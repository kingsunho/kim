/* [2.12.0] 직접 플레이 — 타이밍 스윙 · 코스 선택 */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo/.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  d.querySelectorAll('.pickcard')[0].click();await wait(50);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(250);
  ev("ST.tutDone=true; ST.weekDone=true; ST.absent={}; ST.injury={};");
  ev("ST.lineup=recommendLineup(); ST.rotation=recommendRotation();");

  console.log('[설정]');
  T('끄기 / 중요한 순간만 / 매 타석 세 가지', ()=>{
    ev("go('more')");
    const b=[...d.querySelectorAll('#view .btn')].map(x=>x.textContent);
    return ['끄기','중요한 순간만','매 타석'].every(n=>b.includes(n)) && '있음';
  });
  T('끄면 조작을 안 물어본다', ()=>ev(`(function(){
    ST.playMode='off';
    LIVE=makeLive(); LIVE.manual=true;
    var n=0,g=0;
    while(!LIVE.over && g++<4000){
      var dd=LIVE.pending||LIVE.detectDecision();
      if(dd){ if(dd.kind==='swing'||dd.kind==='pitch') n++;
        LIVE.applyDecision(dd.kind==='pitcherChange'?'stay':(dd.kind==='defense'?'defnone':'none')); continue; }
      LIVE.step();
    }
    return n===0 ? '한 경기 0회' : false;
  })()`));
  T('매 타석 모드면 자주 물어본다', ()=>ev(`(function(){
    ST.playMode='all';
    LIVE=makeLive(); LIVE.manual=true;
    var sw=0,pi=0,g=0;
    while(!LIVE.over && g++<4000){
      var dd=LIVE.pending||LIVE.detectDecision();
      if(dd){
        if(dd.kind==='swing'){sw++;LIVE.applyDecision('swing:0.9');continue;}
        if(dd.kind==='pitch'){pi++;LIVE.applyDecision('pitch:1');continue;}
        LIVE.applyDecision(dd.kind==='pitcherChange'?'stay':(dd.kind==='defense'?'defnone':'none')); continue;
      }
      LIVE.step();
    }
    return (sw>10&&pi>10) ? '스윙 '+sw+'회 · 코스 '+pi+'회' : false;
  })()`));
  T('중요한 순간만 모드는 훨씬 적게 뜬다', ()=>ev(`(function(){
    function count(mode){
      ST.playMode=mode; var tot=0;
      for(var t=0;t<6;t++){
        LIVE=makeLive(); LIVE.manual=true;
        var g=0;
        while(!LIVE.over && g++<4000){
          var dd=LIVE.pending||LIVE.detectDecision();
          if(dd){
            if(dd.kind==='swing'){tot++;LIVE.applyDecision('swing:0.5');continue;}
            if(dd.kind==='pitch'){tot++;LIVE.applyDecision('pitch:0');continue;}
            LIVE.applyDecision(dd.kind==='pitcherChange'?'stay':(dd.kind==='defense'?'defnone':'none')); continue;
          }
          LIVE.step();
        }
      }
      return tot;
    }
    var all=count('all'), key=count('key');
    return key<all*0.7 ? '6경기 — 매 타석 '+all+'회 / 중요한 순간만 '+key+'회' : false;
  })()`));

  console.log('[타이밍이 실제로 결과에 반영되나]');
  T('잘 맞히면 안타 확률이 오른다 (400타석)', ()=>ev(`(function(){
    function trial(q){
      ST.playMode='all';
      var h=0,ab=0;
      for(var t=0;t<14;t++){
        LIVE=makeLive(); LIVE.manual=true;
        var g=0;
        while(!LIVE.over && g++<4000){
          var dd=LIVE.pending||LIVE.detectDecision();
          if(dd){
            if(dd.kind==='swing'){LIVE.applyDecision('swing:'+q);continue;}
            if(dd.kind==='pitch'){LIVE.applyDecision('playskip');continue;}
            LIVE.applyDecision(dd.kind==='pitcherChange'?'stay':(dd.kind==='defense'?'defnone':'none')); continue;
          }
          LIVE.step();
        }
        var us=LIVE.userIsHome?LIVE.home:LIVE.away;
        us.slots.forEach(function(sl){var b=LIVE.box[sl.id]; if(b){h+=b.h;ab+=b.ab;}});
      }
      return ab? h/ab : 0;
    }
    var good=trial(1.0), bad=trial(0.0);
    return good>bad ? '완벽 타이밍 '+good.toFixed(3)+' vs 헛스윙 '+bad.toFixed(3) : false;
  })()`));
  T('보정 폭이 과하지 않다 (확률만 민다)', ()=>ev(`(function(){
    var g=swingMods(1.0), b=swingMods(0.0);
    return (g.babip<1.20 && b.babip>0.85 && g.k>0.6) ?
      '완벽 babip x'+g.babip.toFixed(2)+' · 삼진 x'+g.k.toFixed(2)+
      ' / 헛스윙 babip x'+b.babip.toFixed(2)+' · 삼진 x'+b.k.toFixed(2) : false;
  })()`));
  T('코스를 잡으면 삼진이 늘고 안타가 준다', ()=>ev(`(function(){
    var hit=pitchMods(true,45), miss=pitchMods(false,45);
    return (hit.k>1 && hit.babip<1 && miss.k<1 && miss.babip>1)
      ? '적중 삼진 x'+hit.k.toFixed(2)+' · babip x'+hit.babip.toFixed(2)+
        ' / 실패 삼진 x'+miss.k.toFixed(2) : false;
  })()`));
  T('제구가 낮으면 코스 효과가 작다', ()=>ev(`(function(){
    var hi=pitchMods(true,70), lo=pitchMods(true,20);
    return hi.k>lo.k ? '제구70 삼진 x'+hi.k.toFixed(2)+' / 제구20 x'+lo.k.toFixed(2) : false;
  })()`));

  console.log('[화면]');
  T('스윙 화면이 그려진다', ()=>{
    ev("ST.playMode='all'; LIVE=makeLive(); LIVE.manual=true;");
    ev(`(function(){var g=0;while(!LIVE.over&&g++<3000){
      var dd=LIVE.detectDecision();
      if(dd&&dd.kind==='swing'){window._d=dd;return;}
      if(dd){LIVE.applyDecision(dd.kind==='pitcherChange'?'stay':(dd.kind==='pitch'?'playskip':'none'));continue;}
      LIVE.step();}})()`);
    if(!ev("window._d")) return '스윙 지점 못 만남';
    if(!d.getElementById('decision')){const b=d.createElement('div');b.id='decision';d.body.appendChild(b);}
    ev("showDecision(window._d)");
    const bar=d.querySelector('.tmr'), btn=[...d.querySelectorAll('#decision button')].map(x=>x.textContent);
    return !!bar && btn.join(' | ');
  });
  T('스윙 버튼을 누르면 타이밍이 기록된다', ()=>{
    const b=[...d.querySelectorAll('#decision button')].find(x=>/스윙/.test(x.textContent));
    b.click();
    const q=ev("LIVE._swingQ");
    return (q!=null && q>=0 && q<=1) ? '품질 '+q.toFixed(2) : false;
  });
  T('코스 화면이 그려진다', ()=>{
    ev("ST.playMode='all'; LIVE=makeLive(); LIVE.manual=true;");
    ev(`(function(){var g=0;while(!LIVE.over&&g++<3000){
      var dd=LIVE.detectDecision();
      if(dd&&dd.kind==='pitch'){window._d2=dd;return;}
      if(dd){LIVE.applyDecision(dd.kind==='pitcherChange'?'stay':(dd.kind==='swing'?'playskip':'none'));continue;}
      LIVE.step();}})()`);
    if(!ev("window._d2")) return '코스 지점 못 만남';
    ev("showDecision(window._d2)");
    const cells=d.querySelectorAll('.zgrid button').length;
    return cells===9 ? '9칸 존' : false;
  });
  T('존을 누르면 결과가 기록된다', ()=>{
    const c=d.querySelector('.zgrid button'); c.click();
    return ev("LIVE._pitchHit")!=null ? (ev("LIVE._pitchHit")?'적중':'빗나감') : false;
  });

  if(errs.length) console.log('\n실패:',errs);
  console.log(errs.length?'\n❌ 실패 '+errs.length+'건':'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
},3000);
