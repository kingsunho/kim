/* 주루 2막(groundScene.replay)을 실제로 그려서 눈으로 본다. 게임에는 안 들어간다.

     node art/runview.js

   index.html 에서 groundScene 을 **그대로 떼어다** 돌린다.
   jsdom 에는 캔버스가 없어서 이 장면은 테스트로 확인이 안 된다.
   그래서 여기서 프레임을 뽑아 PNG 로 보고 판단한다.                  */
const fs=require('fs');
const {Ctx,savePNG}=require('./canvas2d.js');
const src=fs.readFileSync(__dirname+'/../index.html','utf8');
function grab(re,label){ const m=src.match(re);
  if(!m){ console.error('못 찾음: '+label); process.exit(1); } return m[0]; }

const parts=[
  grab(/const PARK_DIM_DEFAULT\s*=[^\n]*\n/, 'PARK_DIM_DEFAULT'),
  grab(/const PARKS\s*=\s*\[[\s\S]*?\n\];/, 'PARKS'),
  grab(/function fenceAt\(park, ang\)\{[\s\S]*?\n\}/, 'fenceAt'),
  grab(/const PSS=[\s\S]*?const PS_UNI=\{[\s\S]*?\};/, 'PS 상수'),
  grab(/const PS_FOUL=[^\n]*\n/, 'PS_FOUL'),
  grab(/function psRad\([\s\S]*?\n\}/, 'psRad'),
  grab(/const PS_MPP=[^\n]*\n/, 'PS_MPP'),
  grab(/function psSpot\([\s\S]*?\n\}/, 'psSpot'),
  grab(/function psFenceR\([^\n]*\n/, 'psFenceR'),
  grab(/function psFencePath\([\s\S]*?\n\}/, 'psFencePath'),
  grab(/function psNearest\(p, park\)\{[\s\S]*?\n\}/, 'psNearest'),
  grab(/function psField\(g, parkIn\)\{[\s\S]*?\n\}/, 'psField'),
  grab(/function groundScene\(host, o\)\{[\s\S]*?\n\}\nfunction psField/, 'groundScene')
    .replace(/\nfunction psField$/,''),
];
/* 캔버스·rAF·시간을 가짜로 물려준다 — 프레임을 내가 직접 넘긴다 */
const head=`
let __now=0, __rafq=[];
const Date={now:()=>__now};
const requestAnimationFrame=(f)=>{__rafq.push(f);};
let __cv=null;
/* Ctx 는 그리기 컨텍스트 그 자체다. 캔버스 흉내를 씌워 준다. */
const document={createElement:()=>({
  set className(v){}, get className(){return ''},
  set width(v){}, set height(v){},
  getContext:()=>__cv })};
function __setCv(c){__cv=c;}
`;
const A=new Function('Ctx', head+parts.join('\n')+`
  ;return {groundScene, psField, PARKS, PSW, PSH, PS_B,
           tick:(ms)=>{__now+=ms; const q=__rafq; __rafq=[]; q.forEach(f=>f(0));},
           setNow:(v)=>{__now=v;}, setCv:__setCv};`)(Ctx);

const park=A.PARKS.find(p=>p.id==='benamul');

/* 한 장면의 프레임 몇 개를 뽑아 가로로 이어 붙인다 (ffmpeg 로 타일) */
const {execSync}=require('child_process');
function strip(name, res, ang, myPos){
  const FR=[0.10,0.32,0.55,0.75,0.96];
  const tmp=[];
  FR.forEach((f,i)=>{
    const cv=new Ctx(A.PSW*2, A.PSH*2);
    A.setCv(cv); A.setNow(0);
    const sc=A.groundScene({appendChild:()=>{}},
      {mode:'bat', ang, dur:2800, park, myPos});
    A.tick(0);                       // 1막 첫 프레임
    sc.replay(res, 2400, ()=>{});
    A.tick(0);                       // 2막 시작
    A.tick(Math.round(2400*f));      // 원하는 지점까지
    const o=cv.toRGBA();
    const p=__dirname+'/_rf'+i+'.png';
    savePNG(p, o.w, o.h, o.data); tmp.push(p);
  });
  const outp=__dirname+'/_run_'+name+'.png';
  execSync('ffmpeg -v error -y '+tmp.map(p=>'-i "'+p+'"').join(' ')+
    ' -filter_complex hstack=inputs='+tmp.length+' "'+outp+'"');
  tmp.forEach(p=>fs.unlinkSync(p));
  console.log('  '+name+' \u2192 art/_run_'+name+'.png');
}

console.log('\uc8fc\ub8e8 2\ub9c9 \ud504\ub808\uc784 (10% \u00b7 32% \u00b7 55% \u00b7 75% \u00b7 96%)');
strip('1b',  {type:'1B', gb:false, ang:-14, dist:52}, -14, null);
strip('2b',  {type:'2B', stretched:true, ang:28, dist:74}, 28, null);
strip('out', {type:'OUT', gb:false, runOut:'1B', ang:-30, dist:61}, -30, null);
strip('fly', {type:'OUT', gb:false, ang:12, dist:70}, 12, null);       // 뜬공 — 귀루
strip('gb',  {type:'OUT', gb:true,  ang:-40, dist:24}, -40, null);     // 땅볼 — 1루 송구
strip('hr',  {type:'HR', ang:6, dist:118}, 6, null);
