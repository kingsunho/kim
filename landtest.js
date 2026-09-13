/* landtest — 가로에서 판이 화면 밖으로 안 나가는가 (v3.20.1)
   [제보] "장난하냐 화면짤리는거?"
   v3.19.0 에서 가로 배치를 `#decision.sheet:not(.swf)` 로 걸었더니
   **투구·주루·수비 판까지 같이 맞았다.** 야구장이 화면을 덮어서
   구종 버튼과 존 아홉 칸이 y=1275, y=1346 (화면은 920) 으로 밀렸다.
   눌러야 할 것이 화면 밖에 있는 판은 못 쓰는 판이다.

   여기서는 판마다 **눌러야 할 것이 전부 화면 안에 있는지**를 잰다.
   진짜 크로미움으로 실제 게임을 띄워서 재는 거라, 규칙을 잘못 걸면
   바로 걸린다.                                                     */
const {chromium}=require('playwright');
const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let fail=0; const errs=[];
const T=(ok,msg,note)=>{ console.log('  '+(ok?'✅':'❌')+' '+msg+(note?' :: '+note:''));
  if(!ok){ fail++; errs.push(msg); } };

/* 폰 가로(844×390) 와 태블릿 가로(1600×740) 둘 다 본다.
   제보 사진이 2000×920 이었는데, 짧은 쪽(390) 이 훨씬 빡세다 */
const SIZES=[[844,390,'폰 가로'],[1600,740,'태블릿 가로']];

/* 판마다 «반드시 손이 닿아야 하는 것» */
const MUST={
  pitch  :['.ptype button','.zgrid button','.chase .chb','.pit-bot .pl-skip'],
  lead   :['.runstage','.lead-b'],
  defplay:['.runstage','.lead-b'],
  throw  :['.runstage'],
};

(async()=>{
  const b=await chromium.launch({executablePath:CHROME});
  for(const [W,H,nm] of SIZES){
    const p=await b.newPage({viewport:{width:W,height:H}});
    const boom=[]; p.on('pageerror',e=>boom.push(String(e).split('\n')[0]));
    await p.goto('file://'+__dirname+'/index.html');
    await p.waitForTimeout(900);
    await p.evaluate(()=>{ const i=document.getElementById('lock-in');
      if(i){ i.value=GATE_CODE; document.getElementById('lock-go').click(); } });
    await p.waitForTimeout(900);
    await p.evaluate(()=>document.querySelectorAll('.pickcard')[0].click());
    await p.waitForTimeout(250);
    await p.evaluate(()=>[...document.querySelectorAll('#view .btn')]
      .find(x=>x.textContent==='이 선수로 시작').click());
    await p.waitForTimeout(800);
    await p.evaluate(()=>{ ST.tutDone=true; ST.tutStep=99; saveGame(true); go('home'); });
    await p.waitForTimeout(300);

    console.log('\n['+nm+' '+W+'×'+H+']');
    T(await p.evaluate(()=>document.documentElement.classList.contains('land')),
      '가로로 잡으면 land 가 켜진다');

    for(const kind of Object.keys(MUST)){
      const r=await p.evaluate(([k,sels])=>{
        ST.tutDone=true; ST.round=0; ST.schedule[0].played=false;
        ST.helpSeen={run:1,'def:C':1,'def:IF':1,'def:OF':1,pitch:1,swing:1};
        document.getElementById('view').innerHTML='<div id="stage"></div>';
        LIVE=makeLive(); LIVE.manual=true; buildLiveStage();
        const us=LIVE.userSide(); const me=ST.playerId||MYID; LIVE.myId=me;
        /* 투구는 우리가 수비, 나머지는 우리가 공격 */
        LIVE.half=(us===LIVE.home)?(k==='pitch'?0:1):(k==='pitch'?1:0);
        const i=(us.slots||[]).findIndex(s=>s.id===me); us.order=i>=0?i:0;
        LIVE.bases=[us.slots[(us.order+4)%9].id,null,null];
        LIVE.outs=1; LIVE.inning=3; flushLog(); updateLiveUI();
        try{ showDecision({kind:k, ang:-18, pos:'SS'}); }catch(e){ return {터짐:e.message}; }
        const d=document.getElementById('decision');
        const out=[];
        sels.forEach(s=>{
          const es=[...d.querySelectorAll(s)];
          if(!es.length){ out.push([s,'없음',0,0,1]); return; }
          es.forEach(e=>{ const b=e.getBoundingClientRect();
            /* 화면 안에 있어도 **야구장이 위를 덮으면** 못 누른다.
               v3.19.0 의 진짜 고장이 이거였다 — 좌표는 멀쩡한데
               .mound 가 inset:0 으로 깔려서 손가락이 안 닿았다.     */
            let 닿나=1;
            if(b.width>=1&&b.height>=1){
              const hit=document.elementFromPoint(b.left+b.width/2, b.top+b.height/2);
              닿나=(hit && (hit===e || e.contains(hit) || hit.contains(e))) ? 1 : 0;
            }
            out.push([s, Math.round(b.top)+'~'+Math.round(b.bottom),
              b.bottom>innerHeight+1||b.top<-1||b.right>innerWidth+1||b.left<-1 ? 1:0,
              (b.width>=1&&b.height>=1)?1:0, 닿나]); });
        });
        return {cls:d.className, 것:out, vh:innerHeight};
      }, [kind, MUST[kind]]);
      await p.waitForTimeout(120);
      if(r.터짐){ T(false, kind+' 판이 뜬다', r.터짐); continue; }
      const 밖=r.것.filter(x=>x[2]);
      const 빈=r.것.filter(x=>!x[3]);
      T(r.것.length>0 && !r.것.some(x=>x[1]==='없음'),
        kind+' — 눌러야 할 것이 다 있다',
        r.것.filter(x=>x[1]==='없음').map(x=>x[0]).join(',')||r.것.length+'개');
      T(밖.length===0, kind+' — 화면 밖으로 나간 게 없다',
        밖.slice(0,3).map(x=>x[0]+' '+x[1]).join(' / ')||('화면 '+r.vh));
      T(빈.length===0, kind+' — 납작하게 눌린 게 없다',
        빈.slice(0,3).map(x=>x[0]).join(' / ')||'없음');
      const 막힘=r.것.filter(x=>!x[4]);
      T(막힘.length===0, kind+' — 무엇에도 안 가려서 손이 닿는다',
        막힘.slice(0,3).map(x=>x[0]+' '+x[1]).join(' / ')||'없음');
    }
    /* 세로로 돌리면 가로 배치가 풀려야 한다 */
    await p.setViewportSize({width:390,height:844});
    await p.waitForTimeout(250);
    T(await p.evaluate(()=>{ applyOrient();
      return !document.documentElement.classList.contains('land'); }),
      '세로로 돌리면 land 가 꺼진다');
    await p.setViewportSize({width:W,height:H});
    T(boom.length===0, '브라우저 예외 없음', boom.slice(0,2).join(' / ')||'없음');
    await p.close();
  }
  await b.close();
  console.log(fail?('\n❌ '+fail+'건: '+errs.slice(0,5).join(' / ')):'\n✅ 전부 통과');
  process.exit(fail?1:0);
})();
