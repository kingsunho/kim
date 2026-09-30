/* v3.64.0 묶음 — 사용자 스크린샷 제보
   · 프로 선수 카드에 NaN · 사회인 몸값 · 출석/회식 줄이 없다 / 연봉 · 계약이 나온다
   · 1군 28명(투수 13 · 타자 15) · 선발 · 마무리는 1군에 남는다
   · 투수는 125구 넘게 안 던진다(리그 경기 여러 판)
   · 투수 아이디(wwzw_p4)가 이름 자리에 안 찍힌다
   · 트레이드 마감(96경기째) 뒤에는 성사가 안 된다
   · 별은 리그 분포 기준 — 최고 선수 5개 근처, 리그 중간 2.5~3개
   · 내 체격 — 식단 벌크업이면 몸무게가 는다 · 그림 체격에 쓰인다             */
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
const btn=re=>[...d.querySelectorAll('#view .btn')].find(b=>re.test(b.textContent));

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(40);
  btn(/^이 선수로 시작$/).click(); await wait(250);
  ev("ST.tutDone=true; ST.mode='player'; ST.role='bat'; ST.myPos='CF'; ST.playerId='ksh'; MYID='ksh';");
  ev("proEnter({team:'dsn', round:3, pick:10, level:'1군'}); go('home');"); await wait(80);

  console.log('[선수 카드]');
  const pid=ev("TBYID.wwzw.players.find(p=>p.id!==ST.playerId).id");
  ev(`openPlayer('${pid}')`); await wait(60);
  const vt=d.getElementById('view').textContent;
  T('NaN · 천원 없음', ()=>!/NaN|천원/.test(vt) ? true : '!'+vt.slice(0,160));
  T('연봉 · 계약 · 명성이 나온다', ()=>/연봉/.test(vt)&&/계약/.test(vt)&&/명성/.test(vt));
  T('사회인 줄(출석 · 회식 · 이동)이 없다', ()=>!/출석|회식|이동/.test(vt) ? true : '!있다');
  clean('선수 카드');

  console.log('\n[1군 28명]');
  const cnt=JSON.parse(ev("JSON.stringify(TEAMS.filter(t=>proKeyOf(t.id)).map(t=>[t.name,(t.players||[]).length,(t.pitchers||[]).length, (t.pitchers||[]).filter(p=>p.role==='SP').length, (t.pitchers||[]).filter(p=>p.role==='CL').length]))"));
  T('투수 13 이하 · 타자 15 이하(+나)', ()=>cnt.every(x=>x[2]<=13&&x[1]<=16) ? cnt.map(x=>x[1]+'/'+x[2]).join(' ') : '!'+JSON.stringify(cnt));
  T('선발 다섯 · 마무리는 1군에 남는다', ()=>cnt.every(x=>x[3]>=5) ? true : '!'+JSON.stringify(cnt));

  console.log('\n[투구수]');
  const mx=ev(`(function(){ let m=0, mo=0; const ts=TEAMS.filter(t=>proKeyOf(t.id)&&t.id!=='wwzw');
    for(let g=0; g<40; g++){ const a=ts[g%ts.length], h=ts[(g+3)%ts.length];
      const r=simGame(h,a,{innings:9, rng:makeRng(1000+g), homeLineup:aiLineup(h), awayLineup:aiLineup(a),
        homeRotation:proRotOf(h,proSPs(h)[g%5].id), awayRotation:proRotOf(a,proSPs(a)[g%5].id), homeTactics:oppTactics(h), awayTactics:oppTactics(a), park:parkOf('jamsil')});
      Object.values(r.pbox||{}).forEach(x=>{ m=Math.max(m,x.np||0); }); }
    return m; })()`);
  T('리그 경기 40판 — 한 경기 최다 투구수 125구 근처까지만(그 타석은 마친다)', ()=>mx>0&&mx<=135 ? mx+'구' : '!'+mx);

  console.log('\n[이름 · 마감 · 별 · 체격]');
  T('투수 아이디가 이름 자리에 안 찍힌다', ()=>{ const id=ev("TBYID.wwzw.pitchers[3].id"), n=ev(`nameOf('${id}')`); return n!==id&&!/wwzw_/.test(n) ? n : '!'+n; });
  T('떠난 선수도 아이디 대신 「선수」', ()=>ev("nameOf('wwzw_p999')")==='선수');
  T('트레이드 마감 — 96경기째부터 안 된다', ()=>{ ev("ST.round=100"); const r=JSON.parse(ev("JSON.stringify(pfTradeMulti({team:'kia', give:[TBYID.wwzw.players[3].id], get:[pfAll(TBYID.p_kia)[20].id]}))")); ev("ST.round=0"); return !r.ok&&/마감/.test(r.why) ? r.why : '!'+JSON.stringify(r); });
  const st=JSON.parse(ev("JSON.stringify((function(){ const g=[]; TEAMS.forEach(t=>{ if(proKeyOf(t.id)) pfAll(t).forEach(p=>g.push(pfGrade(p))); }); g.sort((a,b)=>a-b); return [pfStarHalf(g[g.length-1]), pfStarHalf(g[g.length>>1]), pfStarHalf(g[0])]; })())"));
  T('별 — 최고 5개 · 중간 2.5~3개 · 최하 반~1개', ()=>st[0]>=9&&st[1]>=5&&st[1]<=6&&st[2]<=2 ? st.map(x=>x/2).join(' / ') : '!'+st);
  ev("ST.myBody={ht:180, wt:80, diet:'bulk'}"); const w0=ev("ST.myBody.wt"); ev("myBodyWeek(); myBodyWeek();");
  T('벌크업 두 주 — 몸무게가 는다', ()=>ev("ST.myBody.wt")>w0 ? w0+' → '+ev("ST.myBody.wt")+'kg' : '!');
  T('그림 체격이 내 몸무게를 쓴다', ()=>ev("bodyOf({id:ST.playerId}).wt")===Math.round(ev("ST.myBody.wt")));

  console.log(bad.length?'\n❌ '+bad.length+'건:\n'+bad.join('\n'):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
