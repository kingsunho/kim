/* 새 타자 그림이 게임에 들어갈 수 있는지 기계로 검사한다. 게임에는 안 들어간다.

     node art/checkbat.js art/새그림.png

   눈으로 못 보는 상태에서도 규격 위반은 전부 여기서 걸린다.
   특히 '투명해 보이는 체커보드' 는 사람 눈에는 투명해 보여서 그냥 넘어가기 쉬운데,
   알파 채널을 세면 바로 드러난다.                                        */
const {execSync}=require('child_process');
const fs=require('fs');

const file=process.argv[2];
if(!file){ console.error('사용법: node art/checkbat.js <png>'); process.exit(2); }
if(!fs.existsSync(file)){ console.error('파일이 없다: '+file); process.exit(2); }

/* ffmpeg 로 raw RGBA 를 뽑는다 (node-canvas 가 없는 서버라서) */
const tmp='/tmp/_checkbat.raw';
const dim=execSync(`ffprobe -v error -show_entries stream=width,height -of csv=p=0 "${file}"`).toString().trim();
const [W,H]=dim.split(',').map(Number);
execSync(`ffmpeg -v error -y -i "${file}" -pix_fmt rgba -f rawvideo ${tmp}`);
const D=fs.readFileSync(tmp);

let bad=0, warn=0;
const ok =(n,m)=>console.log(`  ✅ ${n}${m?' :: '+m:''}`);
const no =(n,m)=>{bad++;console.log(`  ❌ ${n}${m?' :: '+m:''}`);};
const hm =(n,m)=>{warn++;console.log(`  ⚠️  ${n}${m?' :: '+m:''}`);};
const at =(x,y)=>{const i=(y*W+x)*4; return [D[i],D[i+1],D[i+2],D[i+3]];};
function hsv(r,g,b){
  r/=255;g/=255;b/=255;
  const mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn;
  let h=0;
  if(d>1e-9){ if(mx===r)h=((g-b)/d)%6; else if(mx===g)h=(b-r)/d+2; else h=(r-g)/d+4; }
  h*=60; if(h<0)h+=360;
  return [h, mx?d/mx:0, mx];
}

console.log(`\n[${file}]  ${W}x${H}\n`);

/* ---------- 1. 배경이 진짜 투명한가 ---------- */
console.log('[배경]');
let a0=0, a255=0, aMid=0;
for(let i=3;i<D.length;i+=4){ const a=D[i]; if(a===0)a0++; else if(a===255)a255++; else aMid++; }
const total=W*H;
const clearPct=a0/total*100;
if(a0===0) no('투명 픽셀이 하나도 없다',
  '알파가 전부 불투명이다 — 「투명해 보이는 체커보드」를 그려서 준 것이다. art/strip.js 로 벗겨야 한다');
else if(clearPct<12) hm('투명 배경이 너무 적다', `${clearPct.toFixed(1)}% — 인물이 상자를 꽉 채웠거나 배경이 남아 있다`);
else ok('배경이 진짜 투명하다', `투명 ${clearPct.toFixed(1)}% · 반투명 ${(aMid/total*100).toFixed(1)}%`);

/* 네 모서리는 반드시 비어 있어야 한다 */
const corners=[[0,0],[W-1,0],[0,H-1],[W-1,H-1]].map(([x,y])=>at(x,y)[3]);
if(corners.some(a=>a>8)) no('모서리에 배경이 남아 있다', '알파 '+corners.join(','));
else ok('네 모서리가 비어 있다');

/* 체커보드 흔적 — 배경 자리에 회색 두 가지가 격자로 번갈아 나오는지 */
let chk=0;
for(let y=2;y<H-2;y+=7) for(let x=2;x<W-2;x+=7){
  const [r,g,b,a]=at(x,y); if(a<250) continue;
  const [,s,v]=hsv(r,g,b);
  if(s<0.06 && v>0.70 && v<0.98) chk++;
}
if(a0===0 && chk>40) no('체커보드로 보인다', `무채색 밝은 회색 ${chk}칸이 배경에 깔려 있다`);

