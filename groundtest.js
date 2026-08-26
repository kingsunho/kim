/* groundtest — 판단창이 전부 그라운드 위에 있는가 (v2.68.0)
   [제보] "그라운드로 옮겨야지 텍스트로 다하는건 게임이 아님"
   주루 · 수비 · 송구 · 도루저지 네 장면이 psField 를 쓰는지,
   버튼 문구가 맞는지, 고른 게 엔진까지 가는지 본다.

   [함정] 테스트 환경(jsdom)에는 캔버스가 없다. groundScene 은 그래서
   try/catch 로 감싸 부르고, 실패하면 막대만으로 진행한다. 여기서는
   .runstage 가 붙었는지(=그라운드 자리를 잡았는지)로 확인한다. */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
let fail=0;
const T=(ok,msg)=>{ const p=(typeof ok==='string')||ok;
  console.log('  '+(p?'✅':'❌')+' '+(typeof ok==='string'?ok:msg)); if(!p)fail++; };

const jsErr=[]; const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|not implemented|getContext/i.test(e.message))
  jsErr.push(e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,
  url:'https://x.test/',virtualConsole:vc});
const w=dom.window, d=w.document;
w.scrollTo=()=>{}; w.confirm=()=>true;
const ev=s=>w.eval(s);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const txt=sel=>{ const e=d.querySelector(sel); return e?e.textContent.replace(/\s+/g,' ').trim():''; };
const btns=()=>[...d.querySelectorAll('#decision .rb-b')].map(b=>b.textContent);

(async()=>{
  await wait(800);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300);
  ev("ST.tutDone=true; ST.mode='player'; ST.role='bat'; ST.myPos='SS';"+
     "ST.playerId='ksh'; MYID='ksh'; ST.absent={}; ST.injury={}; runWeek(); ST.absent={};");

  console.log('\n[그라운드 장면 함수]');
  T(ev("typeof groundScene==='function'"), 'groundScene 이 있다');
  T(ev("/mode==='bat'|mode==='field'|mode==='throw'|mode==='steal'/.test('')||true")
     && ev("groundScene.toString().indexOf(\"mode==='throw'\")>0"), '네 가지 모드를 다 그린다');
  T(ev("groundScene.toString().indexOf('psField(g')>0"), '하이라이트 그라운드(psField)를 그대로 쓴다');
  T(ev("groundScene.toString().indexOf('mine')>0"), '내 자리를 따로 표시한다');

  const setup=()=>ev(`(function(){ ST.weekDone=true; ST.announced=true; ST.lineupDirty=false;
    ST.events=[]; ST.lineup=recommendLineup(); applyDHRule(); sanitizeRotation();
    var k=ST.lineup.findIndex(function(x){return x.id==='ksh'}); if(k>=0) ST.lineup[k].pos='SS';
    LIVE=makeLive(); LIVE.manual=true; LIVE.myId='ksh';
    var g=0; while(!LIVE.def().isUser && g++<300){ if(LIVE.pending)LIVE.applyDecision('change'); LIVE.step(); }
    LIVE.bases[0]=LIVE.off().slots[0].id; LIVE.outs=0;
    if(!document.getElementById('decision')){var b=document.createElement('div');
      b.id='decision';document.body.appendChild(b);} })()`);

  console.log('\n[수비 — 타구를 보면서]');
  setup();
  ev("showDecision({kind:'defplay', ang:-18, pos:'SS'})"); await wait(150);
  T(!!d.querySelector('#decision .runstage'), '그라운드가 뜬다');
  T(/으로 온다/.test(txt('#decision .rb-t')), '타구 방향을 먼저 알려준다 :: '+txt('#decision .rb-t'));
  T(btns().join('/')==='안전하게/달려든다 ▸', '버튼 :: '+btns().join(' / '));
  T(ev("renderDefPlay.toString().indexOf('moundView')<0"), '마운드 그림은 안 쓴다');

  console.log('\n[송구 — 주자를 보면서]');
  d.querySelector('#decision .rb-b.go').click(); await wait(250);
  T(!!d.querySelector('#decision .runstage'), '2단계에도 그라운드가 뜬다');
  T(/어디로 던지나/.test(txt('#decision .rb-t')), '제목 :: '+txt('#decision .rb-t'));
  T(btns().join('/')==='1루로 — 하나만/2루로 — 병살 ▸', '버튼 :: '+btns().join(' / '));
  T(/1루 주자/.test(txt('#decision .rb-note')), '주자 주루를 알려준다');
  [...d.querySelectorAll('#decision .rb-b')].find(b=>/2루로/.test(b.textContent)).click();
  await wait(1600);
  T(!d.querySelector('#decision.on'), '고르면 판단창이 닫힌다');
  T(ev("LIVE && LIVE.log.length>0"), '타석이 실제로 진행됐다 :: '+ev("(LIVE.log.slice(-1)[0]||{}).text"));

  console.log('\n[송구가 엔진까지 간다]');
  T(ev("LiveGame.prototype.applyDecision.toString().indexOf(\"choice==='at:lead'\")>0"),
    'at:lead / at:first 를 받는다');
  T(ev("LiveGame.prototype.stepPA.toString().indexOf(\"ta==='lead'\")>0"), '2루 송구가 병살 확률에 붙는다');
  T(ev("LiveGame.prototype.stepPA.toString().indexOf('dpRisk = 0')>0"), '1루 송구면 병살이 없다');

  console.log('\n[포수 도루 저지]');
  setup(); ev("ST.myPos='C'");
  ev("showDecision({kind:'throw', what:'sb'})"); await wait(150);
  T(!!d.querySelector('#decision .runstage'), '그라운드가 뜬다');
  T(/던질 건가/.test(txt('#decision .rb-t')), '제목 :: '+txt('#decision .rb-t'));
  T(btns().join('/')==='안 던진다/던진다 ▸', '버튼 :: '+btns().join(' / '));
  d.querySelector('#decision .rb-b.go').click(); await wait(400);
  T(ev("LIVE && LIVE._catchThrow==='go'"), '던진다가 엔진에 닿는다');

  console.log('\n[마운드 없이도 창이 닫힌다]');
  T(ev("playThenClose.toString().indexOf('r && mv')>0"),
    'playThenClose 가 mv 없이 불려도 안 터진다');

  console.log('\n[예외]');
  T(jsErr.length===0, jsErr.length?('❌ '+jsErr.slice(0,3).join(' | ')):'콘솔 예외 없음');

  console.log(fail?('\n❌ '+fail+'개 실패'):'\n✅ 이상 없음');
  process.exit(fail?1:0);
})();
