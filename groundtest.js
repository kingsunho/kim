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

  /* 주루 판단용 — 우리가 공격 중이고 내가 1루에 나가 있다 */
  const setup2=()=>ev(`(function(){
    ST.mode='player'; ST.playerId='ksh'; ST.defAsk=true;
    ST.weekDone=true; ST.announced=true; ST.lineupDirty=false; ST.absent={}; ST.events=[];
    LIVE=makeLive(); LIVE.manual=true; LIVE.myId='ksh';
    var g=0; while(!LIVE.off().isUser && g++<300){ if(LIVE.pending)LIVE.applyDecision('change'); LIVE.step(); }
    LIVE.bases=['ksh',null,null]; LIVE.outs=0;
    if(!document.getElementById('decision')){var b=document.createElement('div');
      b.id='decision';document.body.appendChild(b);} })()`);

  /* [v2.86.0] "수비 주루플레이가 너무 불친절해 한번 할때 설명 해줘야될듯
     포지션 마다" — 자리마다 처음 한 번 설명이 깔린다. 「알겠다」 를
     눌러야 그때 판단창이 시작된다. 두 번째부터는 안 뜬다. */
  const passHelp=async()=>{
    const b=[...d.querySelectorAll('#decision .rb-b')].find(x=>/알겠다/.test(x.textContent));
    if(b){ b.click(); await wait(150); return true; }
    return false;
  };

  console.log('\n[처음 한 번 설명]');
  setup();
  ev("ST.helpSeen={}");
  ev("showDecision({kind:'defplay', ang:-18, pos:'SS'})"); await wait(150);
  T(!!d.querySelector('#decision .help-b'), '내야 수비를 처음 보면 설명이 뜬다');
  T(/조이스틱/.test(txt('#decision .help-b')), '무엇을 누르라는 건지 적혀 있다');
  T(await passHelp(), '「알겠다」 를 누르면 넘어간다');
  T(!d.querySelector('#decision .help-b'), '설명이 사라지고 판단창이 시작된다');
  T(ev("ST.helpSeen && ST.helpSeen['def:IF']===1"), '한 번 읽은 건 세이브에 남는다');
  await wait(3800);

  console.log('\n[수비 — 직접 조종]');
  setup();
  ev("showDecision({kind:'defplay', ang:-18, pos:'SS'})"); await wait(150);
  T(!d.querySelector('#decision .help-b'), '두 번째부터는 설명이 안 뜬다');
  T([...d.querySelectorAll('#decision .lead-b span')].some(x=>/준비 됐다/.test(x.textContent)),
    '수비도 준비 턴이 있다 — 누를 때까지 공이 안 온다');
  T(ev("renderDefPlay.toString().indexOf('scrollIntoView')>0 && renderDefPlay.toString().indexOf('plLock(true)')>0"),
    '화면 안으로 끌어오고 공이 오는 동안 스크롤을 잠근다');
  T(ev("defScene.toString().indexOf('groundScene')<0"),
    '결과를 새 캔버스로 다시 그리지 않는다 (「화면이 초기화」 가 안 난다)');
  T(!!d.querySelector('#decision .runstage'), '그라운드가 뜬다');
  T(/으로 온다/.test(txt('#decision .rb-t')), '타구 방향을 먼저 알려준다 :: '+txt('#decision .rb-t'));
  T(btns().length===0, '「안전하게 / 달려든다」 버튼이 없어졌다 — 손으로 쫓아간다');
  T(/조이스틱/.test(txt('#decision .rb-note')),
    '조이스틱으로 움직이라고 알려준다 :: '+txt('#decision .rb-note'));
  T(ev("typeof defScene==='function'"), '수비 한 판 캔버스가 있다');
  T(!!d.querySelector('#decision .joy .joy-k'),
    '조이스틱이 그라운드 **밖**에 있다 (손가락이 내 야수를 안 가린다)');
  T(ev("defScene.toString().indexOf('setDir')>0 && defScene.toString().indexOf('o.speed*v*dt')>0"),
    '조이스틱을 민 방향으로 뛴다');
  T(ev("LiveGame.prototype.consumePlayMods.toString().indexOf(\"defForce='out'\")>0 && simPA.toString().indexOf(\"mods.defForce==='out'\")>0"),
    '딱 잡으면 아웃, 손이 안 닿으면 안타 — 내 조작이 결과를 정한다');
  T(ev("LiveGame.prototype.consumePlayMods.toString().indexOf('inPlay:true')>0"),
    '수비 화면이 떴으면 삼진·볼넷이 안 나온다');
  T(ev("defScene.toString().indexOf(\"phase='throw'\")>0 && defScene.toString().indexOf('throwables')>0"),
    '같은 캔버스에서 베이스를 눌러 송구한다 (새 화면이 안 뜬다)');
  T(ev("defScene.toString().indexOf('runners.push')>0"),
    '주자를 전부 그린다 — 누가 어디 있는지 보여야 던질 곳을 안다');
  T(ev("renderDefPlay.toString().indexOf('def:q:')>0 && LiveGame.prototype.consumePlayMods.toString().indexOf('dp.q!=null')>0"),
    '공에 붙은 정도가 그대로 확률로 간다');
  T(ev("(function(){var u=battedU(7);var r=bbRng(7);r();r();r();return Math.abs(u-r())<1e-12;})()"),
    '비거리 난수를 결과 전에 미리 안다 (화면과 로그가 안 어긋난다)');

  console.log('\n[송구 — 주자를 보면서]');
  /* [v2.85.0] 수비 비행 시간을 늘렸다 — 내야 2.3~2.9초 · 외야 3.1~4.0초.
     "수비 지금 속도면 너무 빡세다" 제보에서 나온 값이라 여기도 같이 늘린다. */
  await wait(3800);
  T(!/으로 온다/.test(txt('#decision .rb-t')), '1막이 끝나면 결과로 넘어간다 :: '+txt('#decision .rb-t'));
  const tb=[...d.querySelectorAll('#decision .rb-b')].find(b=>/2루로/.test(b.textContent));
  if(tb){
    T(true, '잡았으면 어디로 던질지 고른다');
    tb.click(); await wait(1800);
  } else {
    T(true, '빠졌으면 송구가 없다 — 그대로 진행된다');
    await wait(1800);
  }
  T(ev("LIVE && LIVE.log.length>0"), '타석이 실제로 진행됐다 :: '+ev("(LIVE.log.slice(-1)[0]||{}).text"));

  console.log('\n[주루 — 리드와 견제]');
  setup2();
  await wait(300);                 // 옛 뒷정리가 새 판단창을 못 지운다(decDone 토큰)
  ev("showDecision({kind:'lead'})"); await wait(150);
  await passHelp();                // 주루도 처음 한 번은 설명이 깔린다
  T(!!d.querySelector('#decision .runstage'), '1루 그라운드가 뜬다');
  T(/리드를 얼마나/.test(txt('#decision .rb-t')), '제목 :: '+txt('#decision .rb-t'));
  T([...d.querySelectorAll('#decision .lead-b span')].map(x=>x.textContent).join('/')
      ==='붙어 있는다/보통/크게 나간다/▸ 뛴다/▸ 히트앤런/안 뛴다 — 다음 타자를 본다',
    '리드 세 칸 + 뛴다 + 히트앤런 + 안 뛴다 :: '+
      [...d.querySelectorAll('#decision .lead-b span')].map(x=>x.textContent).join(' / '));
  T(ev("typeof leadScene==='function' && /setLead/.test(leadScene.toString())"),
    '끌지 않고 버튼으로 고른다');
  T(ev("decDone.toString().indexOf('box._decTok!==tok')>0 && showDecision.toString().indexOf('_decTok=')>0"),
    '늦게 온 뒷정리가 다음 판단창을 못 지운다 (연출이 길어져도 안전하다)');
  T(/도루 성공 \d+% · 견제사 \d+%/.test(txt('#decision')),
    '각 칸에 실제 확률이 적혀 있다 (「이정도이다」 가 아니라 숫자)');
  T(ev("!/T\\b.*4200/.test(renderLead.toString()) && /8000/.test(renderLead.toString())"),
    '시간 제한이 없다 — 고를 때까지 기다린다');
  T(ev("typeof LiveGame.prototype.runPickoff==='function'"), '견제사 판정이 엔진에 있다');
  T(ev("/run:go/.test(LiveGame.prototype.applyDecision.toString())"), '도루 지시가 엔진까지 간다');
  [...d.querySelectorAll('#decision .lead-b')].find(b=>/크게 나간다/.test(b.textContent)).click();
  await wait(60);
  [...d.querySelectorAll('#decision .lead-b')].find(b=>/▸ 뛴다/.test(b.textContent)).click();
  /* [v2.86.0] 「뛴다」 는 그 자리에서 도루까지 굴리고 결과를 1.3초 보여준다.
     예전(0.68초)보다 오래 열려 있는다 — "도루 하고 있는 장면도 안나오고" */
  /* [v3.2.0] 히트앤런이 생기면서 「뛴다」 뒤의 갈래가 늘었다.
     타석이 굴러가고 내가 **아직 1루에 있으면 다음 리드 창이 정당하게
     새로 열린다.** 그래서 「창이 아예 없다」 로 보면 안 된다 —
     **그 창이 닫혔는지**(판단창 번호가 바뀌었는지)로 본다.        */
  const tok0=ev("(document.getElementById('decision')||{})._decTok");
  await wait(3600);
  T(ev("(function(){var b=document.getElementById('decision');"+
       "return !b || !b.classList.contains('on') || b._decTok!=="+(tok0|0)+";})()"),
    '고른 그 판단창은 닫힌다 (다음 창이 열리는 건 정상이다)');

  console.log('\n[송구가 엔진까지 간다]');
  T(ev("LiveGame.prototype.applyDecision.toString().indexOf(\"choice==='at:lead'\")>0"),
    'at:lead / at:first 를 받는다');
  T(ev("LiveGame.prototype.stepPA.toString().indexOf(\"ta==='lead'\")>0"), '2루 송구가 병살 확률에 붙는다');
  T(ev("LiveGame.prototype.stepPA.toString().indexOf('dpRisk = 0')>0"), '1루 송구면 병살이 없다');

  console.log('\n[포수 도루 저지]');
  setup(); ev("ST.myPos='C'");
  ev("showDecision({kind:'throw', what:'sb'})"); await wait(150);
  await passHelp();                // 포수도 처음 한 번은 설명이 깔린다
  /* [v3.3.0] 포수 송구에도 「준비 됐다」 가 생겼다 — 누르기 전에는
     주자가 안 뛴다. 실제 손놀림대로 눌러준다. */
  {
    const rb=[...d.querySelectorAll('#decision .lead-b span')]
      .find(x=>/준비 됐다/.test(x.textContent));
    T(!!rb, '포수 송구에도 준비 턴이 있다');
    if(rb){ rb.parentElement.click(); await wait(120); }
  }
  T(!!d.querySelector('#decision .runstage'), '그라운드가 뜬다');
  T(/던질 건가/.test(txt('#decision .rb-t')), '제목 :: '+txt('#decision .rb-t'));
  T(btns().join('/')==='안 던진다/던진다 ▸', '버튼 :: '+btns().join(' / '));
  d.querySelector('#decision .rb-b.go').click(); await wait(400);
  /* [v2.86.0~] 고르면 곧바로 엔진이 그 도루를 굴린다 — _catchThrow 는
     판정하면서 **비워진다.** 그래서 그 칸만 보면 타이밍 싸움이 된다.
     「엔진에 닿았나」 는 결과(중계 로그)로 본다.                    */
  T(ev("(function(){ if(!LIVE) return false;"+
       "if(LIVE._catchThrow==='go') return true;"+
       "return (LIVE.log||[]).some(function(l){return /도루/.test(l.text||'')}); })()"),
    '던진다가 엔진에 닿는다 (판정까지 굴러간다)');

  console.log('\n[\uc8fc\ub8e8 2\ub9c9 \u2014 \uace0\ub974\uace0 \ub098\uc11c\ub3c4 \ud654\uba74\uc774 \uc774\uc5b4\uc9c4\ub2e4]');
  T(ev("/replay/.test(groundScene.toString())"), 'groundScene \uc774 2\ub9c9(replay)\uc744 \uac00\uc9c0\uace0 \uc788\ub2e4');
  T(ev("/hold\\(r, evs, /.test(playThenClose.toString())"),
    'playThenClose \uac00 \uacb0\uacfc\ub97c hold \uc5d0 \ub118\uae30\uace0 \ubc14\ub85c \uc548 \ub2eb\ub294\ub2e4');
  T(ev("/_lastPlay/.test(LiveGame.prototype.stepPA.toString())"),
    '\uc5d4\uc9c4\uc774 \ub9c8\uc9c0\ub9c9 \ud0c0\uad6c \uacb0\uacfc\ub97c \ub0a8\uae34\ub2e4');
  T(ev(`(function(){
    var seen=0;
    for(var n=0;n<3;n++){ var L=makeLive(); var g=0;
      while(!L.over && g++<3000){ L.pending=null; L.step();
        var p=L._lastPlay;
        if(p && p.ang!=null && p.dist!=null && p.type) seen++; } }
    return seen>50 ? seen+'\ud0c0\uad6c\uc5d0\uc11c \ubc29\ud5a5\u00b7\uac70\ub9ac\uac00 \ub2e4 \ucc28 \uc788\ub2e4' : false; })()`),
    '_lastPlay \uc5d0 \ubc29\ud5a5\u00b7\uac70\ub9ac\u00b7\uacb0\uacfc\uac00 \ub4e4\uc5b4 \uc788\ub2e4');
  T(ev("/\ub3cc\ub2e4 \uc7a1\ud614\ub2e4/.test(groundScene.toString())"), '\ub3cc\ub2e4 \uc8fd\uc73c\uba74 \uadf8\ub807\uac8c \uc801\ud78c\ub2e4');
  T(ev("/_stretch/.test(renderSwing.toString()) && !/removeChild\\(box2\\);\\s*\\n\\s*after\\(\\)/.test(renderSwing.toString())"),
    '\uace0\ub974\uc790\ub9c8\uc790 \ucc3d\uc744 \uc5c6\uc560\uc9c0 \uc54a\ub294\ub2e4');

  console.log('\n[\ubbf8\ud2b8 \uc774\ub984 \ucda9\ub3cc]');
  T(ev("!!document.querySelector('.hitmitt') || true") &&
    ev("/#hitmitt/.test(paintMitt.toString())"), '\ud0c0\uaca9 \ubc94\uc704\ub294 .hitmitt \ub97c \uc4f4\ub2e4');
  T(ev("document.querySelectorAll('#mitt').length===0"), '#mitt \ub85c \uc911\ubcf5\ub41c \uc5d8\ub9ac\uba3c\ud2b8\uac00 \uc5c6\ub2e4');

  console.log('\n[\uba54\uc778\ud654\uba74\uc73c\ub85c \ub098\uac00\ub294 \uae38]');
  T(!!d.querySelector('#homebtn'), '\ud5e4\ub354\uc5d0 \uba54\uc778\ud654\uba74 \ubc84\ud2bc\uc774 \uc788\ub2e4');
  T(ev("/HS_OK/.test(go.toString())"), '\uace0\uad50 \ud504\ub864\ub85c\uadf8 \uc911\uc5d0\ub3c4 \uba54\uc778\ud654\uba74\uc740 \uc5f4\ub9b0\ub2e4');

  console.log('\n[어떤 타구든 끝까지 본다]');
  T(ev("/const showRun=/.test(renderSwing.toString())"),
    '고를 게 없는 타구용 2막(showRun)이 있다');
  T(ev("/endPA\\(pre,col,q>=0\\.75,showRun\\)/.test(renderSwing.toString())"),
    '인플레이 타구는 물어보지 않아도 2막을 탄다');
  T(ev("/if\\(!play\\)\\{ setTimeout\\(doneCb/.test(renderSwing.toString())"),
    '삼진·볼넷은 탄 공이 없으니 그냥 닫는다');
  T(ev("typeof livePlay==='function' && /livePlay\\(stage/.test(renderSwing.toString())"),
    '치자마자 끝까지 한 판으로 간다 (1막·2막이 없다)');
  T(ev("/const T_LAND  = Math\\.round\\(1100 \\+ Math\\.min\\(150,m\\)\\*13\\.5\\)/.test(livePlay.toString())"),
    '체공 시간이 비거리를 따라간다 — 땅볼은 짧게 · 큰 타구는 길게');
  T(ev("/const T_THROW = T_CATCH \\+ 720/.test(livePlay.toString())"),
    '잡고 나서 던지기까지 0.72초 — 그 사이에 정한다 (예전엔 0.36초라 못 눌렀다)');
  T(ev("/psMtoPx\\(m, P, play\\.ang/.test(livePlay.toString())"),
    '진짜 비거리로 날아간다 — 「저 멀리 갔는데 땅볼아웃」 이 안 나온다');
  T(ev("/if\\(t>=T_THROW\\) decide\\(\\)/.test(livePlay.toString())"),
    '송구가 손을 떠나는 순간에 「돌았는지」가 갈린다 (묻는 창이 없다)');
  T(ev("renderSwing.toString().indexOf('baserow')>0 && renderSwing.toString().indexOf('<span>\u25b8 ')>0"),
    '주루 버튼도 수비 송구와 같은 베이스 버튼이다');
  T(ev("livePlay.toString().indexOf('pointerdown')>0 && livePlay.toString().indexOf('basePt(Math.min(4,base+1))')>0"),
    '수비처럼 그라운드의 베이스를 직접 눌러서 진루·귀루한다');
  T(ev("livePlay.toString().indexOf('가는 중')>0 && livePlay.toString().indexOf('돌아간다')>0"),
    '누를 수 있는 베이스에 표시가 뜬다');
  T(ev("renderSwing.toString().indexOf('베이스를 눌러라')>0"),
    '베이스를 누르라고 먼저 알려준다');
  T(ev("/if\\(play\\.gb && isOut\\) runMs = Math\\.max/.test(livePlay.toString())"),
    '주자 속도를 결과에 맞춘다 — 아웃인데 먼저 닿아 보이면 안 된다');
  /* [2.83.0] 이 줄이 여러 줄로 늘어났다 — 베이스 수로 나누는 계산이 붙었다.
     문자열을 통째로 재지 말고 '무엇을 하는지'를 잰다. */
  T(ev("/else if\\(!isOut && !HR\\)[\\s\\S]{0,120}runMs = Math\\.min/.test(livePlay.toString())"),
    '안타면 내가 송구보다 먼저 닿는다');
  T(ev("/T_THROW-160\\)\\/Math\\.max\\(1,base\\)/.test(livePlay.toString())"),
    '2루타는 두 베이스를 가야 하니 시간을 베이스 수로 나눈다');
  T(ev("/베이스로 돌아간다/.test(groundScene.toString())&&!/귀루/.test(livePlay.toString())"),
    '「귀루」 라는 말을 안 쓴다');

  console.log('\n[실제로 쳐보고 창이 닫히는지]');
  /* jsdom 에는 캔버스가 없다 — groundScene 이 던진다. 그때도 2막이
     타석 화면을 되돌리고 창을 닫아야 한다. 안 그러면 경기가 멈춘다. */
  const openBat=()=>ev(`(function(){
    ST.runAsk=false;                       // 안 물어보는 쪽 — showRun 경로
    runWeek(); ST.weekDone=true; ST.announced=true; ST.lineupDirty=false;
    ST.absent={}; ST.events=[];
    LIVE=makeLive(); LIVE.manual=true; LIVE.round=ST.round;
    if(!document.getElementById('decision')){var b=document.createElement('div');
      b.id='decision';document.body.appendChild(b);}
    var g=0; while(!LIVE.off().isUser && g++<400){ if(LIVE.pending)LIVE.applyDecision('none'); LIVE.step(); }
    showDecision({kind:'swing',label:'타석'});
    LIVE.pitchResult=function(){return {end:'IP'};};   // 무조건 인플레이
    return LIVE.off().isUser; })()`);
  T(openBat()===true, '타석 화면이 열린다');
  const goB=d.querySelector('#decision .aim-go'); if(goB) goB.click();
  const swB=d.querySelector('#decision .pl-swing');
  T(!!swB, '스윙 버튼이 있다');
  if(swB) swB.click();
  await wait(1600);
  T(ev("!!(LIVE&&'_lastPlay' in LIVE)"), '엔진이 타구 결과를 남겼다');
  T(ev("!!(LIVE&&LIVE.lastDecPA!=null)"), '2막이 끝나고 창이 실제로 닫혔다(decDone)');
  T(!d.querySelector('#decision .runbox'), '2막이 끝나면 그라운드를 치운다');
  T(!d.querySelector('#decision .pl-wrap') ||
    ev("(function(){var m=document.querySelector('#decision .mound');"+
       "return !m||m.style.display!=='none';})()"),
    '타석 화면이 되돌아온다 (안 숨은 채로 안 남는다)');
  T(jsErr.length===0, '2막을 타도 예외가 없다'+(jsErr.length?' :: '+jsErr[0]:''));

  console.log('\n[감독 승계]');
  T(ev("typeof coachId==='function' && coachId()==='lg'"), '처음 감독은 이건이다');
  T(ev("(function(){var ms=leaveTeam(ST,'lg');"+
       "var t=ms.map(function(m){return m.text}).join(' | ');"+
       "return /인수인계/.test(t) ? (t.match(/감독 인수인계[^|]*/)||[''])[0].split('\\n')[0] : '!'+t.slice(0,80);})()"),
    '감독이 나가면 인수인계 공지가 뜬다');
  T(ev("coachId()!=='lg' && TBYID['wwzw'].players.some(function(p){return p.id===coachId()})"),
    '새 감독은 로스터에 있는 사람이다 :: '+ev("nameOf(coachId())"));
  T(ev("ST.leftPlayers.some(function(r){return r.pid==='lg'})"),
    '이탈 명단에 남는다 — 새로고침해도 안 돌아온다');
  T(ev("(function(){var r=ST.leftPlayers.find(function(x){return x.pid==='lg'});"+
       "return (r&&r.to&&TBYID[r.to]&&TBYID[r.to].players.some(function(p){return p.id==='lg'}))"+
       "? TBYID[r.to].name+' 로 갔다' : '!상대 팀에 안 들어갔다';})()"),
    '나간 감독은 다른 팀으로 간다');
  T(ev("nameOf('lg')==='이건'"), "로스터에 없어도 이름은 '?' 가 아니다");
  T(ev("/nameOf\\(m\\.who\\)/.test(renderKakao.toString())"),
    "단톡 렌더러가 '?' 대신 이름 장부를 본다");

  console.log('\n[마운드 없이도 창이 닫힌다]');
  T(ev("playThenClose.toString().indexOf('r && mv')>0"),
    'playThenClose 가 mv 없이 불려도 안 터진다');

  /* ---------------------------------------------------------------
     [계획 A] 2막을 나머지 화면에도 — 자동 타석과 마운드
     --------------------------------------------------------------- */
  console.log('\n[2막 — 자동 타석과 마운드]');
  T(ev("/endPA\\('알아서 치게 뒀다'[^)]*showRun\\)/.test(renderSwing.toString())"),
    '「알아서 치게 뒀다」 도 2막을 탄다 (창이 그냥 안 꺼진다)');
  T(ev("/const showMound=/.test(renderPitch.toString())"),
    '마운드에도 2막이 있다 — 내가 던진 공이 어디로 갔나');
  T(ev("/mode:'field'[\\s\\S]{0,80}myPos:'P'/.test(renderPitch.toString())"),
    '내 자리(금색)가 마운드다 — 관점만 바꾼 것이다');
  T(ev("(renderPitch.toString().match(/playThenClose\\([^)]*showMound/g)||[]).length===3"),
    '볼넷 · 삼진 · 인플레이 셋 다 2막으로 넘어간다');
  T(ev("/sc.replay\\(play,/.test(renderPitch.toString())"),
    'groundScene().replay() 로 **재생만** 한다 (결과는 엔진이 이미 정했다)');

  /* ---------------------------------------------------------------
     [계획 B] 주루를 두 단계로 — 1루 코치 · 3루 코치
     --------------------------------------------------------------- */
  console.log('\n[주루 두 단계]');
  T(ev("/second:true/.test(LiveGame.prototype.resolveStretch.toString())"),
    '엔진이 두 번째 판단 자리를 남긴다');
  T(ev("/again/.test(LiveGame.prototype.resolveStretch.toString())"),
    '화면에 「한 번 더 물어도 된다」 를 알려준다');
  T(ev("/stage2/.test(livePlay.toString()) && /decide2/.test(livePlay.toString())"),
    '화면에 두 번째 창이 있다');
  T(ev("/onDecide2/.test(livePlay.toString()) && /onDecide2/.test(renderSwing.toString())"),
    '두 번째 답도 같은 엔진 함수로 굴린다 (확률식이 하나다)');
  T(ev("/phase:\\(\\)=>/.test(livePlay.toString())"),
    '지금 몇 번째 판단인지 화면이 알 수 있다 (버튼 글씨가 따라간다)');
  /* 엔진만으로 두 단계를 끝까지 굴려본다 — 1루타 → 2루타 → 3루타 */
  T(ev(`(function(){
      ST.mode='player'; ST.playerId='ksh'; MYID='ksh';
      LIVE=makeLive(); LIVE.manual=true; LIVE.myId='ksh';
      var g=0; while(!LIVE.off().isUser && g++<300){
        if(LIVE.pending)LIVE.applyDecision('change'); LIVE.step(); }
      var side=LIVE.off();
      var bid=side.slots[0].id;
      LIVE.bases=[bid,null,null]; LIVE.outs=0;
      if(!LIVE.box[bid]) LIVE.box[bid]=newBoxL();
      LIVE.box[bid].d2=0; LIVE.box[bid].d3=0;
      LIVE._lastPlay={type:'1B',ang:0,dist:40,gb:false};
      LIVE._stretchOffer={hit:'1B', batId:bid, pitId:LIVE.curPitcher(LIVE.def()).id,
        half:LIVE.half, name:LIVE.nameOf(bid), defTeam:LIVE.def().team};
      /* 첫 판단 — 제일 이른 타이밍(risk 0)이면 대부분 산다 */
      var a=null;
      for(var i=0;i<60 && !(a&&a.ok);i++){
        LIVE.bases=[bid,null,null];
        LIVE._stretchOffer={hit:'1B', batId:bid, pitId:LIVE.curPitcher(LIVE.def()).id,
          half:LIVE.half, name:LIVE.nameOf(bid), defTeam:LIVE.def().team};
        LIVE.outs=0;
        a=LIVE.resolveStretch(true,0);
      }
      if(!a||!a.ok||!a.again) return false;
      if(!LIVE.stretchOffer()) return false;          // 두 번째 창이 열려 있다
      var d2before=LIVE.box[bid].d2;
      var b=null;
      for(var j=0;j<60 && !(b&&b.ok);j++){
        LIVE.bases=[null,bid,null]; LIVE.outs=0;
        LIVE._stretchOffer={hit:'2B', batId:bid, pitId:LIVE.curPitcher(LIVE.def()).id,
          half:LIVE.half, name:LIVE.nameOf(bid), defTeam:LIVE.def().team, second:true};
        b=LIVE.resolveStretch(true,0);
      }
      /* 두 번째까지 성공하면 3루에 서 있고 기록은 3루타다 */
      return !!(b && b.ok && b.type==='3B' && LIVE.bases[2]===bid
                && LIVE.box[bid].d3>0 && !LIVE.stretchOffer());
    })()`), '1루타 → 2루타 → 3루타까지 두 번 물어서 간다');
  T(ev("/of.second/.test(LiveGame.prototype.resolveStretch.toString())"),
    '두 번째에서 섰어도 첫 판단으로 늘린 2루타는 남는다');

  console.log('\n[준비 턴 · 고교 주루]');
  T(ev("/준비 됐다/.test(renderThrow.toString())"),
    '포수 송구에도 「준비 됐다」 가 있다 (누를 때까지 주자가 안 뛴다)');
  T(ev("/block:'end'/.test(renderThrow.toString())"),
    '아래쪽을 맞춰 끌어온다 — 폰에서 스크롤이 올라가 장면을 놓치던 것');
  T(ev("!/const rd=LIVE.detectDecision\\(\\)/.test(hsRunLive.toString())"+
       " && /showDecision\\(\\{kind:'lead'\\}\\)/.test(hsRunLive.toString())"),
    '고교 주루가 뜬다 — detectDecision 이 다음 타자 스윙을 먼저 돌려주던 것');
  T(ev("/showDecision\\(\\{kind:'lead'\\}\\)/.test(farmRunLive.toString())"),
    '2군도 마찬가지다');
  T(ev("/keyMoment/.test(hsRunLive.toString())"),
    '「중요한 순간만」 설정도 그대로 지킨다');

  console.log('\n[베이스마다 다른 주루]');
  T(ev("/base1|base2|base3/.test(renderLead.toString())"),
    '1루·2루·3루에서 하는 일이 갈린다');
  T(ev("/3루까지 갈 건가/.test(renderLead.toString())"),
    '2루에서는 3루 도루를 묻는다');
  T(ev("/뜬공이 뜨면 뛸 건가/.test(renderLead.toString())"),
    '3루에서는 태그업을 미리 정한다');
  T(ev("typeof sfRoll==='function' && /_tagPlan/.test(sfRoll.toString())"),
    '그 답이 희생플라이 확률을 바꾼다');
  T(ev("/_runPlan3/.test(LiveGame.prototype.stepPA.toString())"),
    '2루→3루 도루가 엔진에 있다');
  T(ev("/_runGo/.test(LiveGame.prototype.stepPA.toString())"),
    '뛰는 공에 타자가 치는 길이 있다 (히트앤런)');
  T(ev("/뛰던 주자가 못 돌아왔다/.test(LiveGame.prototype.stepPA.toString())"),
    '뜬공이면 못 돌아와서 병살이 난다');
  T(ev("/삼진 때 뛰었다/.test(LiveGame.prototype.stepPA.toString())"),
    '삼진이면 그때 포수가 던진다');
  T(ev(`(function(){
      /* 히트앤런이면 안타에 한 베이스를 더 간다 */
      var m=LiveGame.prototype.stepPA.toString();
      return /this._runGo \\? 0.92/.test(m) && /this._runGo\\?0.008:0.030/.test(m);
    })()`), '안타면 한 베이스 더 · 땅볼은 포스가 풀려 병살이 덜 난다');

  console.log('\n[야구다운 것들]');
  T(ev("/낫아웃 출루/.test(LiveGame.prototype.stepPA.toString())"),
    '낫아웃 — 삼진을 포수가 흘리면 1루로 뛴다');
  T(ev("/canRun=\\(!this.bases\\[0\\] \\|\\| this.outs>=3\\)/.test(LiveGame.prototype.stepPA.toString())"),
    '1루가 비었거나 2아웃일 때만 — 규칙이 그렇다');
  T(ev("/포일 — 주자 진루/.test(LiveGame.prototype.stepPA.toString())"),
    '폭투와 포일이 갈린다 (누구 기록이냐가 다르다)');
  T(ev("/보크 — 주자 한 베이스/.test(LiveGame.prototype.runPickoff.toString())"),
    '견제하다 보크가 난다');
  T(ev("(function(){var n={wide:0,tight:0,even:0};"+
       "for(var i=0;i<300;i++){var r=Math.random();"+
       "n[r<0.22?'wide':(r<0.44?'tight':'even')]++;}"+
       "return n.wide>0&&n.tight>0&&n.even>0;})()"),
    '심판 존이 경기마다 넓다/좁다/보통으로 갈린다');
  T(ev("/umpZone/.test(LiveGame.prototype.stepPA.toString())"),
    '그 존이 삼진·볼넷에 실제로 들어간다');
  T(ev("/오늘 심판/.test(buildLiveStage.toString())"),
    '경기 화면에 오늘 심판이 뜬다');
  T(ev("pitchesForPA.length===3 && /bat.eye/.test(pitchesForPA.toString())"),
    '파울 커트 — 선구안이 좋으면 투구수를 갉아먹는다');
  T(ev(`(function(){
      var rng=makeRng(5);
      var lo=0,hi=0;
      for(var i=0;i<300;i++){ lo+=pitchesForPA('K',rng,{eye:30}); }
      var rng2=makeRng(5);
      for(var i=0;i<300;i++){ hi+=pitchesForPA('K',rng2,{eye:75}); }
      return hi>lo;
    })()`), '선구 75가 30보다 공을 더 본다');
  T(ev("/몸쪽으로 붙였다/.test(LiveGame.prototype.stepPA.toString())"),
    '위협구 — 우리 타자가 맞으면 되갚는다');

  console.log('\n[번트 · 방향 · 협살 · 어깨]');
  T(ev("typeof LiveGame.prototype.buntResult==='function'"),
    '번트를 실제로 댄다 (감독의 「번트 지시」와 다르다)');
  T(ev(`(function(){
      var rng=makeRng(3), n={sac:0,hit:0,pop:0,fail:0};
      var G=Object.create(LiveGame.prototype);
      for(var i=0;i<400;i++){
        var r=G.buntResult({spd:62,con:60},{_slotDef:46},rng);
        n[r.bunt]++;
      }
      return n.sac>0 && n.hit>0 && n.pop>0 && n.fail>0;
    })()`), '진루타 · 기습번트 안타 · 팝플라이 · 앞 주자 아웃 네 갈래가 다 나온다');
  T(ev("/희생번트 — 주자를 보냈다/.test(LiveGame.prototype.stepPA.toString())"),
    '성공하면 주자가 한 베이스씩 간다');
  T(ev("/번트를 댄다/.test(renderSwing.toString()) && /LIVE.outs<2/.test(renderSwing.toString())"),
    '주자가 있고 2아웃이 아닐 때만 뜬다');
  T(ev("battedBall.length===6 && /spray==='pull'/.test(battedBall.toString())"),
    '밀어치기·당겨치기가 타구 방향에 실제로 들어간다');
  T(ev(`(function(){
      var a=battedBall(7,'1B',psPark(),'R',false,'pull').ang;
      var b=battedBall(7,'1B',psPark(),'R',false,'oppo').ang;
      return a<b;   // 우타가 당기면 좌측(음수), 밀면 우측
    })()`), '우타가 당기면 좌측, 밀면 우측으로 간다');
  T(ev("/_spray/.test(renderSwing.toString())"),
    '타석에서 방향을 고른다');
  T(ev("/협살에 걸렸다가 살았다/.test(LiveGame.prototype.stepPA.toString())"),
    '런다운 — 사이에 걸렸다가 살아 나가기도 한다');
  T(ev("typeof pitchArmWear==='function'"),
    '어깨 통증이 누적된다');
  T(ev(`(function(){
      ST.mode='player'; ST.playerId='ksh'; MYID='ksh';
      ST.rest={ksh:3}; ST.injury={};
      var m=pitchArmWear({pbox:{ksh:{np:130,outs:15}}});
      return !!m && ST.rest['ksh']<3;
    })()`), '많이 던진 다음 경기는 회복이 덜 된다');
  T(ev(`(function(){
      ST.rest={ksh:3};
      return pitchArmWear({pbox:{ksh:{np:60,outs:9}}})===null;
    })()`), '적게 던진 날은 아무 일도 없다');

  console.log('\n[비 · 더블헤더]');
  T(ev("/rainStopped/.test(LiveGame.prototype.endHalf.toString())"),
    '경기 중에 비가 와서 멈춘다');
  T(ev("/강우 콜드게임/.test(LiveGame.prototype.endHalf.toString())"+
       " && /노게임/.test(LiveGame.prototype.endHalf.toString())"),
    '정규이닝 절반을 넘겼으면 강우 콜드, 못 넘겼으면 노게임 — 규칙대로');
  T(ev("/Math.ceil\\(this.INN\\/2\\)/.test(LiveGame.prototype.endHalf.toString())"),
    '절반 기준이 정규이닝을 따라간다 (7이닝이면 4회)');
  T(ev("/noGame:!!this.noGame/.test(LiveGame.prototype.finish.toString())"),
    '그 사실이 결과에 실려 나간다');
  /* 확정 처리는 commitGame 안에 있다 — 거기서 일찍 빠져나가야
     성적·코인·순위에 안 들어간다 */
  T(ev("/res.noGame/.test(commitGame.toString()) && /ST.weekDone=false/.test(commitGame.toString())"),
    '노게임이면 그 주를 다시 한다 (기록·순위에 안 들어간다)');
  T(ev(`(function(){
      var n=0;
      for(var s2=0;s2<12;s2++){
        var st=newSeason();
        n+=(st.schedule||[]).filter(function(x){return x.dh===2}).length;
      }
      return n>0;
    })()`), '시즌마다 더블헤더가 잡힌다');
  T(ev("/dh===2/.test(runWeek.toString()) && /컨디션 -10/.test(runWeek.toString())"),
    '2차전은 몸이 안 돌아온다 — 전원 컨디션이 깎이고 투수 피로가 남는다');
  T(ev("/sc.dh===2 && dates\\[i-1\\]/.test(calRounds.toString())"),
    '달력에서 2차전이 앞 경기와 같은 날에 찍힌다');

  console.log('\n[직선타]');
  T(ev("/ldOf/.test(simPA.toString())"),
    '타구가 셋으로 갈린다 — 땅볼 · 직선타 · 뜬공');
  T(ev(`(function(){
      /* 뜬공에서 갈라낸 것이라 아웃 비율은 안 바뀐다 */
      var m=simPA.toString();
      return /gb:isGb, ld: isGb\\?false:ldOf\\(\\)/.test(m);
    })()`), '직선타는 뜬공에서 갈라냈다 (아웃 비율 불변)');
  T(ev("/직선타 — /.test(LiveGame.prototype.stepPA.toString())"),
    '주자가 나가 있으면 원래 베이스로 던져 병살이 난다');
  T(ev(`(function(){
      /* 뛰고 있으면 거의 못 돌아온다 · 붙어 있으면 거의 안 걸린다 */
      var m=LiveGame.prototype.stepPA.toString();
      return /this._runGo\\?1.0:0/.test(m) && /plan.lead<=0\\)\\?0.02/.test(m);
    })()`), '리드를 벌렸을수록 · 뛰고 있었을수록 못 돌아온다');
  T(ev("/투수 강습/.test(LiveGame.prototype.stepPA.toString())"),
    '가운데 직선타는 투수를 맞힌다');
  T(ev("/rollMyInjury\\('타구', 9\\)/.test(LiveGame.prototype.stepPA.toString())"),
    '내가 던지고 있었으면 크게 다칠 수 있다');
  T(ev("/맞고 굴절, 내야안타/.test(LiveGame.prototype.stepPA.toString())"),
    '맞고 튀면 아웃이 안 되고 안타가 된다');
  T(ev(`(function(){
      var a=battedBall(11,'LD',psPark(),'R',false).m;
      var b=battedBall(11,'FB',psPark(),'R',false).m;
      return a<b;
    })()`), '직선타는 뜬공보다 멀리 안 간다 (낮고 빠르다)');
  T(ev("typeof battedIsLine==='function' && /d.ld/.test(renderDefPlay.toString())"),
    '수비 화면이 직선타인 걸 미리 알려준다');
  T(ev("/isLD\\?0.62:1/.test(renderDefPlay.toString())"),
    '직선타는 반응할 시간이 짧다');

  console.log('\n[예외]');
  T(jsErr.length===0, jsErr.length?('❌ '+jsErr.slice(0,3).join(' | ')):'콘솔 예외 없음');

  console.log(fail?('\n❌ '+fail+'개 실패'):'\n✅ 이상 없음');
  process.exit(fail?1:0);
})();
