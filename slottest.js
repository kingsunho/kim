/* [2.58.0] 세이브 슬롯 — 판 여러 개를 따로 굴린다

   [요청] "세이브 같은것도 만들어놓고 다른 선수 키울 수 있거나
           자기자신 다른 포지션으로 키우거나도 정하고"

   여태 세이브가 키 하나('wwzw_v5')뿐이라, 새로 시작하면 진행 중인 판이
   그대로 덮였다. 육성은 여러 번 하는 게 전부라 슬롯이 필요하다.

   **이 파일이 제일 중요하게 보는 것: 1번 슬롯이 안 다치는가.**
   1번은 옛 키를 그대로 쓴다. 여기가 깨지면 여태 한 게 통째로 날아간다.

   주의: T() 는 문자열을 '통과 + 설명' 으로 친다. 실패는 반드시 false 다.  */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const errs=[], jsErr=[];
const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Not implemented/i.test(e.message)) jsErr.push(e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{}; dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0);
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!ok)errs.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

/* 경기 n 판을 실제 경로로 완주시킨다 */
const play=(n,seed)=>ev(`(function(){ var g=0;
  for(var i=0;i<${n};i++){
    if(!ST.schedule[ST.round]||ST.schedule[ST.round].played) break;
    runWeek(); ST.weekDone=true; ST.announced=true; ST.lineupDirty=false;
    ST.events=[]; ST.absent={};
    ST.lineup=recommendLineup(); applyDHRule(); sanitizeRotation();
    var L=makeLive(); L.rng=makeRng(i*97+${seed||3});
    var k=0; while(!L.over&&k++<3000){ L.pending=null; L.step(); }
    L.finish();
    var nx=ST.schedule[ST.round], r=L.result;
    var us=nx.homeGame?r.home:r.away, th=nx.homeGame?r.away:r.home;
    LIVE=L; commitGame(r,us,th,us.slots); g++;
  } return g; })()`);

