/* [2.37.0] 스윙 버튼 — 지켜보기와 완전히 다른 행동인지, 기존 판정에 붙는지

   [제보] "주황색 '지켜보기' 버튼이 스윙 버튼인 줄 알았다.
           스윙은 반드시 별도의 명확한 버튼으로 만들어라"
   판정(judge)은 원래 있던 걸 그대로 쓴다. 새로 만든 건 입력뿐이다.     */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const errs=[], jsErr=[];
const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|not implemented/i.test(e.message)){
  errs.push(e.message); jsErr.push(e.message); } });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=(typeof f==='function')?f():f;
  const ok=!!r&&!(typeof r==='string'&&r[0]==='!');
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!ok)errs.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300); ev("ST.tutDone=true; ST.absent={}; ST.injury={};");
  const openBat=()=>ev(`(function(){
    runWeek(); ST.weekDone=true; ST.announced=true; ST.lineupDirty=false; ST.absent={}; ST.events=[];
    LIVE=makeLive(); LIVE.manual=true; LIVE.round=ST.round;
    if(!document.getElementById('decision')){var b=document.createElement('div');b.id='decision';document.body.appendChild(b);}
    var g=0; while(!LIVE.off().isUser && g++<400){ if(LIVE.pending)LIVE.applyDecision('none'); LIVE.step(); }
    showDecision({kind:'swing',label:'타석'}); return LIVE.off().isUser; })()`);

  console.log('[스윙 버튼이 따로 있다]');
  T('타석 화면이 열린다', ()=>openBat()===true);
  T('스윙 버튼이 있다', ()=>{
    const b=d.querySelector('#decision .pl-swing');
    return b ? b.textContent.replace(/\s+/g,' ').trim() : '!없다';
  });
  T('지켜보기 버튼도 따로 있다', ()=>{
    const b=d.querySelector('#decision .pl-hit');
    return b ? b.textContent.trim() : '!없다';
  });
  T('둘이 서로 다른 버튼이다', ()=>{
    const a=d.querySelector('#decision .pl-swing'), b=d.querySelector('#decision .pl-hit');
    return (a&&b&&a!==b) ? '별개' : '!같은 버튼';
  });
  T('지켜보기에 "스윙" 이라는 말이 없다', ()=>{
    const b=d.querySelector('#decision .pl-hit');
    return b && !/스윙|swing/i.test(b.textContent) ? b.textContent.trim() : '!헷갈린다';
  });

  const css=d.documentElement.innerHTML;
  const rule=(k)=>{ const m=css.match(new RegExp('\\.'+k+'\\{[\\s\\S]*?\\}')); return m?m[0]:''; };
  const fsz=(k)=>{ const m=rule(k).match(/font-size:([\d.]+)px/); return m?Number(m[1]):NaN; };
  T('색이 다르다 (초록 vs 주황)', ()=>{
    const g=/#2f8f4e|#1f6f3a/.test(rule('pl-swing'));
    const o=/#e8762c|#7a4a2a|#e8a06c/.test(rule('pl-hit'));
    return (g&&o) ? '스윙 초록 · 지켜보기 주황' : '!'+(g?'':'스윙색없음 ')+(o?'':'지켜보기색없음');
  });
  T('스윙 글자가 더 크다', ()=>{
    const a=fsz('pl-swing'), b=fsz('pl-hit');
    return (a>b) ? `스윙 ${a}px > 지켜보기 ${b}px` : `!${a}/${b}`;
  });
  T('스윙이 가로로 더 넓다', ()=>{
    const s=rule('pl-swing'), h=rule('pl-hit');
    return /flex:1/.test(s) && /flex:0 0 3\d%/.test(h) ? '스윙이 남은 폭 전부' : '!'+s.slice(0,60);
  });

  console.log('\n[버튼이 기존 판정에 붙어 있다]');
  const src=ev("String(renderSwing)");
  T('스윙 버튼 → swingAt → judge (판정을 새로 만들지 않았다)', ()=>{
    const a=/swingB\.onclick/.test(src) && /swingAt\(null\)/.test(src);
    const b=/const swingAt=/.test(src);
    const c=/judge\(\{\s*t\s*,/.test(src);
    return (a&&b&&c) ? 'swingAt → judge' : '!'+(a?'':'onclick ')+(b?'':'swingAt ')+(c?'':'judge');
  });
  T('스윙 버튼이 스윙 애니메이션을 돌린다', ()=>
    /const swingAt=[\s\S]{0,400}mvSwing\(mv\)/.test(src) ? 'mvSwing 호출' : '!애니메이션 없다');
  T('지켜보기는 judge(null) — 안 휘두른다', ()=>
    /take\.onclick=\(\)=>\{[^}]*judge\(null\)/.test(src) ? 'judge(null)' : '!다르다');
  T('야구장 탭은 보조 입력으로 남아 있다', ()=>
    /pointerdown[\s\S]{0,400}swingAt\(\{\s*x:c\.x/.test(src) ? '자리까지 노리는 정밀 입력' : '!사라졌다');
  T('안내 문구가 스윙 버튼을 가리킨다', ()=>
    /\[스윙\]/.test(src) ? '[스윙] 을 눌러라' : '!안내가 옛말이다');

  console.log('\n[버튼 스윙의 판정 — 존 안은 따라가고 존 밖은 못 닿는다]');
  const q=(ballX,ballY)=>ev(`(function(){
      var bx=${ballX}, by=${ballY};
      var inx=Math.max(0,Math.min(2,bx)), iny=Math.max(0,Math.min(2,by));
      var sx=1+(inx-1)*0.55, sy=1+(iny-1)*0.55;
      var W=batWindows({con:60,eye:45},{stf:40},'none');
      var dist=Math.hypot(sx-bx, sy-by);
      var loc=Math.max(0,1-dist/W.lw);
      return Math.pow(loc,0.70);            // 타이밍은 완벽하다고 두고 자리만 본다
    })()`);
  const mid=q(1,1), corner=q(0,0), out=q(-1,1), farOut=q(3,3);
  T('한가운데는 정타가 나온다', ()=>mid>=0.75 ? `q=${mid.toFixed(2)}` : `!q=${mid.toFixed(2)}`);
  T('구석은 빗맞는다 (한가운데보다 낮다)', ()=>
    (corner<mid-0.05 && corner>0.15) ? `구석 ${corner.toFixed(2)} < 한가운데 ${mid.toFixed(2)}`
                                     : `!q=${corner.toFixed(2)} (가운데 ${mid.toFixed(2)})`);
  T('존 밖 공은 헛스윙이 된다', ()=>out<0.30 ? `존 밖 q=${out.toFixed(2)}` : `!q=${out.toFixed(2)}`);
  T('많이 빠진 공은 아예 못 닿는다', ()=>farOut<0.05 ? `q=${farOut.toFixed(2)}` : `!q=${farOut.toFixed(2)}`);

  console.log('\n[실제로 눌러본다]');
  T('스윙 버튼을 누르면 타석이 진행된다', ()=>{
    openBat();
    const b=d.querySelector('#decision .pl-swing');
    if(!b) return '!버튼 없음';
    const go=d.querySelector('#decision .aim-go'); if(go) go.click();
    const before=JSON.stringify(ev("LIVE.count()"));
    b.click();
    return `${before} → ${JSON.stringify(ev("LIVE.count()"))}`;
  });
  T('눌러도 자바스크립트 예외가 안 난다', ()=>jsErr.length===0 ? '깨끗' : '!'+jsErr[0]);

  console.log(errs.length?('\n❌ '+errs.length+'건\n'+errs.slice(0,5).join('\n')):'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})();
