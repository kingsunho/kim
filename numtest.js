/* [2.39.0] 유니폼 등번호와 어깨 이음매 검사.

   [제보] "양쪽 팔이 몸통과 자연스럽게 연결되지 않고 어깨에서 기괴하게 꺾여 있다"
   [제보] "등번호가 캐릭터의 왼쪽에 렌더링된다 / [한자] [번호] 순서로 읽혀야 한다"

   눈으로 보면 "어깨가 이상하다" 로 끝나서 원인을 못 찾는다. 픽셀로 잡는다.
   ① 앞쪽 소매가 가슴 한자를 덮지 않는가 (몸통보다 먼저 그려지는가)
   ② 등번호가 한자 오른쪽 아래에 있는가
   ③ 좌투(flip=false)와 우투(flip=true) 에서 번호 자리가 같은가
      — 예전엔 뒤집기가 두 번 걸려서 선수마다 좌우로 튀었다

   크로미움이 필요하다. 없으면 조용히 건너뛴다.                        */
let chromium=null;
try{ chromium=require('playwright').chromium; }
catch(e){
  try{ chromium=require(process.env.NODE_PATH? process.env.NODE_PATH+'/playwright':'playwright').chromium; }catch(e2){}
}
if(!chromium){ console.log('⚠️  playwright 가 없다 — 건너뛴다'); process.exit(0); }
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const errs=[];
const T=(n,r)=>{const ok=!!r&&!(typeof r==='string'&&r[0]==='!');
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!ok)errs.push(n);};

