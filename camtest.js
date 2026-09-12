/* 카메라 — [제보] "너무 짜치는데 이런 느낌이 안나"

   마구마구 타석 화면 넉 장의 공통점은 하나다: **카메라가 타자 어깨 뒤에
   바짝 붙어 있다.** 타자가 화면의 절반을 먹고, 투수는 저 멀리 작고,
   스트라이크 존이 그 사이에 크게 떠 있다.

   우리는 구장 전체가 나오는 넓은 그림이었다. 좌표를 다 다시 잡는 대신
   **그리던 그대로 그리고 카메라만 당겼다**(MV_CAM).

   [핵심] 캔버스는 카메라로 당겨지는데 그 위에 얹은 DOM(스트라이크 존 ·
   미트 · 공)은 안 따라간다. 둘이 어긋나면 **화면에서 한가운데로 들어온
   공이 볼로 불린다** — 예전에 실제로 겪은 사고다.
   그래서 여기서는 「보이는 것」과 「판정에 쓰는 것」이 같은 자리인지를
   숫자로 확인한다.                                                 */
const {chromium}=require('playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const errs=[];
const T=(ok,n,extra)=>{console.log((ok?'  ✅ ':'  ❌ ')+n+(extra?' :: '+extra:''));if(!ok)errs.push(n);};

(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await b.newPage({viewport:{width:390,height:820}});
  const boom=[]; p.on('pageerror',e=>boom.push(String(e.message)));
  await p.goto('file://'+process.cwd()+'/index.html');
  await p.waitForTimeout(1200);

  console.log('[카메라 상수]');
  const C=await p.evaluate(()=>({cam:MV_CAM, cx:MV_CAM_X, cy:MV_CAM_Y,
    bat:MV_FIG_H.bat, pit:MV_FIG_H.pit, mound:MV_MOUND.y, plate:MV_PLATE.y,
    W:MVW, H:MVH, boxc:MV_BOXC[2]}));
  const scr=(src)=>C.cy+(src-C.cy)*C.cam;             // 원본 y → 화면 y
  T(C.cam>1.15 && C.cam<1.8, '카메라가 당겨져 있다', C.cam+'배');
  T(C.cy>C.H, '축이 화면 아래에 있다 — 위(하늘)가 잘리고 아래(홈플레이트 흙)가 남는다',
    'MV_CAM_Y='+C.cy+' > 화면 높이 '+C.H);
  /* 당기고 나서도 투수 머리와 홈플레이트 흙이 둘 다 들어와야 한다 */
  const pitHead=scr(C.mound+14-C.pit);
  const dirtTop=scr(C.plate+14-32);
  T(pitHead>0, '투수 머리가 위로 안 잘린다', '머리 y='+pitHead.toFixed(0));
  T(dirtTop<C.H, '홈플레이트 흙이 화면 안에 있다 — 타자가 잔디에 서 있으면 안 된다',
    '흙 윗선 y='+dirtTop.toFixed(0)+' < '+C.H);
  const batTop=scr(C.boxc-C.bat), batBot=scr(C.boxc);
  const fill=(Math.min(C.H,batBot)-Math.max(0,batTop))/C.H;
  T(fill>0.55, '타자가 화면 높이의 절반을 넘게 먹는다 — 어깨 뒤 카메라다',
    (fill*100).toFixed(0)+'%');
  T(C.pit/C.bat<0.45, '투수는 타자보다 한참 작다',
    C.pit+'/'+C.bat+' = '+(C.pit/C.bat*100).toFixed(0)+'%');

  console.log('\n[화면에 얹은 것이 캔버스와 같은 자리인가]');
  const Z=await p.evaluate(()=>{
    /* [주의] body.innerHTML 을 비우면 **대기화면 뒤에 둔 두 번째
       <style> 까지 날아간다**(경기 화면 CSS 가 거기 있다). 붙이기만 한다. */
    const host=document.createElement('div');
    host.id='camhost'; host.style.cssText='position:fixed;left:-9999px;top:0;width:400px';
    document.body.appendChild(host);
    const mv=moundView({batLeft:false, usDef:false});
    host.appendChild(mv);
    const box=mv.getBoundingClientRect();
    const z=mv.querySelector('#szone').getBoundingClientRect();
    return {boxW:box.width, boxH:box.height,
      zx:(z.left+z.width/2-box.left)/box.width, zy:(z.top+z.height/2-box.top)/box.height,
      zw:z.width/box.width, zh:z.height/box.height};
  });
  /* 존은 홈플레이트 바로 위다. 카메라 식으로 뽑은 자리와 같아야 한다.
     예전(카메라 없던 시절) 존 중심은 화면 80%, 폭 10% 였다.        */
  const wantY=scr(0.80*C.H)/C.H, wantW=0.10*C.cam;
  T(Math.abs(Z.zy-wantY)<0.02, '존 높이가 카메라 식과 맞는다',
    '실제 '+(Z.zy*100).toFixed(1)+'% · 계산 '+(wantY*100).toFixed(1)+'%');
  T(Math.abs(Z.zw-wantW)<0.012, '존 폭이 카메라 배율만큼 커졌다',
    '실제 '+(Z.zw*100).toFixed(1)+'% · 계산 '+(wantW*100).toFixed(1)+'%');
  T(Math.abs(Z.zx-0.5)<0.005, '존이 가로 한가운데다 (홈플레이트 위)', (Z.zx*100).toFixed(1)+'%');
  /* zh·zw 는 각각 판 높이·너비 대비 비율이라, 되돌리려면 boxH/boxW 만
     곱하면 된다. 16/9 를 한 번 더 곱했다가 1:2.42 가 나왔다.       */
  const zr=Z.zh/Z.zw*(Z.boxH/Z.boxW);
  T(zr>1.15 && zr<1.45, '존 가로:세로가 실제 비율(1:1.3)에 가깝다', '1 : '+zr.toFixed(2));

  console.log('\n[공은 투수 손에서 나온다]');
  /* [주의] 페이지 DOM 에서 읽으면 안 된다 — 위에서 body 를 건드리면
     스크립트 태그가 같이 날아간다. 파일에서 직접 읽는다.          */
  const SRC=require('fs').readFileSync('index.html','utf8');
  const relM=SRC.match(/const sx=W\*0\.5, sy=H\*([\d.]+)/);
  const rel=relM?Number(relM[1]):null;
  /* [버그 이력] 0.49 는 카메라를 당기기 전 마운드 자리였다. 안 고치면
     공이 투수 손이 아니라 화면 한가운데 잔디에서 튀어나온다.      */
  const wantRel=scr(C.mound)/C.H;
  T(rel!=null && Math.abs(rel-wantRel)<0.03, '릴리스 지점이 마운드에 있다',
    '실제 '+(rel*100).toFixed(0)+'% · 마운드 '+(wantRel*100).toFixed(0)+'%');
  T(rel<0.40, '화면 한가운데에서 공이 튀어나오지 않는다', (rel*100).toFixed(0)+'%');

  console.log('\n[폰 세로 화면 — 좌우를 잘라서 꽉 채운다]');
  const F=await p.evaluate(()=>{
    const h0=document.getElementById('camhost'); if(h0) h0.remove();
    const st=document.createElement('div');
    st.id='decision'; st.className='decision on sheet swf';
    st.style.cssText='position:fixed;inset:0';
    st.innerHTML='<div class="pl-wrap"></div>';
    document.body.appendChild(st);
    const mv=moundView({batLeft:false, usDef:false});
    st.querySelector('.pl-wrap').appendChild(mv);
    return new Promise(r=>setTimeout(()=>{
      const box=mv.getBoundingClientRect();
      const cv=mv.querySelector('.mv-cv').getBoundingClientRect();
      const z=mv.querySelector('#szone').getBoundingClientRect();
      r({boxW:box.width, boxH:box.height, cvW:cv.width, cvH:cv.height,
         zOfCv:z.width/cv.width, zOfBox:z.width/box.width,
         zx:(z.left+z.width/2-box.left)/box.width});
    },120));
  });
  T(F.boxH>F.boxW*0.75, '세로 화면에서는 야구장이 세로로 길다 — 빈 곳을 안 남긴다',
    Math.round(F.boxW)+'×'+Math.round(F.boxH));
  T(F.cvW>F.boxW*1.3, '캔버스가 판보다 넓다 — 좌우를 잘라낸다 (찌그러뜨리지 않는다)',
    '캔버스 '+Math.round(F.cvW)+' vs 판 '+Math.round(F.boxW));
  T(Math.abs(F.cvW/F.cvH-16/9)<0.05, '캔버스 비율은 16:9 그대로다',
    (F.cvW/F.cvH).toFixed(2));
  /* [핵심] 존을 판 너비의 % 로 두면 캔버스가 두 배 넓어져도 존만
     쪼그라든다 — 보기에도 작고 공이 흩어지는 범위까지 좁아진다. */
  T(Math.abs(F.zOfCv-0.10*C.cam)<0.015,
    '잘라내도 존은 캔버스 기준으로 같은 크기다',
    '캔버스의 '+(F.zOfCv*100).toFixed(1)+'% (판 기준으론 '+(F.zOfBox*100).toFixed(1)+'%)');
  T(Math.abs(F.zx-0.5)<0.01, '잘라내도 존은 홈플레이트 위에 있다', (F.zx*100).toFixed(1)+'%');

  console.log('\n[깨진 데 없나]');
  T(boom.length===0, '브라우저 예외 없음', boom.slice(0,2).join(' / ')||'없음');

  console.log(errs.length?('\n❌ '+errs.length+'건: '+errs.join(' / ')):'\n✅ 전부 통과');
  await b.close();
  process.exit(errs.length?1:0);
})();
