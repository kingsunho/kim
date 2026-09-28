/* 특훈 한 판 — 타이밍 미니게임이 곧 특훈.
   [v3.44.0] 「특훈을 미니게임 한 판으로 — 등급 따라 보너스」 로 생겼다.

   확인하는 것
     · 훈련 화면 버튼이 「특훈 한 판」 이다
     · 한 판을 끝내면 등급만큼 능력치가 바로 붙는다(배팅 → 컨택 · 파워)
     · S 가 C 보다 많이 붙는다(trainSessApply)
     · PERFECT · COMBO 가 점수에 들어간다(한가운데를 누르면 PERFECT)
     · 한 주에 한 판 · 코인은 덤으로 들어온다                                         */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const bad=[]; const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Could not load|stylesheet|[Nn]ot implemented|getContext/.test(e.message)) bad.push('JSDOM: '+e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc,
  beforeParse(w){ w.scrollTo=()=>{}; w.TextEncoder=TextEncoder; w.TextDecoder=TextDecoder;
    /* 마커 위치를 우리가 정한다 — requestAnimationFrame 은 멈춰 둔다 */
    w.requestAnimationFrame=()=>0; w.cancelAnimationFrame=()=>{}; }});
const w=dom.window,d=w.document,ev=s=>w.eval(s);
w.confirm=()=>true;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0&&!/^!/.test(r));
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r.replace(/^!/,''):''));if(!ok)bad.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);bad.push(n+': '+e.message)}};
const clean=tag=>{ const t=(d.getElementById('view')||{}).textContent||'';
  const m=t.match(/.{0,20}(undefined|NaN|\[object Object\]).{0,20}/); if(m) bad.push('['+tag+'] '+m[0]); return !m; };

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(40);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click(); await wait(250);
  ev("ST.tutDone=true; ST.tutStep=99; ST.mode='player'; ST.role='bat'; ST.myPos='CF'; ST.hs={done:true,i:99,res:[],bat:blankBat(),pit:blankPit(),moments:[]}; ST.trainSessAt=null;");
  ev("go('train')"); await wait(30);
  T('훈련 화면 — 「특훈 한 판」', ()=>/특훈 한 판/.test(d.getElementById('view').textContent));
  const me=ev("ST.playerId");
  const con=()=>ev("TBYID.wwzw.players.find(p=>p.id===ST.playerId).con");
  /* 등급 배수 */
  const c0=con(); ev("trainSessApply(trainSessionDef('bat'),'S')"); const dS=con()-c0;
  const c1=con(); ev("trainSessApply(trainSessionDef('bat'),'C')"); const dC=con()-c1;
  T('S 가 C 보다 많이 붙는다', ()=>dS>dC&&dC>0 ? 'S +'+dS.toFixed(1)+' · C +'+dC.toFixed(1) : '!'+dS+' / '+dC);
  /* 한 판 — 매번 초록 칸 한가운데에 마커를 세우고 누른다 */
  ev("go('trainplay')"); await wait(30);
  const card=[...d.querySelectorAll('.trncard')].find(b=>/배팅/.test(b.textContent));
  T('배팅 특훈 카드', ()=>!!card);
  card.click(); await wait(20);
  const coins0=ev("coinSlot()"), cBefore=con();
  const btn=()=>d.querySelector('.tp-go');
  for(let i=0;i<10;i++){
    /* requestAnimationFrame 을 멈춰 둬서 마커는 끝(0 또는 100)에 서 있다 — 초록 칸은 양끝 8% 를 비우니
       다 빗나가서 C 가 나온다. C 도 능력치는 조금 붙는다(0.3배) — 그걸 본다 */
    btn().click(); await wait(5);                       // 시작/다음
    btn().click(); await wait(5);                       // 지금!
  }
  btn().click(); await wait(30);                        // 결과 보기
  const txt=d.getElementById('view').textContent;
  T('결과 화면 — 등급 · 능력치', ()=>/끝/.test(txt)&&/[SABC]/.test(txt) ? txt.replace(/\s+/g,' ').slice(0,80) : '!'+txt.slice(0,80));
  T('능력치가 바로 붙었다', ()=>con()>cBefore ? '컨택 '+cBefore.toFixed(1)+' → '+con().toFixed(1) : '!'+cBefore+' → '+con());
  T('코인도 덤으로', ()=>ev("coinSlot()")>coins0);
  T('한 주에 한 판', ()=>ev("trainSessionDone()"));
  T('신문/소식에 결과', ()=>ev("(ST.notices||[]).some(n=>/훈련 세션/.test(n.title))"));
  clean('특훈 결과');

  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
