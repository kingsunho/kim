/* sizetest — PC 가로에서 화면이 안 꽉 차는가 · 크기를 내가 조절하는가 (v3.22.0)
   [제보] "선수단이랑 훈련화면도 가로배치 같이해주고
           지금 pc버전 화면이 너무 꽉찬대 크기조절 할 수 있게? 원하는만큼"

   가로에서 body 를 max-width:none 으로 풀어놨더니 1920 모니터에서 카드 하나가
   **1896px** 이 됐다. 왼쪽 끝 제목 · 오른쪽 끝 값이라 눈이 모니터를 가로지른다.
   그리고 선수단은 세로로 4841px 짜리 두루마리였다.

   여기서 재는 것 —
     ① PC 가로에서 본문에 천장이 있다 (모니터를 안 꽉 채운다)
     ② 카드 화면은 두 칸으로 흘러서 스크롤이 확 준다
     ③ 설정에서 폭·글자 크기를 밀면 **바로** 먹고 세이브에 남는다
     ④ 홈(로비)과 경기 화면은 **안 건드린다** — 거기는 100dvh 로 한 화면에
        딱 맞게 짜여 있어서 키우면 버튼이 화면 밖으로 나간다
     ⑤ 폰 가로(844)는 천장보다 좁아서 아무것도 안 바뀐다               */
const {chromium}=require('playwright');
const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let fail=0; const errs=[];
const T=(ok,msg,note)=>{ console.log('  '+(ok?'✅':'❌')+' '+msg+(note?' :: '+note:''));
  if(!ok){ fail++; errs.push(msg); } };

const boot=async(p)=>{
  await p.goto('file://'+__dirname+'/index.html');
  await p.waitForTimeout(900);
  await p.evaluate(()=>{ const i=document.getElementById('lock-in');
    if(i){ i.value=GATE_CODE; document.getElementById('lock-go').click(); } });
  await p.waitForTimeout(900);
  await p.evaluate(()=>document.querySelectorAll('.pickcard')[0].click());
  await p.waitForTimeout(250);
  await p.evaluate(()=>[...document.querySelectorAll('#view .btn')]
    .find(x=>x.textContent==='이 선수로 시작').click());
  await p.waitForTimeout(800);
  await p.evaluate(()=>{ ST.tutDone=true; ST.tutStep=99; ST.mode='player'; ST.role='bat';
    runWeek(); saveGame(true); go('home'); });
  await p.waitForTimeout(500);
};
const geo=(p,tab)=>p.evaluate(t=>{
  go(t);
  return new Promise(r=>setTimeout(()=>{
    const v=document.getElementById('view');
    const kid=[...v.children].find(e=>/card|tip-box/.test(e.className));
    r({길이:Math.round(v.scrollHeight), body:Math.round(document.body.getBoundingClientRect().width),
       카드폭:kid?Math.round(kid.getBoundingClientRect().width):0,
       wideOk:v.classList.contains('wide-ok'),
       zoom:getComputedStyle(v).zoom, 칸:getComputedStyle(v).columnWidth});
  },600));
}, tab);

