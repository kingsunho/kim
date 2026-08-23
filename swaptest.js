/* [2.14.0] 두 번 눌러 타순·포지션 바꾸기 */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo/.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const order=()=>ev("ST.lineup.map(function(s,i){return (i+1)+'.'+nameOf(s.id)+'('+POSNAMES[s.pos]+')'}).join(' ')");
setTimeout(async()=>{
  d.querySelectorAll('.pickcard')[0].click();await wait(50);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(250);
  ev("ST.tutDone=true; ST.weekDone=true; ST.absent={}; ST.injury={};");
  ev("ST.lineup=recommendLineup(); ST.rotation=recommendRotation(); ST.luView='list'; swapIdx=null;");

  console.log('[명단 — 타순 맞바꾸기]');
  ev("go('lineup')");
  T('▲▼ 대신 교체 버튼이 있다', ()=>{
    const up=d.querySelectorAll('.lp-row .up').length;
    const sub=d.querySelectorAll('.lp-row .lp-sub').length;
    return up===0 && sub===9 && `▲▼ ${up}개 · 교체 ${sub}개`;
  });
  T('한 번 누르면 선택 표시가 뜬다', ()=>{
    d.querySelectorAll('.lp-row')[2].querySelector('.lp-main').click();
    const picked=d.querySelectorAll('.lp-row.picked').length;
    return picked===1 && ev("swapIdx")===2 && '3번 선택됨';
  });
  T('안내문이 누구를 골랐는지 알려준다', ()=>{
    const n=[...d.querySelectorAll('#view .field-note')].map(x=>x.textContent).join(' ');
    return /선택됨/.test(n) && n.trim().slice(0,44);
  });
  const before=ev("[ST.lineup[2].id,ST.lineup[6].id]");
  T('다른 이름을 누르면 타순이 맞바뀐다 (두 번으로 끝)', ()=>{
    d.querySelectorAll('.lp-row')[6].querySelector('.lp-main').click();
    const after=ev("[ST.lineup[2].id,ST.lineup[6].id]");
    return (after[0]===before[1] && after[1]===before[0])
      ? `${ev(`nameOf('${before[0]}')`)} 3번↔7번 ${ev(`nameOf('${before[1]}')`)}` : false;
  });
  T('수비 위치도 선수를 따라간다', ()=>{
    ev("ST.lineup=recommendLineup(); swapIdx=null; go('lineup')");
    const b=ev("[ST.lineup[1].id,ST.lineup[1].pos,ST.lineup[5].id,ST.lineup[5].pos]");
    ev("tapSwap(1); tapSwap(5)");
    const a=ev("[ST.lineup[5].id,ST.lineup[5].pos,ST.lineup[1].id,ST.lineup[1].pos]");
    return (a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2]&&a[3]===b[3])
      ? `${ev(`nameOf('${b[0]}')`)} ${ev(`POSNAMES['${b[1]}']`)} 유지` : false;
  });
  T('같은 걸 또 누르면 선택이 풀린다', ()=>{
    ev("swapIdx=null; tapSwap(3)");
    const on=ev("swapIdx");
    ev("tapSwap(3)");
    return (on===3 && ev("swapIdx")===null) && '선택 → 취소';
  });
  T('타순 인원·중복은 그대로', ()=>{
    const n=ev("ST.lineup.length");
    const ids=ev("ST.lineup.map(function(s){return s.id})");
    const dup=ids.filter((x,i)=>ids.indexOf(x)!==i);
    return n===9 && dup.length===0 && '9명 · 중복 없음';
  });

  console.log('[야구장 — 수비 위치만 맞바꾸기]');
  ev("ST.lineup=recommendLineup(); swapIdx=null; ST.luView='field'; go('lineup')");
  T('자리를 누르면 선택된다', ()=>{
    const cells=[...d.querySelectorAll('.field .fp')];
    const c=cells.find(x=>/좌익|중견|우익/.test(x.querySelector('.fp-p').textContent));
    c.click();
    return ev("swapIdx")!=null && d.querySelectorAll('.fp.picked').length===1 && '선택 표시 있음';
  });
  T('다른 자리를 누르면 수비만 바뀌고 타순은 그대로', ()=>{
    ev("ST.lineup=recommendLineup(); swapIdx=null;");
    const b=ev("[ST.lineup[0].id,ST.lineup[0].pos,ST.lineup[4].id,ST.lineup[4].pos]");
    ev(`tapSwapPos('${b[1]}'); tapSwapPos('${b[3]}')`);
    const a=ev("[ST.lineup[0].id,ST.lineup[0].pos,ST.lineup[4].id,ST.lineup[4].pos]");
    return (a[0]===b[0] && a[2]===b[2] && a[1]===b[3] && a[3]===b[1])
      ? `${ev(`nameOf('${b[0]}')`)} ${ev(`POSNAMES['${b[1]}']`)}→${ev(`POSNAMES['${b[3]}']`)} · 타순 그대로` : false;
  });
  T('포지션 중복이 안 생긴다', ()=>{
    const ps=ev("ST.lineup.map(function(s){return s.pos})");
    const dup=ps.filter((x,i)=>ps.indexOf(x)!==i);
    return dup.length===0 && '중복 없음';
  });
  T('탭을 옮기면 선택이 초기화된다', ()=>{
    ev("swapIdx=2; ST.luView='field'; go('lineup')");
    const t=[...d.querySelectorAll('.lu-tabs button')].find(x=>x.textContent==='명단');
    t.click();
    return ev("swapIdx")===null && '초기화됨';
  });

  if(errs.length) console.log('\n실패:',errs);
  console.log(errs.length?'\n❌ 실패 '+errs.length+'건':'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
},3000);
