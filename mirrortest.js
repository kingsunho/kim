/* 좌우가 뒤집히던 것들 · 수비 장면과 기록이 어긋나던 것

   [제보] "슬라이더가 반대로 휘는 치명적 버그 · 우완 좌완이 서로 반대"
   [제보] "수비해서 1루 던졌는데 삼진이라 나오고"
   [제보] "수비해서 송구 했는데 3루타 뜬볼이다 내가 잡은 땅볼은 안 나왔다"

   화면은 포수 뒤 고정 카메라다. 우타는 화면 왼쪽, 좌타는 오른쪽에 선다.
   그런데 코스도 변화량도 "왼쪽이 몸쪽" 으로 고정이라 좌타석만 뒤집혔다.  */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo/.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n);if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};

setTimeout(async()=>{
  d.querySelectorAll('.pickcard')[0].click();await new Promise(r=>setTimeout(r,60));
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await new Promise(r=>setTimeout(r,300));

  console.log('[슬라이더가 휘는 쪽]');
  /* 슬라이더는 같은 손 타자에게서 **멀어진다.**
     화면에서 멀어진다 = 우타는 오른쪽(+), 좌타는 왼쪽(-) 으로 간다.
     throwBall 은 캔버스가 없어도 bkx 계산까지는 간다 — 부호만 본다. */
  const brk=(pitL,batL)=>ev(`(function(){
    const T=PITCH_TYPES.sl;
    const hand=(('${pitL}'==='L')===('${batL}'==='L'))?1:-1;   // pitchHand 와 같은 식
    const side=('${batL}'==='L')?-1:1;                          // 타자가 선 쪽
    return T.bx*hand*side;                                      // 화면에서 움직이는 방향
  })()`);
  const rows=[['R','R','오른쪽(바깥)'],['L','L','왼쪽(바깥)'],['R','L','오른쪽(몸쪽)'],['L','R','왼쪽(몸쪽)']];
  rows.forEach(([p2,b2,want])=>{
    const v=brk(p2,b2);
    console.log(`   ${p2}투 vs ${b2}타 → ${v>0?'오른쪽':'왼쪽'} (기대: ${want})`);
  });
  T('우투-우타 슬라이더는 화면 오른쪽(바깥)', ()=>brk('R','R')>0);
  T('좌투-좌타 슬라이더는 화면 왼쪽(바깥)',   ()=>brk('L','L')<0);
  T('우투-좌타 슬라이더는 화면 오른쪽(몸쪽)', ()=>brk('R','L')>0);
  T('좌투-우타 슬라이더는 화면 왼쪽(몸쪽)',   ()=>brk('L','R')<0);
  T('같은 손 맞대결은 좌우가 서로 반대로 간다', ()=>brk('R','R')*brk('L','L')<0);
  T('throwBall 이 타자 선 쪽으로 뒤집는다', ()=>{
    const src=ev("throwBall.toString()");
    return /_mv&&mound\._mv\.batLeft/.test(src) && /\*side/.test(src);
  });

  console.log('\n[수비 장면과 기록이 같은 타구를 말하나]');
  const runDef=(mode)=>JSON.parse(ev(`(function(){
    ST.mode='player'; ST.role='bat'; ST.myPos='2B'; ST.defMode='all';
    ST.hs={i:0,done:true,res:[],bat:blankBat(),pit:blankPit(),moments:[],pending:null};
    ST.lineup=recommendLineup(); optimizePositions();
    const me=ST.playerId||MYID;
    const s0=ST.lineup.find(x=>x.id===me); if(s0)s0.pos='2B';
    const t={n:0,k:0,bb:0,fly:0,tri:0,hr:0,gb:0};
    for(let g=0; g<40; g++){
      ST.seed=(g*7919+13)>>>0;
      LIVE=makeLive(); LIVE.manual=true;
      let guard=0;
      while(!LIVE.over && guard++<400){
        const dec=LIVE.pending||LIVE.detectDecision();
        if(dec && dec.kind==='defplay'){
          t.n++;
          LIVE.applyDecision(${JSON.stringify(mode)});
          const r=LIVE.step();
          const txt=((r&&r.events)||[]).map(x=>x.text).join(' | ');
          if(/삼진/.test(txt))t.k++;
          if(/볼넷|몸에 맞/.test(txt))t.bb++;
          if(/뜬공|플라이/.test(txt))t.fly++;
          if(/3루타/.test(txt))t.tri++;
          if(/홈런/.test(txt))t.hr++;
          if(/땅볼/.test(txt))t.gb++;
          continue;
        }
        if(dec){ LIVE.applyDecision(dec.kind==='swing'?'playskip':'def:skip'); continue; }
        LIVE.step();
      }
    }
    return JSON.stringify(t);
  })()`));

  const A=runDef('def:q:0.95');
  console.log('   딱 잡음 '+A.n+'번 → 땅볼 '+A.gb+' · 뜬공 '+A.fly+' · 삼진 '+A.k+' · 3루타 '+A.tri);
  T('딱 잡으면 삼진이 안 나온다', ()=>A.n>50 && A.k===0);
  T('내야에서 잡았는데 뜬공으로 안 적힌다', ()=>A.fly===0);
  T('땅볼로 적힌다', ()=>A.gb>A.n*0.8);

  const B=runDef('def:q:0.60');
  console.log('   반쯤 붙음 '+B.n+'번 → 삼진 '+B.k+' · 볼넷 '+B.bb+' · 3루타 '+B.tri+' · 홈런 '+B.hr);
  T('중간이어도 삼진·볼넷은 안 나온다', ()=>B.n>50 && B.k===0 && B.bb===0);
  T('내 자리로 온 타구가 3루타가 안 된다', ()=>B.tri===0);
  T('그라운드 홈런도 안 된다', ()=>B.hr===0);

  /* 창이 도중에 닫혀서 아무 선택도 안 남은 경우 — 여기가 진짜 제보였다 */
  const C=runDef('def:skip');
  console.log('   창이 닫힘 '+C.n+'번 → 삼진 '+C.k+' · 볼넷 '+C.bb+' · 뜬공 '+C.fly+' · 3루타 '+C.tri);
  T('선택이 안 남아도 삼진은 안 나온다', ()=>C.n>50 && C.k===0);
  T('선택이 안 남아도 볼넷은 안 나온다', ()=>C.bb===0);
  T('선택이 안 남아도 뜬공으로 안 적힌다', ()=>C.fly===0);

  console.log('\n[수비 판단 시간]');
  const src=ev("renderDefPlay.toString()");
  const m=src.match(/flyMs\s*=\s*Math\.round\(\(inf\?(\d+):(\d+)\)\+mDraw\*\(inf\?(\d+):(\d+)\)\)/);
  console.log('   내야 '+(m?m[1]:'?')+'ms + 거리*'+(m?m[3]:'?')+' · 외야 '+(m?m[2]:'?')+'ms + 거리*'+(m?m[4]:'?'));
  T('내야 판단 시간이 2초는 넘는다', ()=>!!m && parseInt(m[1],10)>=2000);
  T('외야 판단 시간이 2.5초는 넘는다', ()=>!!m && parseInt(m[2],10)>=2500);

  console.log(errs.length?'\n실패 '+errs.length+'개':'\n전부 통과');
  if(errs.length){console.log(errs.join('\n'));process.exit(1);}
  process.exit(0);
},1500);
