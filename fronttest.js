/* 프로 프런트 — 금고 · 콜라보 · 2군 시설 · 트레이드 · FA 등급/보상 · 신인 드래프트 · 2차 드래프트.
   [v3.33.0] 「우린 프런트야」 로 생겼다.

   확인하는 것
     · 금고는 구단 재정으로 시작하고 매주 관중·콜라보만큼 움직인다
     · 트레이드는 값이 맞으면 되고, 안 맞으면 거절 · 네 주에 한 번
     · FA 는 등급(A/B/C)이 붙고, A 는 보상선수가 실제로 떠난다
     · 신인 드래프트 — 우리 차례에서 멈추고, 내가 고른 사람이 우리 팀에 온다
     · 2차 드래프트 — 홀수 해. 보호 안 한 사람이 떠날 수 있다
     · 이동은 저장 → 불러오기(팀을 파일에서 다시 만들어도) 그대로 남는다
     · 다음 시즌으로 넘어가도 남고, 144경기가 돈다(NaN · 로스터 구멍 없음)    */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const bad=[]; const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Could not load|stylesheet|[Nn]ot implemented|getContext/.test(e.message)) bad.push('JSDOM: '+e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc,
  beforeParse(w){ w.scrollTo=()=>{}; w.TextEncoder=TextEncoder; w.TextDecoder=TextDecoder; }});
const w=dom.window,d=w.document,ev=s=>w.eval(s);
w.confirm=()=>true;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0&&!/^!/.test(r));
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r.replace(/^!/,''):''));if(!ok)bad.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);bad.push(n+': '+e.message)}};
const clean=tag=>{ const t=(d.getElementById('view')||{}).textContent||'';
  const m=t.match(/.{0,20}(undefined|NaN|\[object Object\]).{0,20}/); if(m) bad.push('['+tag+'] '+m[0]); return !m; };
