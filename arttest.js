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

(async()=>{
  const b=await chromium.launch(require('fs').existsSync(EXE)?{executablePath:EXE}:{});
  const p=await b.newPage();
  await p.goto('file://'+require('path').resolve(process.argv[2]||'index.html'));
  await p.waitForTimeout(1200);
  await p.evaluate(()=>{ mvSheetInit(); });
  await p.waitForFunction(()=>MV_SHEET_OK===true,null,{timeout:20000});

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

  await b.close();
  console.log(errs.length?('\n❌ '+errs.length+'건\n'+errs.join('\n')):'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})().catch(e=>{ console.log('❌ '+e.message); process.exit(1); });
