/* 병역 — 상무 지원(점수제) · 특례 · 만 27세 넘기면 현역.
   [v3.38.0] 「올림픽 동메달 이상 · 아시안게임 금만 면제, 상무는 해마다 신청 — 티오 안에 못 들면
   떨어진다, 그 나이까지 못 풀면 강제 입대」 로 생겼다.

   확인하는 것
     · 사회인 출신은 군필 — 병역 카드가 안 뜬다. 고졸 바로 입단(route 'hs')은 미필
     · 상무 지원은 한 해 한 번, 순위 · 합격선이 나오고 투수 6 · 야수 6 만 붙는다
     · 붙으면 한 해를 건너뛰어(상무) 능력치가 오르고 1군으로 돌아온다
     · 만 27세 시즌 끝까지 미필이면 현역 — 한 해 건너뛰고 능력치가 떨어지고 2군
     · 특례(ST.pro.exempt)면 입대가 없다 · 올림픽 메달도 특례다
     · 복무한 해는 FA 햇수(pfMySvc)에 안 들어간다
     · 돌아와서 시즌이 돈다                                                   */
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
const restore=snap=>ev(`TEAMS=[]; TBYID={}; ST=JSON.parse(${JSON.stringify(snap)}); TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(t=>TBYID[t.id]=t); normalizeState(); applyMyRatings();`);
const sum=()=>ev("(function(){ const R=ST.myRatings||{}; return ['con','pow','eye','spd','def','arm'].reduce((a,k)=>a+(R[k]||0),0); })()");

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(40);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click(); await wait(250);
  ev(`ST.tutDone=true; ST.mode='player'; ST.role='bat'; ST.myPos='CF'; ST.playerId='ksh'; MYID='ksh';
      proEnter({team:'lg', round:7, pick:3, level:'1군'}); go('home');`);
  await wait(40);

  console.log('[사회인 출신 = 군필]');
  T('미필 아님', ()=>!ev("milNeeds()") && ev("milState().st")==='done' ? '군필' : '!'+ev("milState().st"));
  ev("ST.pro.year=2027; proSeasonEnd();"); await wait(30);
  T('시즌 끝 화면에 병역 카드가 없다', ()=>!d.querySelector('.mil-card'));

  console.log('\n[고졸 바로 입단 = 미필]');
  ev("ST.pro.route='hs'; ST.pro.age0=19; ST.pro.year0=2027; ST.pro.mil=null;");
  T('미필 · 19세', ()=>ev("milNeeds()") && ev("pfAge({id:'ksh'})")===19 ? '19세 미필' : '!');
  ev("proSeasonScreen(ST.pro.history[ST.pro.history.length-1], ST.pro.lastPost)"); await wait(20);
  T('병역 카드 · 상무 지원 버튼', ()=>{ const c=d.querySelector('.mil-card'); return c && /상무 지원서/.test(c.textContent) ? '있다' : '!'; });
  clean('병역 카드');
  const snap=ev("JSON.stringify(ST)");

  console.log('\n[상무 — 점수제]');
  [...d.querySelectorAll('.mil-card .btn')].find(b=>/상무 지원서/.test(b.textContent)).click(); await wait(30);
  const R=JSON.parse(ev("JSON.stringify(milState().apply[ST.pro.year])"));
  T('결과 — 순위 · 합격선 · 정원 6', ()=>R&&R.rank>=1&&R.n>=R.to&&R.to===6 ? (R.ok?'합격':'탈락')+' '+R.rank+'/'+R.n+' · 합격선 '+R.cut+' · 내 점수 '+R.mine : '!'+JSON.stringify(R));
  T('합격 여부 = 순위가 정원 안', ()=>R.ok===(R.rank<=R.to));
  T('한 해 한 번 — 다시 내도 같은 결과', ()=>JSON.stringify(JSON.parse(ev("JSON.stringify(milApply())")))===JSON.stringify(R));
  T('카드에 결과가 찍힌다', ()=>/상무 (합격|탈락)/.test((d.querySelector('.mil-card')||{}).textContent||''));

  /* 강제로 합격시켜서 — 능력치를 크게 올린다 */
  restore(snap);
  ev("['con','pow','eye','spd','def','arm'].forEach(k=>ST.myRatings[k]=85); applyMyRatings();");
  const R2=JSON.parse(ev("JSON.stringify(milApply())"));
  T('잘하면 붙는다', ()=>R2.ok ? R2.rank+'위' : '!'+JSON.stringify(R2));
  const y0=ev("ST.pro.year"), s0=sum(), svc0=ev("pfMySvc()");
  ev("proNextYear()"); await wait(30);
  T('상무 — 한 해 건너뛴다', ()=>ev("ST.pro.year")===y0+2 ? y0+' → '+(y0+2) : '!'+ev("ST.pro.year"));
  T('상무 — 능력치가 올랐다', ()=>sum()>s0 ? '+'+(sum()-s0) : '!'+(sum()-s0));
  T('상무 — 1군으로 돌아온다', ()=>ev("ST.pro.level")==='1군');
  T('군필이 됐다', ()=>ev("milState().st")==='done' && ev("milState().svc.kind")==='sangmu');
  T('복무한 해는 FA 햇수에 안 든다', ()=>ev("pfMySvc()")===svc0 ? svc0+'시즌 그대로' : '!'+svc0+'→'+ev("pfMySvc()"));

  console.log('\n[만 27세 — 현역]');
  restore(snap);
  ev("ST.pro.year0=2027-8;");                     // 올해 27세
  T('올해 27세', ()=>ev("pfAge({id:'ksh'})")===27);
  ev("proSeasonScreen(ST.pro.history[ST.pro.history.length-1], ST.pro.lastPost)"); await wait(20);
  T('카드에 「올겨울이 마지막」', ()=>/마지막/.test((d.querySelector('.mil-card')||{}).textContent||''));
  const y1=ev("ST.pro.year"), s1=sum();
  ev("proNextYear()"); await wait(30);
  T('현역 — 한 해 건너뛴다', ()=>ev("ST.pro.year")===y1+2);
  T('현역 — 능력치가 떨어졌다', ()=>sum()<s1 ? (sum()-s1)+'' : '!'+(sum()-s1));
  T('현역 — 2군에서 다시', ()=>ev("ST.pro.level")==='2군');
  T('신문에 「현역 입대」', ()=>ev("(ST.pro.news||[]).some(n=>/현역 입대/.test(n.head))"));

  console.log('\n[특례]');
  restore(snap);
  ev("ST.pro.year0=2027-8; ST.pro.exempt=true;");
  const y2=ev("ST.pro.year"); ev("proNextYear()"); await wait(30);
  T('특례면 27세여도 입대 없다', ()=>ev("ST.pro.year")===y2+1 && ev("milState().st")==='exempt');
  T('올림픽 메달도 특례(규칙)', ()=>/ev==='olympic' && !!medal/.test(ev("ntPlay.toString()")));
  T('올림픽 대회 카드 문구', ()=>/동메달 이상이면 병역 특례/.test(ev("ntCard.toString()")));

  console.log('\n[돌아와서 시즌]');
  for(let k=0;k<3;k++) ev("runWeek(); saveGame(true);");
  T('시즌이 돈다', ()=>ev("ST.round")>=3 ? ev("ST.round")+'주' : '!'+ev("ST.round"));
  ev("go('home')"); clean('홈');

  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
