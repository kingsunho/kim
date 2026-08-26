/* 영입 선수가 시즌을 넘어가는지 — [제보] "영입한 선수가 내년되면 없어져"

   선수 능력치는 세이브에 안 들어간다. 매번 상수에서 로스터를 새로 만든다.
   영입 선수는 그 상수에 없으니 **매번 다시 올려줘야** 한다.
   여기서 보는 것 네 가지 —
     · 새로고침 후에도 있나 (능력치·투수 여부 그대로)
     · 새 시즌을 넘어가나 (한 해 훈련한 것까지)
     · 원 소속팀에서 빠졌나 (양쪽에 동시에 서 있으면 안 된다)
     · 영입했다가 팀을 나간 사람이 되살아나지 않나                    */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo/.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n);if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};

/* 새로고침 = 로스터를 상수에서 다시 만들고 세이브만 들고 온다 */
const reload=()=>ev(`(function(){
  const s=JSON.parse(JSON.stringify(ST));
  TEAMS=buildAllTeams();TBYID={};TEAMS.forEach(t=>TBYID[t.id]=t);buildPitcherPool();
  ST=s; normalizeState();
})()`);
/* 새 시즌 = 시즌 종료 화면의 「새 시즌 시작」이 하는 그 순서 그대로 */
const nextSeason=()=>ev(`(function(){
  const keep={ratings:{}};
  TBYID['wwzw'].players.forEach(p=>keep.ratings[p.id]={con:p.con,pow:p.pow,eye:p.eye,
    spd:p.spd,def:p.def,arm:p.arm,pitch:p.pitch?{...p.pitch}:null});
  TEAMS=buildAllTeams();TBYID={};TEAMS.forEach(t=>TBYID[t.id]=t);
  if(ST.discharged) addDischarged(ST);
  if(typeof addSignedPlayers==='function') addSignedPlayers(ST);   // 옛 코드에는 없다
  TBYID['wwzw'].players.forEach(p=>{const r=keep.ratings[p.id]; if(r)Object.assign(p,r);});
  finalizeTeam(TBYID['wwzw']); buildPitcherPool();
  const n=(ST.seasonNo||1)+1;
  ST=newSeason(); ST.seasonNo=n;
  normalizeState();
})()`);

