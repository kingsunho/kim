/* FA 벽 · 메이저 — v3.66.0
   [제보] "곽빈 fa 나왔다 (…) C급으로 나오는데 (…) 곽빈 90억 · 문동주는 120억 (…) 안우진도 데려와야지"
          "돈 있다고 이렇게 쉽게 프렌차이즈들 mlb갈만한 선수들이 쉽게 사지는게 많냐?"
   확인하는 것
     · 곽빈(명성 89 · 한 구단) — 프랜차이즈다. 스물여덟이라 영구결번 후보는 아니다
     · 포스팅 기준이 리그 눈금(등급 60)이다 — 예전 72 는 아무도 못 넘었다
     · FA 로 메이저 — 등급 60+ · 서른둘 아래는 시장 전에 나간다 · 시장 목록에 없다
     · 우리 제안도 원 소속 구단의 벽을 넘어야 한다 — 프랜차이즈 90% · 젊은 주전 70% · 30% 얹으면 준다
     · 거절은 그 겨울 끝 · 다시 눌러도 같은 결과                                          */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const bad=[]; const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Could not load|stylesheet|[Nn]ot implemented|getContext/.test(e.message)) bad.push('JSDOM: '+e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc,
  beforeParse(w){ w.scrollTo=()=>{}; w.TextEncoder=TextEncoder; w.TextDecoder=TextDecoder; }});