/* ---------- 2. 인물 상자 ---------- */
console.log('\n[인물]');
let x0=W,x1=-1,y0=H,y1=-1;
for(let y=0;y<H;y++) for(let x=0;x<W;x++){
  if(at(x,y)[3]>=128){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
}
if(x1<0){ no('불투명 픽셀이 없다'); }
else {
  const bw=x1-x0+1, bh=y1-y0+1;
  ok('인물 범위', `x ${x0}~${x1} (${bw}) · y ${y0}~${y1} (${bh})`);
  const pad=Math.min(x0, W-1-x1, y0, H-1-y1);
  if(pad>H*0.06) hm('여백이 많다', `가장 좁은 쪽 ${pad}px — 잘라서 쓰면 된다`);
  const ar=bw/bh;
  if(ar<0.35||ar>0.85) hm('가로세로 비가 예상 밖', `${ar.toFixed(2)} (타자는 0.5~0.7 쯤)`);
  else ok('가로세로 비', ar.toFixed(2));
  if(bh<800) hm('해상도가 낮다', `세로 ${bh}px — 1200 이상 권장`);
  else ok('해상도', `세로 ${bh}px`);
  /* 발이 바닥에 닿아 있나 — 아래 5% 구간에 픽셀이 두 덩어리(양발)로 있는지 */
  const footRow=y1-Math.round(bh*0.01);
  const runs=[]; let inRun=false;
  for(let x=x0;x<=x1;x++){
    const on=at(x,footRow)[3]>=128;
    if(on&&!inRun){ runs.push([x,x]); inRun=true; }
    else if(on) runs[runs.length-1][1]=x;
    else inRun=false;
  }
  const wide=runs.filter(r=>r[1]-r[0]>=bw*0.04);
  if(wide.length>=2) ok('맨 아래에 발이 둘 다 있다', `${wide.length}덩어리 — 양발 접지`);
  else if(wide.length===1) hm('맨 아래에 발이 하나뿐이다', '한 발이 떠 있을 수 있다');
  else hm('맨 아래에서 발을 못 찾았다');
}

/* ---------- 3. 팀 색 치환 규칙 ---------- */
console.log('\n[팀 색 — 게임이 색상각 192~270도 · 채도 0.10 이상만 바꾼다]');
const band={}, outBlue=[];
let tintable=0, whiteish=0;
for(let y=0;y<H;y+=2) for(let x=0;x<W;x+=2){
  const [r,g,b,a]=at(x,y); if(a<200) continue;
  const [h,s,v]=hsv(r,g,b);
  if(s<0.10||v<0.05){ if(v>0.6) whiteish++; continue; }
  if(h>=192&&h<=270){ tintable++; const k=Math.round(h/6)*6; band[k]=(band[k]||0)+1; }
  else if(h>170&&h<300) outBlue.push([h,s,v,r,g,b]);
}
if(!tintable) no('팀 색으로 바뀔 픽셀이 없다', '네이비를 색상각 228도로 안 썼다 — 원정 팀 유니폼을 못 만든다');
else {
  const ks=Object.keys(band).map(Number).sort((a,b)=>band[b]-band[a]);
  const top=ks[0];
  ok('팀 색 픽셀이 있다', `${tintable} 표본 · 최다 색상각 ${top}도`);
  if(Math.abs(top-228)>12) hm('네이비 색상각이 228도에서 벗어났다',
    `${top}도 — 지금 시트(228도)와 색이 달라져서 홈 유니폼이 안 맞을 수 있다`);
  else ok('네이비 색상각이 228도 근처다', `${top}도`);
  const spread=ks.filter(k=>band[k]>tintable*0.05);
  if(spread.length>4) hm('파랑이 여러 색상각에 퍼져 있다', spread.join(',')+'도 — 그라데이션을 썼을 수 있다');
}
/* 흰 천 그림자에 파랑끼가 섞였는지 — 치환 밖 파랑 */
const mid=outBlue.filter(([h,s,v])=>v>0.55&&s>0.10);
if(mid.length>tintable*0.15) hm('밝은 파랑/보라끼가 많다',
  `${mid.length} 표본 — 흰 천 그림자는 무채색 회색이어야 한다. 팀 색 치환 때 얼룩진다`);
else ok('흰 천 그림자에 파랑끼가 거의 없다');
if(whiteish<tintable*0.5) hm('흰 천이 적다', '유니폼 몸통·바지가 흰색인지 확인해라');
else ok('흰 천이 충분하다');

/* ---------- 4. 등번호가 그려져 있나 ---------- */
console.log('\n[등번호]');
console.log('  (등판 한가운데에 짙은 덩어리가 있으면 번호를 그려 넣은 것이다 — 비워야 한다)');
if(x1>0){
  const bw=x1-x0+1, bh=y1-y0+1;
  const cx0=x0+Math.round(bw*0.34), cx1=x0+Math.round(bw*0.66);
  const cy0=y0+Math.round(bh*0.34), cy1=y0+Math.round(bh*0.52);
  let dark=0, tot=0;
  for(let y=cy0;y<cy1;y++) for(let x=cx0;x<cx1;x++){
    const [r,g,b,a]=at(x,y); if(a<200) continue; tot++;
    const [,,v]=hsv(r,g,b); if(v<0.45) dark++;
  }
  const pct=tot?dark/tot*100:0;
  if(pct>14) hm('등판에 짙은 덩어리가 있다', `${pct.toFixed(1)}% — 번호를 그려 넣었는지 확인해라. 비워야 한다`);
  else ok('등판이 비어 있다', `짙은 픽셀 ${pct.toFixed(1)}%`);
}

console.log(bad?`\n❌ ${bad}건 — 이대로는 못 넣는다`
  :(warn?`\n⚠️  통과했지만 확인할 것 ${warn}건`:'\n✅ 규격 통과'));
process.exit(bad?1:0);
