/* steadytest — 수비 라인업이 이유 없이 흔들리지 않는가 (v3.21.1)
   [제보] "왜 수비할때 우리팀 이름도 다바뀌는거냐"
          "선수이름말한거 수비할때 우리팀 선수들 이름 다바뀜"

   원인 두 가지였다 —
   ① 선수 모드의 runWeek() 이 **매주 라인업을 처음부터 다시 짰다.**
      optimizePositions() 는 지금 누가 어디 서 있는지를 안 보고 적합도
      순으로 새로 깐다. 결장자가 하나도 없는 주에도 아홉 중 여섯 명의
      수비 자리가 뒤바뀌었다(포수↔1루, 유격↔3루 …).
   ② 선발 투수가 타순의 야수 자리에도 그대로 남아서, 수비 화면 그라운드에
      한 사람이 **마운드와 제 수비 자리에 두 번** 서고 지명타자는 아예
      안 나왔다 — 아홉 자리에 여덟 명이 서 있었다.

   여기서는 그 둘을 숫자로 잰다. 화면이 아니라 **상태**를 본다.        */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
let fail=0; const errs=[];
const T=(ok,msg,note)=>{ console.log('  '+(ok?'✅':'❌')+' '+msg+(note?' :: '+note:''));
  if(!ok){ fail++; errs.push(msg); } };

const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|[Nn]ot implemented|getContext|Could not load|stylesheet/.test(e.message))
  console.log('  (jsdom) '+e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,
  url:'https://x.test/',virtualConsole:vc});
const w=dom.window, d=w.document;
w.scrollTo=()=>{}; w.confirm=()=>true;
const ev=s=>w.eval(s);
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  await wait(800);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300);
  ev("ST.tutDone=true; ST.mode='player'; ST.role='bat';");

  console.log('\n[결장자가 없는 주에는 수비가 그대로다]');
  const R=ev(`(function(){
    const nm=id=>{const q=TBYID['wwzw'].players.find(x=>x.id===id);return q?q.name:id;};
    const snap=()=>{const o={}; (ST.lineup||[]).forEach(s=>{o[s.id]=s.pos;}); return o;};
    const out=[]; let prev=snap();
    for(let k=1;k<=18;k++){
      const before=(ST.lineup||[]).map(s=>s.id);
      runWeek();
      /* 이번 주에 그 아홉 중 못 나온 사람 */
      const 결장=before.filter(id=>!isAvailable(id)).map(nm);
      const now=snap();
      /* 지난주에도 있었고 이번 주에도 있는 사람 중 자리가 바뀐 수 */
      let moved=[];
      Object.keys(prev).forEach(id=>{
        if(now[id]!=null && now[id]!==prev[id]) moved.push(nm(id)+' '+prev[id]+'→'+now[id]);
      });
      out.push({주:k, 결장:결장, 자리바뀜:moved});
      prev=now;
      ST.weekDone=false;
      ST.round=Math.min((ST.round||0)+1,(ST.schedule||[]).length-1);
    }
    return out;
  })()`);
  const 조용한주=R.filter(x=>!x.결장.length);
  const 그대로=조용한주.filter(x=>!x.자리바뀜.length);
  const 최대=Math.max(0,...조용한주.map(x=>x.자리바뀜.length));
  /* 결장은 난수라 어떤 시드에서는 조용한 주가 거의 안 나온다.
     표본이 모자라면 **실패가 아니라 건너뛴다** — 여기서 재려는 건
     '조용한 주에 흔들리나' 지 '조용한 주가 몇 번 오나' 가 아니다. */
  if(조용한주.length<3){
    console.log('  — 조용한 주가 '+조용한주.length+'주뿐이라 건너뛴다 (결장은 난수다)');
  } else {
  /* [기준을 어디서 가져왔나] 고치기 전 코드로 같은 걸 재보면 조용한 주에도
     **아홉 중 여섯 자리**가 바뀌고, 가만히 있는 주가 거의 없었다.
     고친 뒤에는 대부분의 주가 통째로 그대로이고, 움직여도 두 자리 안쪽이다
     (로스터가 바뀐 다음 주에 감독이 한 번 조정하는 것 — 그건 맞는 동작이다). */
  T(그대로.length*2 >= 조용한주.length,
    '결장자 없는 주는 절반 이상 수비가 통째로 그대로다',
    그대로.length+'/'+조용한주.length+'주');
  T(최대<=2, '아무 일 없는 주에 수비를 통째로 갈아엎지 않는다 (두 자리 이내)',
    '제일 많이 바뀐 주 '+최대+'자리');
  /* 결장이 있는 주라도 통째로 갈아엎으면 안 된다.
     대체자가 그 자리를 못 보면 한두 명이 더 움직인다 — 거기까지는 정상이다. */
  }
  const 과한주=R.filter(x=>x.결장.length && x.자리바뀜.length>x.결장.length+3);
  T(과한주.length===0, '결장이 있어도 그 자리 근처만 움직인다',
    과한주.length ? 과한주.map(x=>x.주+'주 결장'+x.결장.length+'명인데 '+x.자리바뀜.length+'자리').join(' / ')
                  : '전부 통과');

  console.log('\n[투수가 야수 자리에 같이 서 있지 않다]');
  const P=ev(`(function(){
    const out=[];
    for(let g=0; g<6; g++){
      ST.round=g%((ST.schedule||[]).length||1);
      if(ST.schedule&&ST.schedule[ST.round]) ST.schedule[ST.round].played=false;
      let L; try{ L=makeLive(); }catch(e){ out.push({터짐:e.message}); continue; }
      [L.home,L.away].forEach(s=>{
        const pit=L.curPitcher(s); if(!pit) return;
        const hit=(s.slots||[]).find(x=>x.id===pit.id);
        /* 지명타자를 쓰는데 투수가 타순에 있으면 겹친 것.
           지명타자를 안 쓰면 투수는 'P' 자리에 있어야 맞다. */
        const dh=(s.slots||[]).some(x=>x.pos==='DH');
        const bad = hit && (dh ? true : hit.pos!=='P');
        if(bad) out.push({팀:s.team.name, 투수:pit.name, 자리:hit.pos, 지명타자:dh});
      });
      /* 아홉 수비 자리에 아홉 사람이 한 번씩 — 두 번 서는 사람이 없어야 한다 */
      [L.home,L.away].forEach(s=>{
        const on={}; const pit=L.curPitcher(s);
        /* 'P' 칸은 「이 사람이 투수다」 라는 뜻이니 야수로 안 센다 —
           아래에서 투수를 한 번 더하므로 두 번 세면 멀쩡한 라인업이 걸린다 */
        (s.slots||[]).forEach(x=>{ if(x.pos!=='DH'&&x.pos!=='P') on[x.id]=(on[x.id]||0)+1; });
        if(pit) on[pit.id]=(on[pit.id]||0)+1;
        const dup=Object.keys(on).filter(k=>on[k]>1);
        if(dup.length) out.push({팀:s.team.name, 두번선사람:dup.map(k=>L.nameOf(k))});
      });
    }
    return out;
  })()`);
  T(P.length===0, '한 사람이 마운드와 야수 자리에 동시에 서지 않는다',
    P.length ? JSON.stringify(P.slice(0,3)) : '6경기 양 팀 전부 통과');

  console.log(fail?('\n❌ '+fail+'건: '+errs.join(' / ')):'\n✅ 이상 없음');
  process.exit(fail?1:0);
})();
