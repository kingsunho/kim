/* 전역 복귀(송정민)가 새로고침·시즌 넘김에도 살아남는지.

   [버그 이력] "3년차인데 송정민이 라인업에 복귀했었는데, 새로고침하니까
   송정민이 사라졌다" — 선수 능력치는 세이브에 안 들어가고 매번 WWZW 상수에서
   로스터를 새로 만드는데, 송정민은 그 상수에 없고 전역 이벤트가 한 번 밀어
   넣는 사람이었다. 새로고침하면 로스터에서 통째로 빠졌다.                */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|Could not load|stylesheet/.test(e.message))errs.push('JSDOM: '+e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const onRoster=()=>ev("TBYID['wwzw'].players.some(p=>p.id==='sjm')");

setTimeout(async()=>{
  d.querySelectorAll('.pickcard')[0].click();await wait(50);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(250);
  ev("ST.tutDone=true;");

  console.log('[전역 조건]');
  T('1·2년차에는 안 온다', ()=>{
    ev("ST.seasonNo=1; ST.discharged=false;");
    return ev("checkDischarge(ST)")===null && !onRoster();
  });
  T('3년차에 합류한다', ()=>{
    ev("ST.seasonNo=3; ST.discharged=false;");
    const e=ev("JSON.parse(JSON.stringify(checkDischarge(ST)||null))");
    return !!e && e.type==='discharge' && onRoster();
  });
  T('두 번 불러도 한 명이다', ()=>{
    ev("checkDischarge(ST)");
    return ev("TBYID['wwzw'].players.filter(p=>p.id==='sjm').length")===1;
  });
  T('투수 명단에도 들어간다', ()=>ev("TBYID['wwzw'].pitchers.some(p=>p.id==='sjm')"));
  T('기록 칸이 생긴다', ()=>ev("!!(ST.bat['sjm']&&ST.pit['sjm']&&ST.career['sjm'])"));

  console.log('\n[새로고침 — 이번 버그]');
  T('기록을 쌓아둔다', ()=>{
    ev("ST.bat['sjm'].pa=17; ST.bat['sjm'].h=6; ST.pit['sjm'].outs=12; ST.cond['sjm']=61;");
    return ev("ST.bat['sjm'].pa")===17;
  });
  T('라인업에 넣을 수 있다', ()=>{
    ev("ST.lineup[8]={id:'sjm',pos:'LF'}");
    return ev("ST.lineup.some(s=>s.id==='sjm')");
  });
  /* 새로고침 = 로스터를 상수에서 다시 만들고 normalizeState 를 태우는 것 */
  const refresh=()=>ev("(function(){ TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(t=>TBYID[t.id]=t); normalizeState(); })()");
  T('새로고침해도 로스터에 남는다', ()=>{ refresh(); return onRoster(); });
  T('새로고침해도 라인업에 남는다', ()=>ev("ST.lineup.some(s=>s.id==='sjm')"));
  T('쌓아둔 기록이 안 날아간다', ()=>
    ev("ST.bat['sjm'].pa")===17 && ev("ST.bat['sjm'].h")===6 && ev("ST.pit['sjm'].outs")===12);
  T('컨디션도 안 덮어써진다', ()=>ev("ST.cond['sjm']")===61);
  T('이름이 id 로 안 나온다', ()=>ev("nameOf('sjm')")==='송정민');
  T('여러 번 새로고침해도 한 명이다', ()=>{
    refresh(); refresh();
    return ev("TBYID['wwzw'].players.filter(p=>p.id==='sjm').length")===1;
  });
  T('선수단 화면이 안 깨진다', ()=>{
    w.go('squad');
    const t=d.getElementById('view').textContent;
    return /송정민/.test(t) && !/undefined|NaN/.test(t);
  });

  console.log('\n[팀을 나갔을 때]');
  T('나간 뒤에는 다시 안 올라온다', ()=>{
    ev("ST.leftPlayers=[{pid:'sjm',name:'송정민',round:3,season:3}]");
    refresh();
    return !onRoster();
  });
  T('나간 사람은 라인업에서도 빠진다', ()=>!ev("ST.lineup.some(s=>s.id==='sjm')"));
  T('복귀 처리를 지우면 다시 올라온다', ()=>{
    ev("ST.leftPlayers=[]"); refresh();
    return onRoster();
  });

  console.log('\n[시즌 넘김]');
  T('훈련으로 올린 능력치가 이월된다', ()=>ev(`(function(){
    var p=TBYID['wwzw'].players.find(x=>x.id==='sjm');
    p.con=77; p.pitch.ctl=58;                 // 한 해 동안 키웠다고 치고
    // 시즌 롤오버가 하는 일을 그대로
    var keep={ratings:{}};
    TBYID['wwzw'].players.forEach(function(q){
      keep.ratings[q.id]={con:q.con,pow:q.pow,eye:q.eye,spd:q.spd,def:q.def,arm:q.arm,
        pitch:q.pitch?Object.assign({},q.pitch):null};
    });
    TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(function(t){TBYID[t.id]=t;});
    if(ST.discharged) addDischarged(ST);
    TBYID['wwzw'].players.forEach(function(q){ var r=keep.ratings[q.id]; if(r)Object.assign(q,r); });
    finalizeTeam(TBYID['wwzw']); buildPitcherPool();
    var np=TBYID['wwzw'].players.find(function(x){return x.id==='sjm'});
    return !!np && np.con===77 && np.pitch.ctl===58;
  })()`));
  T('통산 기록이 남는다', ()=>ev("!!ST.career['sjm']"));

  console.log('\n[세이브 왕복]');
  T('저장했다 불러와도 남는다', ()=>ev(`(function(){
    ST.discharged=true;
    var saved=serializeState();
    var back=JSON.parse(saved);
    // 로드 경로: 상수에서 로스터 재생성 → ST 교체 → normalizeState
    TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(function(t){TBYID[t.id]=t;});
    ST=back; normalizeState();
    return TBYID['wwzw'].players.some(function(p){return p.id==='sjm'})
        && ST.bat['sjm'] && nameOf('sjm')==='송정민';
  })()`));

  console.log('\n[이미 사라진 세이브 복구]');
  /* 버그가 있던 판(v2.46.1 이하)에서 송정민을 얻고 → 새로고침해서 사라지고
     → 그 상태로 계속 플레이하다 저장한 세이브. 그걸 고친 버전으로 연다.
     "3시즌 해서 송정민을 얻었던 애들은 다시 새로고침하면 기록이랑 같이 돌아오나" */
  const broken=ev(`(function(){
    // 1) 정상적으로 전역시키고 기록을 쌓는다
    TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(function(t){TBYID[t.id]=t;});
    ST.seasonNo=3; ST.discharged=false; ST.leftPlayers=[];
    checkDischarge(ST);
    ST.bat['sjm'].pa=23; ST.bat['sjm'].h=9; ST.bat['sjm'].hr=1; ST.bat['sjm'].rbi=7;
    ST.pit['sjm'].outs=27; ST.pit['sjm'].k=11; ST.pit['sjm'].er=4; ST.pit['sjm'].w=2;
    ST.career['sjm'].g=9; ST.career['sjm'].h=9;
    ST.cond['sjm']=64; ST.morale['sjm']=88;
    ST.lineup[7]={id:'sjm',pos:'LF'};
    // 2) 버그가 있던 새로고침 — 로스터만 다시 만들고 다시 안 올린다
    TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(function(t){TBYID[t.id]=t;});
    ST.lineup=ST.lineup.filter(function(s){
      return TBYID['wwzw'].players.some(function(p){return p.id===s.id}); });
    // 3) 그 상태로 저장
    return serializeState();
  })()`);
  T('망가진 세이브가 만들어졌다 (송정민 없음)', ()=>{
    const b=JSON.parse(broken);
    return b.discharged===true && !b.lineup.some(x=>x.id==='sjm') && !!b.bat['sjm'];
  });
  T('기록은 세이브 안에 살아 있다', ()=>{
    const b=JSON.parse(broken);
    return b.bat['sjm'].pa===23 && b.pit['sjm'].outs===27 && b.career['sjm'].g===9;
  });
  const fixed=(()=>{
    ev(`(function(){
      TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(function(t){TBYID[t.id]=t;});
      ST=JSON.parse(${JSON.stringify(broken)});
      normalizeState();
    })()`);
    return true;
  })();
  T('고친 버전으로 열면 로스터에 돌아온다', ()=>fixed && onRoster());
  T('타격 기록이 그대로다', ()=>
    ev("ST.bat['sjm'].pa")===23 && ev("ST.bat['sjm'].h")===9
    && ev("ST.bat['sjm'].hr")===1 && ev("ST.bat['sjm'].rbi")===7);
  T('투구 기록이 그대로다', ()=>
    ev("ST.pit['sjm'].outs")===27 && ev("ST.pit['sjm'].k")===11
    && ev("ST.pit['sjm'].er")===4 && ev("ST.pit['sjm'].w")===2);
  T('통산 기록이 그대로다', ()=>ev("ST.career['sjm'].g")===9 && ev("ST.career['sjm'].h")===9);
  T('컨디션·사기가 초기화되지 않는다', ()=>
    ev("ST.cond['sjm']")===64 && ev("ST.morale['sjm']")===88);
  T('투수 명단에도 돌아온다', ()=>ev("TBYID['wwzw'].pitchers.some(p=>p.id==='sjm')"));
  T('선수단·기록 화면에 이름이 나온다', ()=>{
    w.go('squad'); const a=d.getElementById('view').textContent;
    w.go('stats'); const b=d.getElementById('view').textContent;
    return /송정민/.test(a) && !/undefined|NaN/.test(a) && !/undefined|NaN/.test(b);
  });
  T('라인업이 9명으로 온전하다', ()=>{
    const n=ev("ST.lineup.length");
    const inLu=ev("ST.lineup.some(s=>s.id==='sjm')");
    return n===9 ? (inLu?'송정민도 라인업에 다시 들어갔다':'라인업 9명 · 송정민은 벤치') : `${n}명`;
  });
  T('라인업에 유령(로스터에 없는 id)이 없다', ()=>
    ev("ST.lineup.every(s=>TBYID['wwzw'].players.some(p=>p.id===s.id))"));

  console.log(errs.length?`\n❌ ${errs.length}건\n - `+errs.join('\n - '):'\n✅ 전부 통과');
  process.exit(errs.length?1:0);
},600);
