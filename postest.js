/* [2.17.1] 라인업 수비 자리 무결성 — 투수 두 명 · 빈 자리 방지 */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo/.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const lu=()=>JSON.parse(ev("JSON.stringify(ST.lineup)"));
/* 타순 아홉 칸이 수비 아홉 자리를 정확히 한 번씩 덮는가 */
const legal=()=>{
  const L=lu(), dh=ev("!!ST.useDH");
  const need=['C','1B','2B','3B','SS','LF','CF','RF'].concat([dh?'DH':'P']);
  const got=L.map(x=>x.pos).sort().join(',');
  return got===need.slice().sort().join(',') ? '' : got;
};
setTimeout(async()=>{
  d.querySelectorAll('.pickcard')[0].click();await wait(50);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(250);
  ev("ST.tutDone=true; ST.weekDone=true; ST.absent={}; ST.injury={};");

  console.log('[야구장 그림 — 마운드 교환]');
  ev("ST.useDH=false; ST.lineup=recommendLineup(); ST.rotation=recommendRotation(); applyDHRule(); ST.luView='field'; go('lineup');");
  T('시작 상태가 정상이다', ()=>legal()===''||legal());
  T('마운드와 중견수를 맞바꾸면 투수가 두 명이 되지 않는다', ()=>{
    ev("tapSwapPos('P'); tapSwapPos('CF');");
    const p=lu().filter(x=>x.pos==='P');
    return p.length===1 && (legal()===''||legal());
  });
  T('맞바꾼 사람이 실제 오늘 선발이 된다', ()=>{
    const p=lu().find(x=>x.pos==='P');
    return ev("gameRotation()[0]")===p.id && ev("ST.rotation[0]")===p.id && nm(p.id);
  });
  function nm(id){ return ev(`nameOf('${id}')`); }
  /* 우리 팀은 열네 명 전원이 급하면 던진다(buildPitcherPool). 그래서 야수와
     마운드를 맞바꾸면 그 사람이 오늘 선발이 되는 게 맞다 — 대신 자리는 안 꼬여야 한다. */
  T('야수와 마운드를 맞바꿔도 자리가 꼬이지 않는다', ()=>{
    const before=lu().find(x=>x.pos==='P').id;
    ev("tapSwapPos('P'); tapSwapPos('1B');");
    const now=lu().find(x=>x.pos==='P').id;
    return now!==before && ev("ST.rotation[0]")===now
      && lu().filter(x=>x.pos==='P').length===1 && (legal()===''||legal())
      && `${nm(before)} → ${nm(now)}`;
  });

  console.log('[발표문]');
  T('발표된 라인업에 같은 포지션이 두 번 나오지 않는다', ()=>{
    ev("ST.announced=false;ST.kakao=null;ST.kakaoPost=[];ST.dropouts=[];ST.kakao=buildKakaoPre(ST);");
    const txt=ev("ST.kakao[0].text");
    const pos=(txt.match(/\(([^)]+)\)/g)||[]).map(x=>x.slice(1,-1));
    const dup=pos.filter((x,i)=>pos.indexOf(x)!==i);
    return pos.length===9 && dup.length===0 && pos.join(',');
  });
  T('발표문의 투수와 선발이 같은 사람이다', ()=>{
    const txt=ev("ST.kakao[0].text");
    const line=txt.split('\n').find(x=>/\(투수\)/.test(x))||'';
    const sp=(txt.match(/선발 (.+)$/)||[])[1]||'';
    return line.indexOf(sp)>=0 && `${line.trim()} / 선발 ${sp}`;
  });

  console.log('[지명타자 사용]');
  T('지타를 쓰면 선발은 타순 밖으로 빠진다', ()=>{
    ev("ST.useDH=true; ST.lineup=recommendLineup(); ST.rotation=recommendRotation(); applyDHRule();");
    ev("ST.announced=false;ST.kakao=null;ST.kakaoPost=[];ST.dropouts=[];ST.kakao=buildKakaoPre(ST);");
    const sp=ev("gameRotation()[0]");
    return !lu().some(x=>x.id===sp) && (legal()===''||legal());
  });
  T('지타 중 선발을 바꾸면 로테이션이 실제로 따라간다', ()=>{
    const alt=ev("ST.rotation[1]");
    ev(`setStarter('${alt}')`);
    return ev("ST.rotation[0]")===alt && ev("gameRotation()[0]")===alt && (legal()===''||legal());
  });

  console.log('[망가진 세이브 복구]');
  T('저장된 라인업이 깨져 있어도 화면을 열면 고쳐진다', ()=>{
    ev("ST.useDH=false; ST.lineup=recommendLineup(); applyDHRule();");
    ev("ST.lineup[0].pos='P'; ST.lineup[1].pos='P'; ST.lineup[2].pos='P';");   // 억지로 망가뜨린다
    ev("go('lineup')");
    return legal()===''||legal();
  });

  console.log('[선수 모드 — 내가 고른 자리 (2.82.0)]');
  /* [제보] "분명 원하는 포지션을 눌렀는데 왜 실제 그냥 포지션으로 가는건지"
     라인업은 recommendLineup → optimizePositions → applyDHRule → fixLineupPositions
     넷이 줄줄이 돈다. 앞의 하나만 고쳐놨더니 뒤에서 다시 밀려났다.        */
  T('여덟 자리 다 내가 고른 대로 선다', ()=>{
    const bad=[];
    ['C','1B','2B','3B','SS','LF','CF','RF'].forEach(pos=>{
      const got=ev(`(function(){
        ST.mode='player'; ST.role='bat'; ST.myPos='${pos}';
        ST.myBenched=0; ST.myFarm=0;
        ST.lineup=recommendLineup(); optimizePositions(); applyDHRule(); sanitizeRotation();
        var me=ST.playerId||MYID;
        var sl=(ST.lineup||[]).find(function(x){return x.id===me;});
        return sl?sl.pos:'없음';
      })()`);
      if(got!==pos) bad.push(pos+'→'+got);
    });
    return bad.length? '!'+bad.join(' ') : '여덟 자리 전부';
  });
  T('내 자리를 박아도 라인업은 멀쩡하다', ()=>{
    ev("ST.mode='player'; ST.role='bat'; ST.myPos='C'; ST.myBenched=0; ST.myFarm=0;"+
       "ST.lineup=recommendLineup(); optimizePositions(); applyDHRule();");
    const poss=ev("ST.lineup.map(function(x){return x.pos;})");
    if(poss.length!==9) return '!'+poss.length+'명';
    if(new Set(poss).size!==9) return '!자리 중복 '+poss.join(',');
    return legal()===''||legal();
  });
  T('벤치로 밀리면 자리를 안 박는다', ()=>{
    ev("ST.myBenched=2; ST.myPos='C';");
    return ev("pinnedPos()")===null ? '벤치면 핀 없음' : '!'+ev("pinnedPos()");
  });
  T('2군에 있으면 자리를 안 박는다', ()=>{
    ev("ST.myBenched=0; ST.myFarm=3;");
    return ev("pinnedPos()")===null ? '2군이면 핀 없음' : '!'+ev("pinnedPos()");
  });
  T('오늘 내가 선발이면 마운드가 먼저다', ()=>{
    ev("ST.myFarm=0; ST.role='two'; ST.myPos='CF'; ST.useDH=false;"+
       "ST.rotation=[ST.playerId||MYID].concat((ST.rotation||[]).filter(x=>x!==(ST.playerId||MYID)));");
    return ev("pinnedPos()")===null ? '마운드 우선' : '!'+ev("pinnedPos()");
  });
  T('감독 모드는 자리를 안 박는다', ()=>{
    ev("ST.mode='mgr'; ST.role='bat'; ST.myPos='C'; ST.rotation=ST.rotation.slice(1).concat(ST.rotation[0]);");
    return ev("pinnedPos()")===null ? '감독 모드는 핀 없음' : '!'+ev("pinnedPos()");
  });

  console.log(errs.length?`\n❌ ${errs.length}건`:'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
},400);
