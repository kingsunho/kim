/* 통짜 그림 시트(index.html 의 MV_FIG_SRC) 를 다시 만든다.

     node art/packfig.js [WebP품질]        기본 85

   재료 세 장 → art/fig.webp · art/fig.b64 · art/_fig.png · _landmark.png
                + index.html 에 넣을 상수값 출력
     art/fig-pit.png    던지는 피니시 투수 (안 바뀐다)
     art/fig-pitw.png   와인드업 투수     (안 바뀐다)
     art/bat-new.png    타자 — 이걸 갈아끼우려고 만든 스크립트다

   [왜 index.html 에서 안 꺼내나]
   처음엔 지금 시트를 index.html 에서 base64 로 꺼내 썼는데, 한 번 돌리고
   나면 index.html 안의 시트가 이미 새 것이라 두 번째 실행이 옛 좌표로
   엉뚱한 데를 잘라낸다. 재료를 파일로 두면 몇 번을 돌려도 같은 게 나온다.

   [왜 사람 키를 따로 재나]
   MV_FIG_H 는 '상자 높이' 가 화면에서 몇 px 이 되는지다. 그런데 상자에는
   머리 위로 솟은 배트까지 들어 있어서, 상자 높이를 맞추면 사람 키가 어긋난다.
   그래서 **헬멧 꼭대기~발바닥** 을 재서 그게 예전과 같아지도록 맞춘다.
   옛 타자는 상자 672 중 사람이 565 (헬멧 107~발바닥 672) 였고
   화면 92px 이었으니 사람 키는 565/672*92 = 77.4px 이다. 이 값을 지킨다.   */
const {execSync}=require('child_process');
const fs=require('fs'), path=require('path');
const DIR=__dirname;
const QUALITY=Number(process.argv[2]||85);

function size(f){ return execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${f}"`)
  .toString().trim().split(',').map(Number); }
function raw(f){ return execSync(`ffmpeg -v error -i "${f}" -f rawvideo -pix_fmt rgba -`,{maxBuffer:1<<30}); }
function hsv(r,g,b){ r/=255;g/=255;b/=255; const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
  let h=0; if(d){ if(mx===r)h=((g-b)/d)%6; else if(mx===g)h=(b-r)/d+2; else h=(r-g)/d+4; h*=60; if(h<0)h+=360; }
  return [h, mx?d/mx:0, mx]; }

/* 시트 높이 — 셋 중 제일 큰 상자(타자)에 맞춘다. 타자를 여기에 꽉 채운다. */
const SHEET_H=672;

const PIT=path.join(DIR,'fig-pit.png'), PITW=path.join(DIR,'fig-pitw.png');
const [pitW,pitH]=size(PIT), [ptwW,ptwH]=size(PITW);
const pitB=raw(PIT), ptwB=raw(PITW);
console.log(`투수 ${pitW}x${pitH} · 와인드업 ${ptwW}x${ptwH}`);

/* ---- 새 타자 읽기 ---- */
const NB=path.join(DIR,'bat-new.png');
const [NW,NH]=size(NB);
const nb=raw(NB);
console.log(`새 타자 ${NW}x${NH}`);

/* ① 알파 정리 — 제미나이 그림은 몸 전체가 알파 253 쯤으로 온다.
      눈에는 안 보이지만 '완전 불투명한 픽셀이 하나도 없는' 그림이라
      가장자리 번지기(dilate)와 WebP 알파 압축이 이상하게 걸린다.        */
let bumped=0;
for(let i=3;i<nb.length;i+=4){ if(nb[i]>=200 && nb[i]<255){ nb[i]=255; bumped++; } }
console.log(`알파 ${bumped} 픽셀을 255 로 (반투명하게 온 몸통)`);

/* ② 네이비 밝기 맞추기 — 새 그림 네이비가 투수들보다 밝게 왔다.
      옛 pit/pitw 네이비 명도 0.29, 새 타자 0.34. 같은 화면에 나란히
      서는 사람들이라 이게 다르면 '다른 유니폼' 으로 보인다.
      색상각·채도는 그대로 두고 명도만 눌러서 맞춘다.                    */