(async()=>{
  const b=await chromium.launch({executablePath:CHROME});

  console.log('\n[PC 가로 1920×1080]');
  const p=await b.newPage({viewport:{width:1920,height:1080}});
  const boom=[]; p.on('pageerror',e=>boom.push(String(e).split('\n')[0]));
  await boot(p);
  const sq=await geo(p,'squad'), tr=await geo(p,'train');
  T(sq.body<1920, '본문이 모니터를 꽉 채우지 않는다', '본문 '+sq.body+'px / 모니터 1920');
  T(sq.카드폭>0 && sq.카드폭<720, '카드가 읽을 만한 폭이다 (예전엔 1896px)', sq.카드폭+'px');
  T(sq.wideOk && tr.wideOk, '선수단·훈련이 두 칸 배치를 쓴다');
  T(sq.길이<3600, '선수단 스크롤이 줄었다 (고치기 전 4841px)', sq.길이+'px');
  T(tr.길이<1100, '훈련 스크롤이 줄었다 (고치기 전 1421px)', tr.길이+'px');

  console.log('\n[크기 조절 — 설정에서 민다]');
  await p.evaluate(()=>go('more')); await p.waitForTimeout(700);
  const has=await p.evaluate(()=>!!document.querySelector('#uiw')&&!!document.querySelector('#uiz'));
  T(has, '설정에 폭·글자 크기 슬라이더가 있다');
  const set=(id,val)=>p.evaluate(([i,v])=>{ const e=document.querySelector('#'+i);
    e.value=(v==='max'?e.max:v);
    e.dispatchEvent(new Event('input',{bubbles:true}));
    e.dispatchEvent(new Event('change',{bubbles:true})); }, [id,val]);
  const now=()=>p.evaluate(()=>({
    w:getComputedStyle(document.documentElement).getPropertyValue('--ui-w').trim(),
    z:getComputedStyle(document.documentElement).getPropertyValue('--ui-zoom').trim(),
    body:Math.round(document.body.getBoundingClientRect().width),
    stW:ST.uiW, stZ:ST.uiZoom}));
  await set('uiw',900); await p.waitForTimeout(250);
  const narrow=await now();
  T(narrow.body<=910 && narrow.stW===900, '폭을 좁히면 바로 좁아진다', '본문 '+narrow.body+'px');
  await set('uiw','max'); await p.waitForTimeout(250);
  const full=await now();
  T(full.w==='none' && full.body>1900 && full.stW===0,
    '제일 오른쪽 끝은 꽉 채움이다', '본문 '+full.body+'px');
  await set('uiw',1180); await set('uiz',130); await p.waitForTimeout(250);
  const big=await now();
  T(big.z==='1.3' && big.stZ===130, '글자 크기가 먹는다', '배율 '+big.z);
  /* 세이브 왕복 — 0(꽉 채움)이 기본값으로 되돌아가면 안 된다 */
  const rt=await p.evaluate(()=>{
    ST.uiW=0; ST.uiZoom=115;
    const raw=JSON.stringify(ST); ST=JSON.parse(raw); normalizeState();
    return {w:ST.uiW, z:ST.uiZoom,
      v:getComputedStyle(document.documentElement).getPropertyValue('--ui-w').trim()};
  });
  T(rt.w===0 && rt.z===115 && rt.v==='none',
    '세이브에 남는다 — 꽉 채움(0)도 안 풀린다', JSON.stringify(rt));

  console.log('\n[홈·경기 화면은 안 건드린다]');
  await p.evaluate(()=>{ ST.uiZoom=140; applyUiSize(); go('home'); });
  await p.waitForTimeout(700);
  const home=await p.evaluate(()=>{
    const v=document.getElementById('view'), L=document.querySelector('.lob');
    return {wideOk:v.classList.contains('wide-ok'), zoom:getComputedStyle(v).zoom,
      바닥:L?Math.round(L.getBoundingClientRect().bottom):-1, 화면:innerHeight};
  });
  T(!home.wideOk, '홈은 두 칸/배율을 안 쓴다');
  T(home.zoom==='1', '글자 크기를 키워도 홈은 그대로다', 'zoom '+home.zoom);
  T(home.바닥>0 && home.바닥<=home.화면+1,
    '로비가 배율 140% 에서도 한 화면 안에 있다', home.바닥+' / '+home.화면);
  T(boom.length===0, '브라우저 예외 없음', boom.slice(0,2).join(' / ')||'없음');
  await p.close();

  console.log('\n[폰 가로 844×390 — 아무것도 안 바뀐다]');
  const q=await b.newPage({viewport:{width:844,height:390}});
  const boom2=[]; q.on('pageerror',e=>boom2.push(String(e).split('\n')[0]));
  await boot(q);
  const ph=await geo(q,'train');
  T(ph.body>=830, '폰 가로는 천장에 안 걸린다 (본문이 그대로다)', ph.body+'px');
  T(boom2.length===0, '브라우저 예외 없음', boom2.slice(0,2).join(' / ')||'없음');
  await q.close();

  await b.close();
  console.log(fail?('\n❌ '+fail+'건: '+errs.slice(0,5).join(' / ')):'\n✅ 전부 통과');
  process.exit(fail?1:0);
})();