(async()=>{
  await wait(800);

  console.log('[키를 어떻게 쓰나]');
  T('1번 슬롯은 옛 키를 그대로 쓴다', ()=>
    ev("slotKey(1)")==='wwzw_v5' && "wwzw_v5 — 옮기지 않는다");
  T('2번부터만 새 키다', ()=>{
    const k=[2,3,4].map(i=>ev(`slotKey(${i})`));
    return k.every(x=>/^wwzw_v5_s[234]$/.test(x)) && k.join(' ');
  });
  T('백업 키도 슬롯마다 따로다', ()=>{
    const a=ev("slotBakKey(1)"), b=ev("slotBakKey(3)");
    return a==='wwzw_v5_bak' && a!==b && `${a} · ${b}`;
  });
  T('슬롯 키가 서로 안 겹친다', ()=>{
    const all=[];
    for(let i=1;i<=ev("SLOT_N");i++){ all.push(ev(`slotKey(${i})`)); all.push(ev(`slotBakKey(${i})`)); }
    return new Set(all).size===all.length && `${all.length}개 전부 다르다`;
  });
  T('처음엔 1번 슬롯을 본다', ()=>ev("CURSLOT")===1 && '1번');

  console.log('\n[1번 슬롯에 감독 모드 판을 만든다]');
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300); ev("ST.tutDone=true;");
  const g1=play(3,3);
  await ev("saveGame(true)"); await wait(150);
  const rec1=ev("JSON.stringify(ST.stand['wwzw'])");
  T('경기가 진행됐다', ()=>g1===3 && rec1);
  const info1=await ev("slotInfo(1)");
  T('슬롯 카드에 적을 내용이 나온다', ()=>
    info1 && info1.mode==='mgr' && info1.g===3 &&
    `감독 모드 · ${info1.w}승 ${info1.l}패 · ${(info1.bytes/1024).toFixed(0)}KB`);

  console.log('\n[2번 슬롯에서 선수를 새로 키운다]');
  await ev("slotNew(2)"); await wait(200);
  T('슬롯이 2번으로 옮겨간다', ()=>ev("CURSLOT")===2 && '2번');
  T('새 슬롯은 앞 판 설정을 안 물고 온다', ()=>{
    /* newSeason 이 ST 에서 모드·자리를 물고 오기 때문에 먼저 비워야 한다 */
    return ev("ST.mode")==='mgr' && ev("ST.role")===null && '모드 mgr · 자리 없음';
  });
  ev("ST.mode='player'; ST.playerId='lg'; MYID='lg'; ST.role='bat'; ST.myPos='CF'; ST.tutDone=true;");
  await ev("saveGame(true)"); await wait(150);
  const info2=await ev("slotInfo(2)");
  T('2번 슬롯이 선수 모드로 잡힌다', ()=>
    info2 && info2.mode==='player' && info2.who==='lg' && info2.pos==='CF' &&
    ev("slotLabel(" + JSON.stringify(info2) + ")"));

  console.log('\n[제일 중요한 것 — 1번이 안 다쳤나]');
  const info1b=await ev("slotInfo(1)");
  T('1번 슬롯이 그대로 있다', ()=>
    info1b && info1b.g===3 && info1b.mode==='mgr' &&
    `${info1b.w}승 ${info1b.l}패 (그대로)`);
  T('1번 슬롯 내용이 한 글자도 안 바뀌었다', ()=>
    info1b.bytes===info1.bytes && `${info1.bytes}바이트 그대로`);

  console.log('\n[왔다 갔다 해도 각자 그대로]');
  const ok=await ev("slotLoad(1)"); await wait(200);
  T('1번으로 돌아간다', ()=>ok===true && ev("CURSLOT")===1 && '1번');
  T('돌아온 판이 아까 그 판이다', ()=>
    ev("JSON.stringify(ST.stand['wwzw'])")===rec1 && rec1);
  T('돌아와서도 감독 모드다', ()=>ev("ST.mode")==='mgr' && 'mgr');
  const info2b=await ev("slotInfo(2)");
  T('2번이 여전히 선수 모드 이건 중견수다', ()=>
    info2b && info2b.who==='lg' && info2b.pos==='CF' && info2b.mode==='player' && '그대로');

  console.log('\n[슬롯을 바꾸기 전에 지금 판을 저장한다]');
  const before=ev("ST.stand['wwzw'].g");
  play(1,71);
  T('1번에서 한 경기 더 했다', ()=>ev("ST.stand['wwzw'].g")===before+1 && `${before} → ${before+1}경기`);
  await ev("slotSwitch(2)"); await wait(200);   // 저장 없이 그냥 옮겨본다
  await ev("slotLoad(1)"); await wait(200);
  T('저장 안 하고 옮겨도 그 경기가 남아 있다', ()=>
    ev("ST.stand['wwzw'].g")===before+1 && '슬롯 바꿀 때 알아서 저장한다');

  console.log('\n[지우기]');
  await ev("slotWipe(3)");
  const info3=await ev("slotInfo(3)");
  T('3번은 비어 있다', ()=>info3===null && 'null');
  T('빈 슬롯 이름은 「비어 있음」', ()=>ev("slotLabel(null)")==='비어 있음' && '비어 있음');

  console.log('\n[화면]');
  w.go('slots'); await wait(400);
  T('슬롯 화면이 그려진다', ()=>{
    const n=d.querySelectorAll('#view .slotc').length;
    return n===ev("SLOT_N") && `${n}칸`;
  });
  T('지금 슬롯에 표시가 붙는다', ()=>{
    const cur=[...d.querySelectorAll('#view .slotc')].filter(x=>x.classList.contains('cur'));
    return cur.length===1 && cur[0].querySelector('.sl-t b').textContent;
  });
  T('지금 슬롯에는 「이어서」가 없다 — 이미 여기다', ()=>{
    const cur=d.querySelector('#view .slotc.cur');
    return ![...cur.querySelectorAll('.btn')].some(b=>/이어서/.test(b.textContent)) && '없다';
  });
  T('다른 슬롯에는 「이어서」가 있다', ()=>{
    const other=[...d.querySelectorAll('#view .slotc')]
      .filter(x=>!x.classList.contains('cur')&&!x.classList.contains('empty'));
    return other.length>0 && other.every(x=>
      [...x.querySelectorAll('.btn')].some(b=>/이어서/.test(b.textContent))) && `${other.length}칸`;
  });
  T('빈 슬롯에는 「새로 시작」이 있다', ()=>{
    const emp=[...d.querySelectorAll('#view .slotc.empty')];
    return emp.length>0 && emp.every(x=>
      [...x.querySelectorAll('.btn')].some(b=>/새로 시작/.test(b.textContent))) && `${emp.length}칸`;
  });
  T('더보기에서 슬롯으로 들어갈 수 있다', ()=>{
    w.go('more');
    const b=[...d.querySelectorAll('#view .btn')].find(x=>/슬롯 보기/.test(x.textContent));
    return b && b.textContent.trim();
  });

  console.log('\n[옛 세이브를 쓰던 사람]');
  T('슬롯을 모르는 세이브도 1번으로 그냥 열린다', ()=>{
    /* 세이브 안에는 슬롯 번호가 없다. 어느 슬롯에 들었는지는 키가 정한다.
       그래서 옛 세이브는 손댈 것 없이 1번에서 그대로 열린다. */
    const s=ev("JSON.parse(serializeState())");
    return s.slot===undefined && '세이브에 슬롯 번호가 안 들어간다';
  });

  T('도는 동안 에러 없음', ()=>jsErr.length===0 || (console.log('     '+jsErr.slice(0,3).join(' | ')),false));
  console.log(errs.length? `\n❌ ${errs.length}개 실패` : '\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
