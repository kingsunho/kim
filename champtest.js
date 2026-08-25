/* [2.42.0] 우승 세리머니.
   [요청] "우승하면 뭔가 축하하는 그런 모션 나오면 좋을듯"

   결승을 이긴 그 순간에 한 번 뜨고, 시즌 종료 화면에서 다시 볼 수 있어야 한다.
   준우승·탈락에는 뜨면 안 된다 — 진 사람한테 색종이를 뿌릴 수는 없다.       */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const errs=[], jsErr=[];
const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Not implemented/.test(e.message)) jsErr.push(e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{}; dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0&&!/^!/.test(r));
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r.replace(/^!/,''):''));if(!ok)errs.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ov=()=>d.querySelector('.ch-ov');

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300); ev("ST.tutDone=true");

  console.log('[세리머니]');
  ev("ST.playoff={place:'우승',prize:50,done:true}; ST.year=2026; ST.seasonNo=1;");
  ev("showChampion({ids:TBYID['wwzw'].players.slice(0,9).map(x=>x.id),score:'7:4',prize:50,year:2026,season:1})");
  T('화면이 뜬다', ()=>!!ov());
  T('우승이라고 쓴다', ()=>/우\s*승/.test(ov().textContent) && /단원리그 C/.test(ov().textContent));
  T('결승 점수와 상금이 나온다', ()=>/7:4/.test(ov().textContent)&&/50만원/.test(ov().textContent));
  T('색종이가 뿌려진다', ()=>{
    const cf=ov().querySelectorAll('.ch-cf');
    return cf.length>=20 ? cf.length+'장' : '!'+cf.length+'장뿐';
  });
  T('색종이가 제각각 떨어진다', ()=>{
    const cf=[...ov().querySelectorAll('.ch-cf')];
    const lefts=new Set(cf.map(x=>x.style.left));
    const dly=new Set(cf.map(x=>x.style.animationDelay));
    return (lefts.size>15&&dly.size>15) ? `자리 ${lefts.size}가지 · 시차 ${dly.size}가지`
      : '!커튼처럼 한꺼번에 떨어진다';
  });
  T('헹가래에 사람이 선다', ()=>{
    const g=ov().querySelectorAll('.ch-guy');
    return g.length>=9 ? g.length+'명' : '!'+g.length+'명';
  });
  T('내가 고른 선수가 더 높이 뜬다', ()=>{
    const me=ev("ST.playerId||MYID");
    const mine=ov().querySelectorAll('.ch-guy.me');
    return mine.length===1 && new RegExp(ev(`nameOf('${me}')`)).test(mine[0].textContent)
      ? ev(`nameOf('${me}')`) : '!내 선수 표시가 없거나 여러 개다';
  });
  T('사람마다 뛰는 박자가 어긋난다', ()=>{
    const dl=new Set([...ov().querySelectorAll('.ch-guy')].map(x=>x.style.animationDelay));
    return dl.size>=5 ? dl.size+'가지' : '!다 같이 뛴다';
  });
  T('한마디가 붙는다', ()=>/이영재/.test(ov().querySelector('.ch-say').textContent));
  /* 사진은 base64 라 안에 undefined 같은 글자가 우연히 들어간다. 빼고 본다 */
  T('undefined·NaN 이 없다', ()=>
    !/undefined|NaN/.test(ov().innerHTML.replace(/src="data:[^"]*"/g,'src=""')));
  T('닫으면 사라진다', ()=>{ ov().querySelector('.ch-close').click(); return !ov(); });

  console.log('\n[언제 뜨나]');
  /* 시즌 종료 화면에서 다시 볼 수 있어야 한다 */
  ev("ST.seasonOver=true; ST.awards=ST.awards||[]; if(!Array.isArray(ST.hall))ST.hall=[];"
    +"ST.playoff={place:'우승',prize:50,done:true,stage:'final',log:['결승 우완좌완 7:4'],seeds:[]};");
  w.go('home'); await wait(200);
  const again=[...d.querySelectorAll('#view .btn')].find(x=>/우승 세리머니 다시 보기/.test(x.textContent));
  T('시즌 종료 화면에서 다시 볼 수 있다', ()=>!!again);
  if(again){ again.click(); T('다시 보기가 실제로 뜬다', ()=>!!ov()); if(ov())ov().remove(); }
  /* 준우승에는 안 뜬다 */
  ev("ST.playoff={place:'준우승',prize:30,done:true,stage:'final',log:['결승 우완좌완 4:7'],seeds:[]};");
  w.go('home'); await wait(200);
  T('준우승에는 다시 보기가 없다', ()=>
    ![...d.querySelectorAll('#view .btn')].some(x=>/세리머니/.test(x.textContent))
      ? '없다' : '!준우승인데 세리머니가 있다');
  T('commitGame 이 우승일 때만 부른다', ()=>{
    const src=ev("String(commitGame)");
    return /showChampion\(/.test(src) && /place==='우승'/.test(src)
      ? '조건이 붙어 있다' : '!조건 없이 부른다';
  });
  T('그리는 동안 에러 없음', ()=>jsErr.length===0?'깨끗':'!'+jsErr[0]);

  console.log(errs.length? '\n❌ '+errs.length+'개 실패' : '\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
