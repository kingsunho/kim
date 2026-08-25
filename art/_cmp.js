/* 수비수 idle 전/후 비교. 게임에는 안 들어간다.
   같은 코드에 포즈 값만 갈아끼워서 나란히 그린다.
     node art/_cmp.js          전/후
     node art/_cmp.js marks    새 값 + 관절 표시                        */
const fs=require('fs');
const {Ctx,loadPNG,savePNG,RGBAImage}=require('./canvas2d.js');
const {execSync}=require('child_process');

const src=fs.readFileSync(__dirname+'/../index.html','utf8');
const a=src.indexOf('/* ===== [ART:BEGIN]');
const b=src.indexOf('/* ===== [ART:END] ===== */');
const block=src.slice(a,b);
execSync(`ffmpeg -v error -y -i "${__dirname}/sheet.webp" "${__dirname}/_sheet.png"`);
const sheetImg=loadPNG(__dirname+'/_sheet.png');

const documentShim={ createElement(){ return { width:0,height:0,
  getContext(){ const self=this; return {
    drawImage(img){ self._img=img; },
    getImageData(){ return {data:Uint8ClampedArray.from(self._img.data),
                            width:self._img.width, height:self._img.height}; },
    putImageData(im){ self._out=new RGBAImage(im.width,im.height,Buffer.from(im.data)); }
  }; } }; }, querySelectorAll(){ return []; } };
const oc=documentShim.createElement;
documentShim.createElement=function(){ const c=oc(); const gc=c.getContext.bind(c);
  c.getContext=(...z)=>{ const q=gc(...z); const pp=q.putImageData;
    q.putImageData=(im)=>{ pp(im); Object.assign(c,{width:im.width,height:im.height,data:c._out.data}); };
    return q; }; return c; };

const pre=`const MVW=480,MVH=270;
const MV_MOUND={x:240,y:132}, MV_PLATE={x:240,y:250};
let ST={weather:'clear',park:'benamul'};\n`;
const post=`;return {mvGuy,MV_POSES,mvDebug,setSheet:(s)=>{MV_SHEET=s;MV_SHEET_OK=true;}};`;
const A=new Function('document', pre+block+post)(documentShim);
A.setSheet(sheetImg);

/* v2.45.0 까지 쓰던 값 — 비교용으로만 여기 둔다 */
const OLD={hip:[0,-19.0], lean:0.00, narrow:1.00,
  legB:[-0.13,-0.03], legF:[0.13,0.03],
  armB:[-6.1,2.2,-1], armF:[6.1,2.2,1], handF:'glove', head:0.00};
const NEW=JSON.parse(JSON.stringify(A.MV_POSES.idle));

const marks=process.argv[2]==='marks';
const CW=310, CH=430, H=310;
const cols = marks ? [['새 값 + 관절 표시',NEW,true]]
                   : [['이전 (v2.45.0)',OLD,false], ['수정 후',NEW,false]];
const cv=new Ctx(CW*cols.length, CH);
cv.fillStyle='#161c27'; cv.fillRect(0,0,CW*cols.length,CH);

cols.forEach(([label,pose,dbg],i)=>{
  const ox=CW*i;
  cv.fillStyle=(i%2)?'#1d2534':'#161c27'; cv.fillRect(ox,0,CW,CH);
  // 어깨 반폭(4.73) 자리에 세로 안내선 — 발이 어깨 너비에 얼마나 가까운지
  const s=H/40, cx=ox+CW/2;
  cv.strokeStyle='rgba(120,180,255,.28)'; cv.lineWidth=1;
  [-4.73,4.73].forEach(x=>{ cv.beginPath();
    cv.moveTo(cx+x*s,60); cv.lineTo(cx+x*s,CH-40); cv.stroke(); });
  cv.strokeStyle='rgba(255,255,255,.16)';
  cv.beginPath(); cv.moveTo(ox,CH-60); cv.lineTo(ox+CW,CH-60); cv.stroke();
  Object.assign(A.MV_POSES.idle, pose);
  A.mvDebug(!!dbg);
  A.mvGuy(cv, cx, CH-60, H, {cap:'#2f5fb0',sh:'#eef2f8',pants:'#dfe4ec',gl:'#5b3a1e'}, 'idle', false, 7);
  A.mvDebug(false);
  cv.fillStyle='#c9a227'; cv.font='700 15px sans-serif';
  cv.textAlign='left'; cv.textBaseline='top'; cv.fillText(label, ox+12, 12);
  cv.fillStyle='#8fa3bb'; cv.font='11px sans-serif';
  cv.fillText('파란 선 = 어깨 너비', ox+12, 34);
});
const out=__dirname+(marks?'/_cmp_marks.png':'/_cmp.png');
const o=cv.toRGBA(); savePNG(out,o.w,o.h,o.data);
console.log(out);
