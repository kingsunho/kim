/* 내 선수 만들기 — 열넷 말고 열다섯 번째 사람.
   [v3.31.0] 「우완좌완 멤버 아니더라도 만들 수 있게」 로 생겼다.

   확인하는 것
     · 고르는 화면에 「새 선수 만들기」 가 뜨고, 이름·번호·학교·투타·포지션을 받는다
     · 만든 사람이 우리 팀 로스터·인적정보(META)에 들어간다 — 실명 열넷은 그대로
     · 고1 은 HS_BASE 에서 시작하고, 고교 3년을 다 돌면 졸업 능력치가 **성적에서** 나온다
     · 잠재력도 졸업 성적에서 바로 나온다
     · 저장 → 불러오기(부팅과 같은 순서)해도 그 사람이 그대로 있다
     · 본편 한 주가 돈다 · 화면에 undefined/NaN 이 안 찍힌다           */
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
  console.log('[만들기 화면]');
  T('고르는 화면에 「새 선수 만들기」 가 있다', ()=>!!d.querySelector('.pk-make'));
  d.querySelector('.pk-make').click(); await wait(40);
  T('만들기 칸이 다 있다', ()=>['#mk-nm','#mk-no','.mk-g[data-k="born"]','.mk-g[data-k="school"]',
    '.mk-g[data-k="throws"]','.mk-g[data-k="bats"]','.mk-g[data-k="pos"]'].every(s=>d.querySelector(s)));
  /* 이름 없이 누르면 안 넘어간다 */
  const start=()=>[...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작');
  start().click(); await wait(40);
  T('이름이 비면 시작이 안 된다', ()=>!ev("ST&&ST.custom") ? '막힌다' : '!그냥 넘어갔다');
  d.querySelector('#mk-nm').value='한결';
  d.querySelector('#mk-no').value='23';
  const pick=(k,v)=>d.querySelector('.mk-g[data-k="'+k+'"] button[data-v="'+v+'"]').click();
  pick('born','1999'); pick('school','흥진고'); pick('throws','L'); pick('bats','L'); pick('pos','CF');
  start().click(); await wait(300);

  console.log('\n[로스터]');
  T('ST.custom 에 고른 값이 남았다', ()=>{ const c=JSON.parse(ev("JSON.stringify(ST.custom)"));
    return (c.name==='한결'&&c.no===23&&c.born===1999&&c.school==='흥진고'&&c.throws==='L'&&c.bats==='L'&&c.pos==='CF')
      ? c.name+' #'+c.no+' · '+c.school+' '+c.born : '!'+JSON.stringify(c); });
  T('내가 그 사람이다', ()=>ev("ST.playerId")==='my' ? 'my' : '!'+ev("ST.playerId"));
  T('우리 팀에 열다섯 번째로 들어갔다', ()=>{ const n=ev("TBYID.wwzw.players.length"), has=ev("!!TBYID.wwzw.players.find(p=>p.id==='my'&&p.name==='한결')");
    return has ? n+'명' : '!없다'; });
  T('실명 열넷은 그대로다', ()=>ev("['swm','ksh','kig','lg'].every(id=>!!TBYID.wwzw.players.find(p=>p.id===id))"));
  T('인적정보가 있다 — 흥진고 · 좌투', ()=>{ const m=JSON.parse(ev("JSON.stringify(META.my)"));
    return (m.school==='흥진고'&&m.throws==='L'&&m.born===1999&&m.pos.CF>50) ? m.school+' · '+m.throws : '!'+JSON.stringify(m).slice(0,80); });
  T('이름이 화면에서 그대로 나온다', ()=>ev("nameOf('my')")==='한결');

  console.log('\n[고교 3년]');
  ev("ST.tutDone=true; ST.tutStep=99; ST.mode='player'; ST.role=ST.role||'bat'; ST.myPos='CF';");
  T('고교가 열린다', ()=>ev("hsSlot(), hsActive()") ? '고1' : '!안 열렸다');
  T('고교 부원 명단에 내가 흥진고로 있다', ()=>ev("(function(){ const R=hsRoster(hsYearsFor('my')[0], ST.seed||1); return !!(R.heung||[]).find(p=>p.id==='my'); })()"));
  ev(`(function(){ const H=hsSlot(); let g=0;
    while(!H.done && g++<60){ H.sayAt=99; H.picked=H.picked||{}; const s=hsStory()[H.i];
      if(s&&s.pick&&H.picked[H.i]==null) H.picked[H.i]=0;
      if(s&&!s.noGame) hsPlay(); H.pending=null; H.i++; if(H.i>=hsStory().length){ hsGraduate(); H.done=true; } }
  })()`);
  T('졸업했다', ()=>ev("ST.hs.done") ? '졸업' : '!아직');
  T('졸업 능력치가 성적에서 나왔다 (HS_BASE 에서 움직였다)', ()=>{ const R=JSON.parse(ev("JSON.stringify(ST.hsRatings||null)"));
    if(!R) return '!없다'; const vals=['con','pow','eye','spd','def','arm'].map(k=>R[k]);
    return vals.some(v=>v!==ev("HS_BASE")) ? vals.join('/') : '!전부 시작값'; });
  ev("go('home'); applyHsStart();");
  T('현재 능력치 = 졸업 능력치', ()=>{ const a=JSON.parse(ev("JSON.stringify(TBYID.wwzw.players.find(p=>p.id==='my'))")), R=JSON.parse(ev("JSON.stringify(ST.hsRatings)"));
    return ['con','pow','eye'].every(k=>a[k]===R[k]) ? '컨택 '+a.con+' · 파워 '+a.pow : '!'+a.con+'≠'+R.con; });
  ev("TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(t=>TBYID[t.id]=t); buildPitcherPool(); applyHsStart();");
  T('잠재력이 졸업 성적에서 나온다 (3~9)', ()=>{ const p=ev("META.my.pot"); return (p>=3&&p<=9)?'잠재 '+p:'!'+p; });

  console.log('\n[저장 → 불러오기]');
  ev("saveGame(true)"); await wait(30);
  const snap=ev("JSON.stringify(ST)");
  /* 부팅 순서 그대로 — 세이브를 읽기 **전에** 팀부터 만든다 */
  ev(`ST=null; CUSTOM_PENDING=null; TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(t=>TBYID[t.id]=t); buildPitcherPool();`);
  T('세이브를 안 읽었을 땐 열넷뿐이다', ()=>ev("!TBYID.wwzw.players.find(p=>p.id==='my')") ? '열넷' : '!남아 있다');
  ev(`ST=JSON.parse(${JSON.stringify(snap)}); normalizeState(); applyLeftPlayers(); MYID=ST.playerId; applyHsStart(); applyMyRatings();`);
  T('불러오면 내가 다시 있다', ()=>ev("!!TBYID.wwzw.players.find(p=>p.id==='my'&&p.name==='한결')") ? '한결' : '!없다');
  T('불러와도 능력치가 졸업 그대로다', ()=>{ const a=ev("TBYID.wwzw.players.find(p=>p.id==='my').con"), r=ev("ST.hsRatings.con"); return a===r?'컨택 '+a:'!'+a+'≠'+r; });

  console.log('\n[본편]');
  ev("go('home')"); clean('홈');
  T('한 주가 돈다', ()=>{ ev("runWeek(); saveGame(true);"); return ev("ST.weekDone") ? '돌았다' : '!안 돈다'; });
  ev("go('squad')"); clean('선수단');
  ev("go('stats')"); clean('기록');
  T('선수단 화면에 내가 나온다', ()=>{ ev("go('squad')"); return /한결/.test(d.getElementById('view').textContent) ? '나온다' : '!없다'; });

  console.log('\n[이름 · 등번호 · 팀명 바꾸기]');
  ev("go('more')"); await wait(30);
  const rb=[...d.querySelectorAll('#view .btn')].find(b=>/바꾸러 가기/.test(b.textContent));
  T('설정에 「이름 · 등번호 · 팀명」 이 있다', ()=>!!rb);
  rb.click(); await wait(30);
  /* 상대 팀 하나 골라서 팀명·선수 하나를 바꾼다 */
  const oid=ev("TEAMS.find(t=>t.id!=='wwzw').id");
  const sel=d.querySelector('.rn-sel'); sel.value=oid; sel.onchange(); await wait(20);
  const pid=ev("TBYID['"+oid+"'].players[0].id"), oldNm=ev("TBYID['"+oid+"'].players[0].name");
  d.querySelector('.rn-team input').value='테스트 곰';
  d.querySelector('.rn-nm[data-id="'+pid+'"]').value='새이름';
  d.querySelector('.rn-no[data-id="'+pid+'"]').value='88';
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='저장').click(); await wait(40);
  T('팀명이 바뀌었다', ()=>ev("TBYID['"+oid+"'].name")==='테스트 곰' ? '테스트 곰' : '!'+ev("TBYID['"+oid+"'].name"));
  T('선수 이름·번호가 바뀌었다', ()=>{ const n=ev("TBYID['"+oid+"'].players[0].name"), no=ev("TBYID['"+oid+"'].players[0].no");
    return (n==='새이름'&&no===88)?n+' #'+no:'!'+n+' #'+no; });
  ev("TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(t=>TBYID[t.id]=t);");
  T('팀을 다시 세워도(불러오기) 바꾼 게 남는다', ()=>ev("TBYID['"+oid+"'].players[0].name")==='새이름' && ev("TBYID['"+oid+"'].name")==='테스트 곰');
  ev("renderRename('"+oid+"')"); await wait(20);
  [...d.querySelectorAll('#view .btn')].find(b=>/원래대로/.test(b.textContent)).click(); await wait(40);
  T('원래대로 돌아간다', ()=>ev("TBYID['"+oid+"'].players[0].name")===oldNm ? oldNm : '!'+ev("TBYID['"+oid+"'].players[0].name"));
  /* 내가 만든 선수 이름도 여기서 바꾼다 — ST.custom 이 원본이다 */
  ev("renderRename('wwzw')"); await wait(20);
  d.querySelector('.rn-nm[data-id="my"]').value='한결이';
  d.querySelector('.rn-no[data-id="my"]').value='9';
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='저장').click(); await wait(40);
  T('내가 만든 선수도 바뀐다 (원본까지)', ()=>{ const c=JSON.parse(ev("JSON.stringify(ST.custom)")); const n=ev("nameOf('my')");
    return (c.name==='한결이'&&c.no===9&&n==='한결이')?n+' #9':'!'+c.name+'/'+n; });
  ev("go('more')"); clean('설정');

  console.log('\n[열넷으로 새로 하면 만든 사람은 빠진다]');
  ev(`ST=null; CUSTOM_PENDING=null; MYID='ksh'; TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(t=>TBYID[t.id]=t);`);
  T('META 에서도 빠졌다', ()=>ev("!META.my && !WWZW.find(p=>p.id==='my')") ? '빠졌다' : '!남았다');

  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
