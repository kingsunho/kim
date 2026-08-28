/* growtest — 선수 육성 구조 (v2.87.0)
   2026-08-28 피드백의 D·E 묶음. 코인 · 2군 벽 · 투수 육성 · 타순 ·
   자리 경쟁 · 역할 면담을 본다.

   [함정] 여기 숫자는 전부 "얼마나 빡센가" 를 정하는 값이다.
   바꾸려면 왜 바꾸는지를 같이 남겨라 — 안 그러면 다음 사람이
   되돌려 놓는다. */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
let fail=0;
const T=(ok,msg)=>{ console.log('  '+(ok?'✅':'❌')+' '+msg); if(!ok)fail++; };
const vc=new VirtualConsole();
const jsErr=[];
vc.on('jsdomError',e=>{ if(!/scrollTo|not implemented|getContext/i.test(e.message))
  jsErr.push(e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,
  url:'https://x.test/',virtualConsole:vc});
const w=dom.window, d=w.document;
w.scrollTo=()=>{}; w.confirm=()=>true;
const ev=s=>w.eval(s);
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  await wait(800);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300);
  ev("ST.tutDone=true; ST.mode='player'; ST.role='bat'; ST.myPos='SS';"+
     "ST.playerId='ksh'; MYID='ksh'; ST.absent={}; ST.injury={};");

  /* ---------------------------------------------------------------
     [제보] "코인 너무 많이 준다" · "바로 코인으로 스탯 올릴 수 있게"
     --------------------------------------------------------------- */
  console.log('\n[코인 — 덜 주고, 아무 때나 쓴다]');
  T(ev("(function(){var r=coinsForGame({box:{ksh:{pa:4,ab:4,h:2,d2:0,d3:0,hr:0,rbi:1,sb:0,bb:0,hbp:0,e:0}}},true,false);"+
       "return r.n;})()")===4,
    '2안타 1타점 이긴 경기가 +4 다 (예전 +8)');
  T(ev("coinsForGame({box:{ksh:{pa:4,ab:4,h:2,d2:0,d3:0,hr:0,rbi:1,sb:0,bb:0,hbp:0,e:0}}},true,false)"+
       ".rows.every(function(r){return /[+-]\\d/.test(r.label)})"),
    '줄마다 몇 점인지 적혀 있다 (왜 줬는지가 보인다)');
  T(ev("coinsForGame({box:{ksh:{pa:4,ab:4,h:0,d2:0,d3:0,hr:0,rbi:0,sb:0,bb:0,hbp:0,e:1}}},false,false).n")<0,
    '실책하고 무안타면 깎인다');
  T(ev("typeof trainQueue==='function' && typeof trainBuy==='function'"+
       " && typeof trainRefund==='function'"), '훈련을 사고 무르는 길이 있다');
  /* [요청] "초반 업그레이드는 싼데 스탯이 올라갈수록 코인이 개비싼
             그런 더쇼처럼 해야함" */
  T(ev("typeof trainLevel==='function' && Array.isArray(TRAIN_PRICE)"),
    '값이 능력치 구간을 따라간다');
  T(ev(`(function(){
      var p=TBYID['wwzw'].players.find(function(x){return x.id==='ksh'});
      var t=pmTrainDef('bat');
      var c0=p.con, w0=p.pow;
      p.con=28; p.pow=28; var cheap=trainCost(t);
      p.con=70; p.pow=70; var dear=trainCost(t);
      p.con=c0; p.pow=w0;
      return cheap===2 && dear===12 && dear>cheap*4;
    })()`), '컨택 28 은 2코인 · 컨택 70 은 12코인 (여섯 배)');
  T(ev("(function(){ return trainCost(pmTrainDef('rest'))===0; })()"),
    '쉬는 건 그대로 공짜다');
  T(ev(`(function(){
      var p=TBYID['wwzw'].players.find(function(x){return x.id==='ksh'});
      var c0=p.con,w0=p.pow,e0=p.eye,s0=p.spd,d0=p.def,a0=p.arm;
      p.con=p.pow=p.eye=p.spd=p.def=p.arm=30;
      var team=trainCost(pmTrainDef('team')), bat=trainCost(pmTrainDef('bat'));
      p.con=c0;p.pow=w0;p.eye=e0;p.spd=s0;p.def=d0;p.arm=a0;
      return team<bat;
    })()`), '팀 훈련은 같은 구간에서도 절반값이다');
  T(ev(`(function(){
      var p=TBYID['wwzw'].players.find(function(x){return x.id==='ksh'});
      var c0=p.con,w0=p.pow,d0=p.def,a0=p.arm,s0=p.spd;
      p.con=p.pow=p.def=p.arm=p.spd=30;      // 전부 2코인 구간
      ST.coin=20; ST.myTrainQ=[]; ST.myTrain=null;
      var a=trainBuy('bat'), b=trainBuy('def'), c=trainBuy('run');
      var okBuy=(!a&&!b&&!c && trainQueue().length===3 && ST.coin===14);
      var okFour=(trainBuy('eye')!==null && trainQueue().length===3);
      var okCond=(trainQueueCond()<=-15);
      trainRefund(0);
      var okBack=(trainQueue().length===2 && ST.coin===16);
      p.con=c0;p.pow=w0;p.def=d0;p.arm=a0;p.spd=s0;
      return okBuy&&okFour&&okCond&&okBack;
    })()`), '싼 구간에서 셋을 사면 20 → 14, 무르면 16 으로 돌아온다');
  T(ev(`(function(){
      /* 산 것이 다음 주에 한꺼번에 붙는다 */
      var p=TBYID['wwzw'].players.find(function(x){return x.id==='ksh'});
      ST.myTrainQ=['bat','bat'];            // 같은 걸 두 번
      var c0=p.con;
      applyMyTrain();
      var up=p.con-c0;
      /* 1.0 + 1.0*0.6 = 1.6 */
      return Math.abs(up-1.6)<0.01 && trainQueue().length===0;
    })()`), '같은 훈련을 두 번 하면 두 번째는 0.6 배만 는다');
  T(ev("/이번 주는 아무것도 안 샀다/.test((function(){ST.myTrainQ=[];return applyMyTrain();})())"),
    '아무것도 안 샀으면 안 샀다고 말해준다');

  /* ---------------------------------------------------------------
     [제보] "2군 안걸치고 왜 바로 1군 온거지?" · "1군벽은 좀 높아야되는데"
     --------------------------------------------------------------- */
  console.log('\n[1군 벽]');
  T(ev("HS_GRAD_PLAY===6 && HS_GRAD_PERF===18"),
    '졸업치를 내렸다 — 뛴 몫 6 · 성적 몫 18 (예전 10 · 26)');
  T(ev("HS_BASE+HS_GRAD_PLAY+HS_GRAD_PERF")===44,
    '3년을 완벽하게 보내도 44 다 (팀 주전은 60~87)');
  /* [v2.96.0] 2군 기간을 정하는 자리가 hsGraduate 의 if 사슬에서
     **입단 드래프트 순번**으로 옮겨갔다 — 고교 성적 → 지명 순번 →
     2군 기간. 검사도 그쪽을 본다. */
  T(ev("entryFarmWeeks(1)===1 && Math.min.apply(null,[1,10,30,60,90,120].map(entryFarmWeeks))===1"),
    '제일 잘해도 2군을 한 주는 거친다');
  T(ev("/entryFarmWeeks/.test(hsGraduate.toString())"),
    '2군 기간을 지명 순번이 정한다');
  T(ev("hsGraduate.toString().indexOf('주전 보장은 없다')>0"),
    '졸업하면서 주전 보장을 안 준다');
  T(ev("farmWeek.toString().indexOf('주전 보장')<0"),
    '콜업에도 주전 보장이 안 붙는다');
  T(ev("farmWeek.toString().indexOf('playedSelf')>0"),
    '2군 경기를 직접 쳤으면 가짜 타석을 또 안 얹는다');

  /* ---------------------------------------------------------------
     [제보] "투수는 훈련하는거 왜 없냐" ·
            "구속형 제구형 변화형 장타억제력형"
     --------------------------------------------------------------- */
  console.log('\n[투수 육성 — 네 갈래]');
  ['pspd','pctl','pbrk','psta'].forEach(id=>{
    T(ev("!!PM_TRAIN.find(function(t){return t.id==='"+id+"'})"), id+' 훈련이 있다');
  });
  T(ev("PM_TRAIN.every(function(t){return t.id!=='pit'})"),
    '「투구 훈련」 하나로 뭉뚱그리던 것은 없앴다');
  T(ev("typeof brkOf==='function'"), '변화(brk) 칸이 있다');
  T(ev("Math.abs(brkOf({stf:50,ctl:50})-31)<0.5"),
    '없는 사람은 구위·제구에서 짐작한다 (스물세 팀과 옛 세이브)');
  T(ev("brkOf({stf:50,ctl:50,brk:70})===70"), '훈련한 사람은 그 값을 쓴다');
  T(ev("(function(){var a=arsenalOf({stf:50,ctl:50});"+
       "var b=arsenalOf({stf:50,ctl:50,brk:70});return b.length>a.length;})()"),
    '변화를 올리면 던질 수 있는 구종이 는다');
  T(ev("/pMov/.test(simPA.toString())"), '변화가 장타를 눌러준다 (장타 억제형)');
  T(ev("myRatingsSave.toString().indexOf(\"'brk'\")>0"+
       " && applyMyRatings.toString().indexOf(\"'brk'\")>0"),
    '[로스터는 세이브에 없다] 올린 변화도 매 로드마다 다시 얹는다');

  console.log('\n[투수 체력 — 한 경기 안에서]');
  T(ev("LiveGame.prototype.stepPA.toString().indexOf('_pitFade')>0"),
    '지치는 계산이 엔진에 있다');
  T(ev("/아무리 체력이 나빠도/.test(LiveGame.prototype.stepPA.toString())"+
       " || /Math.max\\(6, Math.round\\(lim\\*0.75\\)\\)/.test(LiveGame.prototype.stepPA.toString())"),
    '2이닝 전에는 안 지친다');
  T(ev("/팔이 안 올라간다/.test(renderPitch.toString())"),
    '마운드 화면이 지친 정도를 말해준다');

  /* ---------------------------------------------------------------
     [제보] "타순도 좀 짜임새 있게 들어갔으면"
     --------------------------------------------------------------- */
  console.log('\n[타순]');
  T(ev("/p.spd\\*1.6\\+p.eye\\*1.4-p.pow\\*0.5/.test(recommendLineup.toString())"),
    '1번은 발과 선구안이다 · 힘 있는 타자는 뒤로 민다');
  T(ev("/bal\\(p\\)/.test(recommendLineup.toString())"), '2번은 다재다능이다');
  T(ev("/p.con\\*1.7/.test(recommendLineup.toString())"), '3번은 컨택이다');
  T(ev("/p.pow\\*1.8/.test(recommendLineup.toString())"), '4번은 한 방이다');
  T(ev(`(function(){
      ST.weekDone=true; ST.announced=true; ST.absent={};
      var L=recommendLineup();
      if(L.length<9) return false;
      var by=function(id){return TBYID['wwzw'].players.find(function(p){return p.id===id})};
      var one=by(L[0].id), four=by(L[3].id);
      /* 1번이 4번보다 발이 빠르고, 4번이 1번보다 힘이 세다 */
      return one.spd>=four.spd && four.pow>=one.pow;
    })()`), '실제로 1번이 더 빠르고 4번이 더 힘있다');

  /* ---------------------------------------------------------------
     [제보] "투수만 하는거는 지명타자 사용" · "포수 밀려서 2루로"
     --------------------------------------------------------------- */
  console.log('\n[자리 — 역할과 경쟁]');
  T(ev("/ST.role==='pit'\\)\\s*ST.useDH=true/.test(runWeek.toString())"),
    '투수만 고르면 지명타자를 쓴다 — 타석에 안 선다');
  T(ev("/ST.role==='two'\\)\\s*ST.useDH=false/.test(runWeek.toString())"),
    '이도류면 지명타자를 안 쓴다 — 수비에 들어간다');
  T(ev("typeof posRivalFor==='function'"), '자리 경쟁을 재는 길이 있다');
  T(ev("(function(){ST.bat={ksh:{pa:5,ab:5,h:0}};return posRivalFor('SS')===null;})()"),
    '스무 타석 전에는 자리를 안 뺏는다 — 기회는 준다');
  T(ev("(function(){ST.bat={ksh:{pa:30,ab:30,h:9}};return posRivalFor('SS')===null;})()"),
    '3할을 치면 내 자리다');
  T(ev("/myPosTaken/.test(coachNoteFor.toString())"),
    '뺏겼으면 누구한테 뺏겼는지 화면에 적는다 (「감독이 땜빵 준거 맞지?」)');

  console.log('\n[교체당했을 때]');
  T(ev("/바로 결과만 본다/.test(renderBenched.toString())"),
    '남은 경기를 볼지 결과만 볼지 고른다');
  T(ev("/시즌 /.test(renderBenched.toString())"),
    '왜 뺐는지에 숫자를 붙인다');

  console.log('\n[역할 면담]');
  T(ev("typeof rollRoleTalk==='function' && typeof thinPosFor==='function'"),
    '감독이 방향을 제안하는 줄기가 있다');
  T(ev(`(function(){
      ST.roleTalk=null; ST.roleTalkAt=-99; ST.role='two';
      ST.schedule.forEach(function(x,i){ x.played=(i<6); });
      ST.bat={ksh:{pa:20,ab:20,h:3}}; ST.pit={ksh:{outs:15,er:20}};
      rollRoleTalk();
      return !!(ST.roleTalk && ST.roleTalk.kind==='two');
    })()`), '이도류인데 둘 다 안 되면 「하나만 하자」 고 부른다');
  T(ev(`(function(){
      ST.roleTalk=null; ST.roleTalkAt=-99; ST.role='pit'; ST.pitRole=null;
      ST.bat={ksh:{pa:20,ab:20,h:8}}; ST.pit={ksh:{outs:18,er:6}};
      rollRoleTalk();
      return !!(ST.roleTalk && ST.roleTalk.kind==='pit');
    })()`), '투수면 선발이냐 중계냐를 묻는다');
  T(ev("/pitRole==='rp'/.test(sanitizeRotation.toString())"),
    '중계를 고르면 로테이션에서 두 번째다 — 선발이 내려가면 올라간다');
  T(ev("(function(){ST.myPos='SS';var a=thinPosFor('ksh');return !!a && a!=='SS';})()"),
    '제일 얇은 자리를 골라서 권한다');

  console.log('\n[고교·2군 주루]');
  T(ev("/_lastRunPA/.test(hsRunLive.toString())"),
    '고교에서도 리드·도루가 뜬다 (「고교라서 안나오나」)');
  T(ev("/_lastRunPA/.test(farmRunLive.toString())"), '2군도 마찬가지다');
  T(ev("/LIVE.pending \\|\\| LIVE.paSeq!==LIVE._lastDefPA/.test(hsRunLive.toString())"),
    '포수 송구 창(pending)을 고교 진행이 안 놓친다');

  /* ---------------------------------------------------------------
     [요청] "부상당하면 스탯이 확내려갔다가 경기뛰면서 차근차근 다시
             스탯 복구되게"
     --------------------------------------------------------------- */
  console.log('\n[부상 — 확 꺼지고 뛰면서 돌아온다]');
  T(ev("INJ_SCAR_MULT>2 && INJ_HEAL_GAMES>=5"),
    '자국이 깊어지고 여러 경기에 걸쳐 아문다');
  T(ev("/파워 -10.4/.test(injHitText({pow:-4}))"),
    '화면에 적는 값이 실제로 깎이는 값이다 (표의 -4 가 아니라 -10.4)');
  T(ev(`(function(){
      var p=TBYID['wwzw'].players.find(function(x){return x.id==='ksh'});
      ST.playerId='ksh'; MYID='ksh'; ST.mode='player';
      p.pow=60; ST.injScar={};
      applyInjuryHit('ksh',{hit:{pow:-4}});
      return Math.abs(p.pow-49.6)<0.05 && ST.injScar.pow
             && Math.abs(ST.injScar.pow.left-10.4)<0.05;
    })()`), '파워 60 이 49.6 으로 확 꺼지고, 10.4 를 빚으로 들고 있는다');
  T(ev(`(function(){
      var p=TBYID['wwzw'].players.find(function(x){return x.id==='ksh'});
      var steps=0;
      while(injScarLeft().length && steps++<40) healInjScar();
      return steps<=INJ_HEAL_GAMES+1 && Math.abs(p.pow-60)<0.15
             && injScarLeft().length===0;
    })()`), '일곱 경기를 뛰면 60 으로 딱 돌아온다');
  T(ev(`(function(){
      /* 바닥에 걸리면 빚도 그만큼만 진다 — 갚을 때 원래보다 높아지면 안 된다 */
      var p=TBYID['wwzw'].players.find(function(x){return x.id==='ksh'});
      p.spd=10; ST.injScar={};
      applyInjuryHit('ksh',{hit:{spd:-3}});
      var owed=ST.injScar.spd?ST.injScar.spd.left:0;
      var steps=0;
      while(injScarLeft().length && steps++<40) healInjScar();
      var ok=Math.abs(p.spd-10)<0.15 && owed===2;
      p.spd=60;
      return ok;
    })()`), '바닥(8)에 걸려 2 만 깎였으면 2 만 돌려준다');
  T(ev("/healInjScar/.test(farmLiveEnd.toString())"),
    '2군에서 뛴 것도 경기로 친다');
  T(ev("normalizeState.toString().indexOf('injScar')>0"),
    '옛 세이브에도 장부가 생긴다');

  console.log('\n[예외]');
  T(jsErr.length===0, '콘솔 예외 없음 :: '+(jsErr[0]||'없음'));
  console.log(fail? `\n❌ ${fail}개 실패` : '\n✅ 이상 없음');
  process.exit(fail?1:0);
})();
