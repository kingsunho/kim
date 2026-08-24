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

  console.log('\n[완성된 그림을 그대로 쓴다 — 조립하지 않는다]');
  const fg=await p.evaluate(()=>({
    figs:Object.keys(MV_FIGS), of:MV_FIG_OF, h:MV_FIG_H,
    anch:MV_FIG_ANCH, src:String(mvFig),
    dead:['MV_FIG_POSE','MV_FIG_ARM','MV_FIG_BALL','MV_FIG_HEAD','MV_FIG_HIP','MV_GRIP']
      .filter(k=>typeof window[k]!=='undefined'||(()=>{try{eval(k);return true;}catch(e){return false;}})())
  }));
  T('그림 세 장이 다 있다 (투구 · 와인드업 · 타자)',
    fg.figs.includes('pit')&&fg.figs.includes('pitw')&&fg.figs.includes('bat')
      ? fg.figs.join(', ') : '!'+fg.figs.join(','));
  T('와인드업 → 투구로 그림이 바뀐다',
    fg.of.idle==='pitw' && fg.of.wind==='pitw' && fg.of.rel==='pit' && fg.of.follow==='pit'
      ? '세트/와인드업=pitw · 릴리스/피니시=pit' : '!'+JSON.stringify(fg.of));
  T('타자는 타자 그림만 쓴다', fg.of.stand==='bat'&&fg.of.swing==='bat' ? 'ok' : '!'+fg.of.stand);
  T('그림을 조립하지 않는다 (머리·팔·다리를 따로 안 건드린다)', (()=>{
      const bad=/mvBone|mvAnchor|head_cap|legSx|MV_FIG_ARM|MV_FIG_HEAD|MV_GRIP/.test(fg.src);
      return bad ? '!mvFig 안에서 아직 조립한다' : 'drawImage 한 번뿐';
    })());
  T('조립용 상수가 남아 있지 않다', fg.dead.length===0 ? '전부 지웠다' : '!'+fg.dead.join(','));
  T('그림마다 화면 키를 따로 잡는다',
    fg.h.bat>fg.h.pit && fg.h.pit>0 ? `타자 ${fg.h.bat} · 투수 ${fg.h.pit}/${fg.h.pitw}` : '!'+JSON.stringify(fg.h));
  T('투수가 타자의 절반쯤이다', (()=>{
      const r=fg.h.pit/fg.h.bat;
      return (r>0.42&&r<0.68) ? `${(r*100).toFixed(0)}%` : `!${(r*100).toFixed(0)}%`;
    })());
  T('발바닥이 그림 맨 아래다 (땅에 선다)',
    ['pit','bat','pitw'].every(k=>fg.anch[k][2]===1&&fg.anch[k][1]===0)
      ? 'ok' : '!'+JSON.stringify(fg.anch));

  console.log('\n[스윙이 눈에 보인다]');
  const sw=await p.evaluate(()=>{
    const fr=[0,0.2,0.38,0.5,0.62,0.8,1].map(t=>mvSwingPose(t));
    /* 실제로 그려서 프레임마다 그림이 달라지는지 픽셀로 본다 */
    const c=document.createElement('canvas'); c.width=300; c.height=300;
    const g=c.getContext('2d');
    const u={cap:'#2f5fb0',sh:'#eef2f8',pants:'#dfe4ec',st:'rgba(47,95,176,.35)',gl:'#5b3a1e'};
    const sig=[];
    [0,0.38,0.62,1].forEach(t=>{
      g.clearRect(0,0,300,300);
      mvFig(g,'swing',150,260,u,false,{no:1,swT:t});
      const d=g.getImageData(0,0,300,300).data;
      let n=0,sx=0;
      for(let i=3;i<d.length;i+=4) if(d[i]>60){ n++; sx+=((i-3)/4)%300; }
      sig.push({n, cx:n?Math.round(sx/n):0});
    });
    /* 등번호가 데이터에서 오는지 — 다른 번호를 주면 그림이 달라져야 한다 */
    const px=(no)=>{ g.clearRect(0,0,300,300);
      mvFig(g,'stand',150,260,u,false,{no:no,swT:0});
      const d=g.getImageData(0,0,300,300).data; let h=0;
      for(let i=0;i<d.length;i+=4) h=(h*31+d[i]+d[i+1]*3+d[i+3]*7)|0;
      return h; };
    return {fr, sig, h1:px(1), h2:px(88), h0:px(null)};
  });
  T('스윙 중에 몸이 돌아간다', (()=>{
      const r=sw.fr.map(f=>f.rot);
      return (Math.max(...r)-Math.min(...r))>0.25
        ? `회전 ${Math.min(...r).toFixed(2)} → ${Math.max(...r).toFixed(2)}` : '!'+r.join(',');
    })());
  T('배트 잔상이 떴다가 사라진다', (()=>{
      const b=sw.fr.map(f=>f.blur);
      return Math.max(...b)>0.8 && b[0]===0 && b[b.length-1]<0.2
        ? `0 → ${Math.max(...b).toFixed(2)} → ${b[b.length-1].toFixed(2)}` : '!'+b.join(',');
    })());
  T('프레임마다 실제로 그림이 다르다', (()=>{
      /* 몸이 돌아가면 그림의 무게중심이 옆으로 밀린다. 픽셀 수보다 이게 확실하다 */
      const s0=sw.sig[0], s1=sw.sig[1], s2=sw.sig[2], s3=sw.sig[3];
      const moved=(a,b)=>Math.abs(a.cx-b.cx);
      return moved(s1,s0)>=4 && moved(s2,s0)>=6 && moved(s3,s0)<=1
        ? `무게중심 ${s0.cx} → ${s1.cx} → ${s2.cx} → ${s3.cx} (되돌아옴)`
        : '!'+JSON.stringify(sw.sig);
    })());
  T('등번호가 선수 데이터에서 온다 (그림에 안 박혀 있다)',
    sw.h1!==sw.h2 && sw.h1!==sw.h0
      ? '번호를 바꾸면 그림도 바뀐다' : '!등번호가 고정이다');

  console.log('\n[누가 누구를 보고 있나 — 그림 픽셀로]');
  const face=await p.evaluate(()=>{
    const c=document.createElement('canvas');
    c.width=MV_FIG.naturalWidth; c.height=MV_FIG.naturalHeight;
    const q=c.getContext('2d'); q.drawImage(MV_FIG,0,0);
    const W=c.width, d=q.getImageData(0,0,c.width,c.height).data;
    const skin=(x,y)=>{const i=(y*W+x)*4, r=d[i],g=d[i+1],b=d[i+2];
      return d[i+3]>200 && r>195 && g>140 && g<225 && b>105 && b<195;};
    const out={};
    ['pit','bat','pitw'].forEach(k=>{
      const F=MV_FIGS[k];
      let top=0, all=0, sx=0, sy=0, n=0;
      for(let y=0;y<F[3];y++)for(let x=0;x<F[2];x++){
        if(skin(F[0]+x,F[1]+y)){ all++; sx+=x; sy+=y; n++;
          if(y<F[3]*0.30) top++; }
      }
      out[k]={top,all,cx:n?sx/n/F[2]:-1, cy:n?sy/n/F[3]:-1};
    });
    return out;
  });
  ['pit','bat','pitw'].forEach(k=>{
    T(`${k} — 머리가 그림 위쪽에 붙어 있다 (목이 안 파묻힌다)`,
      face[k].top>200 ? `위 30%에 살색 ${face[k].top}px` : `!${face[k].top}px`);
  });
  T('투수는 얼굴이 이쪽(타자)을 향한다 — 얼굴이 크게 보인다',
    face.pit.all>2500 && face.pitw.all>2500
      ? `피니시 ${face.pit.all}px · 와인드업 ${face.pitw.all}px` : `!${face.pit.all}/${face.pitw.all}`);
  T('타자는 뒤에서 본다 — 얼굴이 옆으로 조금만 보인다',
    face.bat.all < face.pit.all*0.75
      ? `타자 ${face.bat.all}px < 투수 ${face.pit.all}px` : `!타자 ${face.bat.all}px`);
  /* 살색 무게중심에는 팔뚝·손목도 같이 잡힌다. 그래서 기준을 넉넉히 잡되,
     '몸 아래쪽이 아니라 위쪽에 얼굴이 있다' 는 건 확실히 본다. */
  T('타자 얼굴이 그림 위쪽으로 돌아가 있다 (마운드를 올려다본다)',
    face.bat.cy < 0.36 ? `살색 무게중심 높이 ${(face.bat.cy*100).toFixed(0)}%` : `!${(face.bat.cy*100).toFixed(0)}%`);

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
