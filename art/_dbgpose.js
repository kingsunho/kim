/* 수비수 idle 한 명을 크게 그려서 관절을 눈으로 본다. 게임에는 안 들어간다.
   index.html 의 [ART:BEGIN]~[ART:END] 를 그대로 떼어다 돌린다 — pose.js 와 같은 방식.
     node art/_dbgpose.js            디버그 표시 켜고
     node art/_dbgpose.js plain      표시 없이 그림만                       */
const fs=require('fs');
const {Ctx,loadPNG,savePNG,RGBAImage}=require('./canvas2d.js');
const {execSync}=require('child_process');

const src=fs.readFileSync(__dirname+'/../index.html','utf8');
const a=src.indexOf('/* ===== [ART:BEGIN]');
const b=src.indexOf('/* ===== [ART:END] ===== */');
if(a<0||b<0){ console.error('[ART:BEGIN]/[ART:END] 를 못 찾았다'); process.exit(1); }
const block=src.slice(a,b);

execSync(`ffmpeg -v error -y -i "${__dirname}/sheet.webp" "${__dirname}/_sheet.png"`);
const sheetImg=loadPNG(__dirname+'/_sheet.png');

const documentShim={ createElement(){ return {
  width:0, height:0,
  getContext(){ const self=this; return {
    drawImage(img){ self._img=img; },
    getImageData(){ return {data:Uint8ClampedArray.from(self._img.data),
                            width:self._img.width, height:self._img.height}; },
    putImageData(im){ self._out=new RGBAImage(im.width,im.height,Buffer.from(im.data)); }
  }; } }; },
  querySelectorAll(){ return []; } };
const origCreate=documentShim.createElement;
documentShim.createElement=function(){
  const c=origCreate();
  const gc=c.getContext.bind(c);
  c.getContext=(...a)=>{ const q=gc(...a); const pp=q.putImageData;
    q.putImageData=(im)=>{ pp(im); Object.assign(c,{width:im.width,height:im.height,data:c._out.data}); };
    return q; };
  return c;
};

const pre=`const MVW=480,MVH=270;
const MV_MOUND={x:240,y:132}, MV_PLATE={x:240,y:250};
let ST={weather:'clear',park:'benamul'};\n`;
const post=`;return {mvGuy,MV_POSES,mvDebug,mvDebugDump,
  MV_JOINTS,MV_PARTS,MV_LEN,MV_SH,MV_HIPW,MV_NECK,
  setSheet:(s)=>{MV_SHEET=s;MV_SHEET_OK=true;}};`;
const A=new Function('document', pre+block+post)(documentShim);
A.setSheet(sheetImg);

const HOME={cap:'#2f5fb0', sh:'#eef2f8', pants:'#dfe4ec', gl:'#5b3a1e'};
const plain=process.argv[2]==='plain';
if(!plain) A.mvDebug(true);

/* 한 칸에 포즈 하나. 발바닥이 아래쪽에 오게 크게 그린다. */
const POSES=process.argv[3] ? [process.argv[3]] : ['idle','idleL','stand'];
const CW=300, CH=420, H=300;
const cv=new Ctx(CW*POSES.length, CH);
cv.fillStyle='#1b2230'; cv.fillRect(0,0,CW*POSES.length,CH);

POSES.forEach((p,i)=>{
  const ox=CW*i;
  // 칸 배경 + 바닥선
  cv.fillStyle=(i%2)?'#202838':'#1b2230'; cv.fillRect(ox,0,CW,CH);
  cv.strokeStyle='rgba(255,255,255,.14)'; cv.lineWidth=1;
  cv.beginPath(); cv.moveTo(ox,CH-50); cv.lineTo(ox+CW,CH-50); cv.stroke();
  // 중심선 — 발이 좌우로 얼마나 벌어졌는지 보려고
  cv.strokeStyle='rgba(255,255,255,.10)';
  cv.beginPath(); cv.moveTo(ox+CW/2,0); cv.lineTo(ox+CW/2,CH); cv.stroke();
  A.mvGuy(cv, ox+CW/2, CH-50, H, HOME, p, false, 7);
  cv.fillStyle='#c9a227'; cv.font='700 14px sans-serif';
  cv.textAlign='left'; cv.textBaseline='top';
  cv.fillText(p, ox+10, 10);
});
const out=__dirname+(plain?'/_dbg_plain.png':'/_dbg_marks.png');
const o=cv.toRGBA(); savePNG(out, o.w, o.h, o.data);
console.log(out);
