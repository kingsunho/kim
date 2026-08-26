/* 하이라이트 장면(psField) 구장만 따로 뽑아 본다. 게임에는 안 들어간다.

     node art/psview.js [구장]      benamul(기본) · seonggok · singil
     node art/psview.js all         세 구장 한 장에

   index.html 에서 ps* 함수와 상수를 **그대로 떼어다** 돌린다.
   그래서 여기서 잘 나오면 게임에서도 잘 나온다.
   수비 위치·베이스·담장 좌표도 같이 재서 출력한다 —
   눈으로 보는 것과 숫자가 따로 놀면 안 된다.                          */
const fs=require('fs');
const {Ctx,savePNG}=require('./canvas2d.js');
const src=fs.readFileSync(__dirname+'/../index.html','utf8');

/* 필요한 조각만 이름으로 떼어낸다 */
function grab(re,label){
  const m=src.match(re);
  if(!m){ console.error('못 찾음: '+label); process.exit(1); }
  return m[0];
}
const parts=[
  grab(/const PARK_DIM_DEFAULT\s*=[^\n]*\n/, 'PARK_DIM_DEFAULT'),
  grab(/const PARKS\s*=\s*\[[\s\S]*?\n\];/, 'PARKS'),
  grab(/function fenceAt\(park, ang\)\{[\s\S]*?\n\}/, 'fenceAt'),
  /* PS_POS · PS_OUT · psPosOf 가 이 덩어리 안에 같이 들어 있다 */
  grab(/const PSS=[\s\S]*?const PS_UNI=\{[\s\S]*?\};/, 'PS 상수'),
  grab(/const PS_FOUL=[^\n]*\n/, 'PS_FOUL'),
  grab(/function psRad\([\s\S]*?\n\}/, 'psRad'),
  grab(/const PS_MPP=[^\n]*\n/, 'PS_MPP'),
  grab(/function psSpot\([\s\S]*?\n\}/, 'psSpot'),
  grab(/function psFenceR\([^\n]*\n/, 'psFenceR'),
  grab(/function psFencePath\([\s\S]*?\n\}/, 'psFencePath'),
  grab(/function psField\(g, parkIn\)\{[\s\S]*?\n\}/, 'psField'),
];
const A=new Function(parts.join('\n')+`
  ;return {PARKS,PS_B,PS_MOUND,PS_POS,PS_MPP,PS_FOUL,PSW,PSH,
           psField,psSpot,psRad,psFenceR,fenceAt,psPosOf,PS_OUT};`)();

const PARK=process.argv[2]||'benamul';
const list=(PARK==='all')?['benamul','seonggok','singil']:[PARK];

/* ---------- 숫자로 재보기 ---------- */
const HX=160, HY=236;
const r=(p)=>Math.hypot(p.x-HX,p.y-HY);
const angOf=(p)=>{                       // psSpot 의 역함수
  const dx=p.x-HX, dy=p.y-HY;
  return Math.atan2(dx,-dy)*180/Math.PI;
};
console.log('== 베이스 (화면 좌표) ==');
const NM=['HOME','1B','2B','3B'];
A.PS_B.forEach((b,i)=>console.log(`  ${NM[i].padEnd(5)} = (${b.x}, ${b.y})   홈에서 ${r(b).toFixed(1)}px`));
const [H,B1,B2,B3]=A.PS_B;
console.log(`  홈↔2루 X 같은가 : ${H.x===B2.x ? 'O ('+H.x+')' : 'X ('+H.x+' vs '+B2.x+')'}`);
console.log(`  1·3루 좌우 대칭 : ${(B1.x-H.x)===-(B3.x-H.x)&&B1.y===B3.y
    ? 'O (±'+(B1.x-H.x)+', y='+B1.y+')' : 'X'}`);
console.log(`  홈→1루 ${r(B1).toFixed(1)}px · 홈→3루 ${r(B3).toFixed(1)}px · 홈→2루 ${r(B2).toFixed(1)}px`);

list.forEach(id=>{
  const park=A.PARKS.find(p=>p.id===id);
  console.log(`\n== ${park.name} (${park.dim.join('/')}) ==`);
  console.log(`  담장  좌 ${A.psFenceR(park,-A.PS_FOUL).toFixed(1)}px`+
              ` · 중앙 ${A.psFenceR(park,0).toFixed(1)}px`+
              ` · 우 ${A.psFenceR(park,A.PS_FOUL).toFixed(1)}px`);
  const bad=[];
  Object.keys(A.PS_POS).forEach(k=>{
    if(k==='C'||k==='P') return;
    const p=A.psPosOf(k,park), d=r(p), a=angOf(p), f=A.psFenceR(park,a);
    const out=d>f;
    if(out) bad.push(k);
    console.log(`  ${k.padEnd(3)} (${p.x.toFixed(0)},${p.y.toFixed(0)})  각 ${a.toFixed(1).padStart(6)}°`+
      `  홈에서 ${d.toFixed(1).padStart(6)}px  담장 ${f.toFixed(1).padStart(6)}px`+
      `  ${out?'← 담장 밖!!':''}`);
  });
  console.log(`  담장 밖: ${bad.length?bad.join(', '):'없음'}`);
});

/* ---------- 그려 보기 ---------- */
const K=Number(process.argv[3]||3);
const g=new Ctx(A.PSW*K*list.length, A.PSH*K);
list.forEach((id,i)=>{
  const park=A.PARKS.find(p=>p.id===id);
  g.save(); g.translate(i*A.PSW*K,0); g.scale(K,K);
  A.psField(g, park);
  /* 수비수 자리에 점을 찍는다 — 사람은 안 그린다. 자리만 본다. */
  Object.keys(A.PS_POS).forEach(k=>{
    const p=A.psPosOf(k,park);
    const d=r(p), f=A.psFenceR(park,angOf(p));
    g.fillStyle=(k==='C'||k==='P')?'#ffd15c':(d>f?'#ff3b30':'#00e5ff');
    g.beginPath(); g.arc(p.x,p.y,3.2,0,Math.PI*2); g.fill();
  });
  g.restore();
});
const o=g.toRGBA(); savePNG(__dirname+'/_psfield.png',o.w,o.h,o.data);
console.log('\nart/_psfield.png  (파랑=담장 안 · 빨강=담장 밖 · 노랑=투수·포수)');
