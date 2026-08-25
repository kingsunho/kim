/* 자책점 규칙(공식야구규칙 9.16)과 실책 개인 기록.

   [주의] 이 저장소의 T() 는 문자열을 '통과 + 설명' 으로 친다.
   실패 사유를 문자열로 돌려주면 초록불로 나온다. 실패는 반드시 false 를 돌려라. */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|Could not load|stylesheet/.test(e.message))errs.push('JSDOM: '+e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

setTimeout(async()=>{
  console.log('[자책 판정 규칙]');
  T('실책이 없으면 자책 후보는 자책이다', ()=>
    ev("isEarned(true,'x',0,newErrLedger())")===true);
  T('자책 후보가 아니면 자책이 아니다', ()=>
    ev("isEarned(false,'x',0,newErrLedger())")===false);
  T('실책으로 살아난 주자의 득점은 비자책이다', ()=>ev(`(function(){
    var led=newErrLedger(); led.roe['x']=true;
    return isEarned(true,'x',0,led)===false && isEarned(true,'y',0,led)===true;
  })()`));
  T('이닝이 끝났어야 하면 그 뒤는 전부 비자책이다', ()=>ev(`(function(){
    var led=newErrLedger(); led.outs=1;          // 실책이 아웃 하나를 날렸다
    return isEarned(true,'y',1,led)===true       // 아웃 1 + 허수 1 = 2, 아직 진행
        && isEarned(true,'y',2,led)===false;     // 아웃 2 + 허수 1 = 3, 끝났어야 한다
  })()`));
  T('허수 아웃이 둘이면 더 일찍 끊긴다', ()=>ev(`(function(){
    var led=newErrLedger(); led.outs=2;
    return isEarned(true,'y',0,led)===true && isEarned(true,'y',1,led)===false;
  })()`));
  T('장부는 반이닝마다 비어 있다', ()=>ev(`(function(){
    var a=newErrLedger();
    return a.outs===0 && Object.keys(a.roe).length===0;
  })()`));

  console.log('\n[실책을 누구에게 다나]');
  T('라인업 안의 야수에게만 단다', ()=>ev(`(function(){
    var T2=buildAllTeams(), us=T2.find(function(t){return t.id==='wwzw'});
    var side={team:us, slots:aiLineup(us)};
    var rng=makeRng(1234);
    for(var i=0;i<400;i++){
      var fid=pickErrorFielder(side,rng);
      if(!side.slots.some(function(s){return s.id===fid})) return false;
    }
    return true;
  })()`));
  T('지명타자에게는 안 단다', ()=>ev(`(function(){
    var T2=buildAllTeams(), us=T2.find(function(t){return t.id==='wwzw'});
    var slots=aiLineup(us); slots[0]={id:slots[0].id,pos:'DH'};
    var side={team:us, slots:slots}, rng=makeRng(99);
    for(var i=0;i<400;i++){ if(pickErrorFielder(side,rng)===slots[0].id) return false; }
    return true;
  })()`));
  T('수비가 나쁠수록 더 자주 저지른다', ()=>ev(`(function(){
    // 같은 자리(유격)에 수비 30 과 수비 70 을 각각 세워서 비교
    var us={id:'t',players:[{id:'bad',def:30},{id:'good',def:70},
      {id:'a',def:50},{id:'b',def:50},{id:'c',def:50},{id:'d',def:50},
      {id:'e',def:50},{id:'f',def:50},{id:'g',def:50}]};
    function run(id){
      var slots=[{id:id,pos:'SS'},{id:'a',pos:'C'},{id:'b',pos:'1B'},{id:'c',pos:'2B'},
        {id:'d',pos:'3B'},{id:'e',pos:'LF'},{id:'f',pos:'CF'},{id:'g',pos:'RF'}];
      var rng=makeRng(555), n=0;
      for(var i=0;i<4000;i++) if(pickErrorFielder({team:us,slots:slots},rng)===id) n++;
      return n;
    }
    var bad=run('bad'), good=run('good');
    return bad>good*1.4;
  })()`));
  T('빈 라인업이면 조용히 null 을 준다', ()=>
    ev("pickErrorFielder({team:{players:[]},slots:[]},makeRng(1))")===null);

  console.log('\n[경기를 돌려서 — 불변식]');
  const sim=JSON.parse(ev(`(function(){
    var T2=buildAllTeams(); var rng=makeRng(20260825);
    var R=0,ER=0,E=0,badER=0,g=0,withErr=0,unearnedGames=0;
    for(var s=0;s<10;s++) for(var i=0;i<T2.length;i++) for(var j=0;j<T2.length;j++){
      if(i===j) continue; if(((i*31+j*17+s*7)%17)!==0) continue;
      var res=simGame(T2[j],T2[i],{rng,innings:7,
        awayLineup:aiLineup(T2[i]),awayRotation:aiRotation(T2[i]),
        homeLineup:aiLineup(T2[j]),homeRotation:aiRotation(T2[j])});
      g++;
      var gr=0,ger=0;
      for(var pid in res.pbox){ var l=res.pbox[pid];
        if(l.er>l.r) badER++;
        R+=l.r; ER+=l.er; gr+=l.r; ger+=l.er; }
      if(gr>ger) unearnedGames++;
      var ge=0;
      for(var pid2 in res.box){ ge+=res.box[pid2].e||0; }
      E+=ge; if(ge>0) withErr++;
      // 팀 실책 합계와 개인 실책 합계가 맞아야 한다
      if(ge!==(res.away.errs+res.home.errs)) return JSON.stringify({mismatch:true});
    }
    return JSON.stringify({g:g,R:R,ER:ER,E:E,badER:badER,withErr:withErr,
      unearnedGames:unearnedGames,mismatch:false});
  })()`));
  console.log(`    ${sim.g}경기 · 실점 ${sim.R} · 자책 ${sim.ER} · 비자책 ${sim.R-sim.ER} · 실책 ${sim.E}`);
  T('자책이 실점을 넘는 경우가 없다', ()=>sim.badER===0 || false);
  T('개인 실책 합계 = 팀 실책 합계', ()=>!sim.mismatch);
  T('비자책이 실제로 발생한다', ()=>sim.R>sim.ER &&
    `자책률 ${(sim.ER/sim.R*100).toFixed(1)}%`);
  T('자책률이 현실적인 범위다 (55~85%)', ()=>{
    const p=sim.ER/sim.R*100;
    return (p>=55&&p<=85) || false;
  });
  T('실책이 난 경기가 대부분이다', ()=>sim.withErr>sim.g*0.5 &&
    `${sim.withErr}/${sim.g}경기`);
  T('비자책이 난 경기가 꽤 된다', ()=>sim.unearnedGames>sim.g*0.2 &&
    `${sim.unearnedGames}/${sim.g}경기`);

  console.log('\n[중계 엔진도 같은 규칙인가]');
  d.querySelectorAll('.pickcard')[0].click();await wait(50);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(250);
  ev("ST.tutDone=true; ST.absent={}; ST.injury={};");
  ev("ST.lineup=recommendLineup(); ST.rotation=recommendRotation(); ST.weekDone=true;");
  const live=JSON.parse(ev(`(function(){
    var R=0,ER=0,E=0,bad=0,g=0;
    for(var n=0;n<26;n++){
      ST.seed=(20260825+n*7919)>>>0;
      LIVE=makeLive(); var guard=0;
      while(!LIVE.over && guard++<4000){ if(LIVE.pending)LIVE.applyDecision('change'); LIVE.step(); }
      g++;
      for(var pid in LIVE.pbox){ var l=LIVE.pbox[pid];
        if(l.er>l.r) bad++; R+=l.r; ER+=l.er; }
      for(var pid2 in LIVE.box){ E+=LIVE.box[pid2].e||0; }
    }
    return JSON.stringify({g:g,R:R,ER:ER,E:E,bad:bad});
  })()`));
  console.log(`    ${live.g}경기 · 실점 ${live.R} · 자책 ${live.ER} · 실책 ${live.E}`);
  T('중계에서도 자책 <= 실점', ()=>live.bad===0 || false);
  T('중계에서도 비자책이 생긴다', ()=>live.R>live.ER &&
    `자책률 ${(live.ER/live.R*100).toFixed(1)}%`);
  T('중계에서도 실책이 개인에게 달린다', ()=>live.E>0 && `${live.E}건`);
  T('중계 실책 장부가 반이닝마다 초기화된다', ()=>ev(`(function(){
    LIVE=makeLive();
    LIVE.errLed.outs=2; LIVE.errLed.roe['zz']=true;
    LIVE.endHalf();
    return LIVE.errLed.outs===0 && Object.keys(LIVE.errLed.roe).length===0;
  })()`));

  console.log('\n[기록으로 흘러가나]');
  T('시즌 기록에 실책이 쌓인다', ()=>ev(`(function(){
    var before=0, after=0;
    TBYID['wwzw'].players.forEach(function(p){ before+=(ST.bat[p.id]&&ST.bat[p.id].e)||0; });
    ST.seed=20260901; ST.weekDone=true; ST.announced=true; ST.lineupDirty=false; ST.events=[];
    LIVE=makeLive(); var g=0;
    while(!LIVE.over && g++<4000){ if(LIVE.pending)LIVE.applyDecision('change'); LIVE.step(); }
    var n=ST.schedule[ST.round], r=LIVE.result;
    var us=n.homeGame?r.home:r.away, th=n.homeGame?r.away:r.home;
    var gameE=0;
    TBYID['wwzw'].players.forEach(function(p){ gameE+=(r.box[p.id]&&r.box[p.id].e)||0; });
    commitGame(r,us,th,us.slots);
    TBYID['wwzw'].players.forEach(function(p){ after+=(ST.bat[p.id]&&ST.bat[p.id].e)||0; });
    return (after-before)===gameE;
  })()`));
  T('blankBat 에 실책 칸이 있다', ()=>ev("blankBat().e")===0);
  T('통산 기록에도 칸이 있다', ()=>ev("blankCareer().e")===0);

  console.log('\n[화면]');
  T('박스스코어에 실책 칸이 있다', ()=>ev(`(function(){
    // 앞 검사에서 commitGame 이 돌아 LIVE 가 비었을 수 있다 — 한 경기 새로 굴린다
    ST.weekDone=true; ST.announced=true; ST.lineupDirty=false; ST.events=[];
    LIVE=makeLive(); var gg=0;
    while(!LIVE.over && gg++<4000){ if(LIVE.pending)LIVE.applyDecision('change'); LIVE.step(); }
    var st=document.createElement('div'); st.id='stage';
    var v=document.getElementById('view'); v.innerHTML=''; v.appendChild(st);
    var dc=document.createElement('div'); dc.id='decision'; st.appendChild(dc);
    showResult();
    return document.getElementById('view').textContent.indexOf('실책')>=0;
  })()`));
  T('결과 화면에 undefined 없음', ()=>
    !/undefined|NaN/.test(d.getElementById('view').textContent));
  T('기록 화면에 실책 칸이 있다', ()=>{
    w.go('records');
    const t=d.getElementById('view').textContent;
    return /실책/.test(t) && !/undefined|NaN/.test(t);
  });
  T('선수 카드가 안 깨진다', ()=>{
    ev("openPlayerCard(ST.lineup[0].id)");
    const t=d.getElementById('sheet-body').textContent;
    ev("closeSheet()");
    return t.length>0 && !/undefined|NaN/.test(t);
  });

  console.log('\n[옛 세이브]');
  T('실책 칸이 없던 세이브도 안 깨진다', ()=>ev(`(function(){
    Object.keys(ST.bat).forEach(function(id){ delete ST.bat[id].e; });
    Object.keys(ST.career||{}).forEach(function(id){ delete ST.career[id].e; });
    normalizeState();
    go('records');
    var t=document.getElementById('view').textContent;
    return t.length>0 && t.indexOf('undefined')<0 && t.indexOf('NaN')<0;
  })()`));

  console.log(errs.length?`\n❌ ${errs.length}건\n - `+errs.join('\n - '):'\n✅ 전부 통과');
  process.exit(errs.length?1:0);
},600);
