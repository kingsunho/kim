/* [2.73.0] 몸 · 부상 · 교체엔 이유가 있다 · 내 능력치 장부
   ------------------------------------------------------------
   [요청] "부상도 넣자 선수모드에서만 그래서 스탯 올릴때 파워만 올리거나
           그러면 수비나 유리몸 되는거지"
   [제보] "5경기 연속 안타였는데 2회 수비때 교체되서 한타석도 못서서
           기록 깨진경우가 생겼대"                                   */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|not implemented|getContext/i.test(e.message))errs.push(e.message)});
const mk=()=>{const v2=new VirtualConsole();v2.on('jsdomError',()=>{});
  const dm=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:v2});
  dm.window.scrollTo=()=>{};dm.window.confirm=()=>true;return dm;};
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();const ok=!!r&&!(typeof r==='string'&&r[0]==='!');
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!ok)errs.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  await wait(800);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300);
  ev("ST.tutDone=true; ST.mode='player'; ST.playerId='ksh'; ST.role='bat';");

  console.log('[몸 — 편중되면 부러진다]');
  T('균형 잡힌 몸은 0에 가깝다', ()=>ev(`(function(){
    var v=bodyLoad({con:50,pow:50,eye:50,spd:50,def:50,arm:50});
    return v<0.10 ? v.toFixed(3) : '!'+v;
  })()`));
  T('파워만 올리면 치우친다', ()=>ev(`(function(){
    var a=bodyLoad({con:50,pow:50,eye:50,spd:50,def:50,arm:50});
    var b=bodyLoad({con:50,pow:78,eye:50,spd:70,def:50,arm:50});
    return b>a+0.3 ? '균형 '+a.toFixed(2)+' → 편중 '+b.toFixed(2) : '!'+a+'/'+b;
  })()`));
  T('몸통을 같이 올리면 다시 균형이 잡힌다', ()=>ev(`(function(){
    var bad=bodyLoad({con:50,pow:78,eye:50,spd:70,def:50,arm:50});
    var fix=bodyLoad({con:66,pow:78,eye:50,spd:70,def:70,arm:66});
    return fix<bad-0.25 ? bad.toFixed(2)+' → '+fix.toFixed(2) : '!'+bad+'/'+fix;
  })()`));
  T('상태 이름이 단계별로 갈린다', ()=>ev(`(function(){
    var a=bodyLabel(0.05)[0], b=bodyLabel(0.3)[0], c=bodyLabel(0.6)[0], e2=bodyLabel(1.0)[0];
    return (a!==b&&b!==c&&c!==e2) ? [a,b,c,e2].join(' / ') : '!'+[a,b,c,e2].join(',');
  })()`));
  T('부상마다 어디가 깎이는지 정해져 있다', ()=>ev(`(function(){
    var bad=PM_INJURIES.filter(function(x){
      return !x.name||!x.line||!x.cause||!x.hit||!Object.keys(x.hit).length||x.min>x.max; });
    return bad.length? '!'+bad.map(function(x){return x.id;}).join(',')
      : PM_INJURIES.length+'종 · 원인 '+[...new Set(PM_INJURIES.map(function(x){return x.cause;}))].join('·');
  })()`));

  console.log('\n[다치면 자국이 남는다]');
  const setup=()=>ev(`(function(){
    runWeek(); ST.weekDone=true; ST.announced=true; ST.lineupDirty=false;
    ST.absent={}; ST.events=[]; ST.injury={};
    LIVE=makeLive(); LIVE.manual=true; LIVE.myId='ksh';
    return 1; })()`);
  setup();
  T('편중된 몸이 훨씬 잘 다친다', ()=>ev(`(function(){
    var p=TBYID['wwzw'].players.find(function(x){return x.id==='ksh';});
    var keep={con:p.con,pow:p.pow,spd:p.spd,def:p.def,arm:p.arm};
    var count=function(){
      var n=0;
      for(var i=0;i<600;i++){
        LIVE._myHurt=null; LIVE.injuries=[];
        LIVE.rng=(function(){var s=i*2654435761>>>0;
          return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296;};})();
        if(LIVE.rollMyInjury('스윙',1)) n++;
      }
      return n;
    };
    p.con=50;p.pow=50;p.spd=50;p.def=50;p.arm=50;
    var bal=count();
    p.con=45;p.pow=80;p.spd=75;p.def=42;p.arm=42;
    var skew=count();
    Object.keys(keep).forEach(function(k){p[k]=keep[k];});
    LIVE._myHurt=null; LIVE.injuries=[];
    return skew>bal*2 ? '균형 '+bal+'건 vs 편중 '+skew+'건 (600회)' : '!'+bal+'/'+skew;
  })()`));
  T('타석 한가운데서 라인업을 안 건드린다 (예약했다가 뺀다)', ()=>ev(`(function(){
    var s=LIVE.userSide();
    if(!s.slots.some(function(x){return x.id==='ksh';})) s.slots[0]={id:'ksh',pos:s.slots[0].pos};
    LIVE._myHurt=null; LIVE.injuries=[];
    LIVE.rng=function(){return 0;};                  // 무조건 다친다
    var r=LIVE.rollMyInjury('스윙',1);
    var midPA=s.slots.some(function(x){return x.id==='ksh';});
    LIVE.flushHurt();                                // 타석과 타석 사이에 실제로 뺀다
    var still=s.slots.some(function(x){return x.id==='ksh';});
    return (r && midPA && !still && LIVE._benched && LIVE._benched.injury)
      ? r.name+' — 타석은 끝내고 빠졌다' : '!'+JSON.stringify(r)+'/'+midPA+'/'+still;
  })()`));
  T('부상이 능력치에 자국을 남긴다', ()=>ev(`(function(){
    var p=TBYID['wwzw'].players.find(function(x){return x.id==='ksh';});
    var pm={id:'back',name:'허리 담',games:2,hit:{pow:-4}};
    var before=p.pow;
    applyInjuryHit('ksh', pm);
    var after=p.pow;
    return (after===Math.round((before-4)*10)/10 && ST.myRatings && ST.myRatings.pow===after)
      ? before+' → '+after+' (장부에도 적혔다)' : '!'+before+'/'+after+'/'+(ST.myRatings||{}).pow;
  })()`));
  T('자국은 내 선수한테만 남는다', ()=>ev(
    "applyInjuryHit('swm',{hit:{pow:-9}})===0"));

  console.log('\n[교체엔 이유가 있다]');
  setup();
  T('한 타석도 못 서면 안 뺀다', ()=>ev(`(function(){
    var s=LIVE.userSide();
    LIVE.box['ksh']=newBoxL();
    return LIVE.protectMe(s,'ksh')===true ? '보호한다' : '!안 보호한다';
  })()`));
  T('기록이 걸려 있으면 안타 칠 때까지 안 뺀다', ()=>ev(`(function(){
    var s=LIVE.userSide();
    LIVE.myStreak=5;
    LIVE.box['ksh']={...newBoxL(), pa:2, ab:2, h:0};
    var keep=LIVE.protectMe(s,'ksh');
    LIVE.box['ksh']={...newBoxL(), pa:2, ab:2, h:1};
    var free=LIVE.protectMe(s,'ksh');
    LIVE.myStreak=0;
    return (keep && !free) ? '무안타면 보호 · 안타 치면 해제' : '!'+keep+'/'+free;
  })()`));
  T('연속 안타 경기 수가 엔진까지 온다', ()=>ev(
    "/myStreak: /.test(makeLive.toString()) && /cfg\\.myStreak/.test(LiveGame.toString())"));
  T('벤치 로테이션이 그 보호를 지킨다', ()=>ev(
    "/this\\.protectMe\\(us, sl\\.id\\)/.test(LiveGame.prototype.benchRotation.toString())"));
  T('감독 대사가 이유마다 다르다', ()=>ev(`(function(){
    var ks=Object.keys(SUB_WHY);
    var bad=ks.filter(function(k){ return !SUB_WHY[k].t || !(SUB_WHY[k].lines||[]).length; });
    return bad.length? '!'+bad.join(',') : ks.length+'가지 — '+ks.join('·');
  })()`));
  T('상황을 보고 이유를 고른다', ()=>ev(`(function(){
    var s=LIVE.userSide(), t=LIVE.oppSide();
    LIVE.box['ksh']={...newBoxL(), pa:3, ab:3, h:0};
    ST.cond['ksh']=80;
    s.runs=12; t.runs=1; var a=LIVE.subReasonKey('ksh');
    s.runs=1; t.runs=12; var b=LIVE.subReasonKey('ksh');
    s.runs=3; t.runs=3;  var c=LIVE.subReasonKey('ksh');
    ST.cond['ksh']=40;   var e2=LIVE.subReasonKey('ksh');
    ST.cond['ksh']=80;   s.runs=0; t.runs=0;
    return (a==='blowout'&&b==='losing'&&c==='nohit'&&e2==='cond')
      ? '크게 이김/크게 짐/무안타/컨디션' : '!'+[a,b,c,e2].join(',');
  })()`));
  T('교체당하면 그 장면이 뜬다', ()=>ev(`(function(){
    LIVE._benched={why:{line:'오늘은 여기까지'},inning:3,ab:2,h:0};
    LIVE._benchedShown=false;
    var dd=LIVE.detectDecision();
    return (dd&&dd.kind==='benched') ? '판단창으로 뜬다' : '!'+JSON.stringify(dd);
  })()`));
  T('그 장면을 그리는 화면이 있다', ()=>ev(
    "typeof renderBenched==='function' && /ht-say/.test(renderBenched.toString())"));

  console.log('\n[훈련한 능력치가 안 사라진다]');
  T('훈련하면 장부에 적힌다', ()=>ev(`(function(){
    ST.myTrain='bat';
    var p=TBYID['wwzw'].players.find(function(x){return x.id==='ksh';});
    var before=p.pow;
    applyMyTrain();
    return (p.pow>before && ST.myRatings && Math.abs(ST.myRatings.pow-p.pow)<1e-9)
      ? before+' → '+p.pow+' · 장부 '+ST.myRatings.pow : '!'+before+'/'+p.pow;
  })()`));
  T('「몸 만들기」 훈련이 있다', ()=>ev(`(function(){
    var t=PM_TRAIN.find(function(x){return x.id==='body';});
    return (t && t.g.def>0 && t.g.arm>0 && t.g.con>0) ? t.name+' — 컨택·수비·어깨' : '!없다';
  })()`));
  T('불러오기 경로가 장부를 다시 얹는다', ()=>ev(
    "/applyMyRatings\\(\\)/.test(slotLoad.toString()) && /applyMyRatings\\(\\)/.test(applyHsStart.toString())"));

  console.log('\n[새로고침해도 남는다]');
  const code=ev("JSON.stringify(ST)");
  const powA=ev("TBYID['wwzw'].players.find(x=>x.id==='ksh').pow");
  const B=mk(); await wait(900);
  const eb=s2=>B.window.eval(s2);
  eb("ST=JSON.parse("+JSON.stringify(code)+"); normalizeState(); applyHsStart(); applyMyRatings();");
  const powB=eb("TBYID['wwzw'].players.find(x=>x.id==='ksh').pow");
  T('훈련·부상으로 바뀐 능력치가 새로고침을 넘어간다',
    ()=>Math.abs(powA-powB)<1e-9 ? `${powA} → ${powB}` : `!${powA} vs ${powB}`);
  const raw=eb("(function(){var q=JSON.parse("+JSON.stringify(code)+"); delete q.myRatings; ST=q; normalizeState(); return ST.myRatings? '만들었다':'없다';})()");
  T('옛 세이브는 장부를 지금 값으로 만들어 준다', ()=>raw==='만들었다'?raw:'!'+raw);

  console.log('\n[예외]');
  T('콘솔 예외 없음', ()=>errs.length?('!'+errs.slice(0,2).join(' / ')):'깨끗');
  console.log(errs.length?`\n❌ ${errs.length}개 실패`:'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})();
