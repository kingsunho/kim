/* 순수 자바스크립트 Canvas2D 흉내 — 미리보기 전용, 게임에는 안 들어간다.

   왜 필요한가: 이 서버에는 node-canvas 가 없다. mvGuy() 의 관절 각도나
   구장 그림을 고칠 때마다 눈으로 못 보면 감으로 찍는 수밖에 없다.
   그래서 게임 코드(mvGuy/mvField/...)를 **그대로** 돌릴 수 있는 최소한의
   2D 컨텍스트를 만들었다. art/pose.js 가 이걸로 PNG 를 뽑는다.

   대충 만든 부분:
   - 안티에일리어싱은 2배로 그려서 줄이는 것으로 대신한다 (SS=2)
   - fillText 는 숫자·영문만 나오는 5x7 비트맵이다 (등번호 확인용)
   - globalCompositeOperation 은 'multiply' 만 안다
   진짜 브라우저와 1픽셀까지 같지는 않다. 배치와 각도를 보는 용도다.  */

const SS = 2;                       // 슈퍼샘플 배수

/* ---------- 색 ---------- */
function parseColor(c){
  if(typeof c!=='string') return null;
  c=c.trim();
  let m=/^#([0-9a-f]{3})$/i.exec(c);
  if(m){ const h=m[1]; return [parseInt(h[0]+h[0],16),parseInt(h[1]+h[1],16),parseInt(h[2]+h[2],16),1]; }
  m=/^#([0-9a-f]{6})$/i.exec(c);
  if(m){ const h=m[1]; return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),1]; }
  m=/^#([0-9a-f]{8})$/i.exec(c);
  if(m){ const h=m[1]; return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),parseInt(h.slice(6,8),16)/255]; }
  m=/^rgba?\(([^)]+)\)$/i.exec(c);
  if(m){ const p=m[1].split(',').map(s=>parseFloat(s));
    return [p[0]|0,p[1]|0,p[2]|0,p.length>3?p[3]:1]; }
  const NAMED={black:[0,0,0,1],white:[255,255,255,1],red:[255,0,0,1],
    lime:[0,255,0,1],blue:[0,0,255,1],transparent:[0,0,0,0]};
  return NAMED[c.toLowerCase()]||[255,0,255,1];
}

class Gradient {
  constructor(x0,y0,x1,y1){ this.p=[x0,y0,x1,y1]; this.stops=[]; }
  addColorStop(t,c){ this.stops.push([t,parseColor(c)]); this.stops.sort((a,b)=>a[0]-b[0]); }
  at(t){
    const s=this.stops;
    if(!s.length) return [0,0,0,0];
    if(t<=s[0][0]) return s[0][1];
    if(t>=s[s.length-1][0]) return s[s.length-1][1];
    for(let i=1;i<s.length;i++){
      if(t<=s[i][0]){
        const a=s[i-1], b=s[i];
        const f=(t-a[0])/Math.max(1e-9,b[0]-a[0]);
        return [a[1][0]+(b[1][0]-a[1][0])*f, a[1][1]+(b[1][1]-a[1][1])*f,
                a[1][2]+(b[1][2]-a[1][2])*f, a[1][3]+(b[1][3]-a[1][3])*f];
      }
    }
    return s[s.length-1][1];
  }
}

/* ---------- 행렬 (a,b,c,d,e,f) ---------- */
const mIdent=()=>[1,0,0,1,0,0];
function mMul(m,n){    // m 다음에 n 을 적용 (canvas 의 곱 순서)
  return [m[0]*n[0]+m[2]*n[1], m[1]*n[0]+m[3]*n[1],
          m[0]*n[2]+m[2]*n[3], m[1]*n[2]+m[3]*n[3],
          m[0]*n[4]+m[2]*n[5]+m[4], m[1]*n[4]+m[3]*n[5]+m[5]];
}
function mApply(m,x,y){ return [m[0]*x+m[2]*y+m[4], m[1]*x+m[3]*y+m[5]]; }
function mInv(m){
  const det=m[0]*m[3]-m[1]*m[2];
  if(Math.abs(det)<1e-12) return mIdent();
  const id=1/det;
  return [ m[3]*id, -m[1]*id, -m[2]*id, m[0]*id,
           (m[2]*m[5]-m[3]*m[4])*id, (m[1]*m[4]-m[0]*m[5])*id ];
}
/* 이 행렬이 길이를 몇 배로 늘리는가 (선 두께용) */
function mScale(m){ return Math.sqrt(Math.abs(m[0]*m[3]-m[1]*m[2]))||1; }

