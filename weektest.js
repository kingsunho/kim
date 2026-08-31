/* 주간 리그 — 같은 판을 다 같이 돈다

   팀원 열넷이 각자 폰에서 따로 돌리고 끝나는 게 문제였다.
   매주 같은 상대·같은 공을 주고, 결과를 짧은 코드로 주고받는다.
   서버는 안 쓴다.

   여기서 지키는 것 —
     · 같은 주에는 누가 열어도 같은 조건이 나온다 (달력 기준)
     · 같은 라인업으로 다시 돌리면 **같은 결과**다 (새로고침으로 못 돌린다)
     · 라인업을 바꾸면 결과가 달라진다 (그게 이 모드의 퍼즐이다)
     · 코드가 왕복하고, 손대면 막힌다                                */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|Not implemented/.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n);if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};

setTimeout(async()=>{
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300);

  console.log('[주차 — 달력 기준]');
  const n=ev("wkNo()");
  console.log('   지금 '+n+'주차 · '+ev("wkSetup(wkNo()).oppName"));
  T('주차가 0 이상이다', ()=>n>=0);
  T('월요일 0시에 넘어간다', ()=>{
    /* 2026-01-05(월) 0시가 0주차의 시작이다 */
    const a=ev("wkNo(Date.UTC(2026,0,5,0,0,0)-9*3600*1000)");
    const b=ev("wkNo(Date.UTC(2026,0,11,23,0,0)-9*3600*1000)");
    const c=ev("wkNo(Date.UTC(2026,0,12,0,0,0)-9*3600*1000)");
    return a===0 && b===0 && c===1;
  });
  T('주마다 조건이 바뀐다', ()=>{
    const o=[];
    for(let k=n;k<n+8;k++) o.push(ev("wkSetup("+k+").opp"));
    return new Set(o).size>=5;
  });
  T('같은 주는 몇 번을 열어도 같다', ()=>
    ev("JSON.stringify(wkSetup(7))")===ev("JSON.stringify(wkSetup(7))"));

  console.log('\n[같은 공 — 새로고침으로 못 돌린다]');
  ev("ST.lineup=recommendLineup(); optimizePositions(); ST.rotation=recommendRotation();");
  const a1=ev("JSON.stringify(wkPlay(wkNo()))");
  const a2=ev("JSON.stringify(wkPlay(wkNo()))");
  console.log('   두 번 돌린 결과: '+a1+' / '+a2);
  T('같은 라인업이면 결과가 같다', ()=>a1===a2 && a1!=='null');
  const b1=ev("(function(){ST.lineup=ST.lineup.slice().reverse();return JSON.stringify(wkPlay(wkNo()))})()");
  console.log('   타순을 뒤집으면: '+b1);
  T('라인업을 바꾸면 결과가 달라진다', ()=>b1!==a1);
  ev("ST.lineup=recommendLineup(); optimizePositions();");
  T('되돌리면 원래 결과로 돌아온다', ()=>ev("JSON.stringify(wkPlay(wkNo()))")===a1);

  console.log('\n[점수]');
  const sc=(o)=>ev("wkScore("+JSON.stringify(o)+")");
  const win=sc({us:5,them:3,h:8,hr:0}), big=sc({us:9,them:3,h:12,hr:1}),
        tie=sc({us:4,them:4,h:9,hr:0}), lose=sc({us:2,them:7,h:4,hr:0});
  console.log('   5:3='+win+' · 9:3='+big+' · 4:4='+tie+' · 2:7='+lose);
  T('이기는 게 제일 크다', ()=>win>tie && tie>lose);
  T('같은 승리면 크게 이긴 쪽이 위다', ()=>big>win);
  T('져도 점수는 남는다 — 잘 싸운 게 보인다', ()=>sc({us:6,them:7,h:11,hr:0})>lose);

  console.log('\n[코드]');
  const r0={us:7,them:4,h:11,hr:1};
  const code=ev("wkEncode(12,'송승민',"+JSON.stringify(r0)+")");
  console.log('   '+code);
  T('짧다 (30자 아래)', ()=>code.length<30);
  T('왕복한다', ()=>{
    const b=JSON.parse(ev("JSON.stringify(wkDecode("+JSON.stringify(code)+"))"));
    return b && b.n===12 && b.name==='송승민' && b.us===7 && b.them===4 && b.h===11 && b.hr===1;
  });
  T('점수를 손대면 막힌다', ()=>
    ev("wkDecode("+JSON.stringify(code.replace('-7-4-','-99-0-'))+")")===null);
  T('이름을 손대면 막힌다', ()=>
    ev("wkDecode("+JSON.stringify(code.replace('송승민','이건'))+")")===null);
  T('아무 글자나 넣으면 안 읽힌다', ()=>ev("wkDecode('그냥 잡담')")===null);
  T('앞뒤에 말이 붙어 있어도 읽는다', ()=>!!ev("wkDecode('나 이거 나옴 ㅋㅋ "+code+" 어때')"));

  console.log('\n[화면]');
  w.go('weekly'); await wait(150);
  const txt=()=>(d.querySelector('#view')||{}).textContent||'';
  T('이번 주 조건이 보인다', ()=>/이번 주 대결/.test(txt()) && /상대/.test(txt()) && /구장/.test(txt()));
  T('순위표가 있다', ()=>/순위표/.test(txt()));
  const go1=[...d.querySelectorAll('#view .btn')].find(b=>/붙어본다|다시 붙는다/.test(b.textContent));
  T('도전 버튼이 있다', ()=>!!go1);
  if(go1){ go1.click(); await wait(200); }
  T('한 판 하면 기록이 남는다', ()=>/점수 /.test(txt()) && /번 해봤다/.test(txt()));
  T('복사할 코드가 나온다', ()=>/WWZW\d+-/.test(txt()));
  T('순위표에 내가 올라간다', ()=>/나/.test(txt()));

  console.log('\n[남의 코드 넣기]');
  const nn=ev("wkNo()");
  const c2=ev("wkEncode("+nn+",'이건',{us:20,them:0,h:25,hr:3})");
  const c3=ev("wkEncode("+nn+",'김선호',{us:1,them:9,h:3,hr:0})");
  const ta=d.querySelector('#view .wk-in');
  T('붙여넣는 칸이 있다', ()=>!!ta);
  if(ta){
    ta.value=c2+'\n'+c3+'\n그냥잡담';
    const add=[...d.querySelectorAll('#view .btn')].find(b=>/코드 넣기/.test(b.textContent));
    if(add){ add.click(); await wait(200); }
  }
  T('두 명이 순위표에 들어간다', ()=>/이건/.test(txt()) && /김선호/.test(txt()));
  T('제일 잘한 사람이 맨 위다', ()=>{
    const rows=[...d.querySelectorAll('#view .wk-row .wk-n')].map(x=>x.textContent.replace(/\s|나$/g,''));
    return rows[0]==='이건';
  });
  T('제일 못한 사람이 맨 아래다', ()=>{
    const rows=[...d.querySelectorAll('#view .wk-row .wk-n')].map(x=>x.textContent.replace(/\s|나$/g,''));
    return rows[rows.length-1]==='김선호';
  });
  T('지난 주 코드는 안 들어간다', ()=>{
    const old=ev("wkEncode("+(nn-1)+",'우진혁',{us:30,them:0,h:40,hr:9})");
    const ta2=d.querySelector('#view .wk-in');
    if(!ta2) return false;
    ta2.value=old;
    const add2=[...d.querySelectorAll('#view .btn')].find(b=>/코드 넣기/.test(b.textContent));
    if(add2) add2.click();
    return !/우진혁/.test(txt());
  });

  console.log('\n[홈에서 들어갈 수 있나]');
  w.go('start'); await wait(150);
  T('메인 화면에 이번 주 대결이 있다', ()=>/이번 주 대결/.test(txt()));

  console.log('\n[예외]');
  T('콘솔 예외 없음', ()=>errs.filter(x=>typeof x==='string'&&/Error|not a function|not defined/.test(x)).length===0);

  console.log(errs.length?'\n실패 '+errs.length+'개':'\n전부 통과');
  if(errs.length){console.log(errs.join('\n'));process.exit(1);}
  process.exit(0);
},1500);