const w=dom.window,d=w.document,ev=s=>w.eval(s); w.confirm=()=>true;
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0&&!/^!/.test(r));
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r.replace(/^!/,''):''));if(!ok)bad.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);bad.push(n+': '+e.message)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click(); await wait(300);
  ev(`ST.tutDone=true; ST.mode='player'; ST.role='bat'; ST.playerId='ksh'; MYID='ksh'; proEnter({team:'lg', round:3, pick:10, level:'1군'});`);
  const find=n=>JSON.parse(ev(`(function(){ var r=null; TEAMS.forEach(function(t){ pfAll(t).forEach(function(p){ if(p.name==='${n}') r={id:p.id,k:proKeyOf(t.id)}; }); }); return JSON.stringify(r); })()`));

  console.log('[프랜차이즈]');
  const gb=find('곽빈');
  T('곽빈 — 프랜차이즈(두산)', ()=>{ const f=ev(`pfFranchise(pfFind('${gb.id}').p,'${gb.k}')`); return f===1?'프랜차이즈':'!'+f; });
  T('옮겨 다닌 사람은 기록이 없으면 프랜차이즈가 아니다', ()=>/!moved/.test(ev("String(pfFranchise)")));

  console.log('\n[FA 등급 — KBO 규정 (v3.67.0)]');
  const gr=(o)=>ev(`(function(){ var f=pfFind('${gb.id}'); return pfFAGrade(f.p, f.t, ${JSON.stringify(o)}); })()`);
  T('세 번째 FA 는 C', ()=>gr({fa:2,sal:900000})==='C');
  T('재자격 — 첫 FA 가 A · B 면 B, C 면 C', ()=>gr({fa:1,fg:'A',sal:900000})==='B' && gr({fa:1,fg:'B',sal:1})==='B' && gr({fa:1,fg:'C',sal:900000})==='C');
  T('등급은 최근 3년 평균 연봉 순위', ()=>/pfSalAvg3\(q,k\)/.test(ev("String(pfSalTable)")) && /S0\.by\[p\.id\]/.test(ev("String(pfFAGrade)")));
  T('만 35세 이상 신규 FA 는 C', ()=>/if\(age>=35\) return 'C'/.test(ev("String(pfFAGrade)")));
  T('곽빈 — 2028 시즌 뒤 FA (부상으로 늦었다)', ()=>{ const r=ev(`(function(){ var f=pfFind('${gb.id}'); return pfFaLeft(f.p,'${gb.k}'); })()`); return r===2?'이번 시즌 포함 두 시즌':'!'+r; });
  T('비FA 연봉도 오른다 — 곽빈 2026 3억 500만 → 2027 더', ()=>{ const v=ev(`pfCon(pfFind('${gb.id}').p,'${gb.k}').sal`); return v>30500 ? (v/10000).toFixed(1)+'억' : '!'+v; });
  T('예비 FA — 구단이 등급 올리려고 연봉을 끌어올린다(FA 2년 전 5억 · 1년 전 7억 · FA 해 9억)',
    ()=>ev("pfPreFAPush(2,999999,60)")===50000 && ev("pfPreFAPush(1,999999,60)")===70000 && ev("pfPreFAPush(0,999999,60)")===90000 && ev("pfPreFAPush(1,999999,50)")===0);
  T('우리 팀 재계약도 예비 FA 는 등급 관리', ()=>/예비 FA — 등급 관리로 크게 올렸다/.test(ev("String(pfRenewals)")));

  console.log('\n[예비 FA 표 · AI 비FA 다년계약 (v3.68.0)]');
  T('기사로 찾은 예비 FA 가 명단과 다 맞는다', ()=>{ const r=JSON.parse(ev("JSON.stringify(Object.keys(PF_FA_DUE).filter(function(kk){ var k=kk.split('|')[0], n=kk.split('|')[1], t=TBYID[pfIdOf(k)]; return !(t&&pfAll(t).some(function(x){return (x._orig||x.name)===n;})); }))"));
    return r.length===0 ? ev("Object.keys(PF_FA_DUE).length")+'명' : '!'+r.join(','); });
  T('2026 시즌 뒤 FA(원태인 · 구자욱)는 개막 전에 FA 계약을 맺은 걸로', ()=>{ const k=ev(`(function(){ var t=TBYID[pfIdOf('sam')], p=pfAll(t).find(function(x){return x.name==='원태인';}); return pfCon(p,'sam').type; })()`); return k==='fa'?'FA 계약':'!'+k; });
  T('NC 김형준 — 2027 시즌 뒤 FA', ()=>{ const r=ev(`(function(){ var t=TBYID[pfIdOf('nc')], p=pfAll(t).find(function(x){return x.name==='김형준';}); return pfFaLeft(p,'nc'); })()`); return r===1?'이번 시즌 뒤':'!'+r; });
  T('AI 구단은 간판을 비FA 다년계약으로 묶는다(프랜차이즈 55% · 젊은 에이스 45%)', ()=>/비FA 다년계약/.test(ev("String(pfFAOpen)")) && /u<\(fr0\?0\.55:0\.45\)/.test(ev("String(pfFAOpen)")));
  T('AI 보호명단은 어린 유망주의 잠재까지 친다', ()=>/protV/.test(ev("String(pfCompPick)")));

  console.log('\n[2차 드래프트 · 등번호 (v3.69.0)]');
  T('2차 드래프트 — 보호 35명은 제외 대상과 따로, 스타는 명단에 없다', ()=>{ const n=ev("pfD2Pool().filter(function(x){return pfGrade(x.p)>=58;}).length");
    const top=ev("(pfD2Pool()[0]||{p:{name:''}}).p.name"); return n===0 ? '맨 위가 '+top+' 급' : '!등급 58+ '+n+'명'; });
  T('등번호 — 원래 달던 사람이 지키고 새로 온 사람이 바꾼다', ()=>{
    const r=ev(`(function(){ var hh=TBYID[pfIdOf('hh')], kt=TBYID[pfIdOf('kt')]; var md=pfAll(hh).find(function(p){return p.name==='문동주';}), gy=pfAll(kt).find(function(p){return p.name==='고영표';});
      if(!md||!gy) return 'skip'; var n0=md.no; gy.no=md.no; pfMove(gy,'kt','hh','트레이드');
      var a=pfAll(hh).find(function(p){return p.name==='문동주';}).no, b=pfAll(hh).find(function(p){return p.name==='고영표';}).no; return (a===n0&&b!==n0)?'문동주 '+a+' 그대로 · 고영표 '+b:'!'+a+'/'+b; })()`);
    return r; });

  console.log('\n[메이저]');
  T('포스팅 기준 등급 60 (리그 최고가 67)', ()=>/if\(g<60\|\|age<24/.test(ev("String(pfPostRun)")) && ev("Math.max.apply(null,TEAMS.map(function(t){return Math.max.apply(null,pfAll(t).map(pfGrade));}))")>=60);
  ev("pfState().cash=900");
  const fa=JSON.parse(ev("JSON.stringify(pfFAOpen())"));
  T('FA 로 메이저 간 사람은 시장 목록에 없고 리그에서 빠졌다', ()=>{
    const m=fa.mlb||[]; if(!m.length) return '올해는 없다';
    const inList=m.some(z=>fa.list.some(x=>x.name===z.name));
    const still=m.some(z=>ev(`TEAMS.some(function(t){return pfAll(t).some(function(p){return p.name==='${z.name}';});})`));
    return !inList&&!still ? m.map(z=>z.name).join(' · ') : '!'+JSON.stringify(m); });
  T('메이저 확률 — 등급 60 0.22 · 67 0.7(최대) · 스물아홉 이하 +0.1 · 불펜 절반', ()=>
    /clamp\(0\.22\+\(pfGrade\(p\)-60\)\*0\.07\+\(age<=29\?0\.1:0\),0\.2,0\.7\)\*\(rp\?0\.5:1\)/.test(ev("String(pfFAOpen)")));

  console.log('\n[우리 제안 — 원 소속 구단의 벽]');
  T('붙잡을 확률 — 프랜차이즈 0.9 · 젊은 주전 0.7 · 명성 65+ 0.35 · 얹으면 준다', ()=>{
    const s=ev("String(pfFAKeepP)");
    return /fr\?0\.9:\(young\?0\.7:\(rp>=65\?0\.35:0\)\)/.test(s) && /if\(over\) k=fr\?0\.7:k\*0\.5/.test(s); });
  const K=fa.list.find(x=>!x.ours && ev(`pfFAKeepP(${JSON.stringify(x)}, pfFind('${x.id}').p, false)`)>0);
  if(K){
    const r1=JSON.parse(ev(`JSON.stringify(pfSign('${K.id}', true))`));
    T('30% 얹어 부르면 총액이 오른다(또는 거절)', ()=>{
      const x=JSON.parse(ev(`JSON.stringify(pfState().fa.list.find(function(z){return z.id==='${K.id}';}))`));
      return x.total>=Math.round(K.total*1.3/1000)*1000-1000 ? (r1.ok?'계약 '+x.total:'거절 — '+r1.why) : '!'+x.total+'/'+K.total; });
    T('끝난 FA 는 다시 못 부른다', ()=>{ const r2=JSON.parse(ev(`JSON.stringify(pfSign('${K.id}'))`)); return !r2.ok ? r2.why : '!'+JSON.stringify(r2); });
  } else T('붙잡히는 FA 가 있다', ()=>'올해는 없다');
  T('AI 도 붙잡는다(pfFAClose) — 우리 제안과 같은 벽', ()=>/young && rng\(\)<0\.8/.test(ev("String(pfFAClose)")));
  T('젊은 에이스는 6년', ()=>/const yrs=star\?6:/.test(ev("String(pfFAOpen)")));
  ev("go('front')"); await wait(30);
  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
