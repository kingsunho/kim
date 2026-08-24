/* [2.29.0] 파츠 시트 그림 검사 — 안쪽이 투명하게 뚫려 있으면 잡는다.

   [버그 이력] 시트를 내보낼 때 알파가 밝기로 잘못 만들어져서, 어두운 부분
   (모자 크라운·헬멧·유니폼 소매·스파이크·배트)이 통째로 투명했다.
   화면에서는 그 자리에 잔디가 비쳐서 헬멧이 초록색으로 보였다.
   눈으로만 보면 "색이 이상하다" 로 끝나서 원인을 못 찾는다. 픽셀로 잡는다.

   크로미움이 필요하다(캔버스로 알파를 읽는다). 없으면 조용히 건너뛴다.  */
let chromium=null;
try{ chromium=require('playwright').chromium; }
catch(e){
  try{ chromium=require(process.env.NODE_PATH? process.env.NODE_PATH+'/playwright':'playwright').chromium; }catch(e2){}
}
if(!chromium){ console.log('⚠️  playwright 가 없다 — 건너뛴다'); process.exit(0); }
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const errs=[];
const T=(n,r)=>{const ok=!!r&&!(typeof r==='string'&&r[0]==='!');
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!ok)errs.push(n);};
const MVW_=a=>'있음';

