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

  console.log('\n[예외]');
  T('콘솔 예외 없음', ()=>errs.filter(x=>typeof x==='string'&&/Error|not a function|not defined/.test(x)).length===0);

  console.log(errs.length?'\n실패 '+errs.length+'개':'\n전부 통과');
  if(errs.length){console.log(errs.join('\n'));process.exit(1);}
  process.exit(0);
},1500);
