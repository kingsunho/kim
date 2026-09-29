/* 나이 · 은퇴 · 환생 — 프로 겨울을 열두 번 넘긴다.
   [v3.52.0] 그 전까지는 AI 구단 선수가 늙지도 은퇴하지도 않았다. 이제 겨울마다
     · 모든 선수 능력치가 나이 곡선대로 조금 오르내린다(백년야구식) — pfDevRoll
     · 나이 + 기록(등급)으로 은퇴한다. 큰 부상이면 베테랑은 그대로 떠난다 — pfRetireRun
     · 쓸 만했던 은퇴 선수는 그해 드래프트에 새 이름으로 다시 나온다(환생) — pfRegenPros
   확인하는 것
     · 해마다 은퇴가 나온다(너무 적지도 · 너무 많지도 않게)
     · 환생 신인이 드래프트 후보에 섞이고, 이름은 은퇴한 사람과 다르다
     · 한 겨울에 오른 사람 · 떨어진 사람 · 그대로인 사람이 다 있다
     · 열두 해가 지나도 리그 평균(1군 주전)이 한쪽으로 흘러가지 않는다 — 엔진 기준값(LG_PRO)은
       2026 명단에 맞춰 돌려서 맞춘 값이라, 평균이 크게 움직이면 득점이 무너진다
     · 1군 인원이 모자라지 않는다(은퇴한 자리는 2군에서 올라온다)
     · 세이브에 남긴 능력치(F.dev)가 불러온 뒤에도 그대로 입혀진다                        */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const bad=[];
const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Could not load|stylesheet|[Nn]ot implemented|getContext/.test(e.message)) bad.push('JSDOM: '+e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc,
  beforeParse(w){ w.scrollTo=()=>{}; w.TextEncoder=TextEncoder; w.TextDecoder=TextDecoder; }});