/* ---------- 이미지 ---------- */
class RGBAImage {
  constructor(w,h,data){ this.width=w; this.height=h; this.data=data; }
}

/* ---------- 컨텍스트 ---------- */
class Ctx {
  constructor(w,h){
    this.W=w*SS; this.H=h*SS;
    this.buf=new Float32Array(this.W*this.H*4);   // 프리멀티플라이 안 함, 0~255
    this.base=[SS,0,0,SS,0,0];
    this.m=this.base.slice();
    this.fillStyle='#000'; this.strokeStyle='#000';
    this.lineWidth=1; this.lineCap='butt'; this.lineJoin='miter';
    this.globalAlpha=1; this.globalCompositeOperation='source-over';
    this.font='10px sans-serif'; this.textAlign='left'; this.textBaseline='alphabetic';
    this.clip_=null;                              // Float32Array 커버리지 또는 null
    this.stack=[];
    this.sub=[]; this.cur=null; this.start=null;
  }
  /* -- 상태 -- */
  save(){
    this.stack.push({m:this.m.slice(), fillStyle:this.fillStyle, strokeStyle:this.strokeStyle,
      lineWidth:this.lineWidth, lineCap:this.lineCap, lineJoin:this.lineJoin,
      globalAlpha:this.globalAlpha, globalCompositeOperation:this.globalCompositeOperation,
      font:this.font, textAlign:this.textAlign, clip:this.clip_});
  }
  restore(){
    const s=this.stack.pop(); if(!s) return;
    Object.assign(this,{m:s.m, fillStyle:s.fillStyle, strokeStyle:s.strokeStyle,
      lineWidth:s.lineWidth, lineCap:s.lineCap, lineJoin:s.lineJoin,
      globalAlpha:s.globalAlpha, globalCompositeOperation:s.globalCompositeOperation,
      font:s.font, textAlign:s.textAlign});
    this.clip_=s.clip;
  }
  setTransform(a,b,c,d,e,f){ this.m=mMul(this.base,[a,b,c,d,e,f]); }
  resetTransform(){ this.m=this.base.slice(); }
  transform(a,b,c,d,e,f){ this.m=mMul(this.m,[a,b,c,d,e,f]); }
  translate(x,y){ this.m=mMul(this.m,[1,0,0,1,x,y]); }
  rotate(r){ const c=Math.cos(r),s=Math.sin(r); this.m=mMul(this.m,[c,s,-s,c,0,0]); }
  scale(x,y){ this.m=mMul(this.m,[x,0,0,y===undefined?x:y,0,0]); }

  createLinearGradient(x0,y0,x1,y1){ return new Gradient(x0,y0,x1,y1); }
  /* 방사형은 안 쓰지만 터지지 않게 선형으로 흉내낸다 */
  createRadialGradient(x0,y0,r0,x1,y1,r1){ return new Gradient(x0-r1,y0,x0+r1,y0); }

