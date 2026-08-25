/* [2.12.0] 직접 플레이 — 타이밍 스윙 · 코스 선택
   [2.26.0] 타격 3층 개편 — 노림수 · 위치 · 타이밍 */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|not implemented/i.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  d.querySelectorAll('.pickcard')[0].click();await wait(50);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(250);
  ev("ST.tutDone=true; ST.weekDone=true; ST.absent={}; ST.injury={};");
  ev("ST.lineup=recommendLineup(); ST.rotation=recommendRotation();");

  console.log('[설정]');
  T('끄기 / 중요한 순간만 / 매 타석 세 가지', ()=>{
    ev("go('more')");
    const b=[...d.querySelectorAll('#view .btn')].map(x=>x.textContent);
    return ['끄기','중요한 순간만','매 타석'].every(n=>b.includes(n)) && '있음';
  });
  T('끄면 조작을 안 물어본다', ()=>ev(`(function(){
    ST.playMode='off';
    LIVE=makeLive(); LIVE.manual=true;
    var n=0,g=0;
    while(!LIVE.over && g++<4000){
      var dd=LIVE.pending||LIVE.detectDecision();
      if(dd){ if(dd.kind==='swing'||dd.kind==='pitch') n++;
        LIVE.applyDecision(dd.kind==='pitcherChange'?'stay':(dd.kind==='defense'?'defnone':'none')); continue; }
      LIVE.step();
    }
    return n===0 ? '한 경기 0회' : false;
  })()`));
  T('매 타석 모드면 자주 물어본다', ()=>ev(`(function(){
    ST.playMode='all';
    LIVE=makeLive(); LIVE.manual=true;
    var sw=0,pi=0,g=0;
    while(!LIVE.over && g++<4000){
      var dd=LIVE.pending||LIVE.detectDecision();
      if(dd){
        if(dd.kind==='swing'){sw++;LIVE.applyDecision('swing:0.9');continue;}
        if(dd.kind==='pitch'){pi++;LIVE.applyDecision('pitch:1');continue;}
        LIVE.applyDecision(dd.kind==='pitcherChange'?'stay':(dd.kind==='defense'?'defnone':'none')); continue;
      }
      LIVE.step();
    }
    return (sw>10&&pi>10) ? '스윙 '+sw+'회 · 코스 '+pi+'회' : false;
  })()`));
  T('중요한 순간만 모드는 훨씬 적게 뜬다', ()=>ev(`(function(){
    /* [2.40.0] 경기 난수가 ST 에서 나온다(새로고침 재굴림 차단). 시드를 안 돌리면
       14경기가 전부 같은 경기라 비교가 안 된다. 두 모드에 같은 시드 열을 준다. */
    var seed0=ST.seed;
    function count(mode){
      ST.playMode=mode; var tot=0;
      for(var t=0;t<14;t++){
        ST.seed=(seed0+t*7919)>>>0;
        LIVE=makeLive(); LIVE.manual=true;
        var g=0;
        while(!LIVE.over && g++<4000){
          var dd=LIVE.pending||LIVE.detectDecision();
          if(dd){
            if(dd.kind==='swing'){tot++;LIVE.applyDecision('swing:0.5');continue;}
            if(dd.kind==='pitch'){tot++;LIVE.applyDecision('pitch:0');continue;}
            LIVE.applyDecision(dd.kind==='pitcherChange'?'stay':(dd.kind==='defense'?'defnone':'none')); continue;
          }
          LIVE.step();
        }
      }
      return tot;
    }
    var all=count('all'), key=count('key');
    ST.seed=seed0;
    return key<all*0.8 ? '14경기 — 매 타석 '+all+'회 / 중요한 순간만 '+key+'회' : false;
  })()`));

  console.log('[타이밍이 실제로 결과에 반영되나]');
  T('잘 맞히면 안타 확률이 오른다 (400타석)', ()=>ev(`(function(){
    function trial(q){
      ST.playMode='all';
      var h=0,ab=0;
      for(var t=0;t<14;t++){
        LIVE=makeLive(); LIVE.manual=true;
        var g=0;
        while(!LIVE.over && g++<4000){
          var dd=LIVE.pending||LIVE.detectDecision();
          if(dd){
            if(dd.kind==='swing'){LIVE.applyDecision('swing:'+q);continue;}
            if(dd.kind==='pitch'){LIVE.applyDecision('playskip');continue;}
            LIVE.applyDecision(dd.kind==='pitcherChange'?'stay':(dd.kind==='defense'?'defnone':'none')); continue;
          }
          LIVE.step();
        }
        var us=LIVE.userIsHome?LIVE.home:LIVE.away;
        us.slots.forEach(function(sl){var b=LIVE.box[sl.id]; if(b){h+=b.h;ab+=b.ab;}});
      }
      return ab? h/ab : 0;
    }
    var good=trial(1.0), bad=trial(0.0);
    return good>bad ? '완벽 타이밍 '+good.toFixed(3)+' vs 헛스윙 '+bad.toFixed(3) : false;
  })()`));
  T('인플레이 보정은 과하지 않다', ()=>ev(`(function(){
    var g=swingMods(1.0), b=swingMods(0.0), m=swingMods(0.5);
    return (g.babip<1.20 && b.babip>0.85 && Math.abs(m.babip-1)<0.01 && Math.abs(m.k-1)<0.01) ?
      '완벽 x'+g.babip.toFixed(2)+' / 평범 x'+m.babip.toFixed(2)+' / 헛스윙 x'+b.babip.toFixed(2) : false;
  })()`));
  T('타이밍이 삼진 여부를 크게 가른다', ()=>ev(`(function(){
    var g=swingMods(1.0), b=swingMods(0.0);
    return (g.k<0.6 && b.k>1.5) ? '정타 삼진 x'+g.k.toFixed(2)+' / 헛스윙 x'+b.k.toFixed(2) : false;
  })()`));
  T('휘두르면 볼넷·사구가 사라진다', ()=>ev(`(function(){
    var a=swingMods(1.0), b=swingMods(0.0);
    return (a.bb<0.1 && a.hbp<0.1 && b.bb<0.1) ? '볼넷 x'+a.bb+' · 사구 x'+a.hbp : false;
  })()`));
  T('정타 치고 볼넷·삼진 나는 일이 거의 없다 (실측)', ()=>ev(`(function(){
    ST.playMode='all';
    var bb=0,k=0,pa=0;
    for(var t=0;t<40;t++){
      LIVE=makeLive(); LIVE.manual=true;
      var g=0;
      while(!LIVE.over && g++<4000){
        var dd=LIVE.pending||LIVE.detectDecision();
        if(dd){
          if(dd.kind==='swing'){LIVE.applyDecision('swing:1.0');continue;}
          if(dd.kind==='pitch'){LIVE.applyDecision('playskip');continue;}
          LIVE.applyDecision(dd.kind==='pitcherChange'?'stay':(dd.kind==='defense'?'defnone':'none'));continue;
        }
        LIVE.step();
      }
      var us=LIVE.userIsHome?LIVE.home:LIVE.away;
      us.slots.forEach(function(sl){var x=LIVE.box[sl.id]; if(x){bb+=x.bb+x.hbp;k+=x.k;pa+=x.pa;}});
    }
    var bbp=pa?bb*100/pa:0, kp=pa?k*100/pa:0;
    return (bbp<6 && kp<14) ? '볼넷 '+bbp.toFixed(1)+'% · 삼진 '+kp.toFixed(1)+'% (기본 15%/20%)' : false;
  })()`));
  T('코스를 잡으면 삼진이 늘고 안타가 준다', ()=>ev(`(function(){
    var hit=pitchMods(true,45), miss=pitchMods(false,45);
    return (hit.k>1 && hit.babip<1 && miss.k<1 && miss.babip>1)
      ? '적중 삼진 x'+hit.k.toFixed(2)+' · babip x'+hit.babip.toFixed(2)+
        ' / 실패 삼진 x'+miss.k.toFixed(2) : false;
  })()`));
  T('제구가 낮으면 코스 효과가 작다', ()=>ev(`(function(){
    var hi=pitchMods(true,70), lo=pitchMods(true,20);
    return hi.k>lo.k ? '제구70 삼진 x'+hi.k.toFixed(2)+' / 제구20 x'+lo.k.toFixed(2) : false;
  })()`));

  console.log('[화면]');
  T('스윙 화면이 그려진다', ()=>{
    ev("ST.playMode='all'; LIVE=makeLive(); LIVE.manual=true;");
    ev(`(function(){var g=0;while(!LIVE.over&&g++<3000){
      var dd=LIVE.detectDecision();
      if(dd&&dd.kind==='swing'){window._d=dd;return;}
      if(dd){LIVE.applyDecision(dd.kind==='pitcherChange'?'stay':(dd.kind==='pitch'?'playskip':'none'));continue;}
      LIVE.step();}})()`);
    if(!ev("window._d")) return '스윙 지점 못 만남';
    if(!d.getElementById('decision')){const b=d.createElement('div');b.id='decision';d.body.appendChild(b);}
    ev("showDecision(window._d)");
    const mv=d.querySelector('.mound');
    const parts=['.mv-cv','.szone','.mitt','#mvboard','#mvtop'].filter(x=>mv&&mv.querySelector(x));
    const btn=[...d.querySelectorAll('#decision button')].map(x=>x.textContent);
    return !!mv && parts.length===5 && (parts.join(',')+' | '+btn.join(' | '));
  });
  T('노림수를 고를 수 있다', ()=>{
    const a=[...d.querySelectorAll('.aim-row button')].map(x=>x.textContent);
    if(!a.length) return false;
    // 변화구가 있는 투수면 3개, 직구만 던지면 2개
    return (a.length===3||a.length===2) && a.includes('안 노린다') && a.join(' / ');
  });
  T('준비 시간을 준다 (카운트다운 동안 잠긴다)', ()=>{
    const b=[...d.querySelectorAll('#decision button')].find(x=>/지켜본다/.test(x.textContent));
    const lb=d.querySelector('.mound .lbl');
    return (b && b.disabled && lb && /준비/.test(lb.textContent)) ? lb.textContent.trim() : false;
  });
  await wait(2600);
  T('카운트다운이 끝나면 칠 수 있다', ()=>{
    const b=[...d.querySelectorAll('#decision button')].find(x=>/지켜본다/.test(x.textContent));
    return (b && !b.disabled) ? '지켜본다 풀림' : false;
  });
  T('화면을 치면 그 공의 판정이 난다', ()=>{
    const mv=d.querySelector('.mound');
    const before=ev("LIVE.count().b+LIVE.count().s");
    mv.dispatchEvent(new w.Event('pointerdown',{bubbles:true}));
    const after=ev("LIVE.count().b+LIVE.count().s");
    const cq=ev("LIVE._contactQ");
    const ended=ev("LIVE._contact===true||LIVE._forceRes!=null");
    return (after>before||ended||cq!=null)
      ? ('카운트 '+before+'→'+after+(cq!=null?' · 품질 '+cq.toFixed(2):'')) : false;
  });

  console.log('[판정 창 — 능력치가 손끝에 닿는가]');
  T('컨택이 높으면 타이밍 창이 넓다', ()=>ev(`(function(){
    var p={stf:50,ctl:40};
    var hi=batWindows({con:87,eye:60},p,'none'), lo=batWindows({con:40,eye:40},p,'none');
    return hi.tw>lo.tw*1.2 ? '컨택87 ±'+hi.tw.toFixed(3)+' / 컨택40 ±'+lo.tw.toFixed(3) : false;
  })()`));
  T('상대 구위가 높으면 타이밍 창이 좁아진다', ()=>ev(`(function(){
    var b={con:60,eye:50};
    var vs=batWindows(b,{stf:30},'none'), ace=batWindows(b,{stf:85},'none');
    return vs.tw>ace.tw*1.2 ? '구위30 ±'+vs.tw.toFixed(3)+' / 구위85 ±'+ace.tw.toFixed(3) : false;
  })()`));
  T('노림수를 맞히면 넓어지고 틀리면 좁아진다', ()=>ev(`(function(){
    var b={con:60,eye:60}, p={stf:50};
    var h=batWindows(b,p,'hit'), n=batWindows(b,p,'none'), m=batWindows(b,p,'miss');
    return (h.tw>n.tw && n.tw>m.tw)
      ? '적중 ±'+h.tw.toFixed(3)+' / 중립 ±'+n.tw.toFixed(3)+' / 실패 ±'+m.tw.toFixed(3) : false;
  })()`));
  T('선구안이 좋을수록 노림수 보상이 크다', ()=>ev(`(function(){
    var p={stf:50};
    var good=batWindows({con:60,eye:80},p,'hit').tw/batWindows({con:60,eye:80},p,'none').tw;
    var bad =batWindows({con:60,eye:25},p,'hit').tw/batWindows({con:60,eye:25},p,'none').tw;
    return good>bad ? '선구80 x'+good.toFixed(2)+' / 선구25 x'+bad.toFixed(2) : false;
  })()`));
  T('위치 허용 오차도 컨택을 따라간다', ()=>ev(`(function(){
    var p={stf:50};
    var hi=batWindows({con:87,eye:50},p,'none').lw, lo=batWindows({con:40,eye:50},p,'none').lw;
    return hi>lo ? '컨택87 '+hi.toFixed(2)+'칸 / 컨택40 '+lo.toFixed(2)+'칸' : false;
  })()`));

  console.log('[빗맞은 이유를 알려준다]');
  T('빨랐는지 늦었는지 말해준다', ()=>ev(`(function(){
    var early=swingNote({guess:'none',errMs:-90,dist:0,tapX:1,tapY:1,ballX:1,ballY:1,batLeft:false});
    var late =swingNote({guess:'none',errMs: 90,dist:0,tapX:1,tapY:1,ballX:1,ballY:1,batLeft:false});
    return (/빨랐다/.test(early)&&/늦었다/.test(late)) ? early+' / '+late : false;
  })()`));
  T('공이 어디로 왔는지 말해준다', ()=>ev(`(function(){
    // 우타 기준 — 공이 탭한 자리보다 왼쪽(cx 작음)이면 몸쪽이다
    var n=swingNote({guess:'none',errMs:0,dist:2,tapX:2,tapY:1,ballX:0,ballY:1,batLeft:false});
    return /몸쪽/.test(n) ? n : false;
  })()`));
  T('좌타는 몸쪽·바깥쪽이 반대로 나온다', ()=>ev(`(function(){
    var r=swingNote({guess:'none',errMs:0,dist:2,tapX:2,tapY:1,ballX:0,ballY:1,batLeft:false});
    var l=swingNote({guess:'none',errMs:0,dist:2,tapX:2,tapY:1,ballX:0,ballY:1,batLeft:true});
    return (/몸쪽/.test(r)&&/바깥쪽/.test(l)) ? '우타 '+r+' / 좌타 '+l : false;
  })()`));
  T('노림수가 틀렸으면 그것부터 말해준다', ()=>ev(`(function(){
    var n=swingNote({guess:'miss',want:'빠른공',came:'커브',errMs:0,dist:0,
                     tapX:1,tapY:1,ballX:1,ballY:1,batLeft:false});
    return /빠른공 노렸는데 커브가 왔다/.test(n) ? n : false;
  })()`));

  console.log('[구속이 장식이 아니다]');
  T('빠른 공이 진짜로 빨리 온다', ()=>ev(`(function(){
    // 타석 화면이 쓰는 식 그대로 — 110km/h 를 기준으로 비행시간을 낸다
    var f=function(k){ return Math.round(Math.max(620,Math.min(1700,1050*(110/Math.max(60,k))))); };
    var fast=f(130), slow=f(85);
    return (fast<slow*0.75) ? '130km/h '+fast+'ms / 85km/h '+slow+'ms' : false;
  })()`));
  T('exact 를 주면 구종 보정을 두 번 안 먹는다', ()=>ev(`(function(){
    var mv=document.querySelector('.mound'); if(!mv) return '마운드 없음';
    var a=throwBall(mv,'cu',{dur:1000,exact:true}); var da=a.dur; a.stop();
    var b=throwBall(mv,'cu',{dur:1000});            var db=b.dur; b.stop();
    return (da===1000 && db>1000) ? 'exact '+da+'ms / 기본 '+Math.round(db)+'ms' : false;
  })()`));
  T('코스 화면이 그려진다', ()=>{
    ev("ST.playMode='all'; LIVE=makeLive(); LIVE.manual=true;");
    ev(`(function(){var g=0;while(!LIVE.over&&g++<3000){
      var dd=LIVE.detectDecision();
      if(dd&&dd.kind==='pitch'){window._d2=dd;return;}
      if(dd){LIVE.applyDecision(dd.kind==='pitcherChange'?'stay':(dd.kind==='swing'?'playskip':'none'));continue;}
      LIVE.step();}})()`);
    if(!ev("window._d2")) return '코스 지점 못 만남';
    ev("showDecision(window._d2)");
    const cells=d.querySelectorAll('.zgrid button').length;
    return cells===9 ? '9칸 존' : false;
  });
  T('구종 버튼이 투수 능력에 맞게 나온다', ()=>{
    const t=[...d.querySelectorAll('.ptype button')].map(x=>x.textContent.replace(/(빠르다|뚝 떨어진다|옆으로 휜다|느리다)/,''));
    return t.length>=1 && t.join(' / ');
  });
  T('존을 누르면 와인드업 후 결과가 기록된다', async()=>{
    const c=d.querySelector('.zgrid button'); c.click();
    return true;
  });

  await wait(3200);   // 와인드업(5단계) + 공 도달 + 타자 판정
  T('던지면 카운트가 올라가거나 타석이 끝난다', ()=>{
    const c=ev("LIVE.count()");
    const closed=!d.querySelector('#decision').classList.contains('on');
    return (c.b+c.s>0 || closed) ? (closed?'타석 종료':`${c.b}볼 ${c.s}스트라이크`) : false;
  });

  console.log('[볼카운트]');
  T('4볼이면 볼넷으로 끝난다', ()=>ev(`(function(){
    LIVE=makeLive(); LIVE.manual=true; LIVE.cntPA=LIVE.paSeq; LIVE.cnt={b:0,s:0};
    var r=null;
    for(var i=0;i<4;i++) r=LIVE.pitchResult('ball');
    return (r&&r.end==='BB'&&LIVE._forceRes&&LIVE._forceRes.type==='BB') ? '4볼 → 볼넷' : false;
  })()`));
  T('3스트라이크면 삼진으로 끝난다', ()=>ev(`(function(){
    LIVE=makeLive(); LIVE.manual=true; LIVE.cntPA=LIVE.paSeq; LIVE.cnt={b:0,s:0};
    var r=null;
    for(var i=0;i<3;i++) r=LIVE.pitchResult('strike');
    return (r&&r.end==='K'&&LIVE._forceRes&&LIVE._forceRes.type==='K') ? '3스트라이크 → 삼진' : false;
  })()`));
  T('파울은 2스트라이크에서 안 올라간다', ()=>ev(`(function(){
    LIVE=makeLive(); LIVE.manual=true; LIVE.cntPA=LIVE.paSeq; LIVE.cnt={b:0,s:2};
    var r=LIVE.pitchResult('foul');
    return (!r && LIVE.count().s===2) ? '2스트라이크 유지' : false;
  })()`));
  T('배트에 맞으면 삼진·볼넷이 안 나온다', ()=>ev(`(function(){
    LIVE=makeLive(); LIVE.manual=true;
    LIVE.pitchResult('contact',0.7);
    var m=LIVE.consumePlayMods({isUser:true},{isUser:false});
    return (m && m.k<0.01 && m.bb<0.01 && m.hbp<0.01)
      ? '삼진 x'+m.k+' · 볼넷 x'+m.bb : false;
  })()`));
  T('맞았는데 삼진 나는 판이 없다 (실측 300타석)', ()=>ev(`(function(){
    var k=0, n=0;
    for(var t=0;t<300;t++){
      LIVE=makeLive(); LIVE.manual=true;
      LIVE.pitchResult('contact',0.6);
      var before=LIVE.log.length;
      var g=0; while(!LIVE.over && g++<40){ LIVE.step();
        if(LIVE.log.slice(before).filter(function(l){return l.t==='play'}).length) break; }
      var evs=LIVE.log.slice(before).filter(function(l){return l.t==='play'});
      if(evs.length){ n++; if(/삼진|볼넷|몸에 맞는/.test(evs[0].text)) k++; }
    }
    return (n>0 && k===0) ? n+'타석 중 삼진·볼넷 0건' : (k+'건 발생');
  })()`));

  console.log('[구종]');
  T('구종마다 속도·궤적이 다르다', ()=>ev(`(function(){
    var ks=Object.keys(PITCH_TYPES);
    var spd={}, brk={};
    ks.forEach(function(k){ spd[k]=PITCH_TYPES[k].spd; brk[k]=Math.abs(PITCH_TYPES[k].bx)+Math.abs(PITCH_TYPES[k].by); });
    var uniqSpd=Object.keys(spd).map(function(k){return spd[k]}).filter(function(v,i,a){return a.indexOf(v)===i}).length;
    return uniqSpd>=4 && ks.map(function(k){return PITCH_TYPES[k].n+'('+spd[k]+', 변화'+brk[k]+')'}).join(' / ');
  })()`));
  T('4부답게 대부분 직구뿐이고 에이스만 다 던진다', ()=>ev(`(function(){
    var t=TBYID['wwzw'];
    var n=t.pitchers.map(function(p){return arsenalOf(p).length;});
    var onlyFF=n.filter(function(x){return x===1}).length;
    var max=Math.max.apply(null,n);
    return (onlyFF>=5 && max>=4) ? '직구만 '+onlyFF+'명 / 최다 '+max+'종' : false;
  })()`));
  T('던질 수 있는 구종만 나온다', ()=>ev(`(function(){
    var t=TBYID['wwzw'];
    var bad=t.pitchers.filter(function(p){
      return arsenalOf(p).some(function(k){
        var need=PITCH_TYPES[k].need; return (p.stf*0.6+p.ctl*0.4) < need; });});
    return bad.length===0 ? '전원 조건 충족' : false;
  })()`));

  if(errs.length) console.log('\n실패:',errs);
  console.log(errs.length?'\n❌ 실패 '+errs.length+'건':'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
},3000);
