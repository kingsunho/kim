/* [2.32.0] 유인구 네 방향이 화면을 얼려버리지 않는지

   [제보] "플레이할 때 변화구 누르고 유인구 누르면 안 움직임. 다른 거 클릭이 안 되네"
   유인구는 존 밖 좌표(-1·3)로 던진다. 그런데 코스 이름을 NAMES[r][c] 로
   찾고 있어서 r 이 -1 이나 3 이면 거기서 예외가 터졌다. busy 는 이미 true 라
   그 뒤로 아무 버튼도 안 먹었다. 높게·낮게가 그랬다.                  */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|not implemented/i.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300); ev("ST.tutDone=true; ST.absent={}; ST.injury={};");
  const open=()=>ev(`(function(){
    runWeek(); ST.weekDone=true; ST.announced=true; ST.lineupDirty=false; ST.absent={}; ST.events=[];
    LIVE=makeLive(); LIVE.manual=true; LIVE.round=ST.round;
    if(!document.getElementById('decision')){var b=document.createElement('div');b.id='decision';document.body.appendChild(b);}
    var g=0; while(!LIVE.def().isUser && g++<300){ if(LIVE.pending)LIVE.applyDecision('change'); LIVE.step(); }
    showDecision({kind:'pitch',label:'투구'}); return LIVE.def().isUser; })()`);
  for(const name of ['높게','낮게','바깥쪽','몸쪽']){
    open(); await wait(80);
    const btns=[...d.querySelectorAll('#decision .chb')];
    const b=btns.find(x=>x.textContent===name);
    if(!b){ console.log('❌ '+name+' 버튼 없음'); continue; }
    const before=errs.length;
    b.click(); await wait(60);
    // 던진 뒤에도 다른 버튼이 살아 있나 — 구종 버튼을 눌러본다
    const t=[...d.querySelectorAll('#decision .trow button, #decision .tsel button')];
    const boom=errs.length>before;
    console.log((boom?'❌ ':'✅ ')+name+' — '+(boom?('예외: '+errs[before]):'예외 없음'));
  }
  console.log(errs.length?('\n❌ '+errs.length+'건'):'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})();
