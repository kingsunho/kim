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

  console.log('\n[한 주 · 한 시즌]');
  ev("ST.injury[ST.playerId]=null;");
  for(let k=0;k<2;k++) ev("runWeek(); saveGame(true);");
  T('프로 주간이 돈다', ()=>ev("ST.round")>=2 ? ev("ST.round")+'주' : '!');
  ev("go('train')"); await wait(20); clean('프로 훈련');

  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