const w=dom.window,d=w.document,ev=s=>w.eval(s);
w.confirm=()=>true;
process.on('unhandledRejection',e=>{ console.log('  ❌ 처리 안 된 예외 :: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' | ')); process.exit(1); });
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0&&!/^!/.test(r));
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r.replace(/^!/,''):''));if(!ok)bad.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);bad.push(n+': '+e.message)}};

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300);
  ev(`ST.tutDone=true; ST.mode='player'; ST.role='bat'; ST.myPos='CF'; ST.playerId='ksh'; MYID='ksh';
      proEnter({team:'lg', round:3, pick:10, level:'1군'}); go('home');`);
  await wait(80);
  /* 리그 평균 — 팀마다 1군 타자 위 아홉 · 투수 위 열둘의 능력치 평균 */
  const lg=()=>JSON.parse(ev(`JSON.stringify((function(){
    const H=[],P=[];
    TEAMS.forEach(t=>{ t.players.filter(p=>p.id!=='ksh').sort((a,b)=>pfValue(b)-pfValue(a)).slice(0,9).forEach(p=>H.push(p));
      t.pitchers.filter(p=>p.id!=='ksh').sort((a,b)=>pfValue(b)-pfValue(a)).slice(0,12).forEach(p=>P.push(p)); });
    const m=(L,k)=>L.reduce((s,p)=>s+(p[k]||0),0)/L.length;
    return {con:m(H,'con'),pow:m(H,'pow'),eye:m(H,'eye'),stf:m(P,'stf'),ctl:m(P,'ctl'),
      minH:Math.min.apply(null,TEAMS.map(t=>t.players.length)), minP:Math.min.apply(null,TEAMS.map(t=>t.pitchers.length))};
  })())`));
  const base=lg();
  console.log('[시작] 타자 con '+base.con.toFixed(1)+' pow '+base.pow.toFixed(1)+' eye '+base.eye.toFixed(1)+' · 투수 stf '+base.stf.toFixed(1)+' ctl '+base.ctl.toFixed(1));
  const ret=[], reg=[], dist=[], hist=[];
  let regenOK=true, regenDrafted=0;
  for(let i=0;i<12;i++){
    /* 드래프트 후보를 만들면 그 전에 은퇴가 돈다 */
    const pool=JSON.parse(ev(`JSON.stringify((function(){ const D=pfRookiePool(); const F=pfState();
      return {ret:(F.retired||[]).map(r=>({n:r.name,a:r.age,g:r.g,h:!!r.hurt})), reg:D.list.filter(x=>x.regen).map(x=>({n:x.p.name,of:x.regen}))}; })())`));
    ret.push(pool.ret); reg.push(pool.reg);
    if(pool.reg.some(x=>x.n===x.of)) regenOK=false;
    /* 겨울 전 능력치를 떠 두고 — 겨울(드래프트 · FA · 능력치 변동)을 넘긴 뒤 비교한다 */
    const before=JSON.parse(ev(`JSON.stringify((function(){ const o={}; TEAMS.forEach(t=>pfAll(t).forEach(p=>{ if(p.id!=='ksh') o[p.id]=pfValue(p); })); return o; })())`));
    ev("proNextYear()"); await wait(10);
    regenDrafted+=ev(`TEAMS.reduce((a,t)=>a+pfAll(t).filter(p=>p.regenOf).length,0)`)>0?1:0;
    const after=JSON.parse(ev(`JSON.stringify((function(){ const o={}; TEAMS.forEach(t=>pfAll(t).forEach(p=>{ o[p.id]=pfValue(p); })); return o; })())`));
    const ds=Object.keys(before).filter(k=>after[k]!=null).map(k=>after[k]-before[k]);   // 신인 포함 전원 — 보이는 그대로
    dist.push({up:ds.filter(x=>x>=3).length, same:ds.filter(x=>x>-3&&x<3).length, down:ds.filter(x=>x<=-3).length});
    hist.push(lg());
  }
  ret.forEach((r,i)=>console.log('  '+(2027+i)+' 은퇴 '+r.length+'명 (부상 '+r.filter(x=>x.h).length+') · 환생 후보 '+reg[i].length+'명'+
    (reg[i][0]?' — 예: '+reg[i][0].n+' ← '+reg[i][0].of:'')+' · 겨울 변동 ▲'+dist[i].up+' ―'+dist[i].same+' ▼'+dist[i].down));
  const last=hist[hist.length-1];
  console.log('[12년 뒤] 타자 con '+last.con.toFixed(1)+' pow '+last.pow.toFixed(1)+' eye '+last.eye.toFixed(1)+' · 투수 stf '+last.stf.toFixed(1)+' ctl '+last.ctl.toFixed(1)+
    ' · 1군 최소 타자 '+last.minH+' 투수 '+last.minP);

  console.log('\n[은퇴 · 환생]');
  /* [v3.55.0] 하한 8 → 5. 명성 높은 베테랑이 한 해씩 더 버티고(은퇴 확률 ×0.7), 선수가 방출 · 포스팅으로도
     나가면서 10년쯤 지나면 34~36세 층이 얇아진다(재 봤다 — 38명 → 21명). 한 해 7명인 해가 나왔다 */
  T('해마다 은퇴가 나온다 — 한 해 5~60명', ()=>{ const n=ret.map(r=>r.length); return n.every(x=>x>=5&&x<=60)?n.join(' · '):'!'+n.join(' · '); });
  T('은퇴한 사람은 대부분 서른 넘었다', ()=>{ const a=[].concat(...ret); const o=a.filter(x=>x.a>=31).length/Math.max(1,a.length); return o>=0.9?(Math.round(o*100)+'%'):'!'+Math.round(o*100)+'%'; });
  T('기록이 안 나오는 베테랑이 먼저 떠난다', ()=>{ const a=[].concat(...ret).filter(x=>x.a>=34&&x.a<=37);
    const lo=a.filter(x=>x.g<42).length, hi=a.filter(x=>x.g>=55).length; return lo>hi?('등급 42 아래 '+lo+'명 · 55 이상 '+hi+'명'):'!'+lo+' / '+hi; });
  T('큰 부상 은퇴도 가끔 있다', ()=>{ const n=[].concat(...ret).filter(x=>x.h).length; return n>=1?n+'명 (12년)':'!없다'; });
  T('환생 신인이 드래프트 후보에 섞인다', ()=>{ const n=reg.map(r=>r.length); return n.some(x=>x>0)?n.join(' · '):'!'+n.join(' · '); });
  T('환생 신인 이름은 은퇴한 사람과 다르다', ()=>regenOK?'전부 새 이름':'!같은 이름이 있다');
  T('환생 신인이 실제로 구단에 뽑혀 들어간다', ()=>regenDrafted>0?regenDrafted+'해':'!없다');

  console.log('\n[해마다 능력치 변동]');
  T('한 겨울에 오른 사람 · 그대로 · 떨어진 사람이 다 있다', ()=>dist.every(x=>x.up>20&&x.same>20&&x.down>20)?('첫해 ▲'+dist[0].up+' ―'+dist[0].same+' ▼'+dist[0].down):'!'+JSON.stringify(dist[0]));
  T('12년 뒤 리그 평균이 흘러가지 않는다(±4)', ()=>{ const ks=['con','pow','eye','stf','ctl']; const d=ks.map(k=>last[k]-base[k]);
    return d.every(x=>Math.abs(x)<=4)?ks.map((k,i)=>k+' '+(d[i]>=0?'+':'')+d[i].toFixed(1)).join(' · '):'!'+ks.map((k,i)=>k+' '+d[i].toFixed(1)).join(' · '); });
  T('1군 인원이 모자라지 않는다(타자 13 · 투수 11 이상)', ()=>(last.minH>=13&&last.minP>=11)?('타자 '+last.minH+' · 투수 '+last.minP):'!'+last.minH+' / '+last.minP);

  console.log('\n[저장 → 불러오기]');
  const pick=ev(`(function(){ const F=pfState(); return Object.keys(F.dev||{}).find(id=>pfFind(id)); })()`);
  const want=ev(`JSON.stringify(pfState().dev['${pick}'])`);
  ev("saveGame(true)"); await wait(30);
  const snap=ev("JSON.stringify(ST)");
  ev(`TEAMS=[]; TBYID={}; ST=JSON.parse(${JSON.stringify(snap)}); TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(t=>TBYID[t.id]=t); normalizeState(); applyMyRatings();`);
  T('불러와도 굴려 둔 능력치가 그대로다', ()=>{ const f=ev(`(function(){ const x=pfFind('${pick}'); return x?JSON.stringify(pfDevKeys(x.p).map(k=>x.p[k])):'' })()`);
    return f===want?('한 사람 '+f):'!'+f+' ≠ '+want; });
  T('은퇴한 사람은 불러와도 없다', ()=>{ const n=ev(`(function(){ const F=pfState(); const r=F.retired||[]; return r.filter(x=>TEAMS.some(t=>pfAll(t).some(p=>p.name===x.name&&p.no===x.snap.no&&!p.rookie))).length; })()`);
    return n===0?'없다':'!'+n+'명이 남아 있다'; });

  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
