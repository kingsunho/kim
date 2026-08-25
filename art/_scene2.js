/* 실제 중계 화면 그대로 한 장. 야수 네 명이 게임과 같은 20px 로 선다.
   게임에는 안 들어간다.   node art/_scene2.js [배수]                      */
const fs=require('fs');
const {Ctx,loadPNG,savePNG,RGBAImage}=require('./canvas2d.js');
const {execSync}=require('child_process');

const src=fs.readFileSync(__dirname+'/../index.html','utf8');
const a=src.indexOf('/* ===== [ART:BEGIN]');
const b=src.indexOf('/* ===== [ART:END] ===== */');
const block=src.slice(a,b);
execSync(`ffmpeg -v error -y -i "${__dirname}/sheet.webp" "${__dirname}/_sheet.png"`);
const sheetImg=loadPNG(__dirname+'/_sheet.png');
const figImg=loadPNG(__dirname+'/_fig.png');

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

/* 화면 상수는 [ART] 구간 밖에 있어서 여기서 채워준다 */
const pre=`const MVW=480,MVH=270,MVS=3;
const MV_MOUND={x:240,y:132}, MV_PLATE={x:240,y:250};
const MV_BOX=[[166,230,62,42],[252,230,62,42]];
const MV_BOXC=[MV_BOX[0][0]+MV_BOX[0][2]/2, MV_BOX[1][0]+MV_BOX[1][2]/2, 262];
const MV_FIELD_SPOT=[[64,168,'3B'],[150,158,'SS'],[330,158,'2B'],[416,168,'1B']];
function fielderThrowsL(){ return false; }
let ST={weather:'clear',park:'benamul'};\n`;
const post=`;return {mvSky,mvCity,mvLights,mvBoard,mvStand,mvField,mvGuy,mvFig,mvDebug,mvHsv2rgb,
  MV_FIELD_SPOT,MV_MOUND,MV_PLATE,MV_BOXC,
  setSheet:(s)=>{MV_SHEET=s;MV_SHEET_OK=true;},setFig:(s)=>{MV_FIG=s;MV_FIG_OK=true;}};`;
const A=new Function('document', pre+block+post)(documentShim);
A.setSheet(sheetImg); A.setFig(figImg);

const K=parseFloat(process.argv[2]||'2.4');       // 확대 배수 (눈으로 보려고)
const cv=new Ctx(480*K, 270*K);
cv.scale(K,K);
const HOME={cap:'#2f5fb0', sh:'#eef2f8', pants:'#dfe4ec', st:'rgba(47,95,176,.35)', gl:'#5b3a1e'};
A.mvSky(cv); A.mvCity(cv); A.mvLights(cv); A.mvBoard(cv); A.mvStand(cv); A.mvField(cv);
/* mvPaint 와 같은 순서. 수비=우리(흰옷), 타자=상대(색옷) 로 놓고 본다 */
const hx=(h,s,v)=>{const c=A.mvHsv2rgb(h,s,v);const x=n=>('0'+Math.round(n*255).toString(16)).slice(-2);
  return '#'+x(c[0])+x(c[1])+x(c[2]);};
const HUE=parseFloat(process.argv[3]||'0');
const AWAY={cap:hx(HUE,0.62,0.70), sh:hx(HUE,0.16,0.93), pants:hx(HUE,0.12,0.86), gl:'#4a3018'};
A.MV_FIELD_SPOT.forEach(([x,y,pos])=> A.mvGuy(cv,x,y,20,HOME,'idle',false));
A.mvFig(cv,'rel',A.MV_MOUND.x,A.MV_MOUND.y+14,HOME,false);
A.mvGuy(cv,A.MV_PLATE.x,270+50,76,HOME,'catch',false);
A.mvFig(cv,'stand',A.MV_BOXC[0],A.MV_BOXC[2],AWAY,false,{no:27,swT:0});
const o=cv.toRGBA(); savePNG(__dirname+'/_scene2.png',o.w,o.h,o.data);
console.log(__dirname+'/_scene2.png');
