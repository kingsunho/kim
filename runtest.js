/* [2.72.0] 결과 먼저 · 주루는 그 위에서 · 수비는 직접 조종
   ------------------------------------------------------------
   이 판의 뼈대가 되는 규칙 네 가지를 엔진 레벨에서 못 박는다.
     ① 「돈다」는 도박이 아니다 — 타구가 다 정해진 뒤에 묻는다
     ② 늘리려다 죽어도 안타는 남는다 (야구 기록 규칙)
     ③ 선수 모드는 내 타석만 열린다
     ④ 몸에 맞는 공·투구수·리드/견제가 실제로 돈다                */
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
  await wait(300); ev("ST.tutDone=true");

  console.log('[① 결과를 먼저 정한다]');
  T('ask 면 늘리기 판정을 미룬다', ()=>ev(`(function(){
    var r=stretchRun('1B',{stretch:{ask:true}},{spd:60},{_slotDef:46},function(){return 0;});
    return r.type==='1B' && r.stretchAsk==='1B' ? '1B / 나중에 묻는다' : '!'+JSON.stringify(r);
  })()`));
  T('안 물어보는 판(자동)은 예전 그대로 굴린다', ()=>ev(`(function(){
    var r=stretchRun('1B',{stretch:{go:true,risk:0}},{spd:80},{_slotDef:20},function(){return 0.01;});
    return r.type==='2B'&&r.stretched ? '성공 → 2루타' : '!'+JSON.stringify(r);
  })()`));
  T('확률식은 한 군데(stretchOdds)만 쓴다', ()=>ev(
    "/stretchOdds\\(/.test(stretchRun.toString())&&/stretchOdds\\(/.test(LiveGame.prototype.resolveStretch.toString())"));

  console.log('\n[② 늘리려다 죽어도 안타는 남는다]');
  T('엔진이 안타 + 주루사로 돌려준다', ()=>ev(`(function(){
    var r=stretchRun('2B',{stretch:{go:true,risk:1}},{spd:10},{_slotDef:80},function(){return 0.99;});
    return r.type==='2B'&&r.runOut==='2B' ? '2루타 + 3루 주루사' : '!'+JSON.stringify(r);
  })()`));
  const setup=()=>ev(`(function(){
    runWeek(); ST.weekDone=true; ST.announced=true; ST.lineupDirty=false;
    ST.absent={}; ST.events=[];
    LIVE=makeLive(); LIVE.manual=true;
    var g=0; while(!LIVE.off().isUser && g++<300){ if(LIVE.pending)LIVE.applyDecision('change'); LIVE.step(); }
    return 1; })()`);
  setup();
  T('돌아서 늘리면 1루타가 2루타가 된다', ()=>ev(`(function(){
    var b=LIVE.off().slots[0].id, p=LIVE.curPitcher(LIVE.def()).id;
    LIVE.box[b]=LIVE.box[b]||newBoxL();
    var d2=LIVE.box[b].d2||0;
    LIVE.bases=[b,null,null]; LIVE.outs=0;
    LIVE._stretchOffer={hit:'1B',batId:b,pitId:p,half:LIVE.half,name:'테스트',defTeam:LIVE.def().team};
    LIVE.rng=function(){return 0.0;};                 // 무조건 성공
    var r=LIVE.resolveStretch(true,0);
    return (r.ok && LIVE.bases[1]===b && !LIVE.bases[0] && LIVE.box[b].d2===d2+1)
      ? '2루타 +1 · 주자 2루' : '!'+JSON.stringify(r)+'/'+JSON.stringify(LIVE.bases);
  })()`));
  T('돌다 죽으면 아웃만 늘고 안타는 그대로다', ()=>ev(`(function(){
    var b=LIVE.off().slots[1].id, p=LIVE.curPitcher(LIVE.def()).id;
    LIVE.box[b]=LIVE.box[b]||newBoxL();
    LIVE.box[b].h=1; LIVE.box[b].ab=1;
    LIVE.bases=[b,null,null]; LIVE.outs=0;
    LIVE._stretchOffer={hit:'1B',batId:b,pitId:p,half:LIVE.half,name:'테스트',defTeam:LIVE.def().team};
    LIVE.rng=function(){return 0.999;};               // 무조건 실패
    var r=LIVE.resolveStretch(true,1);
    return (!r.ok && LIVE.outs===1 && !LIVE.bases[0] && LIVE.box[b].h===1 && LIVE.box[b].d2===0)
      ? '아웃 1 · 안타 1 유지' : '!'+JSON.stringify(r)+' outs='+LIVE.outs+' h='+LIVE.box[b].h;
  })()`));
  T('화면도 안타로 그린다 (돌다 잡혔다 + 안타 인정)', ()=>ev(
    "/rOut \\? \\(res\\.runOut==='1B'\\?'2루에서 아웃 — 안타는 인정'/.test(groundScene.toString())"));
  T('갈 베이스가 막혀 있으면 아예 안 묻는다', ()=>ev(
    "/!this\\.bases\\[sfrom\\+1\\]/.test(LiveGame.prototype.stepPA.toString())"));

  console.log('\n[③ 선수 모드는 내 타석만]');
  T('선수 모드면 「내 선수만」으로 고정된다', ()=>ev(`(function(){
    ST.mode='player'; ST.playBat='all';
    var a=playModeFor('bat');
    ST.playBat='key'; var b=playModeFor('bat');
    ST.playBat='off'; var c=playModeFor('bat');
    ST.mode='mgr'; ST.playBat='all'; var e2=playModeFor('bat');
    ST.mode='player'; ST.playBat='key';
    return (a===PLAY_MINE&&b===PLAY_MINE&&c===PLAY_OFF&&e2===PLAY_ALL)
      ? '매 타석→내것 / 중요→내것 / 끄기 유지 / 감독 모드는 그대로' : '!'+[a,b,c,e2].join(',');
  })()`));
  T('수비·주루를 얼마나 할지 고를 수 있다', ()=>ev(`(function(){
    ST.defMode='key'; ST.runMode='off';
    var a=askModeOf('def'), b=askModeOf('run');
    ST.defMode='all'; ST.runMode='all';
    return (a==='key'&&b==='off') ? 'key / off' : '!'+a+','+b;
  })()`));
  T('「중요한 순간」이 무엇인지 엔진이 안다', ()=>ev(`(function(){
    LIVE.bases=[null,null,null]; LIVE.outs=0; LIVE.inning=1;
    LIVE.home.runs=0; LIVE.away.runs=0;
    var quiet=LIVE.keyMoment();
    LIVE.bases=[null,'x',null];
    var risp=LIVE.keyMoment();
    LIVE.bases=[null,null,null];
    return (!quiet&&risp) ? '평범한 순간 x · 득점권 o' : '!'+quiet+','+risp;
  })()`));

  console.log('\n[④ 몸에 맞는 공 · 투구수 · 리드]');
  setup();
  T('몸에 맞는 공이 타석을 끝낸다', ()=>ev(`(function(){
    var r=LIVE.pitchResult('hbp',null,'ff');
    return (r&&r.end==='HBP'&&LIVE._forceRes&&LIVE._forceRes.type==='HBP')
      ? 'HBP 로 종료' : '!'+JSON.stringify(r);
  })()`));
  T('타석 화면이 몸쪽 붙는 공을 만든다', ()=>ev(
    "/curHbp\\s*=\\s*!ctlOk/.test(renderSwing.toString())"));
  T('뒤 그물 파울이 있다', ()=>ev("/뒤 그물로 넘어갔다/.test(renderSwing.toString())"));
  T('투구수를 지금 이 순간 기준으로 센다', ()=>ev(`(function(){
    var p=LIVE.curPitcher(LIVE.def()).id;
    LIVE.pbox[p].np=12; LIVE._paPitches=3;
    var v=LIVE.pitchCount(p); LIVE._paPitches=0;
    return v===15 ? '12+3=15구' : '!'+v;
  })()`));
  T('타석 머리말에 투구수가 붙는다', ()=>ev("/pitchCount\\(myP\\.id\\)/.test(renderSwing.toString())"));
  T('견제사가 실제로 아웃을 만든다', ()=>ev(`(function(){
    var b=LIVE.off().slots[2].id;
    LIVE.bases=[b,null,null]; LIVE.outs=0;
    LIVE.setRunPlan({lead:2,go:false});
    LIVE.rng=function(){return 0.0;};                 // 무조건 잡힌다
    var r=LIVE.runPickoff(false);
    return (r&&r.out&&LIVE.outs===1&&!LIVE.bases[0]) ? '견제사 · 아웃 1' : '!'+JSON.stringify(r);
  })()`));
  T('제때 돌아오면 거의 산다', ()=>ev(`(function(){
    var b=LIVE.off().slots[3].id;
    LIVE.bases=[b,null,null]; LIVE.outs=0;
    LIVE.setRunPlan({lead:1,go:false});
    LIVE.rng=function(){return 0.5;};
    var r=LIVE.runPickoff(true);
    return (r&&!r.out&&LIVE.bases[0]===b) ? '귀루 성공' : '!'+JSON.stringify(r);
  })()`));
  T('뛰기로 하면 도루를 시도한다', ()=>ev(
    "/plan\\.go\\) runMul=999/.test(LiveGame.prototype.stepPA.toString())"));

  console.log('\n[오심에 따진다]');
  T('접전 오심 판정이 엔진에 있다', ()=>ev("typeof LiveGame.prototype.maybeBadCall==='function'"));
  T('아웃/세이프 오심도 항의 줄에 뜬다', ()=>ev("/bc\\.kind==='play'/.test(showArgue.toString())"));
  T('선수 모드면 내가 따진다', ()=>ev("/내가 따진다/.test(showArgue.toString())"));

  console.log('\n[고교 스토리]');
  T('장면이 열여섯 개다', ()=>ev("HS_STORY.length>=16 ? HS_STORY.length+'장면 · 경기 '+HS_GAMES+'번' : '!'+HS_STORY.length"));
  T('경기가 아닌 장면이 절반쯤이다', ()=>ev(
    "HS_STORY.filter(x=>x.noGame).length>=7 ? HS_STORY.filter(x=>x.noGame).length+'개' : '!'+HS_STORY.filter(x=>x.noGame).length"));
  T('장면마다 고를 게 있다', ()=>ev(
    "HS_STORY.filter(x=>x.pick).length>=8 ? HS_STORY.filter(x=>x.pick).length+'개' : '!'"));
  T('고른 것에 효과와 결과 한 줄이 다 있다', ()=>ev(`(function(){
    var bad=[];
    HS_STORY.forEach(function(s,i){
      if(!s.pick) return;
      if(!s.pick.q||!s.pick.opts||s.pick.opts.length<2) bad.push(i+':틀');
      (s.pick.opts||[]).forEach(function(o){ if(!o.t||!o.r) bad.push(i+':빈칸'); });
    });
    return bad.length? '!'+bad.join(',') : '전부 채워져 있다';
  })()`));
  T('졸업 능력치에 고른 게 붙는다', ()=>ev("/EF\\[k\\]/.test(hsGraduate.toString())"));
  T('출전 몫은 실제 경기 수로 잰다', ()=>ev("/HS_GAMES/.test(hsGraduate.toString())"));

  console.log('\n[사회인야구의 하루]');
  T('그날의 소소한 일이 열두 가지 있다', ()=>ev(
    "SIDE_EVENTS.length>=12 ? SIDE_EVENTS.length+'가지' : '!'+SIDE_EVENTS.length"));
  T('전부 applyWeekEvents 가 처리할 줄 안다', ()=>ev(`(function(){
    var body=applyWeekEvents.toString();
    var miss=SIDE_EVENTS.filter(function(e){ return body.indexOf("'"+e.type+"'")<0; });
    return miss.length? '!'+miss.map(function(x){return x.type;}).join(',') : '열두 가지 다 처리한다';
  })()`));
  T('심판 존 소문이 경기까지 간다', ()=>ev(
    "/umpBias: ST\\.umpBias/.test(makeLive.toString())&&/cfg\\.umpBias/.test(LiveGame.toString())"));
  T('새 공은 장타가 는다', ()=>ev("/cfg\\.ballLive/.test(LiveGame.toString())"));

  console.log('\n[예외]');
  T('콘솔 예외 없음', ()=>errs.length?('!'+errs.slice(0,2).join(' / ')):'깨끗');
  console.log(errs.length?`\n❌ ${errs.length}개 실패`:'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})();
