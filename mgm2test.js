/* 마구마구 참고 2막 — 주루(2·3루) · 번트 방향 · 구종별 구속 · 라인업 패널

   [사진] 사용자가 마구마구 인게임 화면 넉 장을 더 가져왔다.
     · 타석 아래 「3루번트 · 1루번트 · 스윙」          → 번트 방향
     · 구종 버튼마다 박힌 구속 (포심 115 · 슬라이더 102) → 구종별 구속
     · 화면 오른쪽에 늘 떠 있는 아홉 명 라인업          → 라인업 패널
     · 베이스 다이아몬드와 아웃 카운트                  → 주루

   [핵심] 여기서 제일 큰 건 **주루**다. renderLead 에 2루 칸(3루 도루)과
   3루 칸(태그업)을 다 만들어놓고, applyDecision 에 _runPlan3 · _tagPlan 을
   붙이고, 엔진에 3루 도루 굴림과 sfRoll 까지 넣어놨는데 —
   **창을 띄우는 조건 세 군데가 전부 `bases[0]===me && !bases[1]`** 이었다.
   1루에 있을 때만 열리니 2루·3루 길은 한 번도 안 굴렀다.
   만들어놓고 못 닿는 길이 제일 억울하다.                              */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|not implemented|getContext/i.test(e.message))errs.push(e.message)});
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
  await wait(350);

  console.log('[주루 — 내가 어느 베이스에 있든 물어본다]');
  T('1루 — 2루가 비었으면 물어본다', ()=>ev(`(function(){
    var G={bases:['me',null,null], outs:0};
    return myRunBase(G,'me')===0 ? '1루 → 0' : '!'+myRunBase(G,'me');
  })()`));
  T('1루 — 2루가 차 있으면 안 묻는다', ()=>ev(`(function(){
    var G={bases:['me','x',null], outs:0};
    return myRunBase(G,'me')===-1 ? '앞이 막혔다 → -1' : '!'+myRunBase(G,'me');
  })()`));
  T('2루 — 3루가 비었으면 물어본다 (예전엔 안 떴다)', ()=>ev(`(function(){
    var G={bases:[null,'me',null], outs:1};
    return myRunBase(G,'me')===1 ? '2루 → 1' : '!'+myRunBase(G,'me');
  })()`));
  T('2루 — 3루가 차 있으면 안 묻는다', ()=>ev(`(function(){
    var G={bases:[null,'me','x'], outs:0};
    return myRunBase(G,'me')===-1 ? '앞이 막혔다 → -1' : '!'+myRunBase(G,'me');
  })()`));
  T('3루 — 태그업을 미리 정한다 (예전엔 안 떴다)', ()=>ev(`(function(){
    var G={bases:[null,null,'me'], outs:1};
    return myRunBase(G,'me')===2 ? '3루 → 2' : '!'+myRunBase(G,'me');
  })()`));
  T('3루 2아웃이면 안 묻는다 — 뜬공이면 이닝이 끝난다', ()=>ev(`(function(){
    var G={bases:[null,null,'me'], outs:2};
    return myRunBase(G,'me')===-1 ? '2아웃 → -1' : '!'+myRunBase(G,'me');
  })()`));
  T('베이스에 없으면 안 묻는다', ()=>ev(`(function(){
    return myRunBase({bases:['a','b','c'],outs:0},'me')===-1 ? '없다 → -1' : '!';
  })()`));
  T('트리거 세 군데가 전부 myRunBase 를 본다', ()=>{
    const src=require('fs').readFileSync('index.html','utf8');
    const n=(src.match(/myRunBase\(/g)||[]).length;
    const old=(src.match(/bases\[0\]===me && !LIVE\.bases\[1\]/g)||[]).length;
    // 선언 1 + 트리거 3 + 테스트 아님
    return (n>=4 && old===0) ? ('myRunBase 호출 '+(n-1)+'곳 · 옛 조건 '+old+'개')
      : '!호출 '+n+' / 옛 조건 '+old;
  });
  T('applyDecision 이 2루·3루 지시를 받아준다', ()=>ev(`(function(){
    var src=LiveGame.prototype.applyDecision.toString();
    return (/_runPlan3/.test(src) && /_tagPlan/.test(src)) ? '_runPlan3 · _tagPlan 있다' : '!';
  })()`));

  console.log('\n[번트 방향 — 3루쪽이냐 1루쪽이냐]');
  const B=`var G=Object.create(LiveGame.prototype);
    var bat={spd:50,con:50}, def={_slotDef:46};
    var roll=function(dir,n){
      var out={sac:0,hit:0,pop:0,fail:0};
      var seed=1; var rng=function(){ seed=(seed*1103515245+12345)%2147483648; return seed/2147483648; };
      for(var i=0;i<n;i++){ var r=G.buntResult(bat,def,rng,dir); out[r.bunt]++; }
      return out;
    };`;
  T('3루쪽이 주자를 더 잘 보낸다', ()=>ev(`(function(){${B}
    var a=roll('3b',4000), b=roll('1b',4000);
    return a.sac>b.sac ? ('3루쪽 진루 '+a.sac+' · 1루쪽 '+b.sac) : '!'+a.sac+'/'+b.sac;
  })()`));
  T('1루쪽이 내가 살 확률이 높다', ()=>ev(`(function(){${B}
    var a=roll('3b',4000), b=roll('1b',4000);
    return b.hit>a.hit*2 ? ('1루쪽 안타 '+b.hit+' · 3루쪽 '+a.hit) : '!'+b.hit+'/'+a.hit;
  })()`));
  T('1루쪽은 앞 주자가 더 자주 잡힌다', ()=>ev(`(function(){${B}
    var a=roll('3b',4000), b=roll('1b',4000);
    return b.fail>a.fail ? ('1루쪽 실패 '+b.fail+' · 3루쪽 '+a.fail) : '!'+b.fail+'/'+a.fail;
  })()`));
  T('방향을 안 주면 예전 숫자 그대로다', ()=>ev(`(function(){
    /* [주의] 옛 세이브·자동 진행이 이 길로 온다. 발이 느리면 난수를
       아예 안 뽑던 것까지 같아야 한다 — 그래야 시드가 안 밀린다.   */
    var G=Object.create(LiveGame.prototype);
    var seed=7, rng=function(){ seed=(seed*1103515245+12345)%2147483648; return seed/2147483648; };
    var slow={spd:40,con:50};            // 56 미만 — 기습번트 난수를 안 뽑는다
    var used=0; var rng2=function(){ used++; return rng(); };
    var r=G.buntResult(slow,{_slotDef:46},rng2);
    return (used<=2 && r.bdir===null) ? ('난수 '+used+'개 · 방향 없음') : '!'+used+'/'+r.bdir;
  })()`));
  T('버튼이 두 개로 갈렸다 — 3루쪽 · 1루쪽', ()=>{
    const src=require('fs').readFileSync('index.html','utf8');
    return (/mybunt:'\+k/.test(src) && /3루쪽으로/.test(src) && /1루쪽으로/.test(src)
      && !/번트를 댄다 — 주자를 보낸다/.test(src))
      ? '방향 버튼 두 개' : '!옛 버튼이 남아 있다';
  });
  T("applyDecision 이 'mybunt:3b' 를 받는다", ()=>ev(`(function(){
    var G=Object.create(LiveGame.prototype);
    G.log=[]; G.paSeq=1;
    G.applyDecision('mybunt:3b');
    if(G._myBunt!==true || G._myBuntDir!=='3b') return '!'+G._myBunt+'/'+G._myBuntDir;
    G.applyDecision('mybunt');
    return (G._myBuntDir===null) ? '3b 받고, 방향 없는 것도 받는다' : '!'+G._myBuntDir;
  })()`));
  T('3루에 주자가 있으면 스퀴즈라고 부른다', ()=>{
    const src=require('fs').readFileSync('index.html','utf8');
    return /스퀴즈 — 3루 주자가 들어왔다/.test(src) ? '스퀴즈 문구 있다' : '!';
  });

  console.log('\n[구종별 구속]');
  T('구종마다 다른 숫자가 나온다', ()=>ev(`(function(){
    var p={id:'x',stf:60,ctl:50,sta:50};
    var ff=typeKmh(p,'ff'), cu=typeKmh(p,'cu'), sl=typeKmh(p,'sl');
    return (ff>sl && sl>cu) ? ('직구 '+ff+' · 슬라 '+sl+' · 커브 '+cu)
      : '!'+ff+'/'+sl+'/'+cu;
  })()`));
  T('구위가 낮으면 느리다', ()=>ev(`(function(){
    var a=typeKmh({id:'x',stf:30},'ff'), b=typeKmh({id:'x',stf:70},'ff');
    return b>a ? ('구위30 '+a+' → 구위70 '+b) : '!'+a+'/'+b;
  })()`));
  T('사회인야구 상한(117)을 안 넘는다', ()=>ev(`(function(){
    var v=typeKmh({id:'x',stf:99},'ff');
    return v<=117 ? ('구위 99 라도 '+v) : '!'+v;
  })()`));
  T('지치면 구속이 떨어진다 — pitFade 하나로 센다', ()=>ev(`(function(){
    var p={id:'x',stf:60,ctl:50,sta:40};
    var f0=pitFade(p,0), f1=pitFade(p,18);
    var k0=typeKmh(p,'ff',f0.stf), k1=typeKmh(p,'ff',f1.stf);
    return (f1.k>0 && k1<k0) ? ('0아웃 '+k0+'km/h → 18아웃 '+k1+'km/h (구위 -'+Math.round(f1.dStf)+')')
      : '!'+f1.k+'/'+k0+'/'+k1;
  })()`));
  T('2이닝 전에는 안 지친다', ()=>ev(`(function(){
    var p={id:'x',stf:60,sta:22};
    return pitFade(p,5).k===0 ? '5아웃까지 멀쩡' : '!'+pitFade(p,5).k;
  })()`));
  T('엔진도 화면도 같은 식을 본다 — 식이 하나뿐이다', ()=>{
    const src=require('fs').readFileSync('index.html','utf8');
    const dup=(src.match(/Math\.round\(4\+\(sta-22\)\*0\.19\)/g)||[]).length;
    const call=(src.match(/pitFade\(/g)||[]).length;
    return (dup===1 && call>=4) ? ('식 '+dup+'군데 · pitFade 호출 '+(call-1)+'곳')
      : '!식 '+dup+' / 호출 '+call;
  });
  T('버튼과 릴리스 표시가 같은 값을 쓴다', ()=>ev(`(function(){
    var src=pitchKmh.toString();
    return /liveStf\\(/.test(src) ? 'pitchKmh 도 liveStf 를 본다' : '!';
  })()`));
  T('타석 노림수 줄에도 구속이 뜬다', ()=>{
    const src=require('fs').readFileSync('index.html','utf8');
    return /<em>\$\{typeKmh\(myP,k\)\}<\/em>/.test(src) ? '노림수에 구속' : '!';
  });

  console.log('\n[라인업 패널]');
  T('경기 화면에 라인업 버튼이 있다', ()=>{
    const src=require('fs').readFileSync('index.html','utf8');
    return /양 팀 라인업 보기/.test(src) ? '버튼 있다' : '!';
  });
  T('공격 중인 팀이 위에 온다', ()=>ev(`(function(){
    var src=openLineupSheet.toString();
    var a=src.indexOf('LIVE.off()'), b=src.indexOf('LIVE.def()');
    return (a>=0 && b>a) ? '공격 → 수비 순서' : '!'+a+'/'+b;
  })()`));
  T('타순·포지션·좌우타·오늘 성적이 다 있다', ()=>ev(`(function(){
    var src=lineupRows.toString()+lineupCard.toString();
    var need=['pos','bats','today','now','next'];
    var miss=need.filter(function(k){ return src.indexOf(k)<0; });
    return miss.length===0 ? '다 있다' : '!빠짐 '+miss.join(',');
  })()`));
  T('CSS 이름이 기존 라인업 화면과 안 겹친다', ()=>{
    const src=require('fs').readFileSync('index.html','utf8');
    /* [주의] jsdom 은 특이도를 무시하고 소스 순서만 본다.
       .lu-h 는 저장된 라인업 칸이 이미 쓰고 있어서 .lg- 로 갈랐다. */
    return (/\.lg-card\{/.test(src) && !/el\('div','lu-card'/.test(src))
      ? '.lg- 로 갈랐다' : '!이름이 겹친다';
  });

  console.log('\n[실제 경기에서 굴려본다]');
  T('라인업 시트가 열리고 아홉 줄이 찍힌다', ()=>ev(`(function(){
    ST.round=0; ST.schedule[0].played=false;
    LIVE=makeLive(); LIVE.manual=true;
    buildLiveStage();
    openLineupSheet();
    var rows=document.querySelectorAll('#sheet-body .lg-r').length;
    var cards=document.querySelectorAll('#sheet-body .lg-card').length;
    var now=document.querySelectorAll('#sheet-body .lg-r.now').length;
    closeSheet();
    return (cards===2 && rows===18 && now===2)
      ? ('카드 '+cards+'장 · '+rows+'줄 · 지금 타석 '+now+'명') : '!'+cards+'/'+rows+'/'+now;
  })()`));
  T('한 경기 끝까지 굴러간다 — 번트·주루를 섞어도', ()=>ev(`(function(){
    ST.round=0; ST.schedule[0].played=false;
    LIVE=makeLive(); LIVE.manual=false;
    var g=0;
    while(!LIVE.over && g++<3000){
      if(LIVE.pending) LIVE.applyDecision('change');
      if(g%37===0) LIVE.applyDecision(g%74===0?'mybunt:3b':'mybunt:1b');
      LIVE.step();
    }
    return LIVE.over ? (LIVE.inning+'회까지 · '+LIVE.home.runs+'-'+LIVE.away.runs)
      : '!안 끝났다 '+g;
  })()`));

  console.log(errs.length?('\n❌ '+errs.length+'건: '+errs.join(' / ')):'\n✅ 이상 없음');
  dom.window.close(); process.exit(errs.length?1:0);
})();
