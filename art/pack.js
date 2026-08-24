/* 파츠 시트를 게임에 넣을 수 있는 크기로 만든다.

   node art/pack.js
     art/sprite.png  →  art/sheet.webp  +  art/sheet.b64  +  art/sheet.json

   하는 일 세 가지:
   1) 가장자리 색 번지기(dilate) — 투명한 자리에 남아 있는 체커보드 회색
      (109,109,109) 을 이웃한 진짜 색으로 덮는다. WebP 는 색을 2x2 로 묶어서
      저장(yuva420p)하기 때문에, 이걸 안 하면 파츠 테두리에 회색 띠가 낀다.
      ffmpeg 의 libwebp 는 yuva444p 를 줘도 420 으로 되돌린다 — 그래서 미리 손본다.
   2) 축소 — 게임에서 제일 큰 사람이 240px 인데 시트는 그 세 배였다.
   3) parts.json 좌표도 같은 배율로 줄여서 sheet.json 에 쓴다.        */
const {execSync}=require('child_process');
const fs=require('fs');
const path=require('path');
const DIR=__dirname;

const SCALE=0.60;                  // 1200x896 → 720x538
const QUALITY=85;
const DILATE=6;                    // 몇 픽셀 번지게 할지

const src=path.join(DIR,'sprite.png');
const info=execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${src}"`)
  .toString().trim().split(',').map(Number);
const W=info[0], H=info[1];
const buf=execSync(`ffmpeg -v error -i "${src}" -f rawvideo -pix_fmt rgba -`,{maxBuffer:1<<30});
console.log(`원본 ${W}x${H}`);

/* ---- 1) 가장자리 번지기 ---- */
let solid=new Uint8Array(W*H);
for(let i=0,p=0;i<buf.length;i+=4,p++) solid[p]=buf[i+3]>0?1:0;
let filledCount=0;
for(let pass=0;pass<DILATE;pass++){
  const next=solid.slice();
  const adds=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const p=y*W+x;
    if(solid[p]) continue;
    let r=0,g=0,b=0,n=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const nx=x+dx, ny=y+dy;
      if(nx<0||ny<0||nx>=W||ny>=H) continue;
      const q=ny*W+nx;
      if(!solid[q]) continue;
      const i=q*4; r+=buf[i]; g+=buf[i+1]; b+=buf[i+2]; n++;
    }
    if(n){ adds.push([p, r/n|0, g/n|0, b/n|0]); next[p]=1; }
  }
  adds.forEach(([p,r,g,b])=>{ const i=p*4; buf[i]=r; buf[i+1]=g; buf[i+2]=b; });
  filledCount+=adds.length;
  solid=next;
}
console.log(`가장자리 ${DILATE}px 번지기 — ${filledCount} 픽셀 채움`);

/* ---- 2) 축소 + WebP ---- */
const OW=Math.round(W*SCALE), OH=Math.round(H*SCALE);
const out=path.join(DIR,'sheet.webp');
execSync(`ffmpeg -v error -y -f rawvideo -pix_fmt rgba -s ${W}x${H} -i pipe:0 `+
  `-vf "scale=${OW}:${OH}:flags=lanczos" -c:v libwebp -quality ${QUALITY} -compression_level 6 "${out}"`,
  {input:buf, maxBuffer:1<<30});
const bytes=fs.statSync(out).size;
console.log(`sheet.webp ${OW}x${OH} — ${(bytes/1024).toFixed(1)}KB`);

/* ---- 3) 좌표도 같은 배율로 ---- */
const parts=JSON.parse(fs.readFileSync(path.join(DIR,'parts.json'),'utf8')).parts;
const scaled={};
for(const k of Object.keys(parts)){
  const p=parts[k];
  scaled[k]=[Math.round(p.x*SCALE), Math.round(p.y*SCALE),
             Math.round(p.w*SCALE), Math.round(p.h*SCALE)];
}
fs.writeFileSync(path.join(DIR,'sheet.json'),
  JSON.stringify({w:OW,h:OH,scale:SCALE,parts:scaled},null,1));

/* ---- 4) index.html 에 붙일 base64 ---- */
const b64='data:image/webp;base64,'+fs.readFileSync(out).toString('base64');
fs.writeFileSync(path.join(DIR,'sheet.b64'), b64);
console.log(`sheet.b64 — ${(b64.length/1024).toFixed(1)}KB (index.html 에 이만큼 붙는다)`);
console.log('MV_PARTS = '+JSON.stringify(scaled));
