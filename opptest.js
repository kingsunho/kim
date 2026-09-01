/* 상대 팀도 색깔이 있다 · 매니저가 하루에 더 나온다

   [요청] "매니저를 하루에 더 등장시키기 / 평판을 상대도 갖게 하기 —
   23개 팀에 각각 성향을 주면 스카우팅이 진짜 의미가 생긴다"

   [문제] 상대 23팀은 능력치만 달랐지 **다 똑같이 굴렸다.** 도루 극단적인
   팀도 벤치는 'normal' 이라 실제로는 안 뛰었다. 스카우팅 카드는
   기록 나열이었고 경기에서 그게 그대로 나오지 않았다.
   [문제] 매니저는 아침에 한마디 하고 단톡방 전화만 대신 돌렸다.
   「눈치」와 「기록」은 숫자로만 있고 하는 일이 없었다.              */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|Not implemented/.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n);if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const txt=()=>(d.querySelector('#view')||{}).textContent||'';

setTimeout(async()=>{
  console.log('[23개 팀에 색깔이 붙는다]');
  const tags=ev(`(function(){const T=buildAllTeams();
    return T.filter(t=>!t.isUser).map(t=>({id:t.id,n:oppRep(t).name,h:oppRep(t).hookName}));})()`);
  T('우리 팀은 상대 성향이 없다', ()=>ev(`oppRep(TBYID['wwzw'])`)===null);
  T('상대 팀 전부에 성향이 붙는다', ()=>tags.length>=22 && tags.every(x=>x.n));
  const kinds=[...new Set(tags.map(x=>x.n))];
  console.log('   성향 '+kinds.length+'가지: '+kinds.join(' · '));
  T('한 가지로 쏠리지 않는다 (5가지 이상)', ()=>kinds.length>=5);
  T('「색깔 없음」이 절반을 넘지 않는다',
    ()=>tags.filter(x=>x.n==='색깔 없음').length <= tags.length/2);
  T('같은 팀은 항상 같은 성향이다 (id 로 고정)', ()=>{
    const a=ev(`oppRep(buildAllTeams().find(t=>t.id==='boss')).hookName`);
    const b=ev(`oppRep(buildAllTeams().find(t=>t.id==='boss')).hookName`);
    return a===b;
  });
  T('성향은 실제 기록에서 나온다 — 도루 1.3 이상은 「뛰는 팀」', ()=>
    tags.filter(x=>ev(`buildAllTeams().find(t=>t.id==='${x.id}').tend.sb`)>=1.30)
        .every(x=>x.n==='뛰는 팀'));

  console.log('\n[색깔대로 실제로 굴린다]');
  T('「뛰는 팀」은 지시가 aggressive 다', ()=>{
    const t=tags.find(x=>x.n==='뛰는 팀');
    return ev(`oppTactics(TBYID['${t.id}']).run`)==='aggressive';
  });
  T('「골라 나감」은 지시가 patient 다', ()=>{
    const t=tags.find(x=>x.n==='골라 나감');
    return ev(`oppTactics(TBYID['${t.id}']).bat`)==='patient';
  });
  T('지시가 아니라 성향이니 절반만 먹인다 (lean)', ()=>
    ev(`oppTactics(TBYID['boss']).lean`)===true);
  T('lean 이 배수를 절반으로 줄인다', ()=>{
    /* patient 는 볼넷 1.45 배. lean 이면 1.225 배여야 한다 */
    const full=ev(`(function(){let n=0;const T=buildAllTeams();const rng=makeRng(4242);
      for(let i=0;i<400;i++){const r=simPA(T[1].players[0],T[2].pitchers[0],T[1],T[2],rng,
        {bat:'patient',run:'normal',hook:'normal'});if(r.type==='BB')n++;}return n;})()`);
    const lean=ev(`(function(){let n=0;const T=buildAllTeams();const rng=makeRng(4242);
      for(let i=0;i<400;i++){const r=simPA(T[1].players[0],T[2].pitchers[0],T[1],T[2],rng,
        {bat:'patient',run:'normal',hook:'normal',lean:true});if(r.type==='BB')n++;}return n;})()`);
    const base=ev(`(function(){let n=0;const T=buildAllTeams();const rng=makeRng(4242);
      for(let i=0;i<400;i++){const r=simPA(T[1].players[0],T[2].pitchers[0],T[1],T[2],rng,
        {bat:'normal',run:'normal',hook:'normal'});if(r.type==='BB')n++;}return n;})()`);
    console.log('   볼넷 400타석 — 기본 '+base+' · 성향 '+lean+' · 지시 '+full);
    return base<lean && lean<full;
  });
  T('실제 경기가 상대 성향을 들고 들어간다 (neutral 이 안 남았다)',
    ()=>!/homeTactics:\s*(next\.homeGame\?\{\.\.\.ST\.tactics\}:)?neutral/.test(html)
        && html.indexOf('const neutral=')<0);
  T('리그 득점이 크게 안 흔들린다 (팀당 ±0.6점)', ()=>{
    const f=(tac)=>ev(`(function(){const T=buildAllTeams();const rng=makeRng(777);
      let g=0,r=0;
      for(let s=0;s<4;s++)for(let i=0;i<T.length;i++)for(let j=0;j<T.length;j++){
        if(i===j)continue; if(((i*31+j*17+s*7)%9)!==0)continue;
        const o={rng,innings:7,awayLineup:aiLineup(T[i]),awayRotation:aiRotation(T[i]),
          homeLineup:aiLineup(T[j]),homeRotation:aiRotation(T[j])};
        if(${tac}){o.awayTactics=oppTactics(T[i]);o.homeTactics=oppTactics(T[j]);}
        const x=simGame(T[j],T[i],o); g++; r+=x.away.runs+x.home.runs;
      } return r/g/2;})()`);
    const a=f(false), b=f(true);
    console.log('   팀당 득점 — 성향 없음 '+a.toFixed(2)+' → 성향 '+b.toFixed(2));
    return Math.abs(a-b)<0.6;
  });

  /* ---- 게임을 하나 시작한다 ---- */
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300);

  console.log('\n[스카우팅 카드에 상대 감독이 나온다]');
  T('매니저가 없으면 성향 이름만 나온다', ()=>{
    ev("ST.mgr=null");
    const l=ev(`scoutLine(TBYID['boss'])`);
    return /상대 감독/.test(l) && !/주자만 나가면/.test(l);
  });
  T('매니저가 없으면 있으면 더 읽어준다고 알려준다',
    ()=>/매니저가 있으면/.test(ev(`scoutLine(TBYID['boss'])`)));
  T('기록 48 이상이면 설명까지 읽어준다', ()=>{
    ev("ST.mgr={k:'rec',name:'테스트',s:{rec:50,care:40,eye:40},g:0}");
    return /주자만 나가면/.test(ev(`scoutLine(TBYID['boss'])`));
  });
  T('기록 64 이상이면 투수 굴리는 것까지 읽어준다', ()=>{
    ev("ST.mgr.s.rec=70");
    return /투수는 「/.test(ev(`scoutLine(TBYID['boss'])`));
  });
  T('기록이 낮으면 거기까지는 못 읽는다', ()=>{
    ev("ST.mgr.s.rec=42");
    return !/주자만 나가면/.test(ev(`scoutLine(TBYID['boss'])`));
  });
  T('스카우팅이 막히면 아무것도 안 나온다', ()=>{
    ev("ST.scoutBlocked=true"); w.go('home');
    const r=!/상대 감독/.test(txt()); ev("ST.scoutBlocked=false"); return r;
  });

  console.log('\n[매니저가 하루에 더 나온다]');
  ev("ST.mgr={k:'eye',name:'테스트',s:{rec:70,care:64,eye:70},g:0}");
  T('차 안에서 상대 얘기를 해 준다', ()=>{
    ev("dayReset(); ST.day.step=2;"); w.go('day');
    return ev("(ST.day.log||[]).join('|')").indexOf('테스트:')>=0
        && /자료 봤는데요/.test(ev("(ST.day.log||[]).join('|')"));
  });
  /* [버그 이력] 매니저 말을 마디 안에서 밀어 넣는 바람에 로그 카드가
     이미 그려진 뒤였다 — 한 마디씩 늦게 떴다. 화면으로 확인한다. */
  T('그 말이 그 화면에 바로 보인다 (한 마디 늦지 않는다)',
    ()=>/자료 봤는데요/.test(txt()));
  T('아침 인사도 아침 화면에 보인다', ()=>{
    ev("ST.mgr.s.rec=70; dayReset();"); w.go('day');
    return /아이스박스/.test(txt()) && /07:20/.test(txt());
  });
  T('기록이 낮으면 자료가 없다고 한다', ()=>{
    ev("ST.mgr.s.rec=30; dayReset(); ST.day.step=2;"); w.go('day');
    return /자료가 별로 없어요/.test(ev("(ST.day.log||[]).join('|')"));
  });
  T('구장에서 몸 안 좋은 사람을 귀띔한다', ()=>{
    const pid=ev(`(function(){const p=TBYID['wwzw'].players.find(x=>x.id!==(ST.playerId||MYID));
      ST.absent={}; ST.injury={}; ST.unhappy={};
      TBYID['wwzw'].players.forEach(q=>ST.cond[q.id]=80);
      ST.cond[p.id]=40; return p.id;})()`);
    ev("dayReset(); ST.day.step=3;"); w.go('day');
    return ev("(ST.day.log||[]).join('|')").indexOf(ev(`nameOf('${pid}')`))>=0;
  });
  T('귀띔이 그 화면에 바로 보인다', ()=>/어깨 계속 돌리시던데요/.test(txt()));
  T('귀띔받은 사람을 챙기는 선택지가 생긴다',
    ()=>[...d.querySelectorAll('#view .day-opt span')].some(x=>/챙긴다/.test(x.textContent)));
  T('챙기면 그쪽 컨디션이 오른다', ()=>{
    const before=ev(`(function(){const n=[...document.querySelectorAll('#view .day-opt span')][0].textContent
      .replace(' 챙긴다','');const p=TBYID['wwzw'].players.find(x=>x.name===n);
      window.__tid=p.id; return ST.cond[p.id];})()`);
    d.querySelectorAll('#view .day-opt')[0].click();
    return ev("ST.cond[window.__tid]")>before;
  });
  T('눈치가 낮으면 아무것도 못 본다', ()=>{
    ev("ST.mgr.s.eye=40"); return ev("mgrTipTarget()")===null;
  });
  T('매니저가 없으면 귀띔도 없다', ()=>{
    ev("const _m=ST.mgr; ST.mgr=null; window.__r=mgrTipTarget(); ST.mgr=_m;");
    return ev("window.__r")===null;
  });
  T('저녁에 회식비를 말해 준다', ()=>{
    ev(`ST.mgr.s.care=64; ST.budget=200;
        ST.glog=[{us:5,them:3,line:{}}]; dayReset(); ST.day.done=true; nightOpen();`);
    w.go('day');
    return /테스트:/.test(ev("(ST.day.nlog||[]).join('|')"))
        && /만원/.test(ev("(ST.day.nlog||[]).join('|')"))
        && /미리 말해놨어요/.test(txt());     // 저녁 화면에 바로 보인다
  });
  T('살림이 좋으면 회식비를 실제로 깎는다', ()=>{
    const c=ev("Math.round(PARTY_COST*mgrMul('party'))");
    console.log('   회식비 '+ev("PARTY_COST")+'만원 → 살림 64 면 '+c+'만원');
    return c<ev("PARTY_COST");
  });
  T('깎인 값이 실제로 통장에서 나간다', ()=>{
    const cost=ev("Math.max(5,Math.round(PARTY_COST*mgrMul('party')))");
    const b0=ev("ST.budget");
    const btn=[...d.querySelectorAll('#view .day-opt')].find(x=>/회식 간다/.test(x.textContent));
    if(!btn) return false;
    btn.click();
    return ev("ST.budget")===b0-cost;
  });

  console.log('\n[깨진 데 없나]');
  T('콘솔 에러 없음', ()=>{
    const bad=errs.filter(e=>typeof e==='string'&&/TypeError|ReferenceError|not defined/.test(e));
    if(bad.length) console.log('   '+bad.slice(0,3).join('\n   '));
    return bad.length===0;
  });
  T('oppRep 이 한 번만 선언돼 있다',
    ()=>(html.match(/function oppRep\(/g)||[]).length===1);
  T('oppTactics 가 한 번만 선언돼 있다',
    ()=>(html.match(/function oppTactics\(/g)||[]).length===1);

  const real=errs.filter(e=>typeof e==='string');
  console.log(real.length?('\n❌ '+real.length+'개 실패'):'\n✅ 전부 통과');
  process.exit(real.length?1:0);
},600);
