/* 「그날」 하루를 산다 · 평판 — 게임이 나를 캐릭터로 만든다

   [문제] 카톡·불참·차·컨디션·회식은 다 만들어놨는데 메뉴에 흩어져 있었다.
   「이번 주 시작」을 누르면 결과가 쏟아지고 나는 읽기만 했다. 고를 게 없었다.
   [문제] 내가 뭘 해도 세상이 똑같았다. 번트를 백 번 대든 한 번도 안 대든
   상대는 몰랐다. 그건 시뮬레이터지 게임이 아니다.                     */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|Not implemented/.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n);if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const txt=()=>(d.querySelector('#view')||{}).textContent||'';

setTimeout(async()=>{
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300);

  console.log('[하루를 끝까지 걷는다]');
  w.go('home'); await wait(120);
  const b0=[...d.querySelectorAll('#view .btn')].find(x=>/오늘을 시작한다/.test(x.textContent));
  T('「오늘을 시작한다」로 들어간다', ()=>!!b0);
  if(b0){ b0.click(); await wait(200); }
  const rain=/우천|취소/.test(txt());
  const seen=[];
  for(let i=0;i<6;i++){
    const opts=[...d.querySelectorAll('#view .day-opt span')].map(x=>x.textContent);
    if(!opts.length) break;
    seen.push((txt().match(/\d\d:\d\d · [가-힣]+/)||['?'])[0]);
    d.querySelectorAll('#view .day-opt')[0].click(); await wait(140);
  }
  console.log('   거친 마디: '+seen.join(' → '));
  /* 우천 취소면 하루가 없다 — 그건 정상이라 건너뛴다 */
  T('네 마디를 거친다 (아침·단톡방·차·구장)', ()=>rain||seen.length===4);
  T('시간 순서다', ()=>rain||(/07:20/.test(seen[0]) && /11:40/.test(seen[3])));
  T('하루가 끝난다', ()=>rain||ev("!!(ST.day&&ST.day.done)"));
  T('고른 것이 로그로 남는다', ()=>rain||ev("((ST.day&&ST.day.log)||[]).length")===4);
  T('하루가 끝나면 홈이 경기 준비를 보여준다', ()=>{
    w.go('home'); return !/오늘을 시작한다|이어서 간다/.test(txt());
  });

  console.log('\n[고른 것이 실제로 남나]');
  T('아침 선택이 컨디션을 움직인다', ()=>{
    ev("dayReset(); ST.cond[ST.playerId||MYID]=70;");
    w.go('day'); 
    const before=ev("ST.cond[ST.playerId||MYID]");
    const opts=[...d.querySelectorAll('#view .day-opt')];
    opts[1].click();                       // 스트레칭
    return ev("ST.cond[ST.playerId||MYID]")>before;
  });
  T('차에 태우면 그쪽 컨디션과 친밀도가 오른다', ()=>{
    ev("dayReset(); ST.day.step=2;");
    w.go('day');
    const rid=ev(`(function(){const r=dayRiders();return r.length?r[0].id:null})()`);
    if(!rid) return true;
    ev("ST.cond['"+rid+"']=70; ST.bond=ST.bond||{}; ST.bond['"+rid+"']=50;");
    const o=[...d.querySelectorAll('#view .day-opt')];
    if(!o.length) return false;
    o[0].click();
    return ev("ST.cond['"+rid+"']")>70 && ev("ST.bond['"+rid+"']")>50;
  });
  T('전화를 돌리면 「인간적」이 쌓인다', ()=>{
    ev(`(function(){
      dayReset(); ST.day.step=1;
      ST.rep={games:0,bunt:0,steal:0,hook:0,anger:0,calm:0,care:0,starts:{}};
      ST.absent={}; const p=TBYID['wwzw'].players[3]; ST.absent[p.id]='테스트';
    })()`);
    w.go('day');
    const o=[...d.querySelectorAll('#view .day-opt')];
    if(!o.length) return false;
    o[0].click();
    return ev("ST.rep.care")>0;
  });

  console.log('\n[설정에서 끌 수 있나]');
  ev("ST.dayMode=false");
  T('끄면 하루가 안 뜬다', ()=>ev("dayOn()")===false && ev("dayPending()")===false);
  ev("ST.dayMode=true");
  T('켜면 다시 뜬다', ()=>ev("dayOn()")===true);

  console.log('\n[평판 — 세상이 반응한다]');
  ev(`(function(){
    ST.rep={games:20,bunt:22,steal:22,hook:40,anger:16,calm:2,care:30,starts:{}};
    TBYID['wwzw'].players.forEach((p,i)=>{ ST.rep.starts[p.id]= i<5?20:2; });
  })()`);
  const tags=ev("repTags().map(x=>x.k).join(',')").split(',').filter(Boolean);
  console.log('   붙은 평판: '+tags.join(' · '));
  T('번트를 자주 대면 「번트왕」', ()=>tags.indexOf('번트왕')>=0);
  T('도루를 자주 시키면 「뛰는 야구」', ()=>tags.indexOf('뛰는 야구')>=0);
  T('화를 자주 내면 「다혈질」', ()=>tags.indexOf('다혈질')>=0);
  T('쓰는 사람만 쓰면 「편애」', ()=>tags.indexOf('편애')>=0);
  T('챙기면 「인간적」', ()=>tags.indexOf('인간적')>=0);

  console.log('   배수: 번트 '+ev("repMul('bunt')")+' · 도루 '+ev("repMul('steal')")
    +' · 심판 '+ev("repMul('ump')")+' · 출석 '+ev("repMul('attend')")+' · 불만 '+ev("repMul('unhappy')"));
  T('번트가 안 먹게 된다', ()=>ev("repMul('bunt')")<1);
  T('도루가 안 먹게 된다', ()=>ev("repMul('steal')")<1);
  T('심판이 곱게 안 본다', ()=>ev("repMul('ump')")>1);
  T('출석이 오른다', ()=>ev("repMul('attend')")>1);
  T('벤치 불만이 빨리 쌓인다', ()=>ev("repMul('unhappy')")>1);

  T('아무것도 안 했으면 아무 평판도 없다', ()=>{
    ev("ST.rep={games:0,bunt:0,steal:0,hook:0,anger:0,calm:0,care:0,starts:{}}");
    return ev("repTags().length")===0 && ev("repMul('bunt')")===1;
  });
  T('평판이 실제 확률에 붙어 있다', ()=>
    /repMul\('bunt'\)/.test(ev("LiveGame.prototype.buntResult.toString()")) &&
    /repMul\('ump'\)/.test(ev("LiveGame.prototype.maybeBadCall.toString()")) &&
    /repMul\('steal'\)/.test(ev("LiveGame.prototype.stepPA.toString()")));

  console.log('\n[화면에 깐다]');
  ev(`(function(){
    ST.rep={games:20,bunt:22,steal:0,hook:10,anger:0,calm:9,care:30,starts:{}};
    TBYID['wwzw'].players.forEach(p=>{ ST.rep.starts[p.id]=10; });
    dayReset(); ST.day.done=true;
  })()`);
  w.go('home'); await wait(150);
  T('홈에 「너는 이런 감독이다」가 뜬다', ()=>/너는 이런 감독이다/.test(txt()));
  T('무엇 때문에 붙었는지 적혀 있다', ()=>/툭하면 번트/.test(txt()));
  T('뭐가 달라지는지도 적혀 있다', ()=>/상대가 번트를 대비한다/.test(txt()));

  console.log('\n[조사]');
  /* [주의] josa 는 신문용으로 이미 있던 함수다. (w, ['을','를']) 로 부른다.
     같은 이름으로 하나 더 만들었다가 뒤엣것한테 먹혔다. */
  T('josa 는 한 번만 선언돼 있다', ()=>
    (require('fs').readFileSync('index.html','utf8').match(/function josa\(/g)||[]).length===1);
  T('받침이 있으면 을 · 없으면 를', ()=>
    ev("josa('김인규',['을','를'])")==='를' && ev("josa('송승민',['을','를'])")==='을');
  T('한글이 아니면 뒤엣것', ()=>ev("josa('A',['을','를'])")==='를');

  console.log('\n[저녁 — 경기가 끝나야 하루가 닫힌다]');
  ev(`(function(){
    if(!ST.weekDone) runWeek();
    ST.budget=200; ST.mgr=null;
    daySlot().done=true; nightOpen();
    ST.glog=[{us:3,them:7,line:{}}];
    const ps=TBYID['wwzw'].players;
    ST.unhappy={}; ST.unhappy[ps[4].id]={level:2,streak:0};
    ST.rep={games:0,bunt:0,steal:0,hook:0,anger:0,calm:0,care:0,starts:{}};
  })()`);
  w.go('home'); await wait(140);
  T('홈에 저녁 카드가 뜬다', ()=>/오늘 저녁/.test(txt()));
  const nb=[...d.querySelectorAll('#view .btn')].find(x=>/저녁으로/.test(x.textContent));
  T('저녁으로 들어간다', ()=>!!nb);
  if(nb){ nb.click(); await wait(160); }
  T('경기 끝 마디가 나온다', ()=>/14:30/.test(txt()));
  T('회식 · 헤어짐 · 둘이 한잔 세 갈래다', ()=>{
    const o=[...d.querySelectorAll('#view .day-opt span')].map(x=>x.textContent).join('|');
    return /회식 간다/.test(o) && /그냥 헤어진다/.test(o) && /둘이 한잔/.test(o);
  });
  /* 진 경기라 「한소리 한다」가 떠야 한다 — 평판 「다혈질」이 붙을 유일한 자리다 */
  d.querySelectorAll('#view .day-opt')[1].click(); await wait(150);
  T('밤 마디로 넘어간다', ()=>/23:00/.test(txt()));
  T('졌으면 「한소리 한다」가 있다', ()=>
    [...d.querySelectorAll('#view .day-opt span')].some(x=>/한소리/.test(x.textContent)));
  const angryBtn=[...d.querySelectorAll('#view .day-opt')]
    .find(b=>/한소리/.test(b.textContent));
  if(angryBtn) angryBtn.click(); await wait(150);
  T('화를 내면 「anger」가 쌓인다 — 여기 말고는 오를 자리가 없다', ()=>ev("ST.rep.anger")>0);
  T('저녁이 닫힌다', ()=>ev("!!(ST.day&&ST.day.ndone)"));
  T('저녁 로그가 남는다', ()=>ev("((ST.day&&ST.day.nlog)||[]).length")===2);
  T('이겼으면 「한소리 한다」가 안 뜬다', ()=>{
    ev("daySlot().ndone=false; ST.day.night=1; ST.glog=[{us:9,them:1,line:{}}];");
    w.go('day');
    return ![...d.querySelectorAll('#view .day-opt span')].some(x=>/한소리/.test(x.textContent));
  });

  console.log('\n[매니저 — 도와주는 사람]');
  ev("ST.mgr=null; ST.budget=200;");
  w.go('mgr'); await wait(150);
  T('영입 화면이 뜬다', ()=>/매니저를 구한다/.test(txt()));
  T('후보가 셋이다', ()=>(txt().match(/기록형|살림형|눈치형/g)||[]).length===3);
  T('선수가 아니라고 못 박는다', ()=>/선수가 아니다/.test(txt()));
  const b1=[...d.querySelectorAll('#view .btn')].find(x=>/이 사람으로/.test(x.textContent));
  if(b1) b1.click(); await wait(100);
  T('이름을 안 적으면 안 뽑힌다', ()=>ev("ST.mgr")===null);
  const inp=d.querySelector('#view .mgr-in');
  if(inp) inp.value='유나';
  const bs=[...d.querySelectorAll('#view .btn')].filter(x=>/이 사람으로/.test(x.textContent));
  if(bs[1]) bs[1].click(); await wait(150);
  T('이름을 적으면 합류한다', ()=>ev("mgrHas()")===true);
  T('돈이 나간다', ()=>ev("ST.budget")===200-ev("MGR_COST"));
  T('살림형은 회복을 올린다', ()=>ev("mgrMul('cond')")>1);
  T('살림형은 장비 사고를 줄인다', ()=>ev("mgrMul('gear')")<1);
  T('보유 화면에 뭘 해주는지 나온다', ()=>{ w.go('mgr'); return /뭘 해주고 있나/.test(txt()); });
  T('같이 다니면 는다', ()=>{
    const a=ev("ST.mgr.s.care");
    ev("for(let i=0;i<60;i++) mgrGrow();");
    return ev("ST.mgr.s.care")>=a && ev("ST.mgr.g")===60;
  });
  T('88 을 넘지 않는다', ()=>{
    ev("ST.mgr.s={rec:88,care:88,eye:88}; for(let i=0;i<40;i++) mgrGrow();");
    return ev("Math.max(ST.mgr.s.rec,ST.mgr.s.care,ST.mgr.s.eye)")<=88;
  });
  T('주급이 매주 나간다', ()=>{
    ev("ST.budget=100; ST.mgr={name:'유나',k:'car',s:{rec:36,care:64,eye:42},g:0}; runWeek();");
    return ev("ST.budget")<=100-ev("MGR_KEEP") && ev("mgrHas()");
  });
  T('돈이 없으면 그만둔다', ()=>{
    ev("ST.budget=1; runWeek();");
    /* runWeek 이 notices 를 events 로 옮긴다 — 「이번 주 소식」에 뜬다 */
    return !ev("mgrHas()") &&
      ev("((ST.events||[]).concat(ST.notices||[])).some(n=>/그만뒀다/.test(n.title||''))");
  });
  T('매니저가 있으면 단톡방에서 대신 돌린다', ()=>{
    ev(`(function(){
      ST.budget=200; ST.mgr={name:'유나',k:'eye',s:{rec:38,care:42,eye:70},g:3};
      dayReset(); ST.day.step=1; ST.absent={};
      ST.absent[TBYID['wwzw'].players[2].id]='야근';
    })()`);
    w.go('day');
    return [...d.querySelectorAll('#view .day-opt span')].some(x=>/유나에게 맡긴다/.test(x.textContent));
  });
  T('맡기면 내 컨디션이 안 깎인다', ()=>{
    const me=ev("ST.playerId||MYID");
    ev("ST.cond['"+me+"']=70;");
    d.querySelectorAll('#view .day-opt')[0].click();
    return ev("ST.cond['"+me+"']")===70;
  });
  T('매니저가 없으면 예전처럼 내가 돌린다', ()=>{
    ev(`(function(){
      ST.mgr=null; dayReset(); ST.day.step=1; ST.absent={};
      ST.absent[TBYID['wwzw'].players[2].id]='야근';
    })()`);
    w.go('day');
    return [...d.querySelectorAll('#view .day-opt span')].some(x=>/^전화를 돌린다$/.test(x.textContent));
  });
  T('매니저가 없으면 배수가 전부 1', ()=>
    ev("ST.mgr=null; mgrMul('cond')")===1 && ev("mgrMul('gear')")===1 && ev("mgrCallOdds()")===0);

  console.log('\n[예외]');
  T('콘솔 예외 없음', ()=>errs.filter(x=>typeof x==='string'&&/Error|not a function|not defined/.test(x)).length===0);

  console.log(errs.length?'\n실패 '+errs.length+'개':'\n전부 통과');
  if(errs.length){console.log(errs.join('\n'));process.exit(1);}
  process.exit(0);
},1500);
