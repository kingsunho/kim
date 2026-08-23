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
      for(var t=0;t<14;t++){
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
    return key<all*0.8 ? '14경기 — 매 타석 '+all+'회 / 중요한 순간만 '+key+'회' : false;
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
    const mv=d.querySelector('.mound');
    const parts=['#pfig','.szone','.plate','.mitt','.bat-fig'].filter(x=>mv&&mv.querySelector(x));
    const btn=[...d.querySelectorAll('#decision button')].map(x=>x.textContent);
    return !!mv && parts.length===5 && (parts.join(',')+' | '+btn.join(' | '));
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
  T('구종 버튼이 투수 능력에 맞게 나온다', ()=>{
    const t=[...d.querySelectorAll('.ptype button')].map(x=>x.textContent.replace(/(빠르다|뚝 떨어진다|옆으로 휜다|느리다)/,''));
    return t.length>=1 && t.join(' / ');
  });
  T('존을 누르면 와인드업 후 결과가 기록된다', async()=>{
    const c=d.querySelector('.zgrid button'); c.click();
    return true;
  });

  await wait(2200);   // 와인드업 + 공 도달
  T('투구 결과가 실제로 기록된다', ()=>{
    const v=ev("LIVE._pitchHit");
    const consumed=ev("LIVE._lastPlayPA")!=null;
    return (v!=null||consumed) ? (v==null?'이미 소비됨(정상)':(v?'적중':'빗나감')) : false;
  });

  console.log('[구종]');
  T('구종마다 속도·궤적이 다르다', ()=>ev(`(function(){
    var ks=Object.keys(PITCH_TYPES);
    var spd={}, brk={};
    ks.forEach(function(k){ spd[k]=PITCH_TYPES[k].spd; brk[k]=Math.abs(PITCH_TYPES[k].bx)+Math.abs(PITCH_TYPES[k].by); });
    var uniqSpd=Object.keys(spd).map(function(k){return spd[k]}).filter(function(v,i,a){return a.indexOf(v)===i}).length;
    return uniqSpd>=4 && ks.map(function(k){return PITCH_TYPES[k].n+'('+spd[k]+', 변화'+brk[k]+')'}).join(' / ');
  })()`));
  T('4부답게 대부분 직구뿐이고 에이스만 다 던진다', ()=>ev(`(function(){
    var t=TBYID['wwzw'];
    var n=t.pitchers.map(function(p){return arsenalOf(p).length;});
    var onlyFF=n.filter(function(x){return x===1}).length;
    var max=Math.max.apply(null,n);
    return (onlyFF>=5 && max>=4) ? '직구만 '+onlyFF+'명 / 최다 '+max+'종' : false;
  })()`));
  T('던질 수 있는 구종만 나온다', ()=>ev(`(function(){
    var t=TBYID['wwzw'];
    var bad=t.pitchers.filter(function(p){
      return arsenalOf(p).some(function(k){
        var need=PITCH_TYPES[k].need; return (p.stf*0.6+p.ctl*0.4) < need; });});
    return bad.length===0 ? '전원 조건 충족' : false;
  })()`));

  if(errs.length) console.log('\n실패:',errs);
  console.log(errs.length?'\n❌ 실패 '+errs.length+'건':'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
},3000);