(async()=>{
  const b=await chromium.launch(require('fs').existsSync(EXE)?{executablePath:EXE}:{});
  const p=await b.newPage();
  await p.goto('file://'+require('path').resolve(process.argv[2]||'index.html'));
  await p.waitForTimeout(1200);
  await p.evaluate(()=>{ mvSheetInit(); mvFigInit(); });
  await p.waitForFunction(()=>MV_SHEET_OK===true,null,{timeout:20000});
  await p.waitForFunction(()=>MV_FIG_OK===true,null,{timeout:20000});

  const r=await p.evaluate(()=>{
    const c=document.createElement('canvas');
    c.width=MV_SHEET.naturalWidth; c.height=MV_SHEET.naturalHeight;
    const q=c.getContext('2d'); q.drawImage(MV_SHEET,0,0);
    const W=c.width,H=c.height, d=q.getImageData(0,0,W,H).data;
    const A=(x,y)=>d[(y*W+x)*4+3];
    /* 바깥에서 이어지는 투명 픽셀을 칠해 나간다. 안 칠해진 투명 픽셀이
       '그림 안쪽 구멍' 이다. */
    const seen=new Uint8Array(W*H); const st=[];
    const push=(x,y)=>{ const i=y*W+x; if(!seen[i]&&A(x,y)<100){seen[i]=1;st.push(i);} };
    for(let x=0;x<W;x++){ push(x,0); push(x,H-1); }
    for(let y=0;y<H;y++){ push(0,y); push(W-1,y); }
    while(st.length){ const i=st.pop(), x=i%W, y=(i-x)/W;
      if(x>0)push(x-1,y); if(x<W-1)push(x+1,y);
      if(y>0)push(x,y-1); if(y<H-1)push(x,y+1); }
    let holes=0;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++)
      if(A(x,y)<100 && !seen[y*W+x]) holes++;
    /* 파츠별로 '여기는 반드시 불투명' 인 자리를 콕 집어서 본다 */
    const at=(box,fx,fy)=>A(Math.round(box[0]+fx*box[2]), Math.round(box[1]+fy*box[3]));
    const spot={
      '모자 크라운': at(MV_PARTS.head_cap,0.35,0.14),
      '헬멧 돔':     at(MV_PARTS.head_helm,0.50,0.10),
      '헬멧 옆':     at(MV_PARTS.head_helm,0.30,0.16),
      '유니폼 소매': at(MV_PARTS.torso,0.12,0.20),
      '배트 몸통':   at(MV_PARTS.bat,0.60,0.35),
      '스파이크':    at(MV_PARTS.shin,0.45,0.92),
    };
    return {W,H,holes,spot};
  });

  console.log('[파츠 시트 알파]');
  T(`시트가 붙어 있다 (${r.W}x${r.H})`, r.W>0&&r.H>0);
  T('그림 안쪽에 뚫린 구멍이 없다', r.holes===0 ? '0개' : '!'+r.holes+'개가 비친다');
  Object.keys(r.spot).forEach(k=>{
    T(k+' 이 불투명하다', r.spot[k]>=200 ? 'a='+r.spot[k] : '!a='+r.spot[k]);
  });

  /* ---- 구장 좌표 · 사람 관절 ---- */
  const geo=await p.evaluate(()=>{
    const src=String(mvField);
    /* 파울선 식 그대로 다시 계산해서, 코드가 찍는 자리와 맞는지 본다 */
    const flx=y=>228+(28-228)*((254-y)/104);
    const frx=y=>252+(452-252)*((254-y)/104);
    return {
      src,
      onLine: Math.abs(flx(178)-81.85)<0.5 && Math.abs(frx(178)-398.15)<0.5,
      lx:flx(178), rx:frx(178),
      hipw:(typeof MV_HIPW==='number')?MV_HIPW:null,
      legSrc:String(mvGuySprite),
      stand:MV_POSES.stand, joints:MV_JOINTS
    };
  });

  console.log('\n[베이스 자리]');
  T('1·3루를 파울선 식으로 찍는다', /flx\(178\)|frx\(178\)/.test(geo.src)
      ? `3루 x=${geo.lx.toFixed(1)} · 1루 x=${geo.rx.toFixed(1)}` : '!좌표를 손으로 박아뒀다');
  T('파울선 위에 정확히 얹힌다', geo.onLine);
  T('베이스 밑에 흙을 깐다', /bag\(/.test(geo.src) ? 'ok' : '!잔디에 떠 있다');
  T('관중석에 베이스를 안 찍는다', !/bs\(\s*240\s*,\s*1[0-3]\d/.test(geo.src)
      ? 'ok' : '!담장 위에 2루가 있다');

  console.log('\n[뼈 뒤집기]');
  const mir=await p.evaluate(()=>{
    const c=document.createElement('canvas').getContext('2d');
    const end=(k,len,mirOn)=>{
      const P=MV_PARTS[k], J=MV_JOINTS[k];
      const ax=J[0]*P[2], ay=J[1]*P[3], bx=J[2]*P[2], by=J[3]*P[3];
      const vx=bx-ax, vy=by-ay, Lp=Math.hypot(vx,vy)||1, sc=len/Lp;
      c.setTransform(1,0,0,1,0,0);
      if(mirOn) c.scale(-1,1);
      c.rotate(Math.atan2(vx,vy));
      c.scale(sc,sc);
      const m=c.getTransform();
      return [m.a*vx+m.c*vy+m.e, m.b*vx+m.d*vy+m.f];
    };
    const out={};
    [['thigh',MV_LEN.thigh],['shin',MV_LEN.shin],
     ['sleeve',MV_LEN.uarm],['farm',MV_LEN.farm]].forEach(([k,L])=>{
      out[k]={len:L, n:end(k,L,false), m:end(k,L,true)};
    });
    return out;
  });
  Object.keys(mir).forEach(k=>{
    const o=mir[k];
    const okN=Math.abs(o.n[0])<0.01 && Math.abs(o.n[1]-o.len)<0.01;
    const okM=Math.abs(o.m[0])<0.01 && Math.abs(o.m[1]-o.len)<0.01;
    T(`${k} — 뒤집어도 뼈 끝이 제자리다`,
      (okN&&okM) ? `끝 (${o.m[0].toFixed(2)}, ${o.m[1].toFixed(2)}) · 길이 ${o.len}`
                 : `!뒤집으면 (${o.m[0].toFixed(2)}, ${o.m[1].toFixed(2)}) 로 밀린다`);
  });

  console.log('\n[다리]');
  T('골반이 벌어져 있다', geo.hipw!=null && geo.hipw>0.8 ? 'MV_HIPW='+geo.hipw : '!'+geo.hipw);
  T('두 다리를 다른 점에서 뽑는다', /leg\(R\.legB,\s*true,\s*-1\)/.test(geo.legSrc)
      && /leg\(R\.legF,\s*false,\s*1\)/.test(geo.legSrc) ? 'ok' : '!한 점에서 나온다');
  T('정강이를 먼저 그리고 넓적다리로 덮는다', (()=>{
      const a=geo.legSrc.indexOf("'shin'"), b=geo.legSrc.indexOf("'thigh'");
      return (a>=0&&b>=0&&a<b) ? '무릎 이음매가 가려진다' : '!넓적다리 자른 자리가 보인다';
    })());
  T('넓적다리 그림이 무릎 아래까지 내려온다',
      geo.joints.thigh[3]<=0.90 ? 'knee y='+geo.joints.thigh[3] : '!'+geo.joints.thigh[3]);

  console.log('\n[타격 자세]');
  T('두 손이 얼굴을 안 가린다', (()=>{
      /* 턱은 목(-11.5)보다 조금 아래다. 손이 그 위로 올라가면 팔이 얼굴을 지난다 */
      const y=geo.stand.armF[1];
      return y>=-10.5 ? `손 높이 ${y}` : `!손이 ${y} — 얼굴 높이다`;
    })());
  T('두 손이 몸 옆으로 빠져 있다', geo.stand.armF[0]>=5.5
      ? 'x='+geo.stand.armF[0] : '!x='+geo.stand.armF[0]);
  T('배트가 서 있다', Math.abs(geo.stand.bat-Math.PI)<0.9
      ? 'bat='+geo.stand.bat : '!bat='+geo.stand.bat);

  /* ---- 통짜 그림 (타자·투수) ----
     [제보] "미안한데 투수 타자는 이렇게 연결 되어야지.."
     화면에서 제일 큰 두 사람은 관절 조립을 그만두고 그림 한 장으로 그린다.
     그림이 끊겨 있으면(알파 구멍) 또 몸이 갈라져 보이니 여기서도 검사한다. */
  console.log('\n[통짜 그림]');
  const fig=await p.evaluate(()=>{
    const c=document.createElement('canvas');
    c.width=MV_FIG.naturalWidth; c.height=MV_FIG.naturalHeight;
    const q=c.getContext('2d'); q.drawImage(MV_FIG,0,0);
    const W=c.width,H=c.height,d=q.getImageData(0,0,W,H).data;
    const A=(x,y)=>d[(y*W+x)*4+3];
    const seen=new Uint8Array(W*H), st=[];
    const push=(x,y)=>{ const i=y*W+x; if(!seen[i]&&A(x,y)<100){seen[i]=1;st.push(i);} };
    for(let x=0;x<W;x++){ push(x,0); push(x,H-1); }
    for(let y=0;y<H;y++){ push(0,y); push(W-1,y); }
    while(st.length){ const i=st.pop(), x=i%W, y=(i-x)/W;
      if(x>0)push(x-1,y); if(x<W-1)push(x+1,y);
      if(y>0)push(x,y-1); if(y<H-1)push(x,y+1); }
    let holes=0;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++) if(A(x,y)<100&&!seen[y*W+x]) holes++;
    /* 그림에서 배트를 지웠는지 — 손잡이와 배트 끝 중간이 비어 있어야 한다 */
    const Fb=MV_FIGS.bat;
    const mid=A(Math.round(Fb[0]+60), Math.round(Fb[1]+88));
    /* 발바닥이 상자 맨 아래에 붙어 있는지 */
    const anch={bat:MV_FIG_ANCH.bat, pit:MV_FIG_ANCH.pit};
    return {W,H,holes,batMid:mid,anch,
      poses:Object.keys(MV_FIG_POSE),
      hasBat:MV_FIG_POSE.stand[4]!=null&&MV_FIG_POSE.swing[4]!=null,
      batTurn:(MV_FIG_POSE.stand[4]!=null&&MV_FIG_POSE.swing[4]!=null)
        ? Math.abs(MV_FIG_POSE.stand[4]-MV_FIG_POSE.swing[4]) : 0};
  });
  T(`통짜 그림이 붙어 있다 (${fig.W}x${fig.H})`, fig.W>0&&fig.H>0);
  T('그림 안쪽에 뚫린 구멍이 없다', fig.holes===0?'0개':'!'+fig.holes+'개');
  T('타자 그림에서 배트를 지웠다', fig.batMid<60?`a=${fig.batMid}`:`!아직 배트가 있다 a=${fig.batMid}`);
  T('배트를 따로 돌린다 (자세마다 각도)', fig.hasBat && fig.batTurn>1.5
      ? `${(fig.batTurn*180/Math.PI).toFixed(0)}도 돈다` : '!배트가 안 돈다');
  T('발바닥이 상자 맨 아래다', fig.anch.bat[2]>0.99&&fig.anch.pit[2]>0.99
      ? `타자 ${fig.anch.bat[2]} · 투수 ${fig.anch.pit[2]}` : '!'+JSON.stringify(fig.anch));

  const place=await p.evaluate(()=>{
    /* 발바닥이 정확히 (x,y) 에 오는지 — 캔버스에 그려서 실제로 재본다 */
    const c=document.createElement('canvas'); c.width=400; c.height=400;
    const g=c.getContext('2d');
    const u={cap:'#2f5fb0',sh:'#eef2f8',pants:'#dfe4ec',st:'rgba(47,95,176,.35)',gl:'#5b3a1e'};
    const out={};
    [['bat','stand'],['pit','rel'],['pit','idle']].forEach(([k,pose])=>{
      g.clearRect(0,0,400,400);
      mvFig(g,k,200,300,200,u,pose,false);
      const d=g.getImageData(0,0,400,400).data;
      let top=-1,bot=-1,minx=999,maxx=-1;
      for(let y=0;y<400;y++)for(let x=0;x<400;x++){
        if(d[(y*400+x)*4+3]>40){ if(top<0)top=y; bot=y;
          if(x<minx)minx=x; if(x>maxx)maxx=x; } }
      out[k+':'+pose]={top,bot,minx,maxx};
    });
    return out;
  });
  Object.keys(place).forEach(k=>{
    const o=place[k];
    /* 발바닥 밑에 그림자 타원(반지름 h*0.075=15px)을 깔아서 그만큼 더 나온다 */
    T(`${k} — 발이 바닥선에 선다`, Math.abs(o.bot-300)<=17 ? `아래끝 ${o.bot}` : `!아래끝 ${o.bot}`);
  });
  /* [제보] "투구 동작은 화면 아래쪽을 향해 공을 던지는 방향이어야 합니다"
     그림 한 장이라 팔이 안 움직이면 매 프레임 팔 벌리고 서 있는 꼴이 된다.
     던지는 팔을 어깨에서 잘라 따로 돌린다 — 진짜로 도는지 픽셀로 본다.   */
  const arm=await p.evaluate(()=>{
    const c=document.createElement('canvas'); c.width=500; c.height=500;
    const g=c.getContext('2d');
    const u={cap:'#2f5fb0',sh:'#eef2f8',pants:'#dfe4ec',st:'rgba(47,95,176,.35)',gl:'#5b3a1e'};
    const box=pose=>{
      g.clearRect(0,0,500,500);
      mvFig(g,'pit',250,400,240,u,pose,false);
      const d=g.getImageData(0,0,500,500).data;
      let top=-1,minx=999,maxx=-1,armTop=-1;
      for(let y=0;y<500;y++)for(let x=0;x<500;x++){
        if(d[(y*500+x)*4+3]>40){
          if(top<0)top=y; if(x<minx)minx=x; if(x>maxx)maxx=x;
          /* 던지는 팔은 화면 왼쪽이다. 머리(가운데)를 빼고 왼쪽만 본다 */
          if(x<215 && armTop<0) armTop=y;
        } }
      return {top,minx,maxx,armTop};
    };
    return {
      hasPiece: !!MV_FIGS.parm && MV_FIGS.parm[2]>20,
      angles: ['idle','wind','cock','rel','follow'].map(k=>MV_FIG_POSE[k][6]),
      ball:   ['idle','wind','cock','rel','follow'].map(k=>MV_FIG_POSE[k][7]),
      idle: box('idle'), cock: box('cock'), rel: box('rel'), follow: box('follow')
    };
  });
  T('던지는 팔이 따로 있다', arm.hasPiece ? `조각 ${MVW_(arm)}` : '!팔 조각이 없다');
  T('자세마다 팔 각이 다르다', (()=>{
      const a=arm.angles.filter(x=>typeof x==='number');
      const uniq=[...new Set(a.map(x=>x.toFixed(2)))];
      return (a.length===5 && uniq.length===5)
        ? a.map(x=>(x*180/Math.PI).toFixed(0)+'도').join(' → ') : '!'+uniq.length+'가지뿐';
    })());
  T('팔이 실제로 머리 위까지 올라간다',
    arm.cock.armTop < arm.idle.armTop-60
      ? `세트 ${arm.idle.armTop} → 코킹 ${arm.cock.armTop} (${arm.idle.armTop-arm.cock.armTop}px 올라감)`
      : `!${arm.idle.armTop}→${arm.cock.armTop}`);
  T('공을 놓은 뒤에는 손에 공이 없다',
    arm.ball[4]===0 && arm.ball[0]===1 ? '팔로스루만 공 없음' : '!'+JSON.stringify(arm.ball));
  T('팔로스루에서는 팔이 다시 내려온다',
    arm.follow.armTop > arm.cock.armTop+50
      ? `코킹 ${arm.cock.armTop} → 팔로스루 ${arm.follow.armTop}` : '!안 내려온다');

  T('세트 자세는 스트라이드보다 다리가 좁다',
    (place['pit:idle'].maxx-place['pit:idle'].minx) <
    (place['pit:rel'].maxx-place['pit:rel'].minx)-10
      ? `${place['pit:idle'].maxx-place['pit:idle'].minx}px < ${place['pit:rel'].maxx-place['pit:rel'].minx}px`
      : '!다리 폭이 그대로다');

  await p.close();

  /* ---- 만약에 라인스코어가 안 겹치는지 ----
     [제보] "시뮬레이션 깨지는데요? 안타 에러 점수"
     이닝 칸을 담은 <i> 가 줄어들면서 칸들이 밖으로 삐져나오고, 그 위에
     R·H·E 가 겹쳐 찍혔다. jsdom 은 레이아웃을 안 재서 못 잡는다.       */
  console.log('\n[만약에 라인스코어]');
  for(const W of [280,320,360,412,768]){
    const q=await b.newPage({viewport:{width:W,height:900}});
    await q.goto('file://'+require('path').resolve(process.argv[2]||'index.html'));
    await q.waitForTimeout(900);
    await q.evaluate(()=>{const l=document.getElementById('lock');if(l)l.classList.add('off');});
    await q.waitForTimeout(150);
    await q.locator('.pickcard').first().click();
    await q.waitForTimeout(150);
    await q.getByText('이 선수로 시작').click();
    await q.waitForTimeout(500);
    /* 옛 브라우저(삼성 인터넷 구버전 등)는 flex 항목의 min-width:auto 를
       구현하지 않아서 내용보다 더 줄어든다. 그 상황을 강제로 만들어 본다 —
       실제로 제보된 화면이 딱 이 모양이었다. */
    await q.addStyleTag({content:'.wl-r i{min-width:0}'});
    const r=await q.evaluate(()=>{
      ST.tutDone=true; whatIfInit(); WHATIF.runs=1; WHATIF.res=whatIfRun(1);
      /* 연장까지 가는 최악을 억지로 만들어 본다 */
      if(WHATIF.res){
        WHATIF.res.away.line=[1,0,0,2,3,1,0,4,2,1,0,3];
        WHATIF.res.home.line=[2,3,0,1,0,0,5,1,1,0,2,0];
      }
      go('whatif');
      const rows=[...document.querySelectorAll('.wl-r')];
      if(!rows.length) return {err:'행이 없다'};
      let overlap=0, cells=0;
      rows.forEach(row=>{
        const i=row.querySelector('i'); if(!i) return;
        const us=[...i.querySelectorAll('u')].map(u=>u.getBoundingClientRect());
        const bs=[...row.querySelectorAll(':scope>b')].map(x=>x.getBoundingClientRect());
        cells=Math.max(cells,us.length);
        us.forEach(u=>bs.forEach(bb=>{
          if(u.left<bb.right-0.5 && bb.left<u.right-0.5) overlap++; }));
      });
      const box=document.querySelector('.wi-line');
      return {overlap, cells, scroll:box.scrollWidth, client:box.clientWidth};
    });
    T(`폭 ${W} — 이닝 칸과 R·H·E 가 안 겹친다`,
      r.err ? '!'+r.err
        : (r.overlap===0 ? `${r.cells}이닝 · 겹침 0${r.scroll>r.client+1?' (가로 스크롤)':''}`
                         : `!${r.overlap}군데 겹친다`));
    await q.close();
  }

  await b.close();
  console.log(errs.length?('\n❌ '+errs.length+'건\n'+errs.join('\n')):'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})().catch(e=>{ console.log('❌ '+e.message); process.exit(1); });
