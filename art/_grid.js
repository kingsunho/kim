/* 파츠 하나하나에 10% 격자를 얹어서 관절 위치를 눈으로 읽는 용도.
   작업용 스크립트다. 게임과는 상관없다.
   사용: node art/_grid.js head_cap torso uarm farm            */
const {Ctx,loadPNG,savePNG}=require('./canvas2d.js');
const P=require('./parts.json').parts;
const sheet=loadPNG(__dirname+'/sprite.png');
const names=process.argv.slice(2);
const CELL=230, PAD=16, COLS=Math.min(4,names.length);
const ROWS=Math.ceil(names.length/COLS);
const W=COLS*(CELL+PAD)+PAD, H=ROWS*(CELL+PAD)+PAD;
const g=new Ctx(W,H);
g.fillStyle='#20242c'; g.fillRect(0,0,W,H);
names.forEach((n,i)=>{
  const p=P[n]; if(!p){ console.log('없는 파츠:',n); return; }
  const cx=PAD+(i%COLS)*(CELL+PAD), cy=PAD+((i/COLS)|0)*(CELL+PAD);
  g.fillStyle='#0e1116'; g.fillRect(cx,cy,CELL,CELL);
  // 파츠를 셀 안에 꽉 채운다 (가로세로 비율 유지 → 셀 안 오프셋 기록)
  const sc=Math.min(CELL/p.w, CELL/p.h);
  const dw=p.w*sc, dh=p.h*sc, dx=cx+(CELL-dw)/2, dy=cy+(CELL-dh)/2;
  g.drawImage(sheet,p.x,p.y,p.w,p.h,dx,dy,dw,dh);
  // 파츠 상자 = 0~100%
  g.strokeStyle='rgba(120,200,255,.35)'; g.lineWidth=0.7;
  for(let k=1;k<10;k++){
    g.beginPath(); g.moveTo(dx+dw*k/10,dy); g.lineTo(dx+dw*k/10,dy+dh); g.stroke();
    g.beginPath(); g.moveTo(dx,dy+dh*k/10); g.lineTo(dx+dw,dy+dh*k/10); g.stroke();
  }
  g.strokeStyle='rgba(255,90,90,.85)'; g.lineWidth=1.2;
  g.beginPath(); g.moveTo(dx+dw/2,dy); g.lineTo(dx+dw/2,dy+dh); g.stroke();
  g.beginPath(); g.moveTo(dx,dy+dh/2); g.lineTo(dx+dw,dy+dh/2); g.stroke();
  g.strokeStyle='rgba(255,255,255,.55)'; g.lineWidth=1.2; g.strokeRect(dx,dy,dw,dh);
  g.fillStyle='#ffd15c'; g.font='bold 13px sans-serif'; g.textAlign='left';
  g.fillText(n.toUpperCase().replace('_','-'), cx+4, cy+15);
  g.fillStyle='#8fa3bb'; g.font='bold 10px sans-serif';
  g.fillText(p.w+'X'+p.h, cx+4, cy+CELL-4);
});
const o=g.toRGBA();
savePNG(__dirname+'/_grid.png',o.w,o.h,o.data);
console.log('art/_grid.png');