  /* -- 패스 (점은 넣을 때 바로 디바이스 좌표로 바꾼다) -- */
  beginPath(){ this.sub=[]; this.cur=null; this.start=null; }
  _push(x,y){ const p=mApply(this.m,x,y); if(!this.cur){ this.cur=[]; this.sub.push(this.cur); } this.cur.push(p[0],p[1]); }
  moveTo(x,y){ this.cur=[]; this.sub.push(this.cur); const p=mApply(this.m,x,y);
    this.cur.push(p[0],p[1]); this.start=[x,y]; this.last=[x,y]; }
  lineTo(x,y){ if(!this.cur) return this.moveTo(x,y); this._push(x,y); this.last=[x,y]; }
  closePath(){ if(this.cur&&this.start){ this._push(this.start[0],this.start[1]);
    this.cur.closed=true; this.last=this.start.slice(); } }
  quadraticCurveTo(cx,cy,x,y){
    const [x0,y0]=this.last||[cx,cy];
    const n=Math.max(6,Math.min(48,Math.ceil(mScale(this.m)*(Math.hypot(cx-x0,cy-y0)+Math.hypot(x-cx,y-cy))/3)));
    for(let i=1;i<=n;i++){ const t=i/n, u=1-t;
      this.lineTo(u*u*x0+2*u*t*cx+t*t*x, u*u*y0+2*u*t*cy+t*t*y); }
    this.last=[x,y];
  }
  bezierCurveTo(c1x,c1y,c2x,c2y,x,y){
    const [x0,y0]=this.last||[c1x,c1y];
    const n=Math.max(8,Math.min(64,Math.ceil(mScale(this.m)*(Math.hypot(c1x-x0,c1y-y0)+Math.hypot(c2x-c1x,c2y-c1y)+Math.hypot(x-c2x,y-c2y))/3)));
    for(let i=1;i<=n;i++){ const t=i/n,u=1-t;
      this.lineTo(u*u*u*x0+3*u*u*t*c1x+3*u*t*t*c2x+t*t*t*x,
                  u*u*u*y0+3*u*u*t*c1y+3*u*t*t*c2y+t*t*t*y); }
    this.last=[x,y];
  }
  arc(cx,cy,r,a0,a1,ccw){
    let d=a1-a0;
    if(!ccw && d<0) d+=Math.PI*2*Math.ceil(-d/(Math.PI*2));
    if(ccw && d>0) d-=Math.PI*2*Math.ceil(d/(Math.PI*2));
    const n=Math.max(8,Math.min(96,Math.ceil(Math.abs(d)*r*mScale(this.m)/2.2)));
    for(let i=0;i<=n;i++){ const a=a0+d*(i/n);
      const x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r;
      if(i===0 && !this.cur) this.moveTo(x,y); else this.lineTo(x,y); }
  }
  ellipse(cx,cy,rx,ry,rot,a0,a1,ccw){
    let d=a1-a0;
    if(!ccw && d<0) d+=Math.PI*2; if(ccw && d>0) d-=Math.PI*2;
    const n=Math.max(10,Math.min(120,Math.ceil(Math.abs(d)*Math.max(rx,ry)*mScale(this.m)/2.2)));
    const cr=Math.cos(rot||0), sr=Math.sin(rot||0);
    for(let i=0;i<=n;i++){ const a=a0+d*(i/n);
      const ex=Math.cos(a)*rx, ey=Math.sin(a)*ry;
      const x=cx+ex*cr-ey*sr, y=cy+ex*sr+ey*cr;
      if(i===0 && !this.cur) this.moveTo(x,y); else this.lineTo(x,y); }
  }
  rect(x,y,w,h){ this.moveTo(x,y); this.lineTo(x+w,y); this.lineTo(x+w,y+h);
    this.lineTo(x,y+h); this.closePath(); }

