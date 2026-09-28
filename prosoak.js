/* 프로 시즌 완주 — 사회인에서 프로로 넘어가서 144경기 · 포스트시즌 · 다음 시즌까지.
   [v3.27.0] 프로 모드가 생기면서 같이 만들었다. soaktest 가 사회인 시즌을
   UI 로 끝까지 도는 것처럼, 여기서는 프로 한 시즌을 끝까지 돈다.

   확인하는 것
     · 프로로 넘어가면 리그가 KBO 10구단으로 바뀌고 일정이 144경기다
     · 한 주에 다섯 경기는 자동, 한 경기는 직접(여기서는 자동 진행으로 확정)
     · 점수가 말이 된다 — 팀당 경기당 득점 2.5~7 (NaN 컨디션으로 208점이 난 적이 있다)
     · 144경기가 다 차고, 시즌 마무리 → 다음 시즌이 열린다
     · 세이브를 저장했다 불러와도 프로 리그로 돌아온다
     · 화면에 undefined · NaN 이 안 찍힌다                                    */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const bad=[];
const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Could not load|stylesheet|[Nn]ot implemented|getContext/.test(e.message)) bad.push('JSDOM: '+e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc,
  beforeParse(w){ w.scrollTo=()=>{}; w.TextEncoder=TextEncoder; w.TextDecoder=TextDecoder; }});
