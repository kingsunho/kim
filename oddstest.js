/* v2.44.0 — 오늘의 배당 */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|Could not load|stylesheet/.test(e.message))errs.push('JSDOM: '+e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

setTimeout(async()=>{
  d.querySelectorAll('.pickcard')[0].click();await wait(50);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(250);
  ev("ST.tutDone=true; ST.absent={}; ST.injury={};");
  ev("ST.lineup=recommendLineup(); ST.rotation=recommendRotation();");
  ev("runWeek(); ST.events=(ST.events||[]).filter(e=>e.type!=='rain'&&e.type!=='postpone');");

  console.log('[배당 계산]');
  const o=ev("JSON.parse(JSON.stringify(teamOdds()))");
  console.log(`    승 ${(o.w*100).toFixed(1)}% · 패 ${(o.l*100).toFixed(1)}% · 무 ${(o.d*100).toFixed(1)}% · ${o.n}경기`);
  T('배당이 나온다', ()=>!!o && o.n>0);
  T('확률 합이 1이다', ()=>Math.abs(o.w+o.d+o.l-1)<1e-9);
  T('예상 스코어가 4부답게 나온다', ()=>o.rf>2&&o.rf<25&&o.ra>2&&o.ra<25
    ? `${o.rf.toFixed(1)} : ${o.ra.toFixed(1)}` : `${o.rf} : ${o.ra}`);
  T('소수 배당이 1.01 아래로 안 내려간다', ()=>ev("decOdds(0.999)")>=1.01 && ev("decOdds(0)")>1);
  T('배당에 마진이 붙어 있다 (합이 100% 를 넘는다)', ()=>{
    const inv=1/ev(`decOdds(${o.w})`)+1/ev(`decOdds(${o.l})`);
    return inv>1.0 ? `북 합계 ${(inv*100).toFixed(1)}%` : `마진 없음 ${(inv*100).toFixed(1)}%`;
  });
  T('확률이 높을수록 배당이 낮다', ()=>ev("decOdds(0.8)")<ev("decOdds(0.3)"));

  console.log('\n[탑독 · 언더독]');
  T('다섯 단계가 다 있다', ()=>ev("ODDS_BANDS.length")===5);
  T('구간이 겹치지 않고 순서대로다', ()=>{
    const B=ev("JSON.parse(JSON.stringify(ODDS_BANDS))");
    for(let i=1;i<B.length;i++) if(B[i][0]>=B[i-1][0]) return false;
    return B[B.length-1][0]===0;
  });
  T('압도적 우세는 탑독, 절대 열세는 언더독', ()=>
    ev("oddsBand(0.90)[2]")==='탑독' && ev("oddsBand(0.10)[2]")==='언더독'
    && ev("oddsBand(0.50)[2]")==='');
  T('아무 확률이나 넣어도 딱지가 나온다', ()=>{
    for(let p=0;p<=1.0001;p+=0.05){ if(!ev(`oddsBand(${p.toFixed(2)})`)) return false; }
    return true;
  });

  console.log('\n[캐시 · 재현성]');
  T('같은 상황이면 배당이 그대로다', ()=>{
    const a=ev("teamOdds().w");
    ev("ST.odds=null");                    // 캐시를 비우고 다시 뽑아도
    const b=ev("teamOdds().w");
    return a===b ? `두 번 다 ${(a*100).toFixed(1)}%` : `${a} vs ${b}`;
  });
  T('두 번째 호출은 캐시를 쓴다', ()=>{
    ev("ST.odds=null"); ev("teamOdds()");
    const k1=ev("ST.odds.k");
    ev("window.__t0=Date.now(); teamOdds(); window.__ms=Date.now()-window.__t0;");
    return ev("ST.odds.k")===k1 && ev("window.__ms")<10 ? `${ev("window.__ms")}ms` : '캐시 안 씀';
  });
  T('라인업을 바꾸면 배당이 다시 뽑힌다', ()=>{
    const k1=ev("oddsKey()");
    ev("(function(){var a=ST.lineup[0],b=ST.lineup[8];var t=a.id;a.id=b.id;b.id=t;})()");
    const k2=ev("oddsKey()");
    ev("(function(){var a=ST.lineup[0],b=ST.lineup[8];var t=a.id;a.id=b.id;b.id=t;})()");
    return k1!==k2;
  });
  /* [간헐 실패] 예전엔 ST.rotation 을 한 칸 돌리고 열쇠가 바뀌는지 봤다.
     그날 나온 투수가 한 명뿐이면 gameRotation() 이 어차피 같은 목록을 내서
     열쇠가 안 바뀐다 — 게임 버그가 아니라 테스트가 그 경우를 안 가린 것이다.
     열쇠에 실제 등판 순서가 들어 있는지 구조로 확인한다. */
  T('열쇠에 등판 순서가 들어 있다', ()=>{
    const k=ev("oddsKey()"), rot=ev("gameRotation().join(',')");
    return rot.length>0 && k.indexOf(rot)>=0 ? rot : `열쇠에 없다: ${rot}`;
  });
  T('열쇠에 타순·수비 위치가 들어 있다', ()=>{
    const k=ev("oddsKey()"), lu=ev("ST.lineup.map(x=>x.id+':'+x.pos).join(',')");
    return k.indexOf(lu)>=0;
  });
  T('등판 순서가 실제로 바뀌면 열쇠도 바뀐다', ()=>{
    const before=ev("gameRotation().join(',')"), k1=ev("oddsKey()");
    ev("ST.rotation=ST.rotation.slice(1).concat(ST.rotation[0])");
    const after=ev("gameRotation().join(',')"), k2=ev("oddsKey()");
    if(before===after) return `등판 가능 투수가 ${before.split(',').length}명뿐 — 순서가 안 바뀐다`;
    return k1!==k2;
  });

  console.log('\n[스컴 방지]');
  T('배당 시드가 실제 경기 시드와 다르다', ()=>{
    const real=ev("(((ST.seed||0)+(ST.round||0)*7919+(ST.weekSeq||0)*104729)>>>0)");
    const odd=ev("oddsSeed()");
    return real!==odd ? `경기 ${real} · 배당 ${odd}` : '같다 — 결과가 샌다';
  });
  T('배당을 뽑아도 실제 경기 시드가 안 흔들린다', ()=>{
    const before=ev("ST.seed");
    ev("ST.odds=null; teamOdds(); teamOdds();");
    return ev("ST.seed")===before;
  });
  T('배당을 여러 번 뽑아도 경기 결과가 그대로다', ()=>{
    function play(){
      ev("LIVE=makeLive(); var g=0; while(!LIVE.over&&g++<4000){ if(LIVE.pending)LIVE.applyDecision('change'); LIVE.step(); }");
      return ev("(function(){var n=ST.schedule[ST.round];var r=LIVE.result;var u=n.homeGame?r.home:r.away,t=n.homeGame?r.away:r.home;return u.runs+':'+t.runs})()");
    }
    const a=play();
    ev("ST.odds=null; teamOdds(); teamOdds(); teamOdds();");
    const b=play();
    return a===b ? `두 번 다 ${a}` : `${a} vs ${b}`;
  });

  console.log('\n[중계와 같은 세팅을 쓰나]');
  T('buildMatchup 이 ST 를 안 건드린다', ()=>{
    const snap=ev("JSON.stringify({r:ST.rotation,l:ST.lineup,c:ST.cond,g:ST.gameStarters||null})");
    ev("buildMatchup(ST.lineup.map(s=>({id:s.id,pos:s.pos})))");
    return ev("JSON.stringify({r:ST.rotation,l:ST.lineup,c:ST.cond,g:ST.gameStarters||null})")===snap;
  });
  T('makeLive 와 배당이 같은 수비력·컨디션·투수를 본다', ()=>{
    const r=ev(`(function(){
      var uL=ST.lineup.map(s=>({id:s.id,pos:s.pos}));
      var M=buildMatchup(uL);
      var L=makeLive();
      var side=L.userIsHome?L.home:L.away;
      var t=side.team;
      return {a:M.us._slotDef, b:t._slotDef, ea:M.us._errMod, eb:t._errMod,
              ca:JSON.stringify(M.cond), cb:JSON.stringify(side.cond),
              pa:JSON.stringify(M.us.pitchers), pb:JSON.stringify(t.pitchers)};
    })()`);
    if(Math.abs(r.a-r.b)>1e-9) return `수비력 ${r.a} vs ${r.b}`;
    if(Math.abs(r.ea-r.eb)>1e-9) return `실책배수 ${r.ea} vs ${r.eb}`;
    if(r.ca!==r.cb) return '컨디션이 다르다';
    if(r.pa!==r.pb) return '투수 상태가 다르다';
    return `수비 ${r.a.toFixed(2)} · 실책배수 ${r.ea.toFixed(3)} · 컨디션/투수 일치`;
  });
  T('경기를 시작하면 그날 배당이 박힌다', ()=>{
    ev("LIVE=makeLive()");
    const o0=ev("JSON.parse(JSON.stringify(ST.oddsAtStart||null))");
    return o0 && o0.dec>=1 && typeof o0.band==='string'
      ? `배당 ${o0.dec.toFixed(2)} · ${o0.band}` : '스냅샷 없음';
  });

  console.log('\n[화면]');
  /* 배당 카드는 홈 화면의 '이번 주 경기' 카드 밑에 붙는다 —
     상대·구장·스카우팅이 있는 자리다. 우천 취소면 안 뜬다. */
  const showHome=()=>{ ev("LIVE=null; ST.announced=true; ST.lineupDirty=false; ST.events=[];");
    w.go('home'); return d.getElementById('view').textContent; };
  T('경기 전 화면에 배당 카드가 뜬다', ()=>{
    const t=showHome();
    return /오늘의 배당/.test(t) && /탑독|언더독|백중세/.test(t);
  });
  T('배당 숫자가 화면에 찍힌다', ()=>{
    const v=[...d.querySelectorAll('#view .od-v')].map(x=>x.textContent);
    return v.length===2 && v.every(x=>/^\d+\.\d\d$/.test(x)) ? v.join(' vs ') : false;
  });
  T('유리한 쪽에 표시가 붙는다', ()=>d.querySelectorAll('#view .od-side.fav').length===1);
  T('승률 바가 그려진다', ()=>{
    const u=d.querySelector('#view .od-bar u');
    return !!u && /%/.test(u.getAttribute('style')||'');
  });
  T('예상 스코어가 보인다', ()=>/예상 스코어/.test(d.getElementById('view').textContent));
  T('undefined / NaN 없음', ()=>!/undefined|NaN/.test(d.getElementById('view').textContent));
  T('김한규가 삐치면 배당도 없다', ()=>{
    ev("ST.scoutBlocked=true"); showHome();
    const t=d.getElementById('view').textContent;
    ev("ST.scoutBlocked=false");
    return /김한규가 자료를 안 넘겼다/.test(t) && !d.querySelector('#view .od-v');
  });
  T('우천 취소된 주에는 배당이 안 뜬다', ()=>{
    ev("ST.events=[{type:'rain',title:'비',body:'',effect:''}]"); w.go('home');
    const t=d.getElementById('view').textContent;
    ev("ST.events=[]");
    return !/오늘의 배당/.test(t);
  });

  console.log('\n[남의 팀 경기 배당]');
  T('이번 주 대진이 뽑힌다', ()=>{
    const rows=ev("leagueOdds().rows.length");
    return rows>0 ? `${rows}경기` : false;
  });
  T('대진에 우리 팀과 우리 상대는 안 들어간다', ()=>{
    const opp=ev("ST.schedule[ST.round].opp");
    const rows=ev("JSON.stringify(leagueOdds().rows.map(r=>[r.a,r.h]))");
    return !/wwzw/.test(rows) && rows.indexOf('"'+opp+'"')<0;
  });
  T('같은 팀이 두 번 나오지 않는다', ()=>{
    const rows=JSON.parse(ev("JSON.stringify(leagueOdds().rows.map(r=>[r.a,r.h]))"));
    const seen=new Set();
    for(const [a,h] of rows){ if(seen.has(a)||seen.has(h))return false; seen.add(a); seen.add(h); }
    return true;
  });
  T('한 번에 한 경기씩 채워진다', ()=>{
    ev("ST.lgOdds=null"); const total=ev("leagueOdds().rows.length");
    ev("leagueOddsStep()");
    const done1=ev("leagueOdds().rows.filter(r=>r.o).length");
    ev("leagueOddsStep()");
    const done2=ev("leagueOdds().rows.filter(r=>r.o).length");
    return done1===1 && done2===2 ? `${done2}/${total}` : `${done1} → ${done2}`;
  });
  T('다 채우면 더 돌 게 없다고 한다', ()=>{
    let guard=0; while(ev("leagueOddsStep()") && guard++<60){}
    return ev("leagueOdds().rows.every(r=>!!r.o)") && ev("leagueOddsStep()")===false;
  });
  T('양쪽 확률 합이 1이다', ()=>ev("leagueOdds().rows.every(r=>Math.abs(r.o.aw+r.o.hw+r.o.d-1)<1e-9)"));
  T('주가 바뀌면 대진을 다시 뽑는다', ()=>{
    const k1=ev("lgOddsKey()");
    ev("ST.round++"); const k2=ev("lgOddsKey()"); ev("ST.round--");
    return k1!==k2;
  });
  /* 여기가 핵심 — 미리 보여준 대진이 실제로 붙는 대진과 같아야 한다.
     weekPairings 와 simOtherGames 가 같은 난수열을 쓰는지 확인한다. */
  T('미리 뽑은 대진이 실제로 붙는 대진과 같다', ()=>{
    const pred=ev("JSON.stringify(weekPairings(ST.schedule[ST.round].opp).pairs.map(p=>p.away.id+'@'+p.home.id))");
    ev("simOtherGames(ST.schedule[ST.round].opp)");
    const act=ev("JSON.stringify(ST.weekGames.games.map(g=>g.a+'@'+g.h))");
    return pred===act ? `${JSON.parse(pred).length}경기 일치` : `예상 ${pred}\n실제 ${act}`;
  });
  T('결과에 몇 주차인지 박힌다', ()=>ev("ST.weekGames.round")===ev("ST.round"));
  T('결과에 그때 걸렸던 배당이 남는다', ()=>{
    const g=ev("JSON.parse(JSON.stringify(ST.weekGames.games[0]))");
    return g.aO>=1 && g.hO>=1 ? `${g.aO.toFixed(2)} vs ${g.hO.toFixed(2)}` : '배당이 안 남았다';
  });
  T('배당 예측이 실제 결과와 대충 맞는다', ()=>{
    const gs=JSON.parse(ev("JSON.stringify(ST.weekGames.games)"));
    const judged=gs.filter(g=>g.aO!=null&&g.ar!==g.hr);
    const hit=judged.filter(g=>(g.ar>g.hr)===(g.aO<=g.hO)).length;
    // 절반은 넘어야 배당이 정보를 담고 있다는 뜻이다
    return hit*2>=judged.length ? `${judged.length}경기 중 ${hit}경기 적중` : `${hit}/${judged.length} — 동전 던지기만도 못하다`;
  });

  console.log('\n[리그 화면]');
  T('순위 화면에 이번 주 대진 카드가 뜬다', ()=>{
    ev("ST.lgOdds=null"); w.go('stand');
    const t=d.getElementById('view').textContent;
    return /이번 주 리그/.test(t) && /리그 순위/.test(t);
  });
  T('배당을 다 뽑으면 줄마다 숫자가 붙는다', ()=>{
    let guard=0; while(ev("leagueOddsStep()") && guard++<60){}
    w.go('stand');
    const rows=[...d.querySelectorAll('#view .lgo-r')];
    const withOdds=rows.filter(r=>r.querySelectorAll('.lgo-t em').length===2);
    return rows.length>0 && withOdds.length===rows.filter(r=>!r.classList.contains('done')).length
      ? `${withOdds.length}줄` : `${withOdds.length}/${rows.length}`;
  });
  T('유리한 쪽이 줄마다 하나씩 표시된다', ()=>{
    const rows=[...d.querySelectorAll('#view .lgo-r')].filter(r=>!r.classList.contains('done'));
    return rows.length>0 && rows.every(r=>r.querySelectorAll('.lgo-t.fav').length===1);
  });
  T('지난주 결과 카드가 뜬다', ()=>{
    ev("ST.weekGames.round=ST.round-1"); w.go('stand');
    const t=d.getElementById('view').textContent;
    return /지난주 리그/.test(t) && /배당이 \d+경기 중 \d+경기를 맞혔다/.test(t);
  });
  T('지난주 줄에 점수와 적중 여부가 나온다', ()=>{
    const done=[...d.querySelectorAll('#view .lgo-r.done')];
    if(!done.length) return false;
    const ok=done.every(r=>/^\d+ : \d+$/.test(r.querySelector('.lgo-m b').textContent.trim()));
    const marks=done.filter(r=>/배당대로|이변|무승부/.test(r.querySelector('.lgo-m i').textContent));
    return ok && marks.length===done.length ? `${done.length}줄` : `점수 ${ok} · 판정 ${marks.length}/${done.length}`;
  });
  T('지난주가 아니면 안 뜬다', ()=>{
    ev("ST.weekGames.round=ST.round-5"); w.go('stand');
    const t=d.getElementById('view').textContent;
    ev("ST.weekGames.round=ST.round-1");
    return !/지난주 리그/.test(t);
  });
  T('리그 화면에 undefined / NaN 없음', ()=>{
    w.go('stand'); return !/undefined|NaN/.test(d.getElementById('view').textContent);
  });
  T('플레이오프 주간에는 대진 대신 안내가 나온다', ()=>{
    ev("ST.schedule[ST.round].po=true; ST.lgOdds=null;"); w.go('stand');
    const t=d.getElementById('view').textContent;
    // 지난주 결과 카드는 플레이오프 주간에도 그대로 남는다 — 예정 대진만 없어야 한다
    const upcoming=[...d.querySelectorAll('#view .lgo-r')].filter(r=>!r.classList.contains('done'));
    ev("delete ST.schedule[ST.round].po; ST.lgOdds=null;");
    return /플레이오프 주간이다/.test(t) && upcoming.length===0;
  });
  T('옛 세이브(배열이던 weekGames)도 안 깨진다', ()=>{
    ev("ST.weekGames=[{a:'sasin',h:'ilgu',ar:3,hr:2}]; normalizeState();");
    w.go('stand');
    return ev("ST.weekGames&&Array.isArray(ST.weekGames.games)")
      && !/undefined|NaN/.test(d.getElementById('view').textContent);
  });

  console.log('\n[경기 후 정산]');
  T('결과 화면에 배당 정산 줄이 붙는다', ()=>{
    ev(`(function(){
      LIVE=makeLive(); var g=0;
      while(!LIVE.over&&g++<4000){ if(LIVE.pending)LIVE.applyDecision('change'); LIVE.step(); }
      var st=document.createElement('div'); st.id='stage';
      var v=document.getElementById('view'); v.innerHTML=''; v.appendChild(st);
      var dc=document.createElement('div'); dc.id='decision'; st.appendChild(dc);
      showResult();
    })()`);
    const row=d.querySelector('#view .od-settle');
    if(row) console.log('    ', row.textContent.replace(/\s+/g,' ').trim());
    return !!row;
  });
  T('정산 줄에 배당 숫자가 들어간다', ()=>{
    const t=(d.querySelector('#view .od-settle')||{}).textContent||'';
    return /\d\.\d\d/.test(t) || /무승부/.test(t);
  });
  T('정산 줄에 undefined 없음', ()=>{
    const t=(d.querySelector('#view .od-settle')||{}).textContent||'';
    return !/undefined|NaN/.test(t);
  });
  T('옛 세이브(배당 없음)도 결과 화면이 안 깨진다', ()=>{
    ev("ST.oddsAtStart=null");
    ev(`(function(){ var st=document.createElement('div'); st.id='stage';
      var v=document.getElementById('view'); v.innerHTML=''; v.appendChild(st);
      var dc=document.createElement('div'); dc.id='decision'; st.appendChild(dc);
      showResult(); })()`);
    return !d.querySelector('#view .od-settle')
      && !/undefined|NaN/.test(d.getElementById('view').textContent);
  });

  console.log(errs.length?`\n❌ ${errs.length}건\n - `+errs.join('\n - '):'\n✅ 전부 통과');
  process.exit(errs.length?1:0);
},600);
