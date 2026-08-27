/* 고등학교 프롤로그 — 누구로 시작하든 같은 자리에서 출발하나
   [요청] "선수모드 키울때는 그 별같은게 없이 동등하게
           그냥 고딩때 순수 타격실력 투구 실력으로 기본 20으로 해놓고"

   예전에는 고교 능력치가 전부 어른 능력치에 곱한 값이었다.
   송승민으로 시작하면 고1 컨택 47, 이민혁이면 6. 여덟 배 차이였다.
   여기서 보는 것 —
     · 열넷 중 누구로 시작해도 고1 능력치가 전부 HS_BASE 다
     · 졸업치가 어른 능력치를 안 따라간다 (성적만 따라간다)
     · 성적이 좋으면 졸업치가 높다 (눈금이 죽어 있지 않다)
     · 투수로 시작하면 실제로 던진다 (예전엔 명단에서 잘렸다)         */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo/.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n);if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};

/* 프롤로그 3년을 자동으로 완주하고 졸업 능력치를 돌려준다 */
const run=(pid,role,seed)=>JSON.parse(ev(`(function(){
  ST.mode='player'; ST.role='${role}'; ST.myPos=${role==='pit'?'null':"'RF'"};
  ST.playerId='${pid}'; MYID='${pid}';
  ST.seed=${seed}; ST.hs=null; ST.hsRatings=null;
  TEAMS=buildAllTeams();TBYID={};TEAMS.forEach(x=>TBYID[x.id]=x);buildPitcherPool();
  const H=hsSlot();
  const N=(typeof hsStory==='function')?hsStory().length:HS_STORY.length;
  for(let k=0;k<N;k++){ try{hsPlay();}catch(e){} H.pending=null; H.i++; }
  hsGraduate();
  const b=H.bat,q=H.pit,R=ST.hsRatings||{};
  return JSON.stringify({avg:b.ab?b.h/b.ab:0, ab:b.ab, outs:q.outs,
    con:R.con, pow:R.pow, def:R.def, pitch:R.pitch||null});
})()`));

setTimeout(async()=>{
  d.querySelectorAll('.pickcard')[0].click();await new Promise(r=>setTimeout(r,60));
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await new Promise(r=>setTimeout(r,300));
  const ids=ev("TBYID['wwzw'].players.map(p=>p.id).join(',')").split(',');
  const BASE=ev("typeof HS_BASE!=='undefined'?HS_BASE:20");   // 옛 코드에는 없다

  console.log('[고1 시작 능력치 — 전원 같아야 한다]');
  const starts=ev(`(function(){
    const out={};
    ${JSON.stringify(ids)}.forEach(pid=>{
      ST.playerId=pid; MYID=pid; ST.role='bat';
      const t=hsTeamOf('gunpo',2016,1,pid,0)||{players:[]};
      const p=t.players.find(x=>x.id===pid);
      const t2=hsTeamOf('heung',2016,1,pid,0)||{players:[]};
      const p2=p||t2.players.find(x=>x.id===pid);
      if(p2) out[pid]=[p2.con,p2.pow,p2.eye,p2.spd,p2.def,p2.arm];
    });
    return JSON.stringify(out);
  })()`);
  const S=JSON.parse(starts);
  console.log('   '+Object.keys(S).length+'명 · 예: '+JSON.stringify(Object.values(S)[0]));
  T('열넷 전원 고1 능력치가 '+BASE, ()=>Object.keys(S).length>=14
    && Object.values(S).every(v=>v.every(x=>x===BASE)));
  T('어른 능력치를 안 물려받는다', ()=>{
    const adult=ev("TBYID['wwzw'].players.map(p=>p.con).join(',')").split(',').map(Number);
    return Math.max(...adult)-Math.min(...adult)>50;   // 어른은 12~87 로 벌어져 있는데
  });

  console.log('\n[졸업 — 고른 사람이 아니라 성적이 정한다]');
  const R=ids.map(pid=>({pid, r:run(pid,'bat',911)}));
  const cons=R.map(x=>x.r.con);
  console.log('   같은 시드 열넷 졸업 컨택: '+cons.join(' '));
  T('졸업치가 '+BASE+' 아래로 안 내려간다', ()=>cons.every(c=>c>=BASE));
  T('졸업치가 어른 능력치 순서를 안 따라간다', ()=>{
    const adult=ev(`(function(){const m={};TBYID['wwzw'].players.forEach(p=>m[p.id]=p.con);return JSON.stringify(m)})()`);
    const A=JSON.parse(adult);
    /* 어른 컨택 1위(송승민 87)가 졸업 컨택도 1위면 물려받고 있는 것이다 */
    const top=R.slice().sort((a,b)=>A[b.pid]-A[a.pid])[0];
    const best=R.slice().sort((a,b)=>b.r.con-a.r.con)[0];
    return top.pid!==best.pid;
  });

  console.log('\n[눈금이 살아 있나 — 성적이 좋으면 졸업치도 높다]');
  const many=[];
  ids.slice(0,6).forEach(pid=>{ for(let sd=1;sd<=5;sd++) many.push(run(pid,'bat',sd*911)); });
  const lo=many.filter(x=>x.avg<0.20), hi=many.filter(x=>x.avg>0.35);
  const mean=a=>a.reduce((s,x)=>s+x.con,0)/Math.max(1,a.length);
  console.log('   타율 .200 미만 '+lo.length+'판 평균 컨택 '+mean(lo).toFixed(1)+
              ' · .350 초과 '+hi.length+'판 평균 컨택 '+mean(hi).toFixed(1));
  T('못 친 3년과 잘 친 3년이 갈린다', ()=>lo.length&&hi.length&&(mean(hi)-mean(lo))>=8);
  T('졸업치 폭이 실제로 벌어진다', ()=>{
    const c=many.map(x=>x.con);
    return (Math.max(...c)-Math.min(...c))>=15;
  });

  console.log('\n[투수로 시작하면 실제로 던진다]');
  const P=ids.slice(0,5).map(pid=>run(pid,'pit',911));
  console.log('   아웃카운트: '+P.map(x=>x.outs).join(' '));
  T('전원 한 경기 이상 던진다', ()=>P.every(x=>x.outs>=9));
  T('투구 졸업 능력치가 나온다', ()=>P.every(x=>x.pitch&&x.pitch.stf>=BASE));
  T('구위가 0으로 안 나온다', ()=>P.every(x=>x.pitch.stf>0&&x.pitch.ctl>0&&x.pitch.sta>0));

  console.log('\n[별]');
  T('선수 모드 선택 화면에 잠재 별이 없다', ()=>{
    ev("ST.mode='player'"); w.go('pick');
    const h=d.querySelector('#view').innerHTML;
    return h.indexOf('잠재')<0 && h.indexOf('같은 자리')>=0;
  });
  T('감독 모드에는 그대로 있다', ()=>{
    ev("ST.mode='mgr'"); w.go('pick');
    return d.querySelector('#view').innerHTML.indexOf('잠재')>=0;
  });

  console.log(errs.length?'\n실패 '+errs.length+'개':'\n전부 통과');
  if(errs.length){console.log(errs.join('\n'));process.exit(1);}
  process.exit(0);
},1800);