  /* -- 커버리지 만들기 (nonzero) -- */
  _cover(subs){
    let minY=1e9,maxY=-1e9,minX=1e9,maxX=-1e9;
    const edges=[];
    for(const sp of subs){
      const n=sp.length/2; if(n<2) continue;
      for(let i=0;i<n;i++){
        const j=(i+1)%n;
        if(j===0 && !sp.closed && n>1){ /* fill 은 항상 닫힌 것으로 본다 */ }
        const x0=sp[i*2],y0=sp[i*2+1],x1=sp[j*2],y1=sp[j*2+1];
        if(y0===y1) continue;
        edges.push([x0,y0,x1,y1]);
        if(y0<minY)minY=y0; if(y0>maxY)maxY=y0;
        if(y1<minY)minY=y1; if(y1>maxY)maxY=y1;
        if(x0<minX)minX=x0; if(x0>maxX)maxX=x0;
        if(x1<minX)minX=x1; if(x1>maxX)maxX=x1;
      }
    }
    if(!edges.length) return null;
    const y0i=Math.max(0,Math.floor(minY)), y1i=Math.min(this.H-1,Math.ceil(maxY));
    const x0i=Math.max(0,Math.floor(minX)), x1i=Math.min(this.W-1,Math.ceil(maxX));
    if(y1i<y0i||x1i<x0i) return null;
    const bw=x1i-x0i+1, bh=y1i-y0i+1;
    const cov=new Float32Array(bw*bh);
    const xs=[], ws=[];
    for(let py=y0i;py<=y1i;py++){
      const sy=py+0.5;
      xs.length=0; ws.length=0;
      for(const e of edges){
        const [ex0,ey0,ex1,ey1]=e;
        if((sy>=ey0&&sy<ey1)||(sy>=ey1&&sy<ey0)){
          const t=(sy-ey0)/(ey1-ey0);
          xs.push(ex0+(ex1-ex0)*t); ws.push(ey1>ey0?1:-1);
        }
      }
      if(!xs.length) continue;
      const idx=xs.map((v,i)=>i).sort((a,b)=>xs[a]-xs[b]);
      let wind=0;
      for(let k=0;k<idx.length-1;k++){
        wind+=ws[idx[k]];
        if(wind===0) continue;
        let a=xs[idx[k]], b=xs[idx[k+1]];
        if(b<=x0i||a>=x1i+1) continue;
        a=Math.max(a,x0i); b=Math.min(b,x1i+1);
        // 부분 픽셀은 가로 방향만 보정 (세로는 SS 가 처리)
        let ia=Math.floor(a), ib=Math.floor(b);
        const row=(py-y0i)*bw;
        if(ia===ib){ cov[row+ia-x0i]=Math.min(1,cov[row+ia-x0i]+(b-a)); }
        else{
          cov[row+ia-x0i]=Math.min(1,cov[row+ia-x0i]+(ia+1-a));
          for(let px=ia+1;px<ib;px++) cov[row+px-x0i]=1;
          if(ib<=x1i) cov[row+ib-x0i]=Math.min(1,cov[row+ib-x0i]+(b-ib));
        }
      }
    }
    return {cov,x0:x0i,y0:y0i,w:bw,h:bh};
  }

