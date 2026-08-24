/* 구장 그림과 사람 포즈를 눈으로 확인한다. 게임에는 안 들어간다.

   index.html 의 [ART:BEGIN] ~ [ART:END] 구간을 **그대로 떼어다** 돌린다.
   그래서 여기서 잘 나오면 게임에서도 잘 나온다 (브라우저 canvas 대신
   art/canvas2d.js 의 흉내내기 컨텍스트를 쓰는 것만 다르다).

   사용:
     node art/pose.js            구장 3개 + 포즈 전부
     node art/pose.js park       구장 3개만
     node art/pose.js pose       포즈만 크게
     node art/pose.js scene      배나물 한 장 크게                    */
const fs=require('fs');
const {Ctx,loadPNG,savePNG,RGBAImage}=require('./canvas2d.js');

const MVW=480, MVH=270;
const src=fs.readFileSync(__dirname+'/../index.html','utf8');
const a=src.indexOf('/* ===== [ART:BEGIN]');
const b=src.indexOf('/* ===== [ART:END] ===== */');
if(a<0||b<0){ console.error('index.html 에서 [ART:BEGIN]/[ART:END] 를 못 찾았다'); process.exit(1); }
const block=src.slice(a,b);

/* 시트는 webp 를 png 로 바꿔서 읽는다 (ffmpeg 가 webp 알파를 잘 준다) */
const {execSync}=require('child_process');
execSync(`ffmpeg -v error -y -i "${__dirname}/sheet.webp" "${__dirname}/_sheet.png"`);
const sheetImg=loadPNG(__dirname+'/_sheet.png');

/* mvSheetFor 안의 document.createElement('canvas') 를 흉내낸다 —
   색 바꾸기(mvTintPixels)까지 진짜 코드 그대로 확인하려고. */
const documentShim={ createElement(){ return {
  width:0, height:0,
  getContext(){ const self=this; return {
    drawImage(img){ self._img=img; },
    getImageData(){ return {data:Uint8ClampedArray.from(self._img.data),
                            width:self._img.width, height:self._img.height}; },
    putImageData(im){ self._out=new RGBAImage(im.width,im.height,Buffer.from(im.data)); }
  }; } }; } };
/* putImageData 로 만들어진 것을 그림으로 쓰게 감싼다 */
const origCreate=documentShim.createElement;
documentShim.createElement=function(){
  const c=origCreate();
  const gc=c.getContext.bind(c);
  c.getContext=(...a)=>{ const q=gc(...a); const pp=q.putImageData;
    q.putImageData=(im)=>{ pp(im); Object.assign(c,{width:im.width,height:im.height,data:c._out.data}); };
    return q; };
  return c;
};

const pre=`const MVW=${MVW},MVH=${MVH};
const MV_MOUND={x:240,y:132}, MV_PLATE={x:240,y:250};
let ST={weather:'clear',park:'benamul'};\n`;
const post=`;return {mvSky,mvCity,mvLights,mvBoard,mvStand,mvField,mvGuy,mvGuyVec,MV_POSES,
  setSheet:(s)=>{MV_SHEET=s;MV_SHEET_OK=true;},
  setST:(s)=>{ST=s;}};`;
const A=new Function('document', pre+block+post)(documentShim);
A.setSheet(sheetImg);

const HOME={cap:'#2f5fb0', sh:'#eef2f8', pants:'#dfe4ec', gl:'#5b3a1e'};
const AWAY={cap:'#b23a34', sh:'#e6ddd0', pants:'#d8d0c4', gl:'#4a3018'};

