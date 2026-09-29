/* 성장 루틴 · 특성 · 지갑.
   [v3.41.0] 「훈련 코인이 거추장스럽다 · 노력왕 · 유리몸 같은 특성 · 한 해 한 번 10% 로 지우기 ·
   연봉으로 집 · 차 · 도박(걸리면 중징계)」 로 생겼다.

   확인하는 것
     · 코인을 한 푼도 안 써도 루틴이 매주 능력치를 올린다(예전엔 「훈련 없음」)
     · 강도 — 빡세게가 더 오르고 컨디션을 더 깎는다
     · 빡세게 10주 → 「노력파」, 부상 세 번 → 「유리몸」(철강과 같이 못 간다)
     · 특성은 새로고침(META 를 상수에서 다시 만듦)해도 남는다
     · 지우기는 한 해 한 번 · 10%
     · 지갑 — 집 · 차를 사면 돈이 빠지고 효과가 붙는다, 모자라면 못 산다
     · 사설 토토 적발 → 72경기 출장정지 · 「징계전력」 · 국가대표 제외 · 연봉 제시 -20% · 징계 중 무급
     · 화면에 undefined/NaN 이 없다                                                            */
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
const reloadPro=()=>{ const snap=ev("JSON.stringify(ST)"); ev(`TEAMS=[]; TBYID={}; ST=JSON.parse(${JSON.stringify(snap)}); TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(t=>TBYID[t.id]=t); normalizeState(); applyMyRatings();`); };
const statSum=()=>ev("(function(){ const p=TBYID.wwzw.players.find(x=>x.id===(ST.playerId||MYID)); return ['con','pow','eye','spd','def','arm'].reduce((a,k)=>a+(p[k]||0),0); })()");

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(40);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click(); await wait(250);
  ev("ST.tutDone=true; ST.tutStep=99; ST.mode='player'; ST.role='bat'; ST.myPos='CF'; ST.hs={done:true,i:99,res:[],bat:blankBat(),pit:blankPit(),moments:[]};");

  console.log('[루틴 — 코인 없이]');
  ev("ST.coins=0; ST.myTrainQ=[]; rtState().lv=1;");
  const s0=statSum(); ev("applyMyTrain()");
  T('코인 0 · 특훈 없이도 오른다', ()=>statSum()>s0 ? '+'+(statSum()-s0).toFixed(2) : '!'+(statSum()-s0));
  T('「훈련 없음」 이 안 뜬다', ()=>!ev("(ST.notices||[]).some(n=>n.title==='훈련 없음')"));
  const gain=lv=>{ ev("rtState().lv="+lv+"; ST.cond[ST.playerId]=90;"); const a=statSum(), c=ev("ST.cond[ST.playerId]"); ev("applyMyTrain()"); return [statSum()-a, c-ev("ST.cond[ST.playerId]")]; };
  const g0=gain(0), g2=gain(2);
  T('빡세게 > 가볍게 (오름)', ()=>g2[0]>g0[0] ? g0[0].toFixed(2)+' < '+g2[0].toFixed(2) : '!'+g0+' / '+g2);
  T('빡세게가 컨디션을 더 깎는다', ()=>g2[1]>g0[1] ? '-'+g0[1]+' < -'+g2[1] : '!'+g0+' / '+g2);
  ev("go('train')"); await wait(30);
  T('훈련 화면 — 루틴 · 특성 카드', ()=>!!d.querySelector('.rtn-card') && !!d.querySelector('.trt-card'));
  clean('훈련');

  console.log('\n[특성]');
  ev("rtState().lv=2; for(let i=0;i<10;i++) mtWeek();");
  T('빡세게 10주 → 노력파', ()=>ev("mtHas('노력파')"));
  T('노력파면 훈련 1.25배', ()=>Math.abs(ev("mtTrainMul()")-1.25)<1e-6);
  ev("for(let i=0;i<3;i++){ ST.injury[ST.playerId]={name:'발목 접질림',games:2}; mtWeek(); ST.injury[ST.playerId]=null; mtWeek(); }");
  T('부상 세 번 → 유리몸', ()=>ev("mtHas('유리몸')"));
  ev("ST.mt.prog.iron=39; mtWeek();");
  T('유리몸과 철강은 같이 못 간다', ()=>!(ev("mtHas('유리몸')")&&ev("mtHas('철강')")) ? (ev("mtHas('철강')")?'철강':'유리몸') : '!둘 다');
  /* 새로고침 — META 를 상수에서 다시 만든다 */
  ev("const T2=JSON.parse(JSON.stringify(ST.mt)); META[ST.playerId].traits=META[ST.playerId].traits.filter(x=>T2.have.indexOf(x)<0); applyMyRatings();");
  T('새로고침해도 특성이 남는다', ()=>ev("mtHas('노력파')"));
  ev("ST.mt.have=ST.mt.have.filter(x=>x!=='철강'); mtGive('유리몸');");
  const r1=JSON.parse(ev("JSON.stringify(mtTryRemove('유리몸', ()=>0.5))"));
  T('지우기 — 90% 는 실패', ()=>!r1.ok ? r1.why : '!지워졌다');
  const r2=JSON.parse(ev("JSON.stringify(mtTryRemove('유리몸', ()=>0.01))"));
  T('한 해 한 번뿐', ()=>!r2.ok && /올해/.test(r2.why) ? r2.why : '!'+JSON.stringify(r2));
  ev("ST.seasonNo=(ST.seasonNo||1)+1;");
  const r3=JSON.parse(ev("JSON.stringify(mtTryRemove('유리몸', ()=>0.05))"));
  T('다음 해 10% 안이면 지워진다', ()=>r3.ok && !ev("mtHas('유리몸')"));
  T('좋은 특성은 못 지운다', ()=>!JSON.parse(ev("JSON.stringify(mtTryRemove('노력파', ()=>0))")).ok);

  console.log('\n[지갑 — 프로]');
  ev("proEnter({team:'lg', round:3, pick:4, level:'1군', bonus:25000}); ST.pro.earned=25000; go('home');"); await wait(30);
  T('로비에 「지갑」', ()=>[...d.querySelectorAll('.lob-ic')].some(b=>/지갑/.test(b.textContent)));
  ev("renderWallet()"); await wait(20);
  T('지갑 화면', ()=>/내 지갑/.test(d.getElementById('view').textContent));
  clean('지갑');
  T('모자라면 못 산다', ()=>/모자라다/.test(ev("walBuy('house',1)")||''));
  const m0=ev("walMoney()"); ev("walBuy('house',0)");
  T('원룸 전세 — 5,000만 빠진다', ()=>m0-ev("walMoney()")===5000 && ev("walLife().house")===0);
  const c0=ev("(ST.cond[ST.playerId]=60)"); ev("pfWeek()");
  T('집 — 매주 컨디션 +', ()=>ev("ST.cond[ST.playerId]")>c0);
  ev("walBuy('car',1)");
  T('차 — 국산 세단', ()=>ev("walLife().car")===1);
  const off0=ev("pfMyOffer().offer"); ev("pfState().myOffer=null;");

  console.log('\n[불법 도박 — 중징계]');
  let cnt=0; ev("ST.pro.earned=200000;");
  const r=JSON.parse(ev("JSON.stringify(walGamble('illegal', 1000, (function(){ let k=0; return ()=>[0.9,0.01][k++%2]; })()))"));
  T('적발', ()=>r.caught);
  T('72경기 출장정지', ()=>ev("ST.injury[ST.playerId]&&ST.injury[ST.playerId].susp&&ST.injury[ST.playerId].games===72"));
  T('「징계전력」', ()=>ev("mtHas('징계전력')"));
  T('국가대표 명단에서 빠진다', ()=>!ev("ntPool('wbc').hit.some(x=>x.p.id===ST.playerId)"));
  T('연봉 제시 -20%', ()=>{ const o=ev("pfMyOffer().offer"); return o<=Math.round(off0*0.85) || o===ev("kboMinSal(ST.pro.year+1)") ? off0+'→'+o : '!'+off0+'→'+o; });
  const e0=ev("ST.pro.earned"); ev("pfWeek()");
  T('징계 중엔 연봉이 안 나온다', ()=>ev("ST.pro.earned")<=e0);
  T('신문에 징계', ()=>ev("(ST.pro.news||[]).some(n=>/출장정지/.test(n.head))"));
  ev("for(let i=0;i<5;i++) walGamble('legal', 100, ()=>0.9);");
  T('다섯 번 하면 도박중독', ()=>ev("mtHas('도박중독')"));

  console.log('\n[특성 2 — 경기에서]');
  T('클러치히터 — 득점권에서 삼진 0.85 · 장타 1.1', ()=>{ const m=JSON.parse(ev("JSON.stringify(mtPaMods({traits:['클러치히터']},null,true))")); return m&&Math.abs(m.k-0.85)<1e-9&&Math.abs(m.pow-1.1)<1e-9 ? 'k '+m.k+' · pow '+m.pow : '!'+JSON.stringify(m); });
  T('득점권이 아니면 클러치 효과 없음', ()=>ev("mtPaMods({traits:['클러치히터']},null,false)")===null);
  T('배수는 곱한다(똑딱이 × 클러치)', ()=>Math.abs(ev("mtMerge({k:0.82,pow:0.55},{k:0.85,pow:1.1}).k")-0.82*0.85)<1e-9);
  ev("ST.mt.prog.clutch=0; mtLiveHook(null,{isUser:true},{isUser:false},{id:ST.playerId},{id:'x'},{type:'2B'},true);");
  T('득점권 안타를 센다', ()=>ev("ST.mt.prog.clutch")===1);
  ev("ST.mt.prog.clutch=14; mtLiveHook(null,{isUser:true},{isUser:false},{id:ST.playerId},{id:'x'},{type:'1B'},true); mtWeek();");
  T('15개 → 클러치히터', ()=>ev("mtHas('클러치히터')"));
  T('고무팔 — 후반에 덜 떨어진다', ()=>{ const a=ev("pitFade({id:'zz',stf:60,ctl:60,sta:40},30).dStf"); ev("META[ST.playerId].traits.push('고무팔')"); const b=ev("pitFade({id:ST.playerId,stf:60,ctl:60,sta:40},30).dStf"); return b<a ? a.toFixed(1)+' → '+b.toFixed(1) : '!'+a+' / '+b; });
  T('이닝이터 — 지치는 시점이 3아웃 늦다', ()=>{ const a=ev("pitFade({id:'zz',stf:60,ctl:60,sta:40},0).fadeAt"); ev("META[ST.playerId].traits.push('이닝이터')"); const b=ev("pitFade({id:ST.playerId,stf:60,ctl:60,sta:40},0).fadeAt"); return b===a+3 ? a+' → '+b : '!'+a+' / '+b; });

  console.log('\n[스태프 · 외국인 — 구단 금고]');
  ev("pfState().cash=200;");
  const cb=ev("stfState().coach.bat"), m1=ev("stfTrainMul('bat')");
  if(cb<5){ ev("stfUpgrade('bat')");
    T('타격 코치 교체 — 금고에서 나간다', ()=>ev("stfState().coach.bat")===cb+1 && ev("pfState().cash")<200 ? '★'+cb+'→★'+(cb+1)+' · 금고 '+ev("pfState().cash")+'억' : '!');
    T('타격 루틴이 더 잘 된다', ()=>ev("stfTrainMul('bat')")>m1 ? m1.toFixed(2)+'→'+ev("stfTrainMul('bat')").toFixed(2) : '!'); }
  T('내 통장은 안 건드린다', ()=>{ const w0=ev("walMoney()"); ev("stfUpgrade('pit')"); return ev("walMoney()")===w0; });
  const pool=JSON.parse(ev("JSON.stringify(stfMgrPool().list.map(x=>x.style))"));
  T('감독 후보 셋', ()=>pool.length===3 ? pool.join(',') : '!'+pool.length);
  const si=pool.indexOf('small');
  if(si>=0){ const sb0=ev("TBYID.wwzw.tend.sb"); ev("stfHireMgr("+si+")");
    T('스몰볼 감독 — 도루 성향이 오른다', ()=>ev("TBYID.wwzw.tend.sb")>sb0 ? sb0.toFixed(2)+'→'+ev("TBYID.wwzw.tend.sb").toFixed(2) : '!'); }
  const fx=JSON.parse(ev("JSON.stringify(fxPool().list.map(x=>({n:x.p.name,pit:x.pit,usd:x.usd,cap:x.cap})))"));
  const FX_MAX_T=ev('FX_MAX');
  T('외국인 후보 넷 · 상한 이하', ()=>fx.length===4 && fx.every(x=>x.usd<=x.cap) ? fx.map(x=>x.n+' '+x.usd).join(', ') : '!'+JSON.stringify(fx));
  T('자리가 꽉 차면 못 데려온다', ()=>{ if(ev("fxUsed()")<FX_MAX_T) return '빈 자리 — 건너뜀'; const e=ev("fxSign(0,'full')"); return /꽉 찼다/.test(e||'') ? e : '!'+e; });
  T('능력치는 범위로 보인다', ()=>{ const r=JSON.parse(ev("JSON.stringify(fxRange(fxPool().list[0], fxPool().list[0].pit?'stf':'con'))")); const v=ev("fxPool().list[0].p[fxPool().list[0].pit?'stf':'con']"); return r[0]<=v&&v<=r[1]&&r[1]>r[0] ? r.join('~')+' (참값 '+v+')' : '!'+r+'/'+v; });
  const rel=ev("fxOurs(true)[0]&&fxOurs(true)[0].id");
  const cR=ev("pfState().cash");
  if(rel){ ev("fxRelease('"+rel+"')"); T('먼저 내보낸다 — 잔여 연봉 절반', ()=>ev("!pfAll(TBYID.wwzw).find(p=>p.id==='"+rel+"')") && ev("pfState().cash")<cR); }
  ev("Math.random=()=>0.01");
  const c1=ev("pfState().cash"); const se=ev("fxSign(0,'full')");
  T('계약 — 비자 나오기 전엔 아직 안 왔다', ()=>!se && ev("!pfAll(TBYID.wwzw).find(p=>p.id===fxPool().list[0].p.id)") && ev("pfState().fxVisa.length")===1 ? '비자 대기' : '!'+se);
  T('금고에서 계약금 · 이적료가 나간다', ()=>ev("pfState().cash")<c1);
  ev("fxWeek(); fxWeek();");
  T('비자 나오면 우리 팀에 온다', ()=>ev("!!pfAll(TBYID.wwzw).find(p=>p.id===fxPool().list[0].p.id)"));
  T('✕ 하고 스카우트를 보내면 한 주 뒤 새 후보', ()=>{ const n0=ev("fxPool().list.length"); ev("fxCut(1); fxRescout(); fxWeek();"); return ev("fxPool().list.length")===n0+1; });
  reloadPro();
  T('불러와도 그 외국인이 우리 팀', ()=>ev("!!pfAll(TBYID.wwzw).find(p=>p.id===fxPool().list[0].p.id)"));
  ev("renderProFront('staff')"); await wait(20);
  T('스태프 탭 화면', ()=>/코치진/.test(d.getElementById('view').textContent)&&/외국인/.test(d.getElementById('view').textContent));
  clean('스태프');
  ev("go('train')"); await wait(20);
  T('선수 카드 — 종합 · 등급', ()=>{ const o=d.querySelector('.ocd-ovr'); return o&&/^\d+$/.test(o.textContent)&&d.querySelectorAll('.ocd-r b').length>=4 ? 'OVR '+o.textContent : '!'; });

  console.log('\n[v3.43 — 카드 · 이벤트 · 커리어]');
  T('리그 평균 줄이면 OPS+ 100', ()=>{ const r=JSON.parse(ev("JSON.stringify(crrBat({pa:600,ab:520,h:138,d2:25,d3:2,hr:9,bb:62,hbp:8},'CF'))")); return Math.abs(r.opsp-100)<=6 ? 'OPS+ '+r.opsp+' · WAR '+r.war.toFixed(1) : '!'+r.opsp; });
  T('리그 평균 투수면 ERA+ 100', ()=>ev("crrPit({outs:540,er:94,h:180,bb:60,w:10,l:10,k:140}).erap")===100);
  ev("renderProFront('roster')"); await wait(20);
  T('프런트 선수단 — 종합 뱃지', ()=>d.querySelectorAll('.pf-rrow .ovb').length>10 ? d.querySelectorAll('.pf-rrow .ovb').length+'명' : '!'+d.querySelectorAll('.pf-rrow .ovb').length);
  { const row=[...d.querySelectorAll('.pf-rrow')].find(r=>!r.classList.contains('me')); if(row) row.click(); await wait(20); }
  T('선수를 누르면 카드 시트', ()=>!!d.querySelector('#sheet.open .ocd-ovr'));
  ev("document.getElementById('sheet').classList.remove('open'); ST.gev=null;");
  ev("gevWeek(()=>0.01)");
  T('이벤트가 걸린다', ()=>ev("!!ST.gev") ? ev("ST.gev.id") : '!');
  ev("go('home')"); await wait(20);
  T('로비에 「이벤트」', ()=>[...d.querySelectorAll('.lob-ic')].some(b=>/이벤트/.test(b.textContent)));
  ev("gevOpen()"); await wait(10);
  T('이벤트 창 — 고를 거리', ()=>d.querySelectorAll('#sheet.open .gev-b').length>=2);
  const s1=statSum(), cg1=ev("ST.cond[ST.playerId]"), mo1=ev("ST.morale[ST.playerId]");
  d.querySelector('#sheet .gev-b').click(); await wait(20);
  T('고르면 결과가 나오고 이벤트가 끝난다', ()=>!!d.querySelector('#sheet .gev-r') && !ev("ST.gev") ? (d.querySelector('#sheet .gev-r').textContent.slice(0,40)) : '!');
  T('뭔가 바뀌었다(능력치 · 컨디션 · 사기)', ()=>statSum()!==s1 || ev("ST.cond[ST.playerId]")!==cg1 || ev("ST.morale[ST.playerId]")!==mo1);
  ev("ST.gev={id:'drink', wk:ST.round}; ST.round+=2; gevWeek(()=>0.99)");
  T('두 주 안 고르면 사라진다', ()=>!ev("ST.gev"));
  const eff=JSON.parse(ev("JSON.stringify(gevApply({pow:1.5, cond:-10}, ()=>0.5))"));
  T('효과 문구', ()=>eff.some(x=>/파워 \+1\.5/.test(x)) && eff.some(x=>/컨디션 -10/.test(x)) ? eff.join(' · ') : '!'+eff);
  ev("crrOpen()"); await wait(10);
  T('커리어 표', ()=>!!d.querySelector('#sheet.open .crr-t table') && /WAR/.test(d.querySelector('#sheet').textContent));
  ev("document.getElementById('sheet').classList.remove('open')");
  clean('커리어');

  console.log('\n[한 주 · 한 시즌]');
  ev("ST.injury[ST.playerId]=null;");
  for(let k=0;k<2;k++) ev("runWeek(); saveGame(true);");
  T('프로 주간이 돈다', ()=>ev("ST.round")>=2 ? ev("ST.round")+'주' : '!');
  ev("go('train')"); await wait(20); clean('프로 훈련');

  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
