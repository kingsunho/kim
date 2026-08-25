/* [2.49.1] 화면을 내려놓으면 중계도 멈추는지.

   [제보] "갤럭시 쓰는 애가 배터리가 빨리 닳는다" 의 남은 조각.
   v2.43.0 이 브금은 재웠는데 직접 지휘 중계 타이머는 그대로 돌고 있었다 —
   0.52초마다 step() 하고 DOM 을 다시 그린다.
   (자동 진행은 while 로 즉시 끝내니 이 타이머를 안 탄다.)

   '돌아오면 다시 굴러가나' 는 검사하지 않는다. 장면 애니메이션이
   한 타석에 몇 초씩 걸려서 짧은 창으로는 진행이 안 잡힌다 —
   HEAD 에서도 똑같이 안 잡혔다. 대신 **타이머가 살아 있는지**를 본다.

   진짜 판별기는 **소스 검사** 쪽이다. 아래 동작 검사('내리면 멈춘다')는
   HEAD 에서도 우연히 통과할 때가 있다 — 장면 애니메이션이 한 타석에
   몇 초씩 걸려서, 안 고쳐도 그 3.5초 동안 마침 안 움직일 수 있다.
   그래도 남겨둔다. 가드가 엉뚱하게 걸려서 영영 멈춰버리는 건 잡아준다.

   주의: T() 는 문자열을 '통과 + 설명' 으로 친다. 실패는 반드시 false 다.  */
let chromium=null;
try{ chromium=require('playwright').chromium; }
catch(e){
  try{ chromium=require(process.env.NODE_PATH? process.env.NODE_PATH+'/playwright':'playwright').chromium; }catch(e2){}
}
const path=require('path'), fs=require('fs');
const FILE=path.resolve(process.argv[2]||'index.html');
const errs=[];
const T=(n,r)=>{const ok=r===true||(typeof r==='string'&&r.length>0);
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!ok)errs.push(n);};

/* 소스만 봐도 잡히는 것 — 크로미움 없이도 돈다 */
const src=fs.readFileSync(FILE,'utf8');
console.log('[소스]');
const rl=(src.match(/playTimer=setInterval\(\(\)=>\{[\s\S]{0,600}/)||[''])[0];
T('중계 타이머에 화면 내림 가드가 있다', /document\.hidden/.test(rl) ? '있음' : false);
T('가드가 타이머를 죽이지는 않는다 (돌아오면 이어져야 한다)',
  /document\.hidden\)\s*return;/.test(rl) && !/document\.hidden\)\s*\{?\s*clearInterval/.test(rl)
    ? 'return 만 한다' : false);

if(!chromium){ console.log('\n⚠️  playwright 가 없다 — 실제 동작 검사는 건너뛴다');
  console.log(errs.length? '\n❌ '+errs.length+'개 실패':'\n✅ 이상 없음');
  process.exit(errs.length?1:0); }
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const hide=on=>`(()=>{
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>${on}});
  Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'${on?'hidden':'visible'}'});
  document.dispatchEvent(new Event('visibilitychange'));})()`;

(async()=>{
  const b=await chromium.launch(fs.existsSync(EXE)?{executablePath:EXE}:{});
  const p=await b.newPage({viewport:{width:430,height:900}});
  const jsErr=[]; p.on('pageerror',e=>jsErr.push(String(e)));
  await p.goto('file://'+FILE);
  await p.waitForTimeout(900);
  await p.evaluate(()=>{ const i=document.getElementById('lock-in');
    if(i){ i.value=GATE_CODE; document.getElementById('lock-go').click(); } });
  await p.waitForTimeout(1100);
  await p.evaluate(()=>{ document.querySelectorAll('.pickcard')[0].click(); });
  await p.waitForTimeout(200);
  await p.evaluate(()=>{ [...document.querySelectorAll('#view .btn')]
    .find(x=>x.textContent==='이 선수로 시작').click(); });
  await p.waitForTimeout(600);
  await p.evaluate(()=>{ ST.tutDone=true; runWeek();
    ST.weekDone=true; ST.announced=true; ST.lineupDirty=false; ST.events=[]; ST.absent={};
    ST.lineup=recommendLineup(); applyDHRule(); sanitizeRotation(); go('game'); });
  await p.waitForTimeout(400);
  await p.evaluate(()=>{ ST.playMode='off';
    const x=[...document.querySelectorAll('#view .btn')].find(z=>/직접 지휘/.test(z.textContent));
    if(x) x.click();
    const ov=document.querySelector('.rk-ov');
    if(ov){ const g=[...ov.querySelectorAll('button')].find(z=>z.textContent==='경기 시작'); if(g)g.click(); else ov.remove(); }
  });
  await p.waitForTimeout(1600);

  console.log('\n[실제 동작]');
  const snap=()=>p.evaluate(()=>LIVE?{seq:(LIVE.lastPlay&&LIVE.lastPlay.seq)||0,
    log:(LIVE.log||[]).length, over:LIVE.over, timer:typeof playTimer}:null);
  const a=await snap();
  T('직접 지휘 중계가 돌고 있다', a && !a.over ? `${a.log}줄` : false);
  await p.evaluate(hide(true));
  await p.waitForTimeout(3500);
  const c=await snap();
  T('화면을 내리면 중계가 멈춘다',
    a&&c&&c.seq===a.seq&&c.log===a.log ? `${c.log}줄에서 정지` : false);
  await p.evaluate(hide(false));
  await p.waitForTimeout(300);
  const e2=await snap();
  T('타이머는 살아 있다 (돌아오면 이어진다)', e2&&e2.timer==='number' ? '핸들 유지' : false);
  T('도는 동안 에러 없음', jsErr.length===0 ? '깨끗' : false);

  await b.close();
  console.log(errs.length? '\n❌ '+errs.length+'개 실패' : '\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