/* mvPaint 와 같은 순서로 한 장 그린다 */
function scene(g, park, weather, o){
  o=o||{};
  A.setST({park, weather});
  A.mvSky(g); A.mvCity(g); A.mvLights(g); A.mvBoard(g); A.mvStand(g); A.mvField(g);
  const du=o.usDef?HOME:AWAY, ou=o.usDef?AWAY:HOME;
  [[64,168],[150,158],[330,158],[416,168]].forEach(([x,y])=>A.mvGuy(g,x,y,20,du,'idle',false));
  A.mvGuy(g,240,144,40,du,o.pit||'cock',!o.pitLeft, 18);
  A.mvGuy(g,240,MVH+50,76,du,'catch',false);
  A.mvGuy(g, o.batLeft?322:158, 260, 80, ou, o.bat||'stand', !o.batLeft, 47);
}

function label(g,t,x,y){
  g.fillStyle='rgba(0,0,0,.55)'; g.fillRect(x-3,y-11,t.length*7.6+6,14);
  g.fillStyle='#ffd15c'; g.font='bold 11px sans-serif'; g.textAlign='left'; g.fillText(t,x,y);
}
function out(name,g){
  const o=g.toRGBA(); savePNG(__dirname+'/'+name, o.w,o.h,o.data);
  console.log('art/'+name);
}

const mode=process.argv[2]||'all';

if(mode==='all'||mode==='park'){
  const parks=[['benamul','BENAMUL 3'],['seonggok','SEONGGOK 3'],['singil','SINGIL 3']];
  const g=new Ctx(MVW, MVH*3+8*4);
  g.fillStyle='#0b0e13'; g.fillRect(0,0,MVW,MVH*3+32);
  parks.forEach(([id,nm],i)=>{
    g.save(); g.translate(0, 8+i*(MVH+8));
    g.beginPath(); g.rect(0,0,MVW,MVH); g.clip();
    scene(g, id, 'clear', {usDef:true, pit:'cock', bat:'stand'});
    g.restore();
    label(g, nm, 6, 8+i*(MVH+8)+14);
  });
  out('_parks.png', g);
}

if(mode==='all'||mode==='pose'){
  const poses=Object.keys(A.MV_POSES);
  const CELL=170, PAD=6, COLS=4;
  const ROWS=Math.ceil(poses.length/COLS);
  const g=new Ctx(COLS*(CELL+PAD)+PAD, ROWS*(CELL+PAD)+PAD);
  g.fillStyle='#161a21'; g.fillRect(0,0,g.W,g.H);
  A.setST({park:'benamul',weather:'clear'});
  poses.forEach((p,i)=>{
    const cx=PAD+(i%COLS)*(CELL+PAD), cy=PAD+((i/COLS)|0)*(CELL+PAD);
    g.fillStyle=(i%2)?'#1e232c':'#232935'; g.fillRect(cx,cy,CELL,CELL);
    g.strokeStyle='rgba(255,255,255,.10)'; g.lineWidth=1;
    g.beginPath(); g.moveTo(cx,cy+CELL-22); g.lineTo(cx+CELL,cy+CELL-22); g.stroke();
    A.mvGuy(g, cx+CELL/2, cy+CELL-22, 118, HOME, p, false, 47);
    label(g, p.toUpperCase(), cx+4, cy+13);
  });
  out('_poses.png', g);
}

if(mode==='scene'){
  const g=new Ctx(MVW,MVH);
  scene(g,'benamul','clear',{usDef:true, pit:'rel', bat:'swing'});
  out('_scene.png', g);
}
if(mode==='vec'){
  const poses=['idle','wind','cock','rel','follow','swing','stand','catch'];
  const CELL=150,PAD=6,COLS=4;
  const g=new Ctx(COLS*(CELL+PAD)+PAD, 2*(CELL+PAD)+PAD);
  g.fillStyle='#161a21'; g.fillRect(0,0,g.W,g.H);
  poses.forEach((p,i)=>{
    const cx=PAD+(i%COLS)*(CELL+PAD), cy=PAD+((i/COLS)|0)*(CELL+PAD);
    g.fillStyle=(i%2)?'#1e232c':'#232935'; g.fillRect(cx,cy,CELL,CELL);
    A.mvGuyVec(g, cx+CELL/2, cy+CELL-18, 100, HOME, p, false, 47);
    label(g,p.toUpperCase(),cx+4,cy+13);
  });
  out('_vec.png', g);
}

