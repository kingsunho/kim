/* [2.9.6] 교체 아웃된 선수가 투수로 다시 들어오는지 · 던질 사람이 교체당하는지 */
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

  console.log('[스크린샷 재현 — 교체 아웃된 사람이 투수로 복귀]');
  T('교체 아웃된 투수는 마운드에 못 선다', ()=>ev(`(function(){
    ST.lineup=recommendLineup(); ST.rotation=recommendRotation();
    LIVE=makeLive(); LIVE.manual=true; LIVE.inning=6;
    var us=LIVE.userSide();
    // 로테이션 뒤쪽 투수를 타순에서 찾아 강제로 교체 아웃시킨다 (김인규 상황)
    var victim=null, vi=-1;
    us.slots.forEach(function(sl,i){
      if(victim) return;
      if(sl.pos!=='P' && us.rot.indexOf(sl.id)>us.pIdx){ victim=sl.id; vi=i; }
    });
    if(!victim) return '해당 상황 없음';
    var repl=TBYID['wwzw'].players.filter(function(p){return LIVE.canEnter(us,p.id)})[0];
    if(!repl) return '벤치 없음';
    us.slots[vi]={id:repl.id,pos:us.slots[vi].pos};
    LIVE.noteSub(us,vi,repl.id,victim,us.slots[vi].pos,'교체');
    // 이제 투수를 계속 바꿔본다 — 빠진 사람이 다시 나오나
    var came=false, seq=[];
    for(var k=0;k<8;k++){
      if(!LIVE.hasNextPitcher(us)) break;
      LIVE.applyDecision('pchange');
      var now=LIVE.curPitcher(us).id;
      seq.push(nameOf(now));
      if(now===victim) came=true;
    }
    return came ? false : nameOf(victim)+' 교체아웃 → 이후 등판 순서 ['+seq.join(' → ')+'] 에 없음';
  })()`));

  T('한 경기 내내 빠진 사람이 마운드에 안 선다', ()=>ev(`(function(){
    var bad=[];
    for(var t=0;t<120;t++){
      ST.lineup=recommendLineup(); ST.rotation=recommendRotation();
      LIVE=makeLive(); LIVE.manual=false;
      var g=0;
      while(!LIVE.over && g++<5000){
        var dd=LIVE.pending||LIVE.detectDecision();
        if(dd){ LIVE.applyDecision(dd.kind==='pitcherChange'?'change':'none'); continue; }
        LIVE.step();
        var us=LIVE.userSide();
        var mound=LIVE.curPitcher(us).id;
        if(LIVE.gone && LIVE.gone[mound] && bad.indexOf(mound)<0) bad.push(nameOf(mound));
      }
    }
    return bad.length ? false : '120경기 위반 0';
  })()`));

  console.log('[오늘 던질 사람 · 시즌 성적 좋은 주전은 자동 교체 안 당한다]');
  T('아직 안 던진 투수는 자동 교체 대상이 아니다', ()=>ev(`(function(){
    var bad=[], tot=0, subs=0;
    for(var t=0;t<150;t++){
      ST.lineup=recommendLineup(); ST.rotation=recommendRotation();
      LIVE=makeLive(); LIVE.manual=false;
      var us=LIVE.userSide();
      var g=0;
      while(!LIVE.over && g++<5000){
        var dd=LIVE.pending||LIVE.detectDecision();
        if(dd){ LIVE.applyDecision(dd.kind==='pitcherChange'?'change':'none'); continue; }
        // 스텝 직전: 아직 등판 안 한 투수 명단과 교체 기록 수
        var pending=(us.rot||[]).slice(us.pIdx+1);
        var nBefore=(us.used||[]).length;
        LIVE.step();
        var used=(us.used||[]);
        for(var k=nBefore;k<used.length;k++){
          var u=used[k];
          if(u.how!=='교체') continue;            // 컨디션 교체만
          subs++;
          if(u.forId && pending.indexOf(u.forId)>=0 && bad.indexOf(u.forId)<0) bad.push(nameOf(u.forId));
        }
      }
      tot++;
    }
    return bad.length ? '아직 안 던졌는데 교체됨: '+bad.join(',') && false
                      : tot+'경기 · 컨디션 교체 '+subs+'건 중 등판 대기 투수 제거 0';
  })()`));

  T('시즌 성적 상위 타자는 무안타여도 안 빠진다', ()=>ev(`(function(){
    // 시즌 기록을 심는다 — 이건을 확실한 상위 타자로
    ST.bat=ST.bat||{};
    ST.bat['lg']={g:10,pa:40,ab:36,h:22,d2:5,d3:2,hr:1,bb:4,hbp:0,k:3,rbi:15,r:14,sb:8,cs:1};
    var bad=0, tot=0;
    for(var t=0;t<150;t++){
      ST.lineup=recommendLineup(); ST.rotation=recommendRotation();
      if(!ST.lineup.some(function(s){return s.id==='lg'})) continue;
      LIVE=makeLive(); LIVE.manual=false;
      var g=0;
      while(!LIVE.over && g++<5000){
        var dd=LIVE.pending||LIVE.detectDecision();
        if(dd){ LIVE.applyDecision(dd.kind==='pitcherChange'?'change':'none'); continue; }
        LIVE.step();
      }
      tot++;
      var us=LIVE.userSide();
      if((us.used||[]).some(function(u){return u.how==='교체'&&u.forId==='lg'})) bad++;
    }
    return bad===0 ? tot+'경기 · 이건(시즌 OPS 상위) 자동 교체 0건' : false;
  })()`));

  if(errs.length) console.log('\n실패:',errs);
  console.log(errs.length?'\n❌ 실패 '+errs.length+'건':'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
},3000);
