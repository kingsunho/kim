/* ================= 스프라이트 시트 자동 슬라이서 =================
   제미나이가 준 파츠 시트에서 조각을 스스로 찾아낸다.
   격자 크기를 가정하지 않는다 — 시트가 1200x900 으로 온다고 해놓고
   실제로는 1200x896 이 왔다. 칸을 나눠 세면 어긋난다.

   그래서 알파(투명도)가 붙어 있는 덩어리를 찾아서 그 네모를 잰다.
   조각이 몇 개로 갈라져 나오면(신발이 다리와 떨어지는 등) 가까운 것끼리
   묶는다. 그리고 읽는 순서(위→아래, 왼→오른쪽)로 번호를 붙인다.

   쓰는 법:  node art/slice.js art/sprite-src.png                       */
const {execFileSync}=require('child_process');
const fs=require('fs');

const SRC=process.argv[2]||'art/sprite-src.png';
const dim=execFileSync('ffprobe',['-v','error','-select_streams','v:0',
  '-show_entries','stream=width,height','-of','csv=p=0',SRC]).toString().trim().split(',');
const W=+dim[0], H=+dim[1];
const raw=execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-i',SRC,
  '-f','rawvideo','-pix_fmt','rgba','-'],{maxBuffer:1024*1024*200});
if(raw.length!==W*H*4){ console.error('픽셀 수가 안 맞는다'); process.exit(1); }
console.log(`시트 ${W}x${H}`);

/* ---- 알파 덩어리 찾기 (너비 우선 탐색) ---- */
const AT=24;                               // 이보다 투명하면 배경으로 본다
const seen=new Uint8Array(W*H);
const blobs=[];
const qx=new Int32Array(W*H), qy=new Int32Array(W*H);
for(let sy=0;sy<H;sy++)for(let sx=0;sx<W;sx++){
  const si=sy*W+sx;
  if(seen[si]||raw[si*4+3]<=AT) continue;
  let head=0, tail=0, n=0;
  let mnx=sx,mxx=sx,mny=sy,mxy=sy;
  qx[tail]=sx; qy[tail]=sy; tail++; seen[si]=1;
  while(head<tail){
    const x=qx[head], y=qy[head]; head++; n++;
    if(x<mnx)mnx=x; if(x>mxx)mxx=x; if(y<mny)mny=y; if(y>mxy)mxy=y;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const nx=x+dx, ny=y+dy;
      if(nx<0||ny<0||nx>=W||ny>=H) continue;
      const ni=ny*W+nx;
      if(seen[ni]||raw[ni*4+3]<=AT) continue;
      seen[ni]=1; qx[tail]=nx; qy[tail]=ny; tail++;
    }
  }
  if(n>=400) blobs.push({x:mnx,y:mny,w:mxx-mnx+1,h:mxy-mny+1,n});
}
console.log(`덩어리 ${blobs.length}개 찾음`);

/* ---- 가까운 덩어리끼리 묶는다 (신발이 다리와 떨어져 나오는 경우) ---- */
const GAP=Math.round(Math.min(W,H)*0.035);
const near=(a,b)=>{
  const ax2=a.x+a.w+GAP, ay2=a.y+a.h+GAP;
  const bx2=b.x+b.w+GAP, by2=b.y+b.h+GAP;
  return !(ax2<b.x-GAP||bx2<a.x-GAP||ay2<b.y-GAP||by2<a.y-GAP);
};
let merged=true;
while(merged){
  merged=false;
  outer:
  for(let i=0;i<blobs.length;i++)for(let j=i+1;j<blobs.length;j++){
    if(!near(blobs[i],blobs[j])) continue;
    const a=blobs[i], b=blobs[j];
    const x=Math.min(a.x,b.x), y=Math.min(a.y,b.y);
    blobs[i]={x,y, w:Math.max(a.x+a.w,b.x+b.w)-x, h:Math.max(a.y+a.h,b.y+b.h)-y, n:a.n+b.n};
    blobs.splice(j,1); merged=true; break outer;
  }
}
console.log(`묶은 뒤 ${blobs.length}개`);

/* ---- 읽는 순서로 정렬: 줄(y) 로 묶고 각 줄에서 x 순 ---- */
blobs.sort((a,b)=>(a.y+a.h/2)-(b.y+b.h/2));
const rows=[];
blobs.forEach(b=>{
  const cy=b.y+b.h/2;
  const row=rows.find(r=>Math.abs(r.cy-cy)<H*0.14);
  if(row){ row.items.push(b); row.cy=(row.cy*row.items.length+cy)/(row.items.length+1); }
  else rows.push({cy, items:[b]});
});
rows.forEach(r=>r.items.sort((a,b)=>a.x-b.x));
const order=[].concat(...rows.map(r=>r.items));

/* ---- 이름 붙이기 (제미나이에게 준 배치 순서) ---- */
const KEYS=['head_cap','torso','uarm','farm',
            'thigh','shin','glove','bat',
            'catcher','mitt','ball','head_helm'];
const KO={head_cap:'머리(모자)',torso:'몸통',uarm:'윗팔',farm:'아랫팔+손',
  thigh:'허벅지',shin:'종아리+신발',glove:'글러브',bat:'배트',
  catcher:'포수',mitt:'미트',ball:'공',head_helm:'머리(헬멧)'};

console.log(`\n줄 ${rows.length}개 · 줄마다 ${rows.map(r=>r.items.length).join('/')}개`);
const out={sheet:{w:W,h:H}, parts:{}};
order.forEach((b,i)=>{
  const k=KEYS[i]||('part'+i);
  out.parts[k]={x:b.x,y:b.y,w:b.w,h:b.h};
  console.log(`  ${String(i+1).padStart(2)}. ${(KO[k]||k).padEnd(12)}`+
    ` x${String(b.x).padStart(4)} y${String(b.y).padStart(4)}`+
    ` ${String(b.w).padStart(3)}x${String(b.h).padStart(3)}`);
});
if(order.length!==12) console.log(`\n⚠ 조각이 12개가 아니다 (${order.length}개). 이름이 밀렸을 수 있다.`);

fs.writeFileSync('art/parts.json', JSON.stringify(out,null,1));
console.log('\n→ art/parts.json 에 썼다');
