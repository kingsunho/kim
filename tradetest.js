/* 패키지 트레이드 — 선수 3:3 · 지명권 · 현금 (v3.53.0)
   [요청] "트레이드는 1:1만 되는거야? 뭐 수준에 맞으면 지명권이나 뭐 더주고 할 수 있잖아"

   확인하는 것
     · 선수 여럿 + 지명권 + 현금을 묶어서 제안할 수 있다
     · 모자라면 거절, 얹으면 수락 — 지명권 · 현금이 실제로 값을 올린다
     · 그저 그런 여럿으로 에이스 하나를 못 빼 온다(묶음 할인)
     · 넘긴 지명권은 신인 드래프트 순서에서 새 주인이 부른다
     · 현금은 금고에서 빠진다 · 옛 1:1 함수(pfTrade)도 그대로 돈다
     · 트레이드 화면이 뜨고 undefined · NaN 이 안 찍힌다                         */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const bad=[]; const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Could not load|stylesheet|[Nn]ot implemented|getContext/.test(e.message)) bad.push('JSDOM: '+e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc,
  beforeParse(w){ w.scrollTo=()=>{}; w.TextEncoder=TextEncoder; w.TextDecoder=TextDecoder; }});
const w=dom.window,d=w.document,ev=s=>w.eval(s);
w.confirm=()=>true;
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0&&!/^!/.test(r));
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r.replace(/^!/,''):''));if(!ok)bad.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);bad.push(n+': '+e.message)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(40);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click(); await wait(250);
  ev(`ST.tutDone=true; ST.mode='mgr'; ST.role='bat'; ST.myPos='CF'; ST.playerId='ksh'; MYID='ksh';
      proEnter({team:'lg', round:3, pick:10, level:'1군'}); go('home');`);
  await wait(60);
  const K="'kia'";
  ev(`window._us=pfAll(TBYID.wwzw).filter(p=>p.id!=='ksh').sort((a,b)=>pfValue(b)-pfValue(a));
      window._th=pfAll(TBYID[pfIdOf(${K})]).sort((a,b)=>pfValue(b)-pfValue(a));
      window._U=pfUntouch(${K}); window._thAll=_th; window._th=_th.filter(p=>!_U.has(p.id));`);

  console.log('[값 매기기]');
  T('함수가 한 번씩만 선언', ()=>['pfTradeMulti','pfTradeEval','pfPicksOf','pfPickOwner','pfPkgValue'].every(n=>(html.match(new RegExp('^function '+n+'\\(','mg'))||[]).length===1));
  T('우리 지명권 1~3라운드가 있다', ()=>{ const n=ev("pfPicksOf(ST.pro.team).length"); return n===3 ? n+'장' : '!'+n; });
  T('지명권이 값을 올린다', ()=>{
    const a=ev(`pfTradeEval({team:${K}, give:[_us[8].id], get:[_th[3].id]}).give`);
    const b=ev(`pfTradeEval({team:${K}, give:[_us[8].id], get:[_th[3].id], givePicks:[pfPicksOf(ST.pro.team)[0].id]}).give`);
    return b>a+60 ? a+' → 1라운드 얹으면 '+b : '!'+a+'/'+b; });
  T('현금이 값을 올린다(1억에 9)', ()=>{
    const a=ev(`pfTradeEval({team:${K}, give:[_us[8].id], get:[_th[3].id]}).give`);
    const b=ev(`pfTradeEval({team:${K}, give:[_us[8].id], get:[_th[3].id], cash:10}).give`);
    return b===a+90 ? a+' → 10억 얹으면 '+b : '!'+a+'/'+b; });
  T('묶음 할인 — 그저 그런 셋 < 합계', ()=>{
    const pk=ev(`pfPkgValue([_us[20],_us[21],_us[22]], ${K})`), sum=ev(`[_us[20],_us[21],_us[22]].reduce((s,p)=>s+pfTradeAdj(p,${K}),0)`);
    return pk<sum*0.8 ? Math.round(pk)+' < 합계 '+Math.round(sum) : '!'+pk+'/'+sum; });
  T('리빌딩 구단은 지명권을 더 쳐준다', ()=>{
    const r=ev(`(function(){ var reb=PRO_TEAMS.map(d=>d.key).find(k=>proPhil(k).mode==='rebuild'), win=PRO_TEAMS.map(d=>d.key).find(k=>proPhil(k).mode==='win');
      if(!reb||!win) return 'skip'; var pk={y:2027,r:1,orig:ST.pro.team}; return JSON.stringify([pfPickValue(pk,reb),pfPickValue(pk,win)]); })()`);
    if(r==='skip') return '리빌딩/윈나우 구단이 없다 — 건너뜀';
    const [a,b]=JSON.parse(r); return a>b ? '리빌딩 '+Math.round(a)+' > 윈나우 '+Math.round(b) : '!'+r; });

  console.log('\n[제안]');
  T('절대 불가 — 간판·유망주는 아무리 얹어도 안 판다', ()=>{ const r=JSON.parse(ev(`(function(){ var u=_thAll.find(p=>_U.has(p.id)); if(!u) return JSON.stringify({skip:1});
      return JSON.stringify(pfTradeMulti({team:${K}, give:[_us[0].id,_us[1].id,_us[2].id], get:[u.id], givePicks:pfPicksOf(ST.pro.team).map(x=>x.id), cash:30})); })()`));
    ev("pfState().tradeRound=-99");
    return r.skip ? '불가 선수 없음' : (!r.ok && /절대 안 판다/.test(r.why) ? r.why : '!'+JSON.stringify(r)); });
  T('모자라면 거절', ()=>{ const r=JSON.parse(ev(`JSON.stringify(pfTradeMulti({team:${K}, give:[_us[_us.length-1].id], get:[_th[0].id]}))`));
    return !r.ok && /거절/.test(r.why) ? r.why : '!'+JSON.stringify(r); });
  ev("pfState().tradeRound=-99");
  const before=JSON.parse(ev(`JSON.stringify({cash:pfState().cash, n:pfAll(TBYID.wwzw).length})`));
  const deal=JSON.parse(ev(`(function(){
    var get=_th[4], give=[_us[2].id,_us[9].id], picks=pfPicksOf(ST.pro.team).map(x=>x.id).slice(0,2), getPk=pfPicksOf(${K})[2].id;
    var r=pfTradeMulti({team:${K}, give:give, get:[get.id], givePicks:picks, getPicks:[getPk], cash:10});
    return JSON.stringify({r:r, getId:get.id, give:give, picks:picks, getPk:getPk});
  })()`));
  T('얹으면 수락 — 2:1 + 지명권 둘 + 10억 ↔ 1 + 3라운드', ()=>deal.r.ok ? '주는 값 '+deal.r.give+' · 받는 값 '+deal.r.get : '!'+JSON.stringify(deal.r));
  T('선수가 실제로 옮겨 갔다', ()=>ev(`pfFind('${deal.getId}').t.id==='wwzw' && ${JSON.stringify(deal.give)}.every(id=>proKeyOf(pfFind(id).t.id)==='kia')`));
  T('현금이 금고에서 빠졌다', ()=>{ const c=ev("pfState().cash"); return Math.abs(before.cash-10-c)<0.05 ? before.cash.toFixed(1)+' → '+c.toFixed(1)+'억' : '!'+before.cash+' → '+c; });
  T('지명권 주인이 바뀌었다', ()=>ev(`pfState().pickOwn['${deal.picks[0]}']==='kia' && pfState().pickOwn['${deal.getPk}']===ST.pro.team`));
  T('신인 드래프트 순서에서 새 주인이 부른다', ()=>{
    const r=JSON.parse(ev(`(function(){ var o=pfRookieOrder(); var r1=o.slice(0,10), r3=o.slice(20,30);
      return JSON.stringify({kia1:r1.filter(k=>k==='kia').length, us1:r1.filter(k=>k===ST.pro.team).length, us3:r3.filter(k=>k===ST.pro.team).length}); })()`));
    return r.kia1===2 && r.us1===0 && r.us3===2 ? '1라운드 — 호랑이 두 번 · 우리 0번 / 3라운드 우리 두 번' : '!'+JSON.stringify(r); });
  T('한 번 하면 네 주 쉰다', ()=>{ const r=JSON.parse(ev(`JSON.stringify(pfTradeMulti({team:${K}, give:[_us[5].id], get:[_th[20].id]}))`)); return !r.ok && /네 주/.test(r.why); });
  ev("pfState().tradeRound=-99");
  T('옛 1:1 함수도 돈다', ()=>{ const r=JSON.parse(ev(`JSON.stringify(pfTrade(_us[1].id, _th[30].id))`)); return r.ok ? '성사' : '!'+JSON.stringify(r); });
  T('신문에 트레이드가 난다', ()=>ev("(ST.pro.news||[]).some(n=>n.tag==='트레이드' && /지명권 포함/.test(n.head))"));

  console.log('\n[화면]');
  ev("pfState().tradeRound=-99; renderProFront('trade')"); await wait(30);
  const txt=d.getElementById('view').textContent;
  T('트레이드 화면 — 보낸다 · 받는다 · 지명권 · 현금', ()=>/보낸다/.test(txt)&&/받는다/.test(txt)&&/지명권/.test(txt)&&/현금/.test(txt));
  T('고르면 상대 반응이 바뀐다', ()=>{
    const say0=d.querySelector('.tr-say').textContent;
    const chips=[...d.querySelectorAll('.tr-col')[0].querySelectorAll('.tr-chip')];
    chips[0].click(); chips[1].click();
    const say1=d.querySelector('.tr-say').textContent;
    return say0!==say1 ? say0.replace(/.*— /,'')+' → '+say1.replace(/.*— /,'') : '!'+say0; });
  T('화면에 undefined · NaN 없음', ()=>!/undefined|NaN/.test(d.getElementById('view').textContent));
  T('옛 세이브 — pickOwn 을 채운다', ()=>ev("delete ST.pro.front.pickOwn; typeof pfState().pickOwn==='object'"));

  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