const VFIX=0.855;
let dimmed=0;
for(let i=0;i<nb.length;i+=4){
  if(nb[i+3]<200) continue;
  const [h,s]=hsv(nb[i],nb[i+1],nb[i+2]);
  if(s>=0.10 && h>=192 && h<=270){
    nb[i]=Math.round(nb[i]*VFIX); nb[i+1]=Math.round(nb[i+1]*VFIX); nb[i+2]=Math.round(nb[i+2]*VFIX);
    dimmed++;
  }
}
console.log(`네이비 ${dimmed} 픽셀 명도 x${VFIX} (투수와 같은 진하기로)`);

/* ③ 인물 상자 */
const A=(x,y)=>nb[(y*NW+x)*4+3];
let x0=NW,x1=-1,y0=NH,y1=-1;
for(let y=0;y<NH;y++)for(let x=0;x<NW;x++){ if(A(x,y)>40){
  if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
const BW=x1-x0+1, BH=y1-y0+1;
const sc=SHEET_H/BH;
const newBoxW=Math.round(BW*sc), newBoxH=SHEET_H;
console.log(`새 타자 상자 ${BW}x${BH} (${x0},${y0}) → 시트 안 ${newBoxW}x${newBoxH} (배율 ${sc.toFixed(5)})`);

/* ④ 상자 크기로 줄여서 한 장으로 */
const tmpIn=path.join(DIR,'_bat_fix.png');
execSync(`ffmpeg -v error -y -f rawvideo -pix_fmt rgba -s ${NW}x${NH} -i pipe:0 `+
  `-vf "crop=${BW}:${BH}:${x0}:${y0},scale=${newBoxW}:${newBoxH}:flags=lanczos" -frames:v 1 "${tmpIn}"`,
  {input:nb, maxBuffer:1<<30});
const bat=raw(tmpIn);

/* ⑤ 시트 조립 — pit | bat | pitw */
const OW=pitW+newBoxW+ptwW, OH=SHEET_H;
const out=Buffer.alloc(OW*OH*4,0);
function blit(src,sw,sw2,sh2,dx){
  for(let y=0;y<sh2;y++)for(let x=0;x<sw2;x++){
    const si=(y*sw+x)*4, di=(y*OW+(dx+x))*4;
    out[di]=src[si]; out[di+1]=src[si+1]; out[di+2]=src[si+2]; out[di+3]=src[si+3];
  }
}
blit(pitB,pitW,pitW,pitH,0);
blit(bat,newBoxW,newBoxW,newBoxH,pitW);
blit(ptwB,ptwW,ptwW,ptwH,pitW+newBoxW);
console.log(`새 시트 ${OW}x${OH}`);

/* ⑥ 가장자리 번지기 — art/pack.js 와 같은 이유다. WebP 는 색을 2x2 로 묶어
      저장(yuva420p)하기 때문에, 투명한 자리 색이 검정이면 사람 테두리에
      검은 띠가 낀다. ffmpeg 의 libwebp 는 yuva444p 를 줘도 420 으로 되돌린다. */
const DILATE=6;
let solid=new Uint8Array(OW*OH);
for(let i=0,p=0;i<out.length;i+=4,p++) solid[p]=out[i+3]>0?1:0;
let filled=0;
for(let pass=0;pass<DILATE;pass++){
  const next=solid.slice(), adds=[];
  for(let y=0;y<OH;y++)for(let x=0;x<OW;x++){
    const p=y*OW+x; if(solid[p])continue;
    let r=0,g=0,b=0,n=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const nx=x+dx, ny=y+dy; if(nx<0||ny<0||nx>=OW||ny>=OH)continue;
      const q=ny*OW+nx; if(!solid[q])continue;
      const i=q*4; r+=out[i]; g+=out[i+1]; b+=out[i+2]; n++;
    }
    if(n){ adds.push([p,r/n|0,g/n|0,b/n|0]); next[p]=1; }
  }
  adds.forEach(([p,r,g,b])=>{ const i=p*4; out[i]=r; out[i+1]=g; out[i+2]=b; });
  filled+=adds.length; solid=next;
}
console.log(`가장자리 ${DILATE}px 번지기 — ${filled} 픽셀`);

/* ⑦ 내보내기 */
execSync(`ffmpeg -v error -y -f rawvideo -pix_fmt rgba -s ${OW}x${OH} -i pipe:0 -frames:v 1 "${DIR}/_fig.png"`,
  {input:out, maxBuffer:1<<30});
execSync(`ffmpeg -v error -y -f rawvideo -pix_fmt rgba -s ${OW}x${OH} -i pipe:0 `+
  `-c:v libwebp -quality ${QUALITY} -compression_level 6 "${DIR}/fig.webp"`, {input:out, maxBuffer:1<<30});
const b64='data:image/webp;base64,'+fs.readFileSync(path.join(DIR,'fig.webp')).toString('base64');
fs.writeFileSync(path.join(DIR,'fig.b64'), b64);
console.log(`fig.webp 품질 ${QUALITY} — ${(fs.statSync(path.join(DIR,'fig.webp')).size/1024).toFixed(1)}KB · `+
            `base64 ${(b64.length/1024).toFixed(1)}KB (index.html 에 이만큼 붙는다)`);

/* ⑧ 상수 — 새 타자 상자 안의 픽셀 좌표로 다시 잰다.

   [함정] 처음엔 전부 자동으로 찾게 했다가 두 군데서 틀렸다.
     · 헬멧 꼭대기를 "네이비가 처음 뭉치는 줄" 로 찾으면 **배트 외곽선**이
       잡힌다. 이 화풍은 선화가 진한 남색이라 나무 배트도 테두리는 네이비다.
     · 벨트를 "검은 픽셀이 많은 줄" 로 찾으면 팔 외곽선이 먼저 걸린다.
   그래서 아래 여섯 개는 **눈으로 재서 박아둔다.** 그림을 새로 받으면
   art/_landmark.png (아래 ⑨ 가 만든다) 를 보고 다시 재라.
   전부 art/bat-new.png 원본 픽셀 좌표다.                              */
const L={
  helmetTop : 215,              // 헬멧 꼭대기 (배트 말고)
  frontFoot : [183,360],        // 앞발 x 범위 — 뒷발보다 132px 위에 있다(원근)
  rearFoot  : [573,817],        // 뒷발 x 범위 — 이쪽 발바닥이 곧 지면이다
  belt      : [798,818],        // 검은 벨트 위·아래 y
  backPanel : [538,795,395,575],// 등판 흰 천 [위y, 아래y, 왼x, 오른x]
  glove     : [690,850,399,559],// 배팅장갑 두 짝 [x0,x1,y0,y1]
};
const OLD_BOX_H=672, OLD_HELMET=107, OLD_FIG_H=92;
const OLD_MAN_PX=(OLD_BOX_H-OLD_HELMET)/OLD_BOX_H*OLD_FIG_H;   // 77.4
const S=sc, toX=x=>(x-x0)*S, toY=y=>(y-y0)*S, bx0=pitW;
const P=n=>Number(n.toFixed(3));

const manSrc=y1-L.helmetTop+1, manBox=manSrc*S;
const FIG_H=Math.round(OLD_MAN_PX*newBoxH/manBox);
const anchX=((L.frontFoot[0]+L.frontFoot[1])/2+(L.rearFoot[0]+L.rearFoot[1])/2)/2;
const backCx=(L.backPanel[2]+L.backPanel[3])/2, backW=L.backPanel[3]-L.backPanel[2];
const backCy=(L.backPanel[0]+L.backPanel[1])/2;
/* 글자 높이 — 옛 타자는 등판 폭 105 에 62 였다. 같은 비율을 지킨다. */
const noH=Math.round(backW*S*(62/105));
const beltT=toY(L.belt[0]), beltB=toY(L.belt[1]);
/* 스윙 잔상 반지름 = 그립에서 배트 끝까지 */
const gripX=(L.glove[0]+L.glove[1])/2, gripY=(L.glove[2]+L.glove[3])/2;
const sweepR=Math.round(Math.hypot(toX(gripX)-toX(465), toY(gripY)-toY(y0)));

console.log(`\n사람 키 ${manSrc}px → 상자 안 ${manBox.toFixed(1)} → MV_FIG_H ${FIG_H}`);
console.log(`  확인: 화면 사람 키 ${(manBox/newBoxH*FIG_H).toFixed(1)}px (예전 ${OLD_MAN_PX.toFixed(1)}px)`);
console.log(`등판 폭 ${(backW*S).toFixed(1)} · 글자 ${noH} (옛 105 에 62)`);

console.log(`\n===== index.html 에 넣을 값 =====`);
console.log(`const MV_FIGS={`);
console.log(`  pit :[0,0,${pitW},${pitH}],`);
console.log(`  bat :[${bx0},0,${newBoxW},${newBoxH}],`);
console.log(`  pitw:[${bx0+newBoxW},0,${ptwW},${ptwH}]`);
console.log(`};`);
console.log(`MV_FIG_ANCH.bat = [${P(toX(anchX)/newBoxW)},0,1]`);
console.log(`MV_FIG_H.bat    = ${FIG_H}`);
console.log(`MV_BAT_NO       = [${toX(backCx).toFixed(1)}, ${toY(backCy).toFixed(1)}, ${noH}]`);
console.log(`mvBatSweep      = 그립 (${toX(gripX).toFixed(0)}, ${toY(gripY).toFixed(0)}) · r ${sweepR}`);
console.log(`MV_FIG_KEEP bat = [${Math.round(bx0+toX(L.glove[0])-6)},${Math.round(toY(L.glove[2])-6)},`+
            `${Math.round((L.glove[1]-L.glove[0])*S+12)},${Math.round((L.glove[3]-L.glove[2])*S+12)}]`);
console.log(`MV_FIG_BELT     = [`);
console.log(`  [0,${bx0},292,336],`);
console.log(`  [${bx0},${bx0+newBoxW},${Math.round(beltT)-12},${Math.round(beltB)+12}],`);
console.log(`  [${bx0+newBoxW},${OW},240,292]`);
console.log(`]`);

/* ⑨ 잰 자리를 그림에 얹어 눈으로 확인한다 — art/_landmark.png */
const mk=Buffer.from(out);
const put=(x,y,c)=>{ x=Math.round(x); y=Math.round(y);
  if(x<0||y<0||x>=OW||y>=OH) return;
  const i=(y*OW+x)*4; mk[i]=c[0]; mk[i+1]=c[1]; mk[i+2]=c[2]; mk[i+3]=255; };
const hline=(y,c)=>{ for(let x=bx0;x<bx0+newBoxW;x++) put(x,y,c); };
const vline=(x,c)=>{ for(let y=0;y<OH;y++) put(bx0+x,y,c); };
const box=(x,y,w,h,c)=>{ for(let t=0;t<=w;t++){ put(bx0+x+t,y,c); put(bx0+x+t,y+h,c); }
  for(let t=0;t<=h;t++){ put(bx0+x,y+t,c); put(bx0+x+w,y+t,c); } };
hline(toY(L.helmetTop),[255,80,80]);                       // 헬멧 꼭대기
hline(newBoxH-1,[255,80,80]);                              // 발바닥
vline(toX(anchX),[80,255,120]);                            // 디딘 자리
box(toX(L.backPanel[2]),toY(L.backPanel[0]),
    backW*S,(L.backPanel[1]-L.backPanel[0])*S,[255,220,60]);          // 등판
box(toX(L.glove[0]),toY(L.glove[2]),
    (L.glove[1]-L.glove[0])*S,(L.glove[3]-L.glove[2])*S,[80,200,255]); // 장갑
hline(beltT,[255,120,255]); hline(beltB,[255,120,255]);    // 벨트
execSync(`ffmpeg -v error -y -f rawvideo -pix_fmt rgba -s ${OW}x${OH} -i pipe:0 -frames:v 1 "${DIR}/_landmark.png"`,
  {input:mk, maxBuffer:1<<30});
console.log(`\nart/_landmark.png — 잰 자리를 얹었다. 눈으로 확인해라`);
