/* v3.71.0 — 한규 제보 묶음
   · 선발명단 — 감독의 한 주 교체(managerTweak)가 나를 못 뺀다 · 빠져 있으면 다음 주에 다시 들어간다 · 프로 effCA 는 지금 능력치
   · 등번호 — 원래 주인이 지키는 게 기본, 이름값 큰 스타(명성 70+, 20 차이)는 물려받고 선물한다
   · AI 구단끼리 트레이드(마감 전 · 한 시즌 여섯 건까지) · 대형 트레이드 · 대형 FA 뉴스
   · 2차 드래프트 — 잠재(pfPot) · 나이 · 프랜차이즈 · 이름값으로 묶는다
   · 설정 — 선수단 둘러보기 · 이름/등번호/팀명 · 플레이타임은 위에 보인다                        */
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
  d.querySelectorAll('.pickcard')[0].click(); await wait(40);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click(); await wait(250);
  ev(`ST.tutDone=true; ST.mode='player'; ST.role='bat'; ST.myPos='SS'; ST.playerId='ksh'; MYID='ksh'; proEnter({team:'lg', round:3, pick:10, level:'1군'});`);
  console.log('[선발명단]');
  ev("ST.ca=ST.ca||{}; ST.ca['ksh']=5;");
  T('프로 effCA 는 사회인 시절 값(ST.ca)이 아니라 지금 능력치', ()=>{ const v=ev("effCA('ksh')"); return v>20 ? String(v) : '!'+v; });
  T('감독의 한 주 교체가 나를 안 뺀다', ()=>{ let out=false; for(let i=0;i<6;i++){ const t=JSON.parse(ev("JSON.stringify(managerTweak())")); if(t&&t.outId==='ksh') out=true; } return !out; });
  ev("(function(){ var L=ST.lineup; var i=L.findIndex(function(s){return s.id==='ksh';}); var b=TBYID.wwzw.players.find(function(p){return !L.some(function(s){return s.id===p.id;})&&p.id!=='ksh';}); L[i]={id:b.id,pos:L[i].pos}; })()");
  T('빠져 있으면 다음 주에 다시 들어간다', ()=>{ ev("runWeek()"); return ev("ST.lineup.some(function(s){return s.id==='ksh';})") ? '돌아왔다' : '!빠진 채'; });
  console.log('\n[등번호 — 선물]');
  T('이름값 큰 스타가 오면 번호를 물려받고 선물 기사가 난다', ()=>{
    const r=ev(`(function(){ var a=TBYID[pfIdOf('kia')], b=TBYID[pfIdOf('hh')];
      var star=pfAll(b).filter(function(p){return !pfIsForeign(p,'hh');}).sort(function(x,z){return pfRep(z)-pfRep(x);})[0];
      var low=pfAll(a).filter(function(p){return pfRep(p)<=pfRep(star)-25&&pfRep(p)<50&&!pfFranchise(p,'kia')&&p.no!=null;})[0];
      if(!star||!low||pfRep(star)<70) return 'skip '+(star&&pfRep(star));
      var n=low.no; star.no=n; pfMove(star,'hh','kia','트레이드');
      var s2=pfAll(a).find(function(p){return p.id===star.id;}), l2=pfAll(a).find(function(p){return p.id===low.id;});
      var news=(ST.pro.news||[]).find(function(x){return x.tag==='등번호';});
      return (s2.no===n&&l2.no!==n&&news)?(star.name+' '+n+'번 · '+news.head):('!'+s2.no+'/'+l2.no+'/'+n+' '+(news&&news.head)); })()`);
    return r; });
  T('기본은 원래 주인이 지킨다(이름값 차이가 작으면)', ()=>/pfRep\(p\)>=70 && pfRep\(p\)-pfRep\(o\)>=20 && pfRep\(o\)<55/.test(ev("String(pfDedupNos)")));
  console.log('\n[AI 프런트]');
  const tr=JSON.parse(ev(`(function(){ var n=0, big=0; for(var s=1;s<=6;s++){ ST.seed=s; pfState().aiTrades=[]; for(var r=0;r<96;r+=6){ ST.round=r; var t=pfAiTradeWeek(); if(t){ n++; if(t.big) big++; } } } return JSON.stringify({n:n,big:big}); })()`));
  T('AI 구단끼리 트레이드가 난다(여섯 시즌에 몇 건씩)', ()=>tr.n>=3 ? tr.n+'건 · 대형 '+tr.big : '!'+tr.n);
  T('프랜차이즈 · 대형 계약도 부진 + 사는 쪽 포지션이 급하면 가끔 나온다', ()=>/bigOK=\(p\)=>slump\(p\) && needAt/.test(ev("String(pfAiTradeWeek)")));
  T('트레이드 기사가 난다', ()=>ev("(ST.pro.news||[]).some(function(x){return x.tag==='트레이드';})"));
  T('마감(7월 31일) 뒤엔 안 한다', ()=>{ ev("ST.round=100"); return ev("pfAiTradeWeek()")===null; });
  T('대형 FA 기사(30억+ · 80억+ 은 [대형 FA])', ()=>/\[대형 FA\]/.test(ev("String(pfFAClose)")));
  console.log('\n[2차 드래프트]');
  T('프랜차이즈 · 명성 75+ 는 명단에 없다', ()=>{ const r=ev("pfD2Pool().filter(function(x){return pfFranchise(x.p,proKeyOf(x.t.id))||pfRep(x.p)>=75;}).map(function(x){return x.p.name;}).join(',')"); return r===''?'없다':'!'+r; });
  T('보호 점수에 잠재(pfPot)가 들어간다', ()=>/pfPot\(p\)/.test(ev("String(pfD2ProtV)")));
  console.log('\n[설정]');
  ev("go('more')"); await wait(20);
  T('선수단 둘러보기 · 이름/등번호/팀명 · 플레이타임은 위에 보인다', ()=>{ const t=[...d.querySelectorAll('#view > .card > .card-h')].map(h=>h.textContent.trim());
    return ['선수단 둘러보기','이름 · 등번호 · 팀명','플레이타임'].every(x=>t.indexOf(x)>=0) ? t.join(' · ') : '!'+t.join(','); });
  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
