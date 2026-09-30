/* 국가대표 — 프로 시즌이 끝나면 명단 발표 → 대회.
   [v3.32.0] 「국가대표도 아시안게임 WBC 프리미어12」 로 생겼다.

   확인하는 것
     · 해마다 대회가 하나씩 돈다(2027 프리미어12 · 2028 LA 올림픽 · 2029 WBC · 2030 아시안게임)
     · 잘하면 명단에 들고, 못하면(능력치가 낮으면) 안 든다 — 2군이면 안 든다
     · 대회를 치르면 조별 셋 이상 경기가 돌고, 점수가 말이 된다
     · 결과가 ST.pro.nt · 경력(history)에 남는다 · 아시안게임 금이면 병역 특례
     · [v3.67.0] 상대국은 실제 선수(WBC 는 메이저리거까지) · 경기마다 직접 뛰거나 결과만 본다 · 대표팀 유니폼
     · 저장해도 남고, 다음 시즌으로 넘어간다                              */
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

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(40);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click(); await wait(250);
  ev(`ST.tutDone=true; ST.mode='player'; ST.role='bat'; ST.myPos='SS'; ST.playerId='ksh'; MYID='ksh';
      proEnter({team:'lg', round:1, pick:3, level:'1군'});`);
  console.log('[달력]');
  T('해마다 대회가 하나', ()=>{ const a=[2027,2028,2029,2030,2031].map(y=>ev("ntEventFor("+y+")")).join(',');
    return a==='premier12,olympic,wbc,ag,premier12' ? a : '!'+a; });

  console.log('\n[명단 발표]');
  /* 못하는 나 — 능력치를 바닥으로 */
  ev(`(function(){ const p=TBYID.wwzw.players.find(x=>x.id==='ksh'); ['con','pow','eye','spd','def','arm'].forEach(k=>p[k]=12); })()`);
  T('능력치가 낮으면 명단에 없다', ()=>ev("ntQualifies('premier12')") ? '!뽑혔다' : '빠졌다');
  ev(`(function(){ const p=TBYID.wwzw.players.find(x=>x.id==='ksh'); ['con','pow','eye','spd','def','arm'].forEach(k=>p[k]=92); })()`);
  T('리그 최고면 명단에 든다', ()=>ev("ntQualifies('premier12')") ? '뽑혔다' : '!빠졌다');
  ev("ST.myFarm=1");
  T('2군이면 명단에 없다', ()=>ev("ntQualifies('premier12')") ? '!뽑혔다' : '빠졌다');
  ev("ST.myFarm=0");
  T('대표팀이 스물여섯 안팎이다', ()=>{ const k=JSON.parse(ev("JSON.stringify((function(){ const t=ntTeamKor('premier12'); return [t.players.length,t.pitchers.length]; })())"));
    return (k[0]>=12&&k[1]>=10)?'타자 '+k[0]+' · 투수 '+k[1]:'!'+k; });

  console.log('\n[시즌 끝 → 대회]');
  ev("ST.pro.year=2027; proSeasonEnd();"); await wait(30);
  T('시즌 끝 화면에 국가대표 카드가 뜬다', ()=>{ const c=d.querySelector('.nt-card'); return c&&/발탁/.test(c.textContent)?'발탁':'!'+(c?c.textContent.slice(0,40):'없다'); });
  [...d.querySelectorAll('.nt-card .btn')].find(b=>/대회 나간다/.test(b.textContent)).click(); await wait(40);
  /* [v3.67.0] 대회 화면 — 경기마다 직접 뛰거나 결과만 본다 */
  T('대회 화면이 열린다 — 직접 뛴다 · 결과만 본다', ()=>{ const t=d.getElementById('view').textContent;
    return /직접 뛴다/.test(t)&&/결과만 본다/.test(t) ? '열렸다' : '!'+t.slice(0,60); });
  console.log('\n[직접 뛴다 — 대표팀 유니폼]');
  ev("ntLiveStart()"); await wait(40);
  T('경기가 열린다 — 대한민국 vs 상대국', ()=>ev("!!(LIVE&&LIVE._nt)") && /대한민국 vs/.test(d.getElementById('view').textContent) ? ev("LIVE.away.team.name+' @ '+LIVE.home.team.name") : '!안 열렸다');
  T('내가 대표팀 라인업에 있다', ()=>ev("(LIVE.userIsHome?LIVE.home:LIVE.away).slots.some(function(s){return s.id==='ksh';})") ? '있다' : '!없다');
  T('유니폼 — 대표팀 남색 모자 · 상대국 색', ()=>{ const u=JSON.parse(ev("JSON.stringify(LIVE._ntUni)"));
    return u.us.cap==='#0f2a6b' && ev("PS_UNI.us.cap")==='#0f2a6b' && ev("mvOppUniform().cap")===u.them.cap ? 'K '+u.us.cap+' · 상대 '+u.them.cap : '!'+JSON.stringify(u); });
  const psBefore=ev("JSON.stringify(PS_UNI)");
  ev("LIVE.manual=false; var gg=0; while(!LIVE.over && gg++<4000){ if(LIVE.pending) LIVE.applyDecision('auto'); LIVE.step(); } farmLiveEnd();"); await wait(40);
  T('끝나면 대회 화면으로 돌아오고 한 경기가 적힌다', ()=>{ const n=ev("ST.pro.ntRun?ST.pro.ntRun.games.length:(ST.pro.nt[2027]?ST.pro.nt[2027].games.length:0)");
    const live=ev("(ST.pro.ntRun||ST.pro.nt[2027]).games[0].live"); return n===1&&live ? '1경기 · 직접' : '!'+n+'/'+live; });
  T('유니폼이 원래대로 돌아온다', ()=>ev("PS_UNI.us.cap")==='#2f5fb0' ? '되돌렸다' : '!'+ev("PS_UNI.us.cap"));
  T('기록은 시즌 기록에 안 섞인다', ()=>ev("!(LIVE)") ? '따로' : '!');
  /* 나머지는 결과만 본다 */
  for(let i=0;i<6 && ev("!!ST.pro.ntRun");i++){
    const b=[...d.querySelectorAll('#view .btn')].find(x=>/결과만 본다/.test(x.textContent)); if(!b) break; b.click(); await wait(30); }
  const R=JSON.parse(ev("JSON.stringify(ST.pro.nt[2027])"));
  T('대회가 돌았다 — 조별 셋 이상', ()=>R.games.length>=3 ? R.games.map(g=>g.stage+' '+g.us+':'+g.them).join(' · ') : '!'+R.games.length);
  T('점수가 말이 된다 (한 경기 25점 아래)', ()=>R.games.every(g=>g.us<25&&g.them<25&&g.us>=0) ? '정상' : '!'+JSON.stringify(R.games));
  T('내 대회 기록이 남는다', ()=>(R.my.pa>0) ? R.my.ab+'타수 '+R.my.h+'안타' : '!타석 없음');
  T('결과 카드가 다시 그려진다', ()=>/국가대표 · 프리미어12/.test(d.querySelector('.nt-card').textContent));
  T('경력(history)에 대회가 붙는다', ()=>{ const h=JSON.parse(ev("JSON.stringify(ST.pro.history[ST.pro.history.length-1])")); return h.nt&&h.nt.name==='프리미어12' ? h.nt.name+' '+(h.nt.medal||'노메달') : '!'+JSON.stringify(h.nt); });
  console.log('\n[상대국 — 실제 선수 (v3.67.0)]');
  T('WBC 일본 — 오타니 · 야마모토가 나온다', ()=>{ const t=JSON.parse(ev("JSON.stringify((function(){ var t=ntTeamForeign('jpn', makeRng(7), null, 'wbc'); return t.players.map(function(p){return p.name;}).concat(t.pitchers.map(function(q){return q.name;})); })())"));
    return t.indexOf('오타니 쇼헤이')>=0 && t.indexOf('야마모토 요시노부')>=0 ? t.length+'명' : '!'+t.slice(0,5).join(','); });
  T('프리미어12 일본 — 메이저리거는 안 나온다(오타니 없음 · 자국 리그 선수는 나온다)', ()=>{ const t=JSON.parse(ev("JSON.stringify(ntTeamForeign('jpn', makeRng(7), null, 'premier12').players.map(function(p){return p.name;}))"));
    return t.indexOf('오타니 쇼헤이')<0 && t.indexOf('마키 슈고')>=0 ? '마키 슈고 · 겐다 소스케 …' : '!'+t.slice(0,5).join(','); });
  T('WBC 미국 — 저지 · 스킨스', ()=>{ const t=ev("(function(){ var t=ntTeamForeign('usa', makeRng(7), null, 'wbc'); return t.players.concat(t.pitchers).map(function(p){return p.name;}).join(','); })()");
    return /에런 저지/.test(t)&&/폴 스킨스/.test(t) ? '나온다' : '!'+t.slice(0,60); });
  T('대표팀은 14 · 11 을 채운다(모자라면 지어낸 선수)', ()=>{ const k=JSON.parse(ev("JSON.stringify((function(){ var t=ntTeamForeign('pur', makeRng(7), null, 'wbc'); return [t.players.length,t.pitchers.length]; })())"));
    return k[0]===14&&k[1]===11 ? '14 · 11' : '!'+k; });
  T('WBC 한국 — 이정후 · 김하성이 온다', ()=>{ const t=ev("ntTeamKor('wbc').players.map(function(p){return p.name;}).join(',')");
    return /이정후/.test(t)&&/김하성/.test(t)&&/김혜성/.test(t) ? '이정후 · 김하성 · 김혜성 · 송성문' : '!'+t; });
  T('프리미어12 한국엔 메이저리거가 없다', ()=>!/이정후/.test(ev("ntTeamKor('premier12').players.map(function(p){return p.name;}).join(',')")));
  T('WBC 에도 내가 빠지지 않는다', ()=>ev("ntTeamKor('wbc').players.some(function(p){return p.id==='ksh';})") ? '있다' : '!빠졌다');
  clean('대회 결과');

  console.log('\n[아시안게임 금 → 병역 특례]');
  /* 금이 나올 때까지 시드를 돌려본다 — 최강 선수라 대개 몇 번 안에 나온다 */
  let got=false;
  for(let s=1;s<40 && !got;s++){
    ev("ST.seed="+s+"; delete ST.pro.nt[2030]; ST.pro.exempt=false;");
    const r=JSON.parse(ev("JSON.stringify(ntPlay('ag',2030))"));
    if(r.medal==='gold') got=true;
  }
  T('아시안게임 금메달이 나온다', ()=>got ? '나왔다' : '!40판 동안 없음');
  T('금이면 병역 특례가 붙는다', ()=>ev("ST.pro.exempt===true && ST.pro.nt[2030].exempt===true") ? '특례' : '!없다');

  console.log('\n[저장 · 다음 시즌]');
  ev("saveGame(true)"); await wait(20);
  const snap=ev("JSON.stringify(ST)");
  ev(`TEAMS=[]; TBYID={}; ST=JSON.parse(${JSON.stringify(snap)}); TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(t=>TBYID[t.id]=t); normalizeState();`);
  T('불러와도 대회 기록이 남는다', ()=>ev("!!(ST.pro.nt&&ST.pro.nt[2027])") ? '남았다' : '!없다');
  ev("proNextYear()"); await wait(20);
  T('다음 시즌이 열린다', ()=>ev("ST.pro.year")===2028 ? '2028' : '!'+ev("ST.pro.year"));
  T('대회 기록이 다음 시즌에도 따라온다', ()=>ev("!!(ST.pro.nt&&ST.pro.nt[2027])") ? '따라왔다' : '!사라졌다');
  ev("go('home')"); clean('다음 시즌 홈');

  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
