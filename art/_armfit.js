/* 팔·다리 관절이 몸통 실루엣 안에 파묻히는지 재는 도구. 게임에는 안 들어간다.
   유니폼 그림(torso)의 실제 불투명 픽셀 폭을 몸통 좌표계로 환산해서,
   어깨·팔꿈치·손목이 옷 밖으로 나오는지 숫자로 본다.                      */
const fs=require('fs'), {execSync}=require('child_process');
const {loadPNG}=require('./canvas2d.js');
execSync(`ffmpeg -v error -y -i "${__dirname}/sheet.webp" "${__dirname}/_sheet.png"`);
const IMG=loadPNG(__dirname+'/_sheet.png');
const W=IMG.width, D=IMG.data;

const src=fs.readFileSync(__dirname+'/../index.html','utf8');
const grab=(re)=>{ const m=re.exec(src); if(!m) throw new Error('못 찾음 '+re); return m[1]; };
const MV_PARTS=JSON.parse(grab(/const MV_PARTS=(\{[\s\S]*?\});/).replace(/\/\*[\s\S]*?\*\//g,''));
const MV_JOINTS=eval('('+grab(/const MV_JOINTS=(\{[\s\S]*?\n\};)/).replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'').replace(/;$/,'')+')');
const MV_LEN=eval('('+grab(/const MV_LEN=(\{[^}]*\});/)+')');
const MV_SH=eval('('+grab(/const MV_SH=(\[[^\]]*\])/)+')');
const MV_NECK=parseFloat(grab(/MV_NECK=(-?[\d.]+)/));
const MV_HIPW=parseFloat(grab(/const MV_HIPW=([\d.]+)/));

/* 파츠 한 줄의 불투명 좌/우 끝 (상자 비율) */
function rowSpan(k,yr){
  const P=MV_PARTS[k], y=Math.round(yr*(P[3]-1));
  let l=null,r=null;
  for(let x=0;x<P[2];x++){
    const i=((P[1]+y)*W+(P[0]+x))*4;
    if(D[i+3]>=128){ if(l===null)l=x; r=x; }
  }
  return l===null?null:[l/P[2], r/P[2]];
}
/* 유니폼 실루엣을 몸통 좌표계(원점=골반, 목=MV_NECK)로 옮긴다.
   narrow 배수는 mvGuySprite 가 scale(narrow,1) 로 x 에만 먹인다.        */
function torsoProfile(narrow){
  const P=MV_PARTS.torso, J=MV_JOINTS.torso;
  const y0=J[1], y1=J[3];                     // 뼈 시작/끝의 세로 비율
  const cx=J[0];                              // 뼈 축의 가로 비율
  const px2u=MV_LEN.torso/((y1-y0)*P[3]);     // 그림 1px = 몸통 몇 단위
  const out=[];
  for(let i=0;i<=40;i++){
    const yr=y0+(y1-y0)*(i/40);
    const s=rowSpan('torso',yr); if(!s) continue;
    const yBody=MV_NECK+MV_LEN.torso*(i/40);
    const half=((s[1]-s[0])/2)*P[2]*px2u*(narrow==null?1:narrow);
    const mid =((s[0]+s[1])/2-cx)*P[2]*px2u*(narrow==null?1:narrow);
    out.push({y:+yBody.toFixed(2), mid:+mid.toFixed(2), half:+half.toFixed(2),
              L:+(mid-half).toFixed(2), R:+(mid+half).toFixed(2)});
  }
  return out;
}
/* 그 높이에서 유니폼이 가리는 가로 반폭 */
function halfAt(prof,y){
  if(y<=prof[0].y) return prof[0].half;
  if(y>=prof[prof.length-1].y) return prof[prof.length-1].half;
  for(let i=1;i<prof.length;i++){
    if(y<=prof[i].y){
      const a=prof[i-1], b=prof[i], t=(y-a.y)/((b.y-a.y)||1);
      return a.half+(b.half-a.half)*t;
    }
  }
  return prof[prof.length-1].half;
}
/* index.html 의 mvIK 를 그대로 */
function mvIK(dx,dy,l1,l2,bend){
  const d=Math.max(1e-4, Math.min(Math.hypot(dx,dy), (l1+l2)*0.999));
  const base=Math.atan2(dx,dy);
  const a1=Math.acos(Math.max(-1,Math.min(1,(d*d+l1*l1-l2*l2)/(2*d*l1))));
  const a2=Math.acos(Math.max(-1,Math.min(1,(l1*l1+l2*l2-d*d)/(2*l1*l2))));
  const sg=bend<0?-1:1;
  const u=base-sg*a1;
  return [u, u+sg*(Math.PI-a2)];
}
/* mvGuySprite 의 leg / mvArm 이 거는 변환과 같은 순서 */
function fk2(x0,y0,a0,a1,l1,l2){
  const t=-a0, tk=t+(-(a1-a0));
  const kX=x0-l1*Math.sin(t),  kY=y0+l1*Math.cos(t);
  const eX=kX-l2*Math.sin(tk), eY=kY+l2*Math.cos(tk);
  return {knee:[kX,kY], end:[eX,eY]};
}
function armSolve(sx0,t){
  const A=mvIK(t[0]-sx0, t[1]-MV_SH[1], MV_LEN.uarm, MV_LEN.farm, t[2]);
  const r=fk2(sx0, MV_SH[1], A[0], A[1], MV_LEN.uarm, MV_LEN.farm);
  return {ang:A, elbow:r.knee, wrist:r.end};
}
module.exports={MV_PARTS,MV_JOINTS,MV_LEN,MV_SH,MV_NECK,MV_HIPW,
                rowSpan,torsoProfile,halfAt,mvIK,fk2,armSolve};

if(require.main===module){
  const narrow=parseFloat(process.argv[2]||'1');
  const prof=torsoProfile(narrow);
  console.log(`\n=== 유니폼(torso) 실루엣 · narrow=${narrow} · 몸통 좌표계(원점=골반) ===`);
  console.log('    y      왼끝    오른끝   반폭');
  prof.forEach((p,i)=>{ if(i%2) return;
    console.log(`  ${String(p.y).padStart(6)}  ${String(p.L).padStart(6)}  ${String(p.R).padStart(6)}  ${String(p.half).padStart(6)}`); });
  const mx=prof.reduce((a,b)=>b.half>a.half?b:a);
  console.log(`  최대 반폭 ${mx.half} (y=${mx.y})  · 어깨 anchor x=${(Math.abs(MV_SH[0])*narrow).toFixed(2)} y=${MV_SH[1]}`);
  console.log(`  어깨 높이의 유니폼 반폭 = ${halfAt(prof,MV_SH[1]).toFixed(2)}  → 어깨가 옷 ${
    (Math.abs(MV_SH[0])*narrow - halfAt(prof,MV_SH[1])).toFixed(2)} 만큼 ${
    Math.abs(MV_SH[0])*narrow < halfAt(prof,MV_SH[1])?'**안쪽**':'바깥'}에 있다`);
}