const w=dom.window,d=w.document,ev=s=>w.eval(s);
w.confirm=()=>true;
process.on('unhandledRejection',e=>bad.push('REJECT: '+String(e).slice(0,160)));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0&&!/^!/.test(r));
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r.replace(/^!/,''):''));if(!ok)bad.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);bad.push(n+': '+e.message)}};
const clean=(tag)=>{ const t=(d.getElementById('view')||{}).textContent||'';
  const m=t.match(/.{0,24}(undefined|NaN|\[object Object\]).{0,24}/);
  if(m) bad.push('['+tag+'] '+m[0].replace(/\s+/g,' ')); return !m; };

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300);
  console.log('[사회인 → 프로]');
  ev(`ST.tutDone=true; ST.mode='player'; ST.role='bat'; ST.myPos='CF'; ST.playerId='ksh'; MYID='ksh';
      proEnter({team:'lg', round:3, pick:10, level:'1군'}); go('home');`);
  await wait(80);
  T('리그가 KBO 10구단이다', ()=>ev("TEAMS.length")===10 ? ev("TEAMS.map(t=>t.name).join(' · ')") : '!'+ev("TEAMS.length"));
  T('내 팀이 우리 팀 자리(wwzw)를 이어받았다', ()=>ev("TBYID.wwzw.name")==='서울 쌍둥이' ? '서울 쌍둥이' : '!'+ev("TBYID.wwzw.name"));
  T('일정이 144경기 · 직접 뛰는 경기 24개', ()=>{ const n=ev("ST.schedule.length"), k=ev("ST.schedule.filter(x=>x.key).length");
    return (n===144&&k===24)?(n+'경기 · '+k+'개'):'!'+n+'/'+k; });
  T('프로 기준값으로 바뀌었다', ()=>Math.abs(ev("LG.BABIP")-ev("LG_PRO.BABIP"))<1e-9 ? 'BABIP '+ev("LG.BABIP") : '!'+ev("LG.BABIP"));
  T('프로 선수 컨디션이 전부 숫자다 (NaN 이면 한 경기 208점이 난다)',
    ()=>ev("TBYID.wwzw.players.concat(TBYID.wwzw.pitchers).every(p=>ST.cond[p.id]>=0)")?'전원':'!빈칸이 있다');

  console.log('\n[한 시즌]');
  let weeks=0, maxRuns=0;
  for(let wk=0; wk<30 && ev("ST.round<ST.schedule.length"); wk++){
    ev("runWeek(); saveGame(true);");
    if(ev("ST.round>=ST.schedule.length")) break;
    /* 직접 뛰는 경기 — 여기서는 끝까지 자동으로 돌리고 결과 화면에서 확정한다 */
    ev(`LIVE=makeLive(); LIVE.manual=false; var gg=0;
        while(!LIVE.over && gg++<4000){ if(LIVE.pending) LIVE.applyDecision('auto'); LIVE.step(); }`);
    ev("go('game'); if(typeof showResult==='function') showResult();");
    await wait(20);
    const fin=[...d.querySelectorAll('#view .btn')].find(x=>/결과 확정/.test(x.textContent));
    if(!fin){ bad.push(wk+'주: 결과 확정 버튼이 없다'); break; }
    fin.click(); await wait(20);
    weeks++;
    const mx=ev("Math.max.apply(null, ST.schedule.filter(x=>x.played&&x.result).map(x=>Math.max(x.result.us,x.result.them)))");
    maxRuns=Math.max(maxRuns,mx);
    if(wk===3){ ev("go('home')"); clean('홈 4주차'); ev("go('stand')"); clean('순위'); ev("go('stats')"); clean('기록'); }
  }
  T('24주를 다 돌았다', ()=>weeks>=24 ? weeks+'주' : '!'+weeks+'주');
  T('144경기가 전부 치러졌다', ()=>{ const n=ev("ST.schedule.filter(x=>x.played).length"); return n===144?'144':'!'+n; });
  T('점수가 말이 된다 — 한 경기 최다 득점이 25 아래', ()=>maxRuns<25 ? '최다 '+maxRuns+'점' : '!'+maxRuns+'점');
  T('경기당 득점이 KBO 근처(2.5~7)', ()=>{ const s=ev("JSON.stringify(ST.stand.wwzw)"); const o=JSON.parse(s);
    const r=o.rf/Math.max(1,o.g); return (r>2.5&&r<7)?(r.toFixed(2)+'점 · '+o.w+'승 '+o.l+'패'):'!'+r.toFixed(2); });
  T('다른 팀도 144경기씩 뛰었다', ()=>{ const g=ev("TEAMS.map(t=>ST.stand[t.id].g)"); return g.every(x=>x===144)?'10팀 전부':'!'+g.join(','); });
  T('프로 신문이 나온다', ()=>{ const N=ev("JSON.stringify(newsIssue())"); const o=JSON.parse(N);
    return (o.name==='스포츠 KBO' && o.lead && o.lead.h)?o.lead.h:'!'+N.slice(0,80); });

  console.log('\n[시즌 마무리 → 다음 시즌]');
  T('시즌이 끝나면 「시즌 마무리」 가 뜬다', ()=>{ const s=ev("JSON.stringify(nextStepInfo())"); return /시즌 마무리/.test(s)?'뜬다':'!'+s; });
  ev("proSeasonEnd()"); await wait(20);
  T('포스트시즌이 돌았다 — 우승 팀이 있다', ()=>{ const c=ev("ST.pro.lastPost&&ST.pro.lastPost.champ"); return c?ev("TBYID['"+c+"'].name"):'!없다'; });
  clean('시즌 끝');
  const y0=ev("ST.pro.year");
  ev("proNextYear()"); await wait(20);
  T('다음 시즌이 열린다', ()=>{ const y=ev("ST.pro.year"), n=ev("ST.schedule.filter(x=>x.played).length");
    return (y===y0+1&&n===0)?(y+' 시즌'):'!'+y+'/'+n; });
  T('지난 시즌이 경력에 남았다', ()=>ev("ST.pro.history.length")>=1?ev("ST.pro.history[0].year")+' · '+ev("ST.pro.history[0].rank")+'위':'!없다');

  console.log('\n[저장 → 불러오기]');
  ev("saveGame(true)"); await wait(30);
  const snap=ev("JSON.stringify(ST)");
  ev(`TEAMS=[]; TBYID={}; ST=JSON.parse(${JSON.stringify(snap)}); TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(t=>TBYID[t.id]=t); normalizeState(); applyMyRatings();`);
  T('불러와도 프로 리그다', ()=>(ev("TEAMS.length")===10&&ev("TBYID.wwzw.name")==='서울 쌍둥이')?'서울 쌍둥이 · 10구단':'!'+ev("TEAMS.length"));
  T('불러와도 내가 팀에 있다', ()=>ev("!!TBYID.wwzw.players.find(p=>p.id==='ksh')")?'있다':'!없다');
  T('불러와도 라인업이 프로 선수다', ()=>ev("(ST.lineup||[]).every(s=>TBYID.wwzw.players.some(p=>p.id===s.id))")?'아홉 전부':'!섞였다');
  ev("go('home')"); clean('불러온 뒤 홈');

  /* [v3.33.0] 명단 버전이 없는 옛 프로 세이브 — 라인업 · 로테이션을 새로 짜야 한다.
     옛 id 는 빈 자리가 아니라 **다른 사람**을 가리키므로, 순서를 뒤섞은 라인업으로 흉내 낸다 */
  console.log('\n[옛 프로 세이브(명단 9/28 이전)]');
  const old=JSON.parse(snap); delete old.pro.rosterVer;
  old.lineup=(old.lineup||[]).slice().reverse(); old.rotation=['wwzw_p15','wwzw_p14'];
  ev(`TEAMS=[]; TBYID={}; ST=JSON.parse(${JSON.stringify(JSON.stringify(old))}); TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(t=>TBYID[t.id]=t); normalizeState(); applyMyRatings();`);
  T('명단 버전이 새것으로 바뀐다', ()=>ev("ST.pro.rosterVer===PRO_ROSTER_VER")?ev("PRO_ROSTER_VER"):'!'+ev("String(ST.pro.rosterVer)"));
  T('라인업을 새로 짰다 — 아홉 전부 우리 선수', ()=>ev("(ST.lineup||[]).length>=9 && ST.lineup.every(s=>TBYID.wwzw.players.some(p=>p.id===s.id))")?'새로 짰다':'!'+ev("(ST.lineup||[]).length"));
  T('로테이션을 새로 짰다 — 선발 다섯 이상', ()=>ev("(ST.rotation||[]).length>=5")?ev("ST.rotation.length")+'명':'!'+ev("(ST.rotation||[]).length"));
  T('내 선수는 그대로다', ()=>ev("!!TBYID.wwzw.players.find(p=>p.id==='ksh')")?'있다':'!없다');
  ev("go('home')"); clean('옛 세이브 불러온 뒤 홈');
  T('부속 데이터가 열 팀 다 있다', ()=>ev("['kia','sam','lg','lot','kt','dsn','nc','ssg','hh','kw'].every(k=>PRO_FARM[k]&&PRO_FARM[k].hit.length&&PRO_FOREIGN[k].now.length>=4&&PRO_SEASON_2026[k]&&proFront(k))")
    ?'2군 · 외국인 · 순위 · 프런트':'!빠진 팀');
  T('아시안게임 대표팀 24명', ()=>ev("PRO_AG_2026.length")===24?'24명':'!'+ev("PRO_AG_2026.length"));

  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
