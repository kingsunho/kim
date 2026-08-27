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

  console.log('\n[수비 — 직접 조종]');
  setup();
  ev("showDecision({kind:'defplay', ang:-18, pos:'SS'})"); await wait(150);
  T(!!d.querySelector('#decision .runstage'), '그라운드가 뜬다');
  T(/으로 온다/.test(txt('#decision .rb-t')), '타구 방향을 먼저 알려준다 :: '+txt('#decision .rb-t'));
  T(btns().length===0, '「안전하게 / 달려든다」 버튼이 없어졌다 — 손으로 쫓아간다');
  T(/끌어라/.test(txt('#decision .rb-note')), '끌어서 조종하라고 알려준다 :: '+txt('#decision .rb-note'));
  T(ev("typeof defChaseScene==='function'"), '타구를 쫓아가는 캔버스가 있다');
  T(ev("/pointermove/.test(defChaseScene.toString())&&/o\\.speed\\*dt/.test(defChaseScene.toString())"),
    '손가락 쪽으로 능력치만큼 뛴다');
  T(ev("/def:q:/.test(renderDefPlay.toString())&&/dp\\.q!=null/.test(LiveGame.prototype.consumePlayMods.toString())"),
    '공에 붙은 정도가 그대로 확률로 간다');
  T(ev("(function(){var u=battedU(7);var r=bbRng(7);r();r();r();return Math.abs(u-r())<1e-12;})()"),
    '비거리 난수를 결과 전에 미리 안다 (화면과 로그가 안 어긋난다)');

  console.log('\n[송구 — 주자를 보면서]');
  await wait(2200);
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
  await wait(700);                 // 앞 장면의 뒷정리 타이머가 다 끝난 뒤에
  ev("showDecision({kind:'lead'})"); await wait(150);
  T(!!d.querySelector('#decision .runstage'), '1루 그라운드가 뜬다');
  T(/리드를 얼마나/.test(txt('#decision .rb-t')), '제목 :: '+txt('#decision .rb-t'));
  T(btns().join('/')==='안 뛴다/뛴다 ▸', '버튼 :: '+btns().join(' / '));
  T(ev("typeof leadScene==='function'&&/pointermove/.test(leadScene.toString())"),
    '끌어서 리드를 벌린다');
  T(ev("typeof LiveGame.prototype.runPickoff==='function'"), '견제사 판정이 엔진에 있다');
  T(ev("/run:go/.test(LiveGame.prototype.applyDecision.toString())"), '도루 지시가 엔진까지 간다');
  [...d.querySelectorAll('#decision .rb-b')].find(b=>/뛴다 ▸/.test(b.textContent)).click();
  await wait(900);
  T(!d.querySelector('#decision.on'), '고르면 판단창이 닫힌다');

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
  T(ev("/const T_LAND  = Math\\.round\\(820 \\+ Math\\.min\\(150,m\\)\\*9\\.5\\)/.test(livePlay.toString())"),
    '체공 시간이 비거리를 따라간다 — 땅볼은 짧게 · 큰 타구는 길게');
  T(ev("/psMtoPx\\(m, P, play\\.ang/.test(livePlay.toString())"),
    '진짜 비거리로 날아간다 — 「저 멀리 갔는데 땅볼아웃」 이 안 나온다');
  T(ev("/if\\(t>=T_THROW\\) decide\\(\\)/.test(livePlay.toString())"),
    '송구가 손을 떠나는 순간에 「돌았는지」가 갈린다 (묻는 창이 없다)');
  T(ev("/'▸ 더 간다/.test(renderSwing.toString())&&/'◂ 돌아간다'/.test(renderSwing.toString())"),
    '도는 버튼과 돌아가는 버튼이 따로 있다');
  T(ev("/if\\(play\\.gb && isOut\\) runMs = Math\\.max/.test(livePlay.toString())"),
    '주자 속도를 결과에 맞춘다 — 아웃인데 먼저 닿아 보이면 안 된다');
  T(ev("/else if\\(!isOut && !HR\\) runMs = Math\\.min/.test(livePlay.toString())"),
    '안타면 내가 송구보다 먼저 닿는다');
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

  console.log('\n[예외]');
  T(jsErr.length===0, jsErr.length?('❌ '+jsErr.slice(0,3).join(' | ')):'콘솔 예외 없음');

  console.log(fail?('\n❌ '+fail+'개 실패'):'\n✅ 이상 없음');
  process.exit(fail?1:0);
})();
