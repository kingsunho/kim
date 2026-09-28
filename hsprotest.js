/* 고교 졸업 → 바로 프로 / 사회인 먼저 — 진로 고르기.
   [v3.37.0] 「고교 끝나고 바로 프로 도전할건지 사회인야구 끝나고 도전할건지 선택 —
   전자면 좀 하위 드래프트, 사회인야구까지 하면 상위 라운드」 로 생겼다.

   확인하는 것
     · 졸업 화면에 두 갈래(우완좌완 드래프트장 · 바로 KBO 신청)가 다 뜬다
     · 바로 신청하면 5~10 라운드 — 같은 점수라도 사회인 트라이아웃 쪽이 늘 더 위다
     · 드래프트 날 내 줄에 「고졸 바로 신청」 · 학교 이름이 찍히고, 입단하면 2군 · 프로 모드
     · 우완좌완 입단 드래프트(entryDraft)와 2군 공지는 걷힌다
     · 사회인 갈래는 예전 그대로(드래프트장으로 간다)                           */
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
  ev("ST.tutDone=true; ST.tutStep=99; ST.mode='player'; ST.role='bat'; ST.myPos='CF';");

  console.log('[라운드 규칙]');
  T('고졸 바로 신청은 5~10 라운드', ()=>{ const r=[40,50,60,70,80,85].map(s=>ev(`proDraftSlot(${s},'hs').round`));
    return r.every(x=>x>=5&&x<=10) ? r.join('·') : '!'+r.join('·'); });
  T('같은 점수면 사회인 트라이아웃이 늘 더 위(작은 라운드)', ()=>{ const ok=[45,55,65,75,85].every(s=>ev(`proDraftSlot(${s}).round<=proDraftSlot(${s},'hs').round`));
    return ok ? '맞다' : '!아니다'; });
  T('사회인 1라운드는 열려 있다', ()=>ev("proDraftSlot(90).round")===1);

  console.log('\n[고교 3년 → 졸업 화면]');
  ev(`(function(){ const H=hsSlot(); let g=0;
    while(!H.done && g++<60){ H.sayAt=99; H.picked=H.picked||{}; const s=hsStory()[H.i];
      if(s&&s.pick&&H.picked[H.i]==null) H.picked[H.i]=0;
      if(s&&!s.noGame) hsPlay(); H.pending=null; H.i++; if(H.i>=hsStory().length){ hsGraduate(); } }
  })()`);
  T('졸업했다', ()=>ev("!!(ST.hs&&ST.hs.done)") ? '졸업' : '!아직');
  const snap=ev("JSON.stringify(ST)");
  ev("renderHS()"); await wait(40);
  T('두 갈래가 다 뜬다', ()=>!!btn(/사회인야구부터/) && !!btn(/바로 프로/) ? '둘 다' : '!'+[...d.querySelectorAll('#view .btn')].map(b=>b.textContent).join('|'));
  T('진로 카드에 예상 라운드가 나온다', ()=>{ const t=(d.querySelector('.hs-route')||{}).textContent||''; return /라운드/.test(t) ? t.match(/예상 \d+라운드/)[0] : '!'; });
  clean('졸업');

  console.log('\n[바로 프로]');
  btn(/바로 프로/).click(); await wait(40);
  T('entryDraft · 2군 공지가 걷혔다', ()=>ev("!ST.entryDraft && !(ST.notices||[]).some(n=>n.type==='farm')"));
  T('슬롯이 하위 라운드', ()=>{ const r=ev("ST.proSlot.round"); return r>=5&&r<=10 ? r+'라운드' : '!'+r; });
  const sk=btn(/빨리 넘기기/); if(sk) sk.click(); await wait(40);
  T('내 줄 — 학교 · 「고졸 바로 신청」', ()=>{ const r=d.querySelector('.dr-row.mine'); const t=r?r.textContent:''; return /고졸 바로 신청/.test(t)&&/고/.test(t) ? t.slice(0,40) : '!'+t; });
  btn(/입단한다/).click(); await wait(80);
  T('프로 모드로 들어갔다', ()=>ev("isPro()") ? ev("proName(ST.pro.team)") : '!아니다');
  T('2군에서 시작', ()=>ev("ST.pro.level")==='2군' ? '2군' : '!'+ev("ST.pro.level"));
  T('2027 시즌으로 들어간다(리그 기준 해)', ()=>ev("ST.pro.year")===2027 ? '2027' : '!'+ev("ST.pro.year"));
  T('나이는 고졸 19세', ()=>ev("pfAge({id:ST.playerId||MYID})")===19 ? '19세' : '!'+ev("pfAge({id:ST.playerId||MYID})"));
  T('신문에 「졸업 바로 프로」', ()=>ev("(ST.pro.news||[]).some(n=>/바로 프로/.test(n.head))"));
  T('프로 한 주가 돈다', ()=>{ ev("runWeek(); saveGame(true);"); return ev("ST.round>=1") ? ST_round() : '!'; function ST_round(){ return ev("ST.round")+'주'; } });
  clean('프로 홈');

  console.log('\n[사회인 먼저 — 예전 길]');
  ev(`TEAMS=[]; TBYID={}; ST=JSON.parse(${JSON.stringify(snap)}); TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(t=>TBYID[t.id]=t); normalizeState();`);
  ev("renderHS()"); await wait(40);
  btn(/사회인야구부터/).click(); await wait(60);
  T('우완좌완 드래프트장으로 간다', ()=>ev("!!ST.entryDraft && !isPro()") ? '드래프트장' : '!');

  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
