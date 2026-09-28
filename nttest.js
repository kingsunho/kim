/* 국가대표 — 프로 시즌이 끝나면 명단 발표 → 대회.
   [v3.32.0] 「국가대표도 아시안게임 WBC 프리미어12」 로 생겼다.

   확인하는 것
     · 해마다 대회가 하나씩 돈다(2027 프리미어12 · 2028 LA 올림픽 · 2029 WBC · 2030 아시안게임)
     · 잘하면 명단에 들고, 못하면(능력치가 낮으면) 안 든다 — 2군이면 안 든다
     · 대회를 치르면 조별 셋 이상 경기가 돌고, 점수가 말이 된다
     · 결과가 ST.pro.nt · 경력(history)에 남는다 · 아시안게임 금이면 병역 특례
     · 상대 나라 선수 이름은 지어낸 이름이다(실제 대표 명단이 아니다)
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
  const R=JSON.parse(ev("JSON.stringify(ST.pro.nt[2027])"));
  T('대회가 돌았다 — 조별 셋 이상', ()=>R.games.length>=3 ? R.games.map(g=>g.stage+' '+g.us+':'+g.them).join(' · ') : '!'+R.games.length);
  T('점수가 말이 된다 (한 경기 25점 아래)', ()=>R.games.every(g=>g.us<25&&g.them<25&&g.us>=0) ? '정상' : '!'+JSON.stringify(R.games));
  T('내 대회 기록이 남는다', ()=>(R.my.pa>0) ? R.my.ab+'타수 '+R.my.h+'안타' : '!타석 없음');
  T('결과 카드가 다시 그려진다', ()=>/국가대표 · 프리미어12/.test(d.querySelector('.nt-card').textContent));
  T('경력(history)에 대회가 붙는다', ()=>{ const h=JSON.parse(ev("JSON.stringify(ST.pro.history[ST.pro.history.length-1])")); return h.nt&&h.nt.name==='프리미어12' ? h.nt.name+' '+(h.nt.medal||'노메달') : '!'+JSON.stringify(h.nt); });
  T('상대 나라 선수는 지어낸 이름이다 (한 글자 성+이름이 아니라 「이름 성」)', ()=>{
    const nm=ev("ntTeamForeign('jpn', makeRng(7)).players[0].name"); return / /.test(nm) ? nm : '!'+nm; });
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
