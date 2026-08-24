/* ================= 체커보드 배경 벗겨내기 =================
   제미나이는 "투명 배경" 을 달라고 하면 투명 배경처럼 보이는
   회색 체커보드를 그려서 준다. 알파 채널은 전부 255 다.
   그대로 게임에 넣으면 인물 뒤에 회색 격자가 따라다닌다.

   그래서 직접 벗긴다.
     1. 테두리 픽셀을 훑어서 체커보드의 두 회색 값을 알아낸다
     2. 테두리에서 시작해 그 회색과 비슷한 픽셀만 타고 번져 나간다
        (인물 안쪽의 흰 유니폼은 검은 외곽선에 막혀 안 번진다)
     3. 번진 곳을 투명으로 만든다
   경계의 뿌연 픽셀은 배경 회색에 가까운 만큼 반투명으로 깎는다.

   쓰는 법:  node art/strip.js art/sprite2-src.png art/sprite.png       */
const {execFileSync}=require('child_process');
const fs=require('fs');

const SRC=process.argv[2]||'art/sprite2-src.png';
const DST=process.argv[3]||'art/sprite.png';
const dim=execFileSync('ffprobe',['-v','error','-select_streams','v:0',
  '-show_entries','stream=width,height','-of','csv=p=0',SRC]).toString().trim().split(',');
const W=+dim[0], H=+dim[1];
const raw=execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-i',SRC,
  '-f','rawvideo','-pix_fmt','rgba','-'],{maxBuffer:1<<28});
console.log(`원본 ${W}x${H}`);

const sat=(i)=>{ const r=raw[i],g=raw[i+1],b=raw[i+2];
  return Math.max(r,g,b)-Math.min(r,g,b); };
const lum=(i)=>(raw[i]*0.299+raw[i+1]*0.587+raw[i+2]*0.114);

/* ---- 1. 체커보드 회색 두 개 찾기 (테두리 한 줄씩 훑는다) ---- */
const hist=new Map();
const edge=[];
for(let x=0;x<W;x++){ edge.push([x,0],[x,H-1]); }
for(let y=0;y<H;y++){ edge.push([0,y],[W-1,y]); }
edge.forEach(([x,y])=>{
  const i=(y*W+x)*4;
  if(sat(i)>14) return;
  const v=Math.round(lum(i));
  hist.set(v,(hist.get(v)||0)+1);
});
const tops=[...hist.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8);
/* 가장 흔한 값 두 개 — 다만 서로 12 이상 떨어진 것으로 고른다 */
const grays=[tops[0][0]];
for(const [v] of tops){ if(Math.abs(v-grays[0])>=12){ grays.push(v); break; } }
console.log(`체커보드 회색: ${grays.join(' / ')} (테두리 표본 ${edge.length}개)`);

const TOL=30;
const isBg=(i)=> sat(i)<=20 && grays.some(g=>Math.abs(lum(i)-g)<=TOL);

/* ---- 2. 테두리에서 번져 나간다 ---- */
const bg=new Uint8Array(W*H);
const qx=new Int32Array(W*H), qy=new Int32Array(W*H);
let head=0,tail=0;
const push=(x,y)=>{ const p=y*W+x; if(bg[p])return;
  if(!isBg(p*4))return; bg[p]=1; qx[tail]=x; qy[tail]=y; tail++; };
for(let x=0;x<W;x++){ push(x,0); push(x,H-1); }
for(let y=0;y<H;y++){ push(0,y); push(W-1,y); }
while(head<tail){
  const x=qx[head],y=qy[head]; head++;
  if(x>0)push(x-1,y); if(x<W-1)push(x+1,y);
  if(y>0)push(x,y-1); if(y<H-1)push(x,y+1);
}
/* 테두리에서 못 닿는 안쪽 구멍도 뚫는다 — 포수 마스크 창살 사이 같은 곳.
   완전히 둘러싸여 있어서 번짐이 못 들어간다. 체커보드 색이면 배경이다. */
let holes=0;
for(let p=0;p<W*H;p++){ if(bg[p]||!isBg(p*4)) continue;
  const y0=(p/W)|0, x0=p%W;
  let h2=0,t2=0, ok=true, mem=[];
  qx[t2]=x0; qy[t2]=y0; t2++; bg[p]=1; mem.push(p);
  while(h2<t2){
    const x=qx[h2],y=qy[h2]; h2++;
    for(let k=0;k<4;k++){
      const nx=x+(k===0?-1:k===1?1:0), ny=y+(k===2?-1:k===3?1:0);
      if(nx<0||ny<0||nx>=W||ny>=H) continue;
      const q=ny*W+nx;
      if(bg[q]||!isBg(q*4)) continue;
      bg[q]=1; mem.push(q); qx[t2]=nx; qy[t2]=ny; t2++;
    }
    if(t2>W*H-1){ ok=false; break; }
  }
  if(ok && mem.length>=25) holes+=mem.length;
  else mem.forEach(q=>bg[q]=0);
}
if(holes) console.log(`안쪽 구멍 ${holes}개도 뚫었다`);

let n=0; for(let p=0;p<W*H;p++) if(bg[p])n++;
console.log(`배경으로 판정 ${n}개 (${(n/(W*H)*100).toFixed(1)}%)`);
if(n<W*H*0.25){ console.error('❌ 배경이 너무 적게 잡혔다 — 번짐이 막혔다'); process.exit(1); }
if(n>W*H*0.92){ console.error('❌ 배경이 너무 많이 잡혔다 — 그림까지 먹었다'); process.exit(1); }

/* ---- 3. 알파를 깎는다. 경계는 배경색에 가까운 만큼 반투명으로. ---- */
const out=Buffer.from(raw);
let soft=0;
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const p=y*W+x, i=p*4;
  if(bg[p]){ out[i+3]=0; continue; }
  /* 배경에 닿아 있고 아직 회색기가 남은 픽셀 — 안티에일리어싱 잔털 */
  const touch=(x>0&&bg[p-1])||(x<W-1&&bg[p+1])||(y>0&&bg[p-W])||(y<H-1&&bg[p+W]);
  if(!touch) continue;
  if(sat(i)>26) continue;                       // 색이 있으면 그림이다
  const d=Math.min(...grays.map(g=>Math.abs(lum(i)-g)));
  if(d<=46){ out[i+3]=Math.round(255*Math.min(1,d/46)); soft++; }
}
console.log(`경계 ${soft}개를 반투명으로 깎았다`);

/* ---- 4. PNG 로 다시 쓴다 ---- */
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y',
  '-f','rawvideo','-pix_fmt','rgba','-s',`${W}x${H}`,'-i','pipe:0',
  '-frames:v','1',DST],{input:out});
console.log(`→ ${DST}`);

/* ---- 5. 확인용 — 자홍색 위에 얹어본다. 잔털이 있으면 눈에 보인다. ---- */
const chk=Buffer.alloc(W*H*4);
for(let p=0;p<W*H;p++){
  const i=p*4, a=out[i+3]/255;
  chk[i]  =Math.round(out[i]  *a+255*(1-a));
  chk[i+1]=Math.round(out[i+1]*a+  0*(1-a));
  chk[i+2]=Math.round(out[i+2]*a+255*(1-a));
  chk[i+3]=255;
}
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y',
  '-f','rawvideo','-pix_fmt','rgba','-s',`${W}x${H}`,'-i','pipe:0',
  '-frames:v','1','-vf','scale=600:-1','art/_check.png'],{input:chk});
console.log('→ art/_check.png (자홍 배경 확인용)');