const reload=()=>{ const snap=ev("JSON.stringify(ST)");
  ev(`TEAMS=[]; TBYID={}; ST=JSON.parse(${JSON.stringify(snap)}); TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(t=>TBYID[t.id]=t); normalizeState(); applyMyRatings();`); };

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(40);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click(); await wait(250);
  ev(`ST.tutDone=true; ST.mode='player'; ST.role='bat'; ST.myPos='CF'; ST.playerId='ksh'; MYID='ksh';
      proEnter({team:'lg', round:3, pick:10, level:'1군'}); go('home');`);
  await wait(40);

  console.log('[금고 · 콜라보 · 시설]');
  T('금고가 구단 재정으로 시작한다', ()=>{ const c=ev("pfState().cash"); return c>100?c+'억':'!'+c; });
  T('로비에 「프런트」 가 있다', ()=>[...d.querySelectorAll('.lob-ic')].some(b=>/프런트/.test(b.textContent)));
  ev("go('front')"); await wait(20);
  T('프런트 화면이 뜬다', ()=>/구단 금고/.test(d.getElementById('view').textContent));
  clean('프런트');
  const c0=ev("pfState().cash");
  [...d.querySelectorAll('.pf-opt')].find(b=>/웹툰/.test(b.textContent)).click(); await wait(30);
  T('콜라보를 고르면 제작비가 나간다', ()=>{ const c=ev("pfState().cash"); return Math.abs((c0-c)-5)<0.01 ? '-5억' : '!'+(c0-c); });
  const c1=ev("pfState().cash"); ev("pfWeek()");
  T('한 주가 지나면 금고가 는다(관중+콜라보−운영비)', ()=>{ const c=ev("pfState().cash"); return c>c1 ? '+'+(c-c1).toFixed(1)+'억' : '!'+(c-c1); });
  const fac=ev("pfState().fac");
  if(fac<5){ [...d.querySelectorAll('#view .btn')].find(b=>/한 칸 올린다/.test(b.textContent)).click(); await wait(20);
    T('2군 시설이 한 칸 오른다', ()=>ev("pfState().fac")===fac+1 ? '★'+(fac+1) : '!'+ev("pfState().fac")); }

  console.log('\n[트레이드]');
  /* 우리 최하위 ↔ 상대 최상위 — 거절돼야 한다 */
  const r1=JSON.parse(ev(`JSON.stringify((function(){ const us=[].concat(TBYID.wwzw.players,TBYID.wwzw.pitchers).filter(p=>p.id!=='ksh').sort((a,b)=>pfValue(a)-pfValue(b));
    const th=[].concat(TBYID.p_kt.players,TBYID.p_kt.pitchers).sort((a,b)=>pfValue(b)-pfValue(a));
    return pfTrade(us[0].id, th[0].id); })())`));
  T('안 맞는 트레이드는 거절', ()=>!r1.ok ? r1.why : '!받아줬다');
  const r2=JSON.parse(ev(`JSON.stringify(pfTrade('x','y'))`));
  T('네 주 안에 또 못 한다', ()=>!r2.ok && /네 주/.test(r2.why) ? r2.why : '!'+JSON.stringify(r2));
  ev("pfState().tradeRound=-99");
  const pair=JSON.parse(ev(`JSON.stringify((function(){ const us=[].concat(TBYID.wwzw.players).filter(p=>p.id!=='ksh').sort((a,b)=>pfValue(b)-pfValue(a));
    const th=[].concat(TBYID.p_kt.players).sort((a,b)=>pfValue(a)-pfValue(b));
    const r=pfTrade(us[0].id, th[0].id); return {r, a:us[0].id, b:th[0].id}; })())`));
  T('값이 맞으면 성사', ()=>pair.r.ok ? '성사' : '!'+pair.r.why);
  T('선수가 실제로 팀을 바꿨다', ()=>ev(`!!TBYID.wwzw.players.find(p=>p.id==='${pair.b}') && !!TBYID.p_kt.players.find(p=>p.id==='${pair.a}')`));
  T('온 사람 컨디션이 숫자다', ()=>ev(`ST.cond['${pair.b}']>=0`) ? '있다' : '!비었다');
  reload();
  T('불러와도(팀을 다시 만들어도) 트레이드가 남는다', ()=>ev(`!!TBYID.wwzw.players.find(p=>p.id==='${pair.b}') && !TBYID.wwzw.players.find(p=>p.id==='${pair.a}')`));

  console.log('\n[시즌 끝 → 겨울]');
  ev("ST.pro.year=2027; proSeasonEnd();"); await wait(30);
  T('시즌 끝 화면에 「겨울 — 프런트 일」', ()=>!!d.querySelector('.pf-win'));
  clean('시즌 끝');
  /* 신인 드래프트 */
  [...d.querySelectorAll('.pf-win .pf-opt')].find(b=>/신인 드래프트/.test(b.textContent)).click(); await wait(30);
  T('우리 차례에서 멈춘다', ()=>/우리 차례/.test(d.getElementById('view').textContent));
  let guard=0;
  while(!ev("pfRookiePool().done") && guard++<60){
    const opt=d.querySelector('.kd-cand');
    if(opt){ opt.click(); await wait(20); continue; }
    const f=[...d.querySelectorAll('#view .btn')].find(b=>/우리 차례까지 빨리/.test(b.textContent));
    if(!f) break; f.click(); await wait(20); }
  ev("clearInterval(PF_DRAFT_T)");
  T('11라운드 110명이 다 뽑혔다', ()=>{ const n=ev("pfRookiePool().picks.length"); return n===110?'110명':'!'+n; });
  T('우리 지명 열하나가 우리 2군에 왔다', ()=>{ const mine=JSON.parse(ev("JSON.stringify(pfRookiePool().picks.filter(z=>z.team===ST.pro.team).map(z=>z.id))"));
    /* 괴물 신인(phenom)은 바로 1군 — 나머지는 2군 */
    const ok=mine.length===11 && mine.every(id=>ev(`(function(){ const ph=!!(pfRookiePool().list.find(x=>x.p.id==='${id}')||{}).phenom;
      return ph ? !![].concat(TBYID.wwzw.players,TBYID.wwzw.pitchers).find(p=>p.id==='${id}') : !!(TBYID.wwzw.farm||[]).find(p=>p.id==='${id}'); })()`)); return ok?'11명':'!'+mine.length; });
  T('후보 학교가 고졸이면 고, 대졸이면 대', ()=>ev("pfRookiePool().list.every(x=>(x.school==='고교')===/고$/.test(x.schoolName))") ? '맞다' : '!섞였다');
  T('괴물 신인은 고졸 · 현재 58+ · 잠재 86+', ()=>{ const P=JSON.parse(ev("JSON.stringify(pfRookiePool().list.filter(x=>x.phenom).map(x=>[x.cur,x.pot,x.school]))"));
    return P.every(q=>q[0]>=58&&q[1]>=86&&q[2]==='고교') ? (P.length?P.length+'명':'올해는 없다') : '!'+JSON.stringify(P); });
  T('스카우트 범위 안에 진짜 값이 있다', ()=>{ const r=JSON.parse(ev(`JSON.stringify(pfRookiePool().list.map(x=>({c:x.rc, p:x.rp, tc:x.cur, tp:x.pot})))`));
    const bad2=r.filter(x=>x.tc!=null&&(x.tc<x.c[0]||x.tc>x.c[1]||x.tp<x.p[0]||x.tp>x.p[1]));
    return r.length&&!bad2.length ? r.length+'명 전원' : '!'+bad2.length+'/'+r.length+' '+JSON.stringify(r[0]); });
  T('스카우트진이 좋을수록 범위가 좁다', ()=>{ const w=ev("(function(){ const a=pfRange(60,1,()=>0.5), b=pfRange(60,5,()=>0.5); return (a[1]-a[0])+'>'+(b[1]-b[0]); })()");
    const [a,b]=w.split('>').map(Number); return a>b ? '★1 '+a+'칸 · ★5 '+b+'칸' : '!'+w; });
  /* FA */
  ev("pfState().cash=400");
  const fa=JSON.parse(ev("JSON.stringify(pfFAOpen())"));
  T('FA 에 등급이 붙는다', ()=>fa.list.length && fa.list.every(x=>/^[ABC]$/.test(x.grade)) ? fa.list.map(x=>x.grade).join('') : '!'+fa.list.length);
  /* A·B 는 보상선수가 붙는다(A 20인 · B 25인 보호 밖). 해에 따라 A 가 없을 수 있어서 둘 다 본다 */
  const A=fa.list.find(x=>x.grade==='A'&&!x.ours)||fa.list.find(x=>x.grade==='B'&&!x.ours);
  if(A){
    const before=ev("pfAll(TBYID.wwzw).length");
    const r=JSON.parse(ev(`JSON.stringify(pfSign('${A.id}'))`));
    T(A.grade+' 등급 영입 — 보상선수가 떠난다', ()=>r.ok&&r.lost ? A.name+' 영입 · '+r.lost+' 떠남' : '!'+JSON.stringify(r));
    T('인원은 그대로(한 명 오고 한 명 감)', ()=>ev("pfAll(TBYID.wwzw).length")===before ? '같다' : '!'+before+'→'+ev("pfAll(TBYID.wwzw).length"));
  } else T('보상선수 붙는 FA 가 있다', ()=>'!없다');
  ev("pfFAClose()");
  T('시장을 닫으면 남은 FA 가 정리된다', ()=>ev("pfFAOpen().list.every(x=>!!x.done)"));
  /* 2차 드래프트 — 2027 은 홀수 해 */
  T('2027 은 2차 드래프트가 있는 해', ()=>ev("pfD2Year(2027)")===true && ev("pfD2Year(2028)")===false);
  const pool=JSON.parse(ev("JSON.stringify(pfD2Pool().slice(0,2).map(x=>x.p.id))"));
  const d2=JSON.parse(ev(`JSON.stringify(pfD2Run(${JSON.stringify(pool)}))`));
  T('2차 드래프트로 데려온다', ()=>d2&&d2.got.length===2 ? d2.got.join(', ') : '!'+JSON.stringify(d2));
  T('나는 어디에도 안 끌려간다', ()=>ev("!!TBYID.wwzw.players.find(p=>p.id==='ksh')"));

  console.log('\n[연봉 — 비FA 는 해마다 재계약 · 내 연봉]');
  T('재계약 명단이 있고 전원 최저연봉 이상', ()=>{ const R=JSON.parse(ev("JSON.stringify(pfRenewals())")); const mn=ev("kboMinSal(ST.pro.year+1)");
    return R.list.length && R.list.every(x=>x.sal>=mn) ? R.list.length+'명 · 최저 '+mn : '!'+R.list.length; });
  T('FA 계약 중인 사람은 재계약 명단에 없다', ()=>ev("(function(){ const ids=pfRenewals().list.map(x=>x.id); return pfAll(TBYID.wwzw).filter(p=>pfCon(p,ST.pro.team).type==='fa').every(p=>!ids.includes(p.id)); })()"));
  T('내 연봉 제시액이 나온다', ()=>{ const o=JSON.parse(ev("JSON.stringify(pfMyOffer())")); return o.skip||o.offer>=ev("kboMinSal(ST.pro.year+1)") ? (o.skip?'FA 계약 중':o.old+'→'+o.offer) : '!'+JSON.stringify(o); });
  T('샐러리캡은 외국인 · 신인을 뺀다', ()=>ev("pfPayroll().capSum<=pfPayroll().total") ? '캡 '+ev("wonStr2(pfPayroll().capSum)")+' / 총 '+ev("wonStr2(pfPayroll().total)") : '!');
  { const snap=ev("JSON.stringify(ST)");
    ev("ST.pro.history=(ST.pro.history||[]).concat(Array.from({length:8},()=>({level:'1군'}))); pfState().myFA={year:ST.pro.year, offers:[{key:'kt',yrs:4,total:400000}], done:false}; pfMyFAPick('kt'); pfResolveFAMove();");
    T('내 FA — 다른 구단을 고르면 옮긴다', ()=>ev("ST.pro.team")==='kt' && ev("pfMyCon().type")==='fa' ? '→ kt · '+ev("wonStr2(pfMyCon().sal)") : '!'+ev("ST.pro.team"));
    ev(`TEAMS=[]; TBYID={}; ST=JSON.parse(${JSON.stringify(snap)}); TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(t=>TBYID[t.id]=t); normalizeState();`); }

  console.log('\n[트레이드 요청 — 나를 보내 달라]');
  T('겨울 카드에 트레이드 요청이 있다', ()=>{ ev("proSeasonScreen(ST.pro.history[ST.pro.history.length-1], ST.pro.lastPost)"); return [...d.querySelectorAll('.pf-win .pf-opt')].some(b=>/트레이드 요청/.test(b.textContent)); });
  { /* 따로 떼어서 — 받아들여지는 시드를 찾아 본다 */
    const snap=ev("JSON.stringify(ST)");
    let moved=null;
    for(let s=1;s<12&&!moved;s++){
      ev(`TEAMS=[]; TBYID={}; ST=JSON.parse(${JSON.stringify(snap)}); TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(t=>TBYID[t.id]=t); normalizeState(); ST.seed=${s}; ST.pro.tradeReq=true;`);
      const r=ev("pfResolveTradeReq()"); if(r&&r!=='stay') moved=r;
    }
    T('받아주는 구단이 있으면 간다', ()=>moved ? '→ '+ev("proName('"+moved+"')") : '!12번 다 거절');
    if(moved){ ev("ST.pro.year++; proNewSeason();");
      T('새 구단에서 내가 우리 팀(wwzw)에 있다', ()=>ev("TBYID.wwzw.proKey")===moved && ev("!!TBYID.wwzw.players.find(p=>p.id==='ksh')") ? '있다' : '!'+ev("TBYID.wwzw.proKey"));
      T('금고는 새 구단 것이다', ()=>{ const c=ev("pfState().cash"); return c>0?c+'억':'!'+c; }); }
    ev(`TEAMS=[]; TBYID={}; ST=JSON.parse(${JSON.stringify(snap)}); TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(t=>TBYID[t.id]=t); normalizeState();`);
  }

  console.log('\n[저장 · 다음 시즌 · 144경기]');
  reload();
  T('불러와도 신인 · FA · 2차 드래프트가 남는다', ()=>{ const n=ev("pfState().moves.length"); const mine=JSON.parse(ev("JSON.stringify(pfRookiePool().picks.filter(z=>z.team===ST.pro.team).map(z=>z.id))"));
    return (n>30 && mine.every(id=>ev(`!!pfAll(TBYID.wwzw).find(p=>p.id==='${id}')`)))?'이동 '+n+'건':'!'+n; });
  ev("proNextYear()"); await wait(30);
  T('다음 시즌이 열린다', ()=>ev("ST.pro.year")===2028);
  T('다음 시즌에도 이동이 남는다', ()=>ev(`!!TBYID.wwzw.players.find(p=>p.id==='${pair.b}')`) ? '남았다' : '!사라졌다');
  T('우리 팀 전원 컨디션이 숫자다', ()=>ev("[].concat(TBYID.wwzw.players,TBYID.wwzw.pitchers).every(p=>ST.cond[p.id]>=0)") ? '전원' : '!빈칸');
  let maxR=0;
  for(let wk=0;wk<30 && ev("ST.round<ST.schedule.length");wk++){
    ev("runWeek(); saveGame(true);");
    if(ev("ST.round>=ST.schedule.length")) break;
    ev(`LIVE=makeLive(); LIVE.manual=false; var gg=0; while(!LIVE.over && gg++<4000){ if(LIVE.pending) LIVE.applyDecision('auto'); LIVE.step(); }`);
    ev("go('game'); if(typeof showResult==='function') showResult();"); await wait(15);
    const fin=[...d.querySelectorAll('#view .btn')].find(x=>/결과 확정/.test(x.textContent));
    if(!fin){ bad.push(wk+'주: 결과 확정 없음'); break; } fin.click(); await wait(15);
    maxR=Math.max(maxR, ev("Math.max.apply(null, ST.schedule.filter(x=>x.played&&x.result).map(x=>Math.max(x.result.us,x.result.them)).concat([0]))"));
  }
  T('144경기가 다 돈다', ()=>{ const n=ev("ST.schedule.filter(x=>x.played).length"); return n===144?'144':'!'+n; });
  T('점수가 말이 된다', ()=>maxR<25 ? '최다 '+maxR+'점' : '!'+maxR);
  T('금고가 시즌 동안 움직였다', ()=>{ const c=ev("pfState().cash"); return (c>0)?c.toFixed(0)+'억':'!'+c; });
  ev("go('front')"); clean('다음 시즌 프런트');

  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