(async()=>{
  const b=await chromium.launch(require('fs').existsSync(EXE)?{executablePath:EXE}:{});
  const p=await b.newPage();
  const jsErr=[]; p.on('pageerror',e=>jsErr.push(String(e)));
  await p.goto('file://'+require('path').resolve(process.argv[2]||'index.html'));
  await p.waitForTimeout(1200);
  await p.evaluate(()=>{ mvSheetInit(); });
  await p.waitForFunction(()=>MV_SHEET_OK===true,null,{timeout:20000});

  const r=await p.evaluate(()=>{
    const U={cap:'#2f5fb0',sh:'#eef2f8',pants:'#dfe4ec',st:'rgba(47,95,176,.35)',gl:'#5b3a1e'};
    const H=600, W=760, HH=800, X=380, Y=760;
    /* 몸통 그림 좌표 → 캔버스 좌표. mvGuySprite 가 쓰는 변환 그대로 계산한다 */
    const R=MV_POSES.idle, s=H/40;
    const P=MV_PARTS.torso, J=MV_JOINTS.torso;
    const ax=J[0]*P[2], ay=J[1]*P[3];
    const sc=MV_LEN.torso/Math.hypot((J[2]-J[0])*P[2],(J[3]-J[1])*P[3]);
    /* 몸통 그림은 flip 이 걸려도 화면에서 안 뒤집힌다(가슴 글씨가 거꾸로 되면
       안 되니까). 그래서 그림 좌표 → 화면 좌표는 flip 과 무관하다 */
    const art=(fx,fy)=>[ X + (fx*P[2]-ax)*sc*R.narrow*s,
                         Y + (R.hip[1] + MV_NECK + (fy*P[3]-ay)*sc)*s ];

    const shot=(flip,no)=>{
      const c=document.createElement('canvas'); c.width=W; c.height=HH;
      const g=c.getContext('2d');
      g.fillStyle='#3a6b32'; g.fillRect(0,0,W,HH);
      mvGuy(g,X,Y,H,U,'idle',flip,no);
      return g.getImageData(0,0,W,HH).data;
    };
    /* 네이비 잉크(한자·번호) 세기. 흰 유니폼 위의 진한 파랑만 센다 */
    const ink=(d,x0,y0,x1,y1)=>{
      let n=0, sx=0, sy=0;
      for(let y=Math.round(y0);y<Math.round(y1);y++)
        for(let x=Math.round(x0);x<Math.round(x1);x++){
          const i=(y*W+x)*4, rr=d[i], gg=d[i+1], bb=d[i+2];
          if(bb>rr+14 && rr<110 && bb<150){ n++; sx+=x; sy+=y; }
        }
      return {n, x:n?sx/n:0, y:n?sy/n:0};
    };
    /* 팔 없이 몸통만 — 소매가 한자를 얼마나 가리는지 재는 잣대 */
    const bare=(()=>{
      const c=document.createElement('canvas'); c.width=W; c.height=HH;
      const g=c.getContext('2d'); g.fillStyle='#3a6b32'; g.fillRect(0,0,W,HH);
      const sheet=mvSheetFor(U);
      g.save(); g.translate(X,Y); g.scale(s,s);
      g.translate(R.hip[0],R.hip[1]); g.rotate(-R.lean);
      g.scale(R.narrow,1); g.translate(0,MV_NECK);
      mvBone(g,sheet,'torso',MV_LEN.torso,false);
      g.restore();
      return g.getImageData(0,0,W,HH).data;
    })();
    const noNo=shot(false,null), a=shot(false,7), bb=shot(true,7);
    /* 한자 띠: 그림 세로 0.42~0.60, 가로 0.22~0.80 */
    const HZ=[].concat(art(0.22,0.42), art(0.80,0.60));
    /* 번호 자리: 한자 아래 (세로 0.62~0.95) 전체 폭 */
    const NO=[].concat(art(0.18,0.62), art(0.86,0.95));
    const cen=art(0.50,0.50);
    return {
      hz_bare:  ink(bare,HZ[0],HZ[1],HZ[2],HZ[3]).n,
      hz_full:  ink(a   ,HZ[0],HZ[1],HZ[2],HZ[3]).n,
      no_a: ink(a ,NO[0],NO[1],NO[2],NO[3]),
      no_b: ink(bb,NO[0],NO[1],NO[2],NO[3]),
      no_plain: ink(noNo,NO[0],NO[1],NO[2],NO[3]).n,
      cx: cen[0],
      hzBot: art(0.50,0.60)[1]
    };
  });

  console.log('[등번호 · 어깨]');
  T('가슴 한자가 그려진다', r.hz_bare>800 ? '픽셀 '+r.hz_bare : '!한자가 안 보인다 ('+r.hz_bare+')');
  /* 여기가 어깨 이음매 검사다. 예전엔 앞쪽 소매를 몸통 위에 통째로 얹어서
     한자 '腕' 한 글자가 통째로 잘렸다 — 20% 넘게 가려졌었다 */
  /* 소매 천도 같은 네이비라 가리면 픽셀이 오히려 **늘어난다.** 양쪽으로 재야 한다 */
  T('앞쪽 소매가 한자를 안 덮는다',
    Math.abs(r.hz_full-r.hz_bare)<=r.hz_bare*0.06
      ? '팔까지 '+r.hz_full+' / 몸통만 '+r.hz_bare
      : '!소매가 한자 띠를 침범했다 '+r.hz_full+' vs '+r.hz_bare);
  T('번호 자리가 원래는 비어 있다', r.no_plain<40 ? '픽셀 '+r.no_plain : '!'+r.no_plain);
  T('번호가 찍힌다', r.no_a.n>80 ? '픽셀 '+r.no_a.n : '!번호가 안 보인다 ('+r.no_a.n+')');
  T('번호가 한자 아래에 있다',
    r.no_a.y>r.hzBot ? r.no_a.y.toFixed(0)+' > '+r.hzBot.toFixed(0) : '!번호가 한자 위에 있다');
  T('번호가 몸 오른쪽에 있다 ([한자] [번호] 순서)',
    r.no_a.x>r.cx+8 ? r.no_a.x.toFixed(0)+' > 중앙 '+r.cx.toFixed(0) : '!번호가 왼쪽에 있다');
  /* 여기가 핵심. 뒤집기가 두 번 걸리면 좌투·우투가 서로 반대편에 찍힌다 */
  T('좌투·우투 번호 자리가 같다',
    Math.abs(r.no_a.x-r.no_b.x)<4 && Math.abs(r.no_a.y-r.no_b.y)<4
      ? '차이 '+Math.abs(r.no_a.x-r.no_b.x).toFixed(1)+'px'
      : '!좌우로 튄다 '+r.no_a.x.toFixed(0)+' vs '+r.no_b.x.toFixed(0));
  T('그리는 중 에러 없음', jsErr.length===0 ? '없음' : '!'+jsErr[0]);

  await b.close();
  console.log(errs.length? '\n❌ '+errs.length+'개 실패' : '\n✅ 전부 통과');
  process.exit(errs.length?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
