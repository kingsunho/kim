/* 뜬공은 잡으면 아웃이다 · 공 근처가 아니라 공 밑으로 가야 한다

   [제보] "수비 외야로 하는데 플라이 뭐 그냥 공 근처가면 다잡은판정이고
           플라이볼도 뭐 송구해야 아웃이되네;;"

   [문제] 닿는 거리를 **픽셀로** 재고 있었다. 화면에 원근이 들어가 있어서
   같은 26픽셀이 내야에서는 9.7m 인데 외야에서는 22m 였다. 외야수가
   22m 안에만 들어가면 다 잡았다.
   [문제] 공중에서 잡은 뜬공도 베이스를 골라 던져야 아웃이 됐다.
   야구에서 뜬공은 잡는 순간 아웃이다.

   캔버스가 있어야 해서 크로미움으로 돈다.                          */
const {chromium}=require('playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const errs=[];
const T=(ok,n,extra)=>{console.log((ok?'  ✅ ':'  ❌ ')+n+(extra?' :: '+extra:''));if(!ok)errs.push(n);};

(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await b.newPage({viewport:{width:390,height:844}});
  const boom=[];
  p.on('pageerror',e=>boom.push(String(e.message)));
  await p.goto('file://'+process.cwd()+'/index.html');
  await p.waitForTimeout(1000);

  console.log('[닿는 거리를 미터로 잰다]');
  const r=await p.evaluate(()=>{
    const P=PARKS[0];
    const f=(dv)=>{ const RM=6.0+dv*0.082; return {RM,
      inPx:RM*psPxPerM(P,0,25), ofPx:RM*psPxPerM(P,0,85)}; };
    return {a:f(45), lo:f(30), hi:f(75),
      inScale:psPxPerM(P,0,25), ofScale:psPxPerM(P,0,85)};
  });
  console.log('   수비45 — 닿는 '+r.a.RM.toFixed(1)+'m · 내야 '+r.a.inPx.toFixed(1)+
              'px · 외야 '+r.a.ofPx.toFixed(1)+'px');
  T(r.inScale>r.ofScale*2, '화면 원근이 있다 — 내야 1px 과 외야 1px 의 값이 다르다',
    r.inScale.toFixed(2)+' vs '+r.ofScale.toFixed(2)+' px/m');
  T(r.a.RM>=8 && r.a.RM<=11, '닿는 거리가 8~11m 다 (예전 외야 22m)', r.a.RM.toFixed(1)+'m');
  T(Math.abs(r.a.inPx-25.9)<3, '내야는 예전 그대로다 — 더 어려워지지 않았다',
    r.a.inPx.toFixed(1)+'px (예전 25.9)');
  T(r.a.ofPx<16, '외야는 절반으로 줄었다', r.a.ofPx.toFixed(1)+'px (예전 25.9)');
  T(r.lo.RM<r.a.RM && r.a.RM<r.hi.RM, '수비가 좋을수록 넓다');

  /* ---- defScene 을 직접 돌린다 ---- */
  const run=(opt)=>p.evaluate(async(o)=>{
    const host=document.createElement('div');
    host.style.cssText='position:fixed;left:-9999px;width:320px;height:264px';
    document.body.appendChild(host);
    const log={titles:[], phases:[], done:null};
    return await new Promise(res=>{
      let sc=null;
      const fin=()=>{ try{sc.stop();}catch(e){} try{host.remove();}catch(e){} res(log); };
      sc=defScene(host, {
        park:PARKS[0], ang:o.ang, m:o.m, pos:o.pos, flyMs:o.flyMs,
        reach:o.reach, grab:o.grab, pxPerM:o.pxPerM, speed:o.speed, arm:45,
        bases:o.bases, hasFirst:!!o.bases[0], outs:o.outs,
        onTick:()=>{},
        onTitle:(t)=>log.titles.push(t),
        onPhase:(ph,list,tag)=>log.phases.push({ph, n:(list||[]).length, tag:!!tag}),
        onDone:(q,where,tq,air)=>{ log.done={q,where,tq,air}; setTimeout(fin,10); }});
      /* 낙구 지점으로 곧장 뛴다(완벽 추적) 또는 옆으로 샌다 */
      const HX=160,HY=236, rad=psRad(o.ang);
      const landPx=Math.max(14,Math.min(psFenceR(PARKS[0],o.ang)*1.06, psMtoPx(o.m,PARKS[0],o.ang)));
      const land={x:HX+Math.cos(rad)*landPx+(o.off||0), y:HY+Math.sin(rad)*landPx};
      const home=psPosOf(o.pos,PARKS[0]);
      let fx=home.x, fy=home.y;
      const iv=setInterval(()=>{
        const dx=land.x-fx, dy=land.y-fy, dd=Math.hypot(dx,dy);
        if(dd<1.2){ sc.setDir(0,0); return; }
        sc.setDir(dx/dd, dy/dd);
        fx+=dx/dd*o.speed*0.033; fy+=dy/dd*o.speed*0.033;
      },33);
      setTimeout(()=>{ clearInterval(iv);
        if(!log.done){ try{sc.stop();host.remove();}catch(e){} res(log); } }, 9000);
    });
  },opt);

  const base=(x)=>Object.assign({ang:-20, m:85, pos:'LF', flyMs:3700,
    reach:9.7*1.17, grab:9.7*0.42*1.17, pxPerM:1.17, speed:95,
    bases:[null,null,null], outs:0, off:0}, x||{});

  console.log('\n[공중에서 잡은 뜬공은 그 자리에서 아웃이다]');
  const fly=await run(base());
  console.log('   '+JSON.stringify(fly.done)+' · 제목 '+JSON.stringify(fly.titles));
  T(!!fly.done, '판정이 난다');
  T(!!(fly.done&&fly.done.air), '공중 포구로 잡힌다');
  T(!!(fly.done&&fly.done.where==='def:none'), '송구를 안 시킨다', fly.done&&fly.done.where);
  T(!!(fly.done&&fly.done.q>=0.84), '엔진이 무조건 아웃으로 받는 값이다 (q≥0.84)',
    fly.done&&fly.done.q.toFixed(2));
  T(!fly.phases.some(x=>x.ph==='throw'), '베이스 버튼이 아예 안 뜬다');
  T(fly.titles.some(t=>/아웃|호수비/.test(t)), '「아웃」이라고 말해 준다');

  console.log('\n[주자가 있으면 태그업만 물어본다 — 아웃은 이미 잡았다]');
  const tag=await run(base({bases:[null,'x',null], outs:0}));
  console.log('   '+JSON.stringify(tag.done)+' · '+JSON.stringify(tag.phases));
  T(tag.phases.some(x=>x.ph==='throw'&&x.tag), '태그업 표시로 베이스가 뜬다');
  T(!!(tag.done&&tag.done.air), '안 던져도 뜬공 아웃으로 끝난다');
  T(!!(tag.done&&tag.done.q>=0.84), '아웃은 그대로다', tag.done&&tag.done.q.toFixed(2));
  const tag2=await run(base({bases:[null,'x',null], outs:2}));
  T(!tag2.phases.some(x=>x.ph==='throw'), '2아웃이면 태그업도 안 물어본다 — 이닝이 끝났다');

  console.log('\n[땅볼은 예전처럼 던져야 한다]');
  const gb=await run(base({ang:-30, m:24, pos:'3B', flyMs:2500,
    reach:9.7*2.68, grab:9.7*0.42*2.68, pxPerM:2.68, bases:[null,null,null]}));
  console.log('   '+JSON.stringify(gb.done)+' · '+JSON.stringify(gb.phases));
  T(gb.phases.some(x=>x.ph==='throw'&&!x.tag), '베이스 버튼이 뜬다 (송구 단계)');
  T(!(gb.done&&gb.done.air), '땅볼은 공중 포구가 아니다');

  console.log('\n[공 근처가 아니라 공 밑으로 가야 한다]');
  const near=await run(base({off:13}));    // 낙구점에서 13px(≈11m) 옆
  const far =await run(base({off:26}));    // 26px(≈22m) 옆 — 예전이면 이것도 잡았다
  console.log('   11m 옆: '+JSON.stringify(near.done));
  console.log('   22m 옆: '+JSON.stringify(far.done));
  T(!(far.done&&far.done.air), '22m 옆에 서 있으면 못 잡는다 (예전엔 잡혔다)');
  T(!!(far.done&&far.done.q<0.55), '놓친 값이 넘어간다', far.done&&far.done.q.toFixed(2));

  console.log('\n[깨끗하게 잡은 것과 겨우 닿은 것을 가른다]');
  const clean=await run(base({off:0}));
  const edge =await run(base({off:10}));
  console.log('   정확히: q '+(clean.done&&clean.done.q.toFixed(2))+
              ' · 끝에 걸려: q '+(edge.done&&edge.done.q.toFixed(2)));
  T(!!(clean.done&&edge.done&&clean.done.q>edge.done.q),
    '정확히 들어갈수록 좋은 값이다 — 낙구 지점 기준으로 잰다');
  T(!!(clean.done&&clean.done.q>=0.99), '딱 밑에 들어가면 호수비다', clean.done&&clean.done.q.toFixed(2));
  T(!!(edge.done&&edge.done.air&&edge.done.q>=0.84), '끝에 걸려도 잡았으면 아웃이다',
    edge.done&&edge.done.q.toFixed(2));

  console.log('\n[깨진 데 없나]');
  T(boom.length===0, '브라우저 예외 없음', boom.slice(0,2).join(' / '));
  T(await p.evaluate(()=>(function(){ // 같은 식을 두 군데서 쓰지 않는다
      return defScene.toString().indexOf('o.m>40')>0
          && defScene.toString().indexOf('psPxPerM')<0; })()),
    '뜬공 판정이 ballAt 의 포물선 조건과 같은 식을 쓴다');

  await b.close();
  console.log(errs.length?('\n❌ '+errs.length+'개 실패'):'\n✅ 전부 통과');
  process.exit(errs.length?1:0);
})();