/* 관절이 실제로 어디에 찍히는지 뼈대를 얹어 본다.
   mvGuySprite 와 같은 순서로 좌표만 다시 계산한다 (미리보기용 중복이다). */
if(mode==='dbg'){
  const LEN={torso:11.5,uarm:6.2,farm:6.4,thigh:9.2,shin:7.6};
  const SH=[-4.73,-9.91], NECK=-11.5;
  const poses=['idle','cock','stand','swing'];
  const CELL=260,PAD=8;
  const g=new Ctx(poses.length*(CELL+PAD)+PAD, CELL+PAD*2);
  g.fillStyle='#161a21'; g.fillRect(0,0,g.W,g.H);
  A.setST({park:'benamul',weather:'clear'});
  poses.forEach((p,i)=>{
    const cx=PAD+i*(CELL+PAD), cy=PAD, gy=cy+CELL-30, ox=cx+CELL/2;
    g.fillStyle='#202631'; g.fillRect(cx,cy,CELL,CELL);
    A.mvGuy(g, ox, gy, 190, HOME, p, false, 47);
    const R=A.MV_POSES[p], s=190/40;
    const T=(x,y)=>[ox+x*s, gy+y*s];
    const dot=(pt,c,r)=>{ g.fillStyle=c; g.beginPath(); g.arc(pt[0],pt[1],r||3,0,Math.PI*2); g.fill(); };
    const seg=(a2,b2,c)=>{ g.strokeStyle=c; g.lineWidth=1.6;
      g.beginPath(); g.moveTo(a2[0],a2[1]); g.lineTo(b2[0],b2[1]); g.stroke(); };
    const hip=[R.hip[0],R.hip[1]];
    const step=(x,y,ang,len)=>[x+Math.sin(ang)*len, y+Math.cos(ang)*len];
    // 다리
    [[R.legB,'#ff6b6b'],[R.legF,'#ffd15c']].forEach(([a2,c])=>{
      const kn=step(hip[0],hip[1],a2[0],LEN.thigh);
      const an=step(kn[0],kn[1],a2[1],LEN.shin);
      seg(T(hip[0],hip[1]),T(kn[0],kn[1]),c); seg(T(kn[0],kn[1]),T(an[0],an[1]),c);
      dot(T(kn[0],kn[1]),c); dot(T(an[0],an[1]),c);
    });
    // 몸통 (기울기 무시하고 대략)
    const neck=[hip[0]+Math.sin(R.lean)*LEN.torso*-1*0+0, hip[1]+NECK];
    seg(T(hip[0],hip[1]),T(neck[0],neck[1]),'#6bd6ff');
    dot(T(hip[0],hip[1]),'#fff',4); dot(T(neck[0],neck[1]),'#6bd6ff',4);
    [[R.armB,'#a6ff6b',-1],[R.armF,'#6bffd6',1]].forEach(([a2,c,sg])=>{
      const sh=[hip[0]+sg*-SH[0]*R.narrow, hip[1]+SH[1]];
      const el2=step(sh[0],sh[1],a2[0],LEN.uarm);
      const wr=step(el2[0],el2[1],a2[1],LEN.farm);
      seg(T(sh[0],sh[1]),T(el2[0],el2[1]),c); seg(T(el2[0],el2[1]),T(wr[0],wr[1]),c);
      dot(T(sh[0],sh[1]),c); dot(T(el2[0],el2[1]),c); dot(T(wr[0],wr[1]),c,4);
    });
    g.strokeStyle='rgba(255,255,255,.25)'; g.lineWidth=1;
    g.beginPath(); g.moveTo(cx,gy); g.lineTo(cx+CELL,gy); g.stroke();   // 땅
    label(g,p.toUpperCase(),cx+4,cy+13);
  });
  out('_dbg.png', g);
}