  /* -- 픽셀 합성 -- */
  _blend(px,py,r,g,b,a){
    if(a<=0) return;
    if(px<0||py<0||px>=this.W||py>=this.H) return;
    if(this.clip_){ const c=this.clip_[py*this.W+px]; if(c<=0) return; a*=c; }
    const i=(py*this.W+px)*4, B=this.buf;
    if(this.globalCompositeOperation==='multiply'){
      const dr=B[i],dg=B[i+1],db=B[i+2];
      r=dr*r/255; g=dg*g/255; b=db*b/255;
    }
    const da=B[i+3]/255;
    const oa=a+da*(1-a);
    if(oa<=0){ B[i+3]=0; return; }
    B[i]  =(r*a+B[i]  *da*(1-a))/oa;
    B[i+1]=(g*a+B[i+1]*da*(1-a))/oa;
    B[i+2]=(b*a+B[i+2]*da*(1-a))/oa;
    B[i+3]=oa*255;
  }
  _paint(res, style){
    if(!res) return;
    const {cov,x0,y0,w,h}=res;
    const ga=this.globalAlpha;
    if(style instanceof Gradient){
      const gm=this.m;                                   // fill 시점의 CTM
      const p0=mApply(gm,style.p[0],style.p[1]);
      const p1=mApply(gm,style.p[2],style.p[3]);
      const dx=p1[0]-p0[0], dy=p1[1]-p0[1];
      const dd=dx*dx+dy*dy;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const c=cov[y*w+x]; if(c<=0) continue;
        const px=x0+x+0.5, py=y0+y+0.5;
        const t=dd<1e-9?0:((px-p0[0])*dx+(py-p0[1])*dy)/dd;
        const col=style.at(t);
        this._blend(x0+x,y0+y,col[0],col[1],col[2],col[3]*c*ga);
      }
    } else {
      const col=parseColor(style)||[0,0,0,1];
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const c=cov[y*w+x]; if(c<=0) continue;
        this._blend(x0+x,y0+y,col[0],col[1],col[2],col[3]*c*ga);
      }
    }
  }

  fill(){ this._paint(this._cover(this.sub), this.fillStyle); }
  clip(){
    const res=this._cover(this.sub);
    const next=new Float32Array(this.W*this.H);
    if(res){ const {cov,x0,y0,w,h}=res;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const v=cov[y*w+x]; if(v<=0) continue;
        const gx=x0+x, gy=y0+y;
        next[gy*this.W+gx]=this.clip_?this.clip_[gy*this.W+gx]*v:v;
      } }
    this.clip_=next;
  }
  /* 선 — 세그먼트마다 사각형 + 둥근 이음 */
  stroke(){
    const lw=Math.max(0.35, this.lineWidth*mScale(this.m));
    const half=lw/2;
    const polys=[];
    for(const sp of this.sub){
      const n=sp.length/2; if(n<2){
        if(n===1&&this.lineCap==='round') polys.push(circlePoly(sp[0],sp[1],half));
        continue; }
      for(let i=0;i<n-1;i++){
        const x0=sp[i*2],y0=sp[i*2+1],x1=sp[i*2+2],y1=sp[i*2+3];
        const dx=x1-x0, dy=y1-y0, L=Math.hypot(dx,dy);
        if(L<1e-9) continue;
        const nx=-dy/L*half, ny=dx/L*half;
        let ax=x0,ay=y0,bx=x1,by=y1;
        if(this.lineCap==='square'&&(i===0||i===n-2)){
          const ux=dx/L*half, uy=dy/L*half;
          if(i===0){ax-=ux;ay-=uy;} if(i===n-2){bx+=ux;by+=uy;}
        }
        polys.push([ax+nx,ay+ny, bx+nx,by+ny, bx-nx,by-ny, ax-nx,ay-ny]);
      }
      // 이음·끝 마감은 원으로 (round/miter 둘 다 이렇게 — 얇은 선이라 티 안 난다)
      const first=0, last=n-1;
      for(let i=0;i<n;i++){
        const isEnd=(i===first||i===last);
        if(isEnd && this.lineCap==='butt' && !sp.closed) continue;
        polys.push(circlePoly(sp[i*2],sp[i*2+1],half));
      }
    }
    if(!polys.length) return;
    /* 겹치는 조각을 한 번에 합치면 nonzero 로 잘 붙는다.
       단 방향이 서로 반대면 겹친 데가 상쇄돼서 구멍이 뚫린다
       (선이 점선으로 나왔던 이유). 전부 같은 방향으로 돌려놓는다. */
    polys.forEach(p=>{
      let a=0;
      for(let i=0;i<p.length;i+=2){ const j=(i+2)%p.length;
        a+=p[i]*p[j+1]-p[j]*p[i+1]; }
      if(a<0){ const q=[]; for(let i=p.length-2;i>=0;i-=2) q.push(p[i],p[i+1]);
        p.length=0; p.push(...q); }
    });
    this._paint(this._cover(polys), this.strokeStyle);
  }
  fillRect(x,y,w,h){ this.beginPath(); this.rect(x,y,w,h); this.fill(); }
  strokeRect(x,y,w,h){ this.beginPath(); this.rect(x,y,w,h); this.stroke(); }
  clearRect(x,y,w,h){
    const a=mApply(this.m,x,y), b=mApply(this.m,x+w,y+h);
    const x0=Math.max(0,Math.floor(Math.min(a[0],b[0]))), x1=Math.min(this.W,Math.ceil(Math.max(a[0],b[0])));
    const y0=Math.max(0,Math.floor(Math.min(a[1],b[1]))), y1=Math.min(this.H,Math.ceil(Math.max(a[1],b[1])));
    for(let py=y0;py<y1;py++)for(let px=x0;px<x1;px++){
      const i=(py*this.W+px)*4; this.buf[i]=this.buf[i+1]=this.buf[i+2]=this.buf[i+3]=0; }
  }

  /* -- 이미지 -- */
  drawImage(img,a1,a2,a3,a4,a5,a6,a7,a8){
    let sx=0,sy=0,sw=img.width,sh=img.height,dx,dy,dw,dh;
    if(a5===undefined){ dx=a1;dy=a2; dw=(a3===undefined?sw:a3); dh=(a4===undefined?sh:a4); }
    else { sx=a1;sy=a2;sw=a3;sh=a4;dx=a5;dy=a6;dw=a7;dh=a8; }
    if(dw===0||dh===0||sw===0||sh===0) return;
    // 목적지 사각형 → 디바이스
    const cs=[mApply(this.m,dx,dy),mApply(this.m,dx+dw,dy),
              mApply(this.m,dx+dw,dy+dh),mApply(this.m,dx,dy+dh)];
    let x0=Math.floor(Math.min(...cs.map(c=>c[0]))), x1=Math.ceil(Math.max(...cs.map(c=>c[0])));
    let y0=Math.floor(Math.min(...cs.map(c=>c[1]))), y1=Math.ceil(Math.max(...cs.map(c=>c[1])));
    x0=Math.max(0,x0); y0=Math.max(0,y0); x1=Math.min(this.W,x1); y1=Math.min(this.H,y1);
    if(x1<=x0||y1<=y0) return;
    const inv=mInv(this.m);
    const ga=this.globalAlpha;
    const S=img.data, SW=img.width, SH=img.height;
    /* 축소할 때 뭉개지지 않게 소스 픽셀 몇 개를 평균낸다 */
    const step=Math.max(1,Math.floor(Math.min(sw/Math.max(1,x1-x0), sh/Math.max(1,y1-y0))));
    for(let py=y0;py<y1;py++){
      for(let px=x0;px<x1;px++){
        const u=mApply(inv,px+0.5,py+0.5);
        const fx=(u[0]-dx)/dw, fy=(u[1]-dy)/dh;
        if(fx<0||fx>=1||fy<0||fy>=1) continue;
        let r=0,g=0,b=0,al=0,cnt=0;
        for(let oy=0;oy<step;oy++)for(let ox=0;ox<step;ox++){
          const gx=Math.min(SW-1,Math.max(0,Math.floor(sx+fx*sw)+ox));
          const gy=Math.min(SH-1,Math.max(0,Math.floor(sy+fy*sh)+oy));
          const i=(gy*SW+gx)*4;
          const aa=S[i+3]/255;
          r+=S[i]*aa; g+=S[i+1]*aa; b+=S[i+2]*aa; al+=aa; cnt++;
        }
        if(al<=0) continue;
        this._blend(px,py, r/al, g/al, b/al, (al/cnt)*ga);
      }
    }
  }

  /* -- 글자 (숫자·영문 대문자만, 등번호 확인용) -- */
  /* 'bold 2.6px sans-serif' 처럼 앞에 굵기가 붙으면 parseFloat 이 NaN 이다.
     그것 때문에 등번호가 10 units 짜리로 나와서 사람을 다 덮었다. */
  _fsize(){ const m=/([\d.]+)\s*px/.exec(this.font); return m?parseFloat(m[1]):10; }
  measureText(t){ const sz=this._fsize(); return {width:String(t).length*sz*0.56}; }
  fillText(t,x,y){
    t=String(t);
    const sz=this._fsize();
    const cw=sz*0.56, gap=cw*0.14, adv=cw+gap;
    let ox=x;
    if(this.textAlign==='center') ox=x-(t.length*adv-gap)/2;
    else if(this.textAlign==='right'||this.textAlign==='end') ox=x-(t.length*adv-gap);
    const px=cw/5, py=sz/7;
    for(const ch of t){
      const rows=GLYPH[ch.toUpperCase()];
      if(rows){
        for(let r=0;r<7;r++)for(let c=0;c<5;c++){
          if(rows[r]&(1<<(4-c))) this.fillRect(ox+c*px, y-sz+r*py, px*1.02, py*1.02);
        }
      }
      ox+=adv;
    }
  }
  strokeText(t,x,y){ const f=this.fillStyle; this.fillStyle=this.strokeStyle; this.fillText(t,x,y); this.fillStyle=f; }

  /* -- 결과 뽑기 (SS 로 줄이면서 평균) -- */
  toRGBA(){
    const w=this.W/SS|0, h=this.H/SS|0;
    const out=Buffer.alloc(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      let r=0,g=0,b=0,a=0;
      for(let oy=0;oy<SS;oy++)for(let ox=0;ox<SS;ox++){
        const i=((y*SS+oy)*this.W+(x*SS+ox))*4;
        const aa=this.buf[i+3]/255;
        r+=this.buf[i]*aa; g+=this.buf[i+1]*aa; b+=this.buf[i+2]*aa; a+=aa;
      }
      const n=SS*SS, o=(y*w+x)*4;
      if(a<=0){ out[o]=out[o+1]=out[o+2]=out[o+3]=0; continue; }
      out[o]=Math.min(255,Math.round(r/a)); out[o+1]=Math.min(255,Math.round(g/a));
      out[o+2]=Math.min(255,Math.round(b/a)); out[o+3]=Math.round(a/n*255);
    }
    return {w,h,data:out};
  }
}
function circlePoly(cx,cy,r){
  const n=Math.max(6,Math.min(24,Math.ceil(r*2)));
  const p=[]; for(let i=0;i<n;i++){ const a=i/n*Math.PI*2; p.push(cx+Math.cos(a)*r, cy+Math.sin(a)*r); }
  return p;
}
/* 5x7 비트맵 — 숫자와 몇 글자만 */
const GLYPH={
 '0':[0x0E,0x11,0x13,0x15,0x19,0x11,0x0E],'1':[0x04,0x0C,0x04,0x04,0x04,0x04,0x0E],
 '2':[0x0E,0x11,0x01,0x02,0x04,0x08,0x1F],'3':[0x1F,0x02,0x04,0x02,0x01,0x11,0x0E],
 '4':[0x02,0x06,0x0A,0x12,0x1F,0x02,0x02],'5':[0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E],
 '6':[0x06,0x08,0x10,0x1E,0x11,0x11,0x0E],'7':[0x1F,0x01,0x02,0x04,0x08,0x08,0x08],
 '8':[0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E],'9':[0x0E,0x11,0x11,0x0F,0x01,0x02,0x0C],
 '.':[0,0,0,0,0,0x0C,0x0C],'-':[0,0,0,0x1F,0,0,0],' ':[0,0,0,0,0,0,0],
 'A':[0x0E,0x11,0x11,0x1F,0x11,0x11,0x11],'B':[0x1E,0x11,0x1E,0x11,0x11,0x11,0x1E],
 'C':[0x0E,0x11,0x10,0x10,0x10,0x11,0x0E],'H':[0x11,0x11,0x11,0x1F,0x11,0x11,0x11],
 'E':[0x1F,0x10,0x1E,0x10,0x10,0x10,0x1F],'R':[0x1E,0x11,0x11,0x1E,0x14,0x12,0x11],
 'S':[0x0F,0x10,0x10,0x0E,0x01,0x01,0x1E],'W':[0x11,0x11,0x11,0x15,0x15,0x1B,0x11],
 'V':[0x11,0x11,0x11,0x11,0x11,0x0A,0x04],'Z':[0x1F,0x01,0x02,0x04,0x08,0x10,0x1F],
};

/* ---------- PNG 읽고 쓰기 (ffmpeg 를 부른다) ---------- */
const {execSync}=require('child_process');
function loadPNG(path){
  const info=execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${path}"`)
    .toString().trim().split(',');
  const w=+info[0], h=+info[1];
  const data=execSync(`ffmpeg -v error -i "${path}" -f rawvideo -pix_fmt rgba -`,{maxBuffer:1<<30});
  return new RGBAImage(w,h,data);
}
function savePNG(path,w,h,data){
  execSync(`ffmpeg -v error -y -f rawvideo -pix_fmt rgba -s ${w}x${h} -i pipe:0 -frames:v 1 "${path}"`,
    {input:data, maxBuffer:1<<30});
}
module.exports={Ctx,RGBAImage,loadPNG,savePNG,parseColor};