setTimeout(async()=>{
  d.querySelectorAll('.pickcard')[0].click();await new Promise(r=>setTimeout(r,60));
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await new Promise(r=>setTimeout(r,300));
  ev("ST.budget=99999;");

  console.log('[야수 영입]');
  const a=JSON.parse(ev(`(function(){
    const from=TBYID['pirates'];
    const src=from.players.filter(p=>!p.pitch).sort((x,y)=>y.con-x.con)[0];
    signPlayer(src, from);
    return JSON.stringify({nid:'new_'+src.id, pid:src.id, name:src.name, con:src.con});
  })()`));
  const onUs=id=>ev(`TBYID['wwzw'].players.some(p=>p.id==='${id}')`);
  T('영입 직후 로스터에 있다', ()=>onUs(a.nid));
  T('영입 명단에 적힌다', ()=>ev(`(ST.signedIds||[]).some(r=>r.nid==='${a.nid}')`));

  console.log('\n[새로고침]');
  reload();
  T('로스터에 그대로 있다', ()=>onUs(a.nid));
  T('능력치가 안 바뀐다', ()=>ev(`TBYID['wwzw'].players.find(p=>p.id==='${a.nid}').con`)===a.con);
  T('원 소속팀에서는 빠져 있다', ()=>!ev(`TBYID['pirates'].players.some(p=>p.id==='${a.pid}')`));
  const hand1=ev(`META['${a.nid}'].throws`);
  reload();
  T('던지는 손이 새로고침해도 같다', ()=>ev(`META['${a.nid}'].throws`)===hand1);

  console.log('\n[투수 영입]');
  /* 상대 팀 투수는 t.players 에 없다 — t.pitchers 에 따로 있고 스카우트 화면이
     접촉할 때 야수 모양으로 즉석에서 만들어 넘긴다. 그 경로를 그대로 흉내낸다. */
  const b=JSON.parse(ev(`(function(){
    const from=TBYID['blackcats'];
    const q=from.pitchers[0];
    const src={id:q.id,name:q.name,bats:'R',con:30,pow:25,eye:35,spd:40,def:40,arm:60,
               pos:['P'],pitch:{stf:q.stf,ctl:q.ctl,sta:q.sta}};
    signPlayer(src, from);
    return JSON.stringify({nid:'new_'+src.id, pid:src.id, stf:q.stf});
  })()`));
  T('투수를 영입할 수 있다', ()=>onUs(b.nid));
  T('원 소속팀 투수진에서 빠진다', ()=>!ev(`(TBYID['blackcats'].pitchers||[]).some(p=>p.id==='${b.pid}')`));
  reload();
  T('새로고침해도 투수다', ()=>ev(`(function(){const p=TBYID['wwzw'].players.find(p=>p.id==='${b.nid}');return !!(p&&p.pitch)})()`));
  T('구위가 그대로다', ()=>ev(`(TBYID['wwzw'].players.find(p=>p.id==='${b.nid}').pitch||{}).stf`)===b.stf);
  T('투수 명단에도 올라간다', ()=>ev(`(TBYID['wwzw'].pitchers||[]).some(p=>p.id==='${b.nid}')`));

  console.log('\n[새 시즌 — 이게 터졌던 곳이다]');
  ev(`(function(){const p=TBYID['wwzw'].players.find(p=>p.id==='${a.nid}');p.con+=9;})()`);  // 한 해 훈련했다 치고
  nextSeason();
  T('2년차에도 로스터에 있다', ()=>onUs(a.nid));
  T('훈련해서 올린 능력치가 넘어간다', ()=>ev(`TBYID['wwzw'].players.find(p=>p.id==='${a.nid}').con`)===a.con+9);
  T('시즌 기록 칸이 새로 생긴다', ()=>ev(`!!ST.bat['${a.nid}']`));
  T('영입 투수도 2년차에 있다', ()=>onUs(b.nid));
  T('원 소속팀에 되살아나지 않는다', ()=>!ev(`TBYID['pirates'].players.some(p=>p.id==='${a.pid}')`));

  nextSeason(); nextSeason();
  T('4년차까지 그대로 있다', ()=>onUs(a.nid)&&onUs(b.nid));
  reload();
  T('4년차에서 새로고침해도 있다', ()=>onUs(a.nid)&&onUs(b.nid));

  console.log('\n[영입했다가 내보내면]');
  ev(`(function(){
    ST.leftPlayers=(ST.leftPlayers||[]).concat([{pid:'${a.nid}',name:'${a.name}',to:null,why:'test'}]);
    normalizeState();
  })()`);
  T('나간 사람은 로스터에서 빠진다', ()=>!onUs(a.nid));
  nextSeason();
  T('새 시즌에 되살아나지 않는다', ()=>!onUs(a.nid));
  T('안 나간 사람은 그대로 있다', ()=>onUs(b.nid));

  console.log('\n[옛 세이브 — 명단 없이 기록만 남은 것]');
  ev(`(function(){
    delete ST.signedIds;
    TEAMS=buildAllTeams();TBYID={};TEAMS.forEach(t=>TBYID[t.id]=t);buildPitcherPool();
    normalizeState();
  })()`);
  T('타격 기록만 보고 되살린다', ()=>onUs(b.nid));
  T('명단이 만들어진다', ()=>ev(`(ST.signedIds||[]).some(r=>r.nid==='${b.nid}')`));

  console.log(errs.length?'\n실패 '+errs.length+'개':'\n전부 통과');
  if(errs.length){console.log(errs.join('\n'));process.exit(1);}
  process.exit(0);
},1500);
