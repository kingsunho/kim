/* [2.34.0] 화면 축 — 투수 ↓ 공 ↓ 타자 ↓ 포수

   [제보] 사용자가 그림까지 그려서 보내준 기준이다.
     · 투수(마운드)는 화면 위, 타자(타석)는 화면 아래
     · 투수는 아래쪽 홈플레이트를 향해 던지고, 공도 위 → 아래로 간다
     · 타자는 반드시 타석 박스 안에 발을 놓고 위쪽 투수를 본다
     · 포수는 타자 뒤(더 아래)에서 위를 본다
   눈으로 보면 "뭔가 이상하다" 로 끝나서 매번 놓쳤다. 좌표로 박아둔다.   */
let chromium=null;
try{ chromium=require('playwright').chromium; }catch(e){}
if(!chromium){ console.log('⚠️  playwright 가 없다 — 건너뛴다'); process.exit(0); }
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const errs=[];
const T=(n,r)=>{const ok=!!r&&!(typeof r==='string'&&r[0]==='!');
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!ok)errs.push(n);};

(async()=>{
  const b=await chromium.launch(require('fs').existsSync(EXE)?{executablePath:EXE}:{});
  const p=await b.newPage({viewport:{width:412,height:900}});
  await p.goto('file://'+require('path').resolve(process.argv[2]||'index.html'));
  await p.waitForTimeout(1000);
  await p.evaluate(()=>{ mvSheetInit(); mvFigInit(); });
  await p.waitForFunction(()=>MV_FIG_OK===true,null,{timeout:20000});

  const g=await p.evaluate(()=>({
    mound:{x:MV_MOUND.x,y:MV_MOUND.y}, plate:{x:MV_PLATE.x,y:MV_PLATE.y},
    box:MV_BOX, boxc:MV_BOXC, H:MVH, W:MVW,
    paint:String(mvPaint), fig:String(mvFig), ball:String(throwBall)
  }));

  console.log('[화면 축 — 투수 ↓ 공 ↓ 타자 ↓ 포수]');
  T('투수(마운드)가 타자(타석)보다 위에 있다',
    g.mound.y < g.boxc[2]-40 ? `마운드 y=${g.mound.y} · 타석 y=${g.boxc[2]}` : '!뒤집혔다');
  T('타자가 포수보다 위에 있다',
    g.boxc[2] < g.H ? `타석 y=${g.boxc[2]} < 포수 y=${g.H+50}` : '!뒤집혔다');
  T('마운드와 홈플레이트가 같은 세로축이다',
    Math.abs(g.mound.x-g.plate.x)<1 ? `x=${g.mound.x}` : `!${g.mound.x} vs ${g.plate.x}`);
  T('공은 위에서 아래로 간다', /const sx=W\*0\.5,\s*sy=H\*0\.49/.test(g.ball)
    ? '릴리스가 화면 위쪽(0.49H)' : '!릴리스 지점을 못 찾음');

  console.log('\n[타자는 타석 박스 안에 선다]');
  const inBox=(cx,cy,bx)=>cx>=bx[0]&&cx<=bx[0]+bx[2]&&cy>=bx[1]&&cy<=bx[1]+bx[3];
  T('우타 발자리가 3루쪽 박스 안이다',
    inBox(g.boxc[0],g.boxc[2],g.box[0])
      ? `(${g.boxc[0]}, ${g.boxc[2]}) ∈ [${g.box[0].join(',')}]` : '!박스 밖이다');
  T('좌타 발자리가 1루쪽 박스 안이다',
    inBox(g.boxc[1],g.boxc[2],g.box[1])
      ? `(${g.boxc[1]}, ${g.boxc[2]}) ∈ [${g.box[1].join(',')}]` : '!박스 밖이다');
  T('우타는 3루쪽(화면 왼쪽), 좌타는 1루쪽(오른쪽)',
    g.boxc[0]<g.plate.x && g.boxc[1]>g.plate.x ? 'ok' : '!좌우가 바뀌었다');
  T('박스가 홈플레이트를 사이에 두고 붙어 있다',
    (g.box[0][0]+g.box[0][2])<=g.plate.x-10 && g.box[1][0]>=g.plate.x+10
      ? `${g.box[0][0]+g.box[0][2]} | ${g.plate.x} | ${g.box[1][0]}` : '!플레이트와 겹친다');
  T('그리는 코드가 이 박스를 쓴다 (좌표를 두 군데 안 박는다)',
    /MV_BOX\.forEach/.test(String(await p.evaluate(()=>String(mvField))))
      ? 'MV_BOX 하나만 본다' : '!따로 박아뒀다');
  T('타자를 박스 한가운데에 세운다', /MV_BOXC\[1\]:MV_BOXC\[0\]/.test(g.paint)
    ? 'ok' : '!다른 좌표를 쓴다');

  console.log('\n[투구 동작]');
  const ph=await p.evaluate(()=>{
    const P=MV_FIG_POSE;
    return {arm:['idle','wind','cock','rel','follow'].map(k=>P[k][6]),
            leg:['idle','wind','cock','rel','follow'].map(k=>P[k][5]),
            push:['idle','wind','cock','rel','follow'].map(k=>P[k][2]),
            head:!!(typeof MV_FIG_HEAD!=='undefined'&&MV_FIG_HEAD.pit)};
  });
  T('팔이 뒤 → 머리 위 → 앞으로 넘어온다',
    ph.arm[1]<ph.arm[2] && ph.arm[2]<ph.arm[3] ? ph.arm.map(v=>v.toFixed(2)).join(' → ') : '!'+ph.arm.join(','));
  T('다리가 모았다가 벌어진다 (세트 → 스트라이드)',
    ph.leg[1]<ph.leg[3] ? ph.leg.join(' → ') : '!'+ph.leg.join(','));
  T('몸이 뒤로 모았다가 앞(타자쪽)으로 나간다',
    ph.push[1]<0 && ph.push[4]>1 ? ph.push.join(' → ') : '!'+ph.push.join(','));
  T('투수 얼굴을 정면(타자쪽)으로 갈아 끼운다', ph.head ? 'MV_FIG_HEAD.pit' : '!옆얼굴 그대로');

  console.log('\n[실제로 그려본다]');
  const draw=await p.evaluate(()=>{
    const c=document.createElement('canvas'); c.width=MVW*2; c.height=MVH*2;
    const g2=c.getContext('2d'); g2.setTransform(2,0,0,2,0,0);
    const m=document.createElement('div'); m.className='mound';
    m.innerHTML='<canvas class="mv-cv" width="'+(MVW*3)+'" height="'+(MVH*3)+'"></canvas>';
    document.body.appendChild(m);
    LIVE=null;
    mvPaint(m,{pit:'rel',bat:'stand',pitLeft:false,batLeft:false,usDef:false});
    const cv=m.querySelector('.mv-cv');
    const q=cv.getContext('2d');
    const d=q.getImageData(0,0,cv.width,cv.height).data;
    /* 위쪽 절반과 아래쪽 절반에서 사람(살구색 얼굴) 픽셀이 있는지 */
    const skin=(i)=>{const r=d[i],g3=d[i+1],b=d[i+2];
      return d[i+3]>200 && r>200 && g3>150 && g3<215 && b>110 && b<190;};
    let topY=-1, botY=-1;
    for(let y=0;y<cv.height;y++){
      for(let x=0;x<cv.width;x++){
        if(skin((y*cv.width+x)*4)){ if(topY<0)topY=y; botY=y; break; }
      }
    }
    m.remove();
    return {topY:topY/3, botY:botY/3, h:MVH};
  });
  T('사람 얼굴이 화면 위(투수)와 아래(타자) 양쪽에 있다',
    draw.topY>0 && draw.botY>draw.topY+60
      ? `투수 얼굴 y≈${draw.topY.toFixed(0)} · 타자 얼굴 y≈${draw.botY.toFixed(0)}`
      : `!${draw.topY.toFixed(0)} ~ ${draw.botY.toFixed(0)}`);

  await b.close();
  console.log(errs.length?('\n❌ '+errs.length+'건\n'+errs.join('\n')):'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})().catch(e=>{ console.log('❌ '+e.message); process.exit(1); });
