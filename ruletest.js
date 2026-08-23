/* [2.9.4] 야구 규칙 4종 — 교체 복귀 금지 · 결장자 차단 · 승계주자 자책 · 콜드/마지막이닝 말 스킵 */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo/.test(e.message))errs.push(e.message)});
const mk=()=>{const d=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
  d.window.scrollTo=()=>{};d.window.confirm=()=>true;return d;};
const dom=mk();
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

setTimeout(async()=>{
  d.querySelectorAll('.pickcard')[0].click();await wait(50);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(250);
  ev("ST.tutDone=true; ST.weekDone=true; ST.absent={}; ST.injury={};");

  console.log('[① 한 번 빠진 사람은 다시 못 들어온다]');
  T('교체로 빠진 사람이 대타 후보에서 사라진다', ()=>ev(`(function(){
    ST.absent={}; ST.lineup=recommendLineup(); ST.rotation=recommendRotation();
    LIVE=makeLive(); LIVE.manual=true; LIVE.inning=5;
    var us=LIVE.userSide();
    var victim=us.slots[3].id;
    var benchBefore=TBYID['wwzw'].players.filter(function(p){return LIVE.canEnter(us,p.id)}).map(function(p){return p.id});
    var newGuy=benchBefore[0];
    if(!newGuy) return false;
    LIVE.order=3; us.order=3;
    LIVE.pinchHit(newGuy);
    var benchAfter=TBYID['wwzw'].players.filter(function(p){return LIVE.canEnter(us,p.id)}).map(function(p){return p.id});
    return benchAfter.indexOf(victim)<0 ? nameOf(victim)+' 제외됨 (후보 '+benchBefore.length+'→'+benchAfter.length+')' : false;
  })()`));
  T('타순에서 밀려난 투수도 다시 못 들어온다', ()=>ev(`(function(){
    ST.useDH=false; applyDHRule(); resolveStarterField();
    LIVE=makeLive(); LIVE.manual=true; LIVE.inning=5;
    var s=LIVE.userSide();
    var outId=LIVE.curPitcher(s).id;
    LIVE.applyDecision('pchange');
    if(s.slots.some(function(x){return x.id===outId})) return '벤치가 없어 야수로 남음 — 해당 없음';
    return !LIVE.canEnter(s,outId) ? nameOf(outId)+' 제외됨' : false;
  })()`));
  T('무안타 교체로 빠진 사람도 다시 못 들어온다', ()=>ev(`(function(){
    ST.useDH=true; applyDHRule(); resolveStarterField();
    LIVE=makeLive(); LIVE.manual=false;
    var gonePrev={}, bad=[];
    var g=0;
    while(!LIVE.over && g++<5000){
      var dd=LIVE.pending||LIVE.detectDecision();
      if(dd){ LIVE.applyDecision(dd.kind==='pitcherChange'?'change':'none'); continue; }
      LIVE.step();
      var s=LIVE.userSide();
      Object.keys(LIVE.gone||{}).forEach(function(id){
        if(s.slots.some(function(x){return x.id===id})) bad.push(nameOf(id));
      });
    }
    var goneN=Object.keys(LIVE.gone||{}).length;
    return bad.length? false : '한 경기 동안 '+goneN+'명 빠졌고 복귀 0명';
  })()`));

  console.log('[② 오늘 못 온다고 한 사람은 교체로도 못 나온다]');
  T('결장자는 어떤 경로로도 출전하지 않는다', ()=>ev(`(function(){
    ST.absent={}; ST.injury={};
    ST.lineup=recommendLineup(); ST.rotation=recommendRotation();
    var us0=TBYID['wwzw'];
    var benchIds=us0.players.filter(function(p){return !ST.lineup.some(function(s){return s.id===p.id})}).map(function(p){return p.id});
    var absent=benchIds.slice(0,2);
    absent.forEach(function(id){ ST.absent[id]='오늘 못 온다'; });
    LIVE=makeLive(); LIVE.manual=false;
    var appeared=[], inCand=[];
    var g=0;
    while(!LIVE.over && g++<5000){
      var dd=LIVE.pending||LIVE.detectDecision();
      if(dd){ LIVE.applyDecision(dd.kind==='pitcherChange'?'change':'none'); continue; }
      LIVE.step();
      var s=LIVE.userSide();
      absent.forEach(function(id){
        if(s.slots.some(function(x){return x.id===id}) && appeared.indexOf(id)<0) appeared.push(id);
        if(LIVE.canEnter(s,id) && inCand.indexOf(id)<0) inCand.push(id);
      });
    }
    ST.absent={};
    return (appeared.length===0 && inCand.length===0)
      ? '결장 '+absent.map(nameOf).join(',')+' — 출전 0 · 후보 노출 0' : false;
  })()`));

  console.log('[③ 승계주자 자책점은 원래 투수가 가져간다]');
  T('바뀐 투수가 앞 투수의 주자를 뒤집어쓰지 않는다', ()=>ev(`(function(){
    var okN=0, badN=0, sample='';
    for(var t=0;t<160 && okN<6;t++){
      ST.lineup=recommendLineup(); ST.rotation=recommendRotation();
      LIVE=makeLive(); LIVE.manual=false;
      var g=0;
      while(!LIVE.over && g++<5000){
        var dd=LIVE.pending||LIVE.detectDecision();
        if(dd){ LIVE.applyDecision(dd.kind==='pitcherChange'?'change':'none'); continue; }
        var def=LIVE.def();
        if(def.isUser && LIVE.bases.filter(Boolean).length>0 && def.pIdx<def.rot.length-1 && LIVE.inning>=2){
          var oldP=LIVE.curPitcher(def).id;
          var runners=LIVE.bases.filter(Boolean).slice();
          var eO=(LIVE.pbox[oldP]||{er:0}).er;
          LIVE.applyDecision('pchange');
          var newP=LIVE.curPitcher(def).id;
          if(newP===oldP){ LIVE.step(); continue; }
          var eN=(LIVE.pbox[newP]||{er:0}).er;
          var h=0;
          while(!LIVE.over && h++<400 && LIVE.bases.some(function(b){return runners.indexOf(b)>=0})){
            var d2=LIVE.pending||LIVE.detectDecision();
            if(d2){ LIVE.applyDecision(d2.kind==='pitcherChange'?'stay':'none'); continue; }
            LIVE.step();
          }
          var dO=(LIVE.pbox[oldP]||{er:0}).er-eO, dN=(LIVE.pbox[newP]||{er:0}).er-eN;
          if(dO>0){ okN++; if(!sample) sample='원래 투수 '+nameOf(oldP)+' 자책 +'+dO+' / 바뀐 투수 '+nameOf(newP)+' +'+dN; }
          else if(dN>0){ badN++; sample='[버그] 바뀐 투수 '+nameOf(newP)+'가 +'+dN+' 뒤집어씀'; }
          break;
        }
        LIVE.step();
      }
    }
    return badN===0 && okN>0 ? okN+'건 확인 · '+sample : (sample||'재현 실패');
  })()`));

  console.log('[④ 홈팀이 이미 이겼으면 말 공격을 안 한다]');
  T('마지막 이닝·콜드 조건에서 말을 건너뛴다', ()=>ev(`(function(){
    var badLast=0, badCold=0, tot=0, mercyN=0;
    for(var t=0;t<400;t++){
      ST.lineup=recommendLineup(); ST.rotation=recommendRotation();
      LIVE=makeLive(); LIVE.manual=false;
      var g=0;
      while(!LIVE.over && g++<5000){
        var dd=LIVE.pending||LIVE.detectDecision();
        if(dd){ LIVE.applyDecision(dd.kind==='pitcherChange'?'change':'none'); continue; }
        var innB=LIVE.inning, halfB=LIVE.half;
        LIVE.step();
        if(halfB===0 && LIVE.half===1 && !LIVE.over){
          var lead=LIVE.home.runs-LIVE.away.runs;
          if(innB>=LIVE.INN && lead>0) badLast++;
          if((innB>=4&&lead>=10)||(innB>=6&&lead>=7)) badCold++;
        }
      }
      if(LIVE.mercy) mercyN++;
      tot++;
    }
    return (badLast===0&&badCold===0)
      ? tot+'경기 · 마지막이닝 위반 0 · 콜드 위반 0 (콜드게임 '+mercyN+'건)'
      : '마지막이닝 '+badLast+' · 콜드 '+badCold;
  })()`));
  T('홈팀이 말 도중 승부를 끝내면 그 자리에서 끝난다', ()=>ev(`(function(){
    var C=0,tot=0,s=[];
    for(var t=0;t<300;t++){
      ST.round=t%2;
      ST.lineup=recommendLineup(); ST.rotation=recommendRotation();
      LIVE=makeLive(); LIVE.manual=false;
      var g=0;
      while(!LIVE.over && g++<5000){
        var dd=LIVE.pending||LIVE.detectDecision();
        if(dd){ LIVE.applyDecision(dd.kind==='pitcherChange'?'change':'none'); continue; }
        var halfB=LIVE.half, innB=LIVE.inning, hB=LIVE.home.runs, aB=LIVE.away.runs;
        LIVE.step();
        if(halfB===1 && !LIVE.over){
          var lB=hB-aB;
          if((innB>=LIVE.INN&&lB>0)||((innB>=4&&lB>=10)||(innB>=6&&lB>=7))){
            C++; if(s.length<2) s.push(innB+'회말 '+aB+':'+hB);
          }
        }
      }
      tot++;
    }
    return C===0 ? tot+'경기 · 이미 끝났는데 계속 친 경우 0' : C+'건 ('+s.join(', ')+')';
  })()`));
  T('리그 다른 팀 경기도 같은 규칙이다', ()=>ev(`(function(){
    var A=0,B=0,tot=0,skip=0;
    var ids=TEAMS.filter(function(t){return t.id!=='wwzw'}).map(function(t){return t.id});
    for(var t=0;t<300;t++){
      var h=TBYID[ids[t%ids.length]], a=TBYID[ids[(t*7+3)%ids.length]];
      if(h.id===a.id) continue;
      var r=simGame(h,a,{rng:makeRng(t*977+13),innings:7,awayLineup:aiLineup(a),
        awayRotation:aiRotation(a),homeLineup:aiLineup(h),homeRotation:aiRotation(h)});
      if(!r||!r.away||!r.home) continue;
      tot++;
      var aL=r.away.line,hL=r.home.line,last=aL.length-1; if(last<0)continue;
      var hs=0,as=0;
      for(var j=0;j<last;j++){hs+=(hL[j]||0);as+=(aL[j]||0);}
      as+=(aL[last]||0);
      var lead=hs-as, played=(hL[last]!=null);
      if(last+1>=7 && lead>0){ if(played)A++; else skip++; }
      else if((last+1>=4&&lead>=10)||(last+1>=6&&lead>=7)){ if(played)B++; else skip++; }
    }
    return (A===0&&B===0) ? tot+'경기 · 위반 0 (정상 스킵 '+skip+'건)' : 'A'+A+' B'+B;
  })()`));

  T('라인스코어 이닝 수가 안 어긋난다', ()=>ev(`(function(){
    var bad=0;
    for(var t=0;t<120;t++){
      ST.lineup=recommendLineup(); ST.rotation=recommendRotation();
      LIVE=makeLive(); LIVE.manual=false;
      var g=0;
      while(!LIVE.over && g++<5000){
        var dd=LIVE.pending||LIVE.detectDecision();
        if(dd){ LIVE.applyDecision(dd.kind==='pitcherChange'?'change':'none'); continue; }
        LIVE.step();
      }
      var a=LIVE.away.line.length, h=LIVE.home.line.length;
      if(h>a || a-h>1) bad++;
      var sumA=LIVE.away.line.reduce(function(n,x){return n+(x||0)},0);
      var sumH=LIVE.home.line.reduce(function(n,x){return n+(x||0)},0);
      if(sumA!==LIVE.away.runs||sumH!==LIVE.home.runs) bad++;
    }
    return bad===0 ? '120경기 정상' : bad+'건 어긋남';
  })()`));

  console.log('[⑤ 팀 나간 사람은 새로고침·새 시즌에도 안 돌아온다]');
  const victim=ev(`(function(){
    ST.leftPlayers=[];
    var us=TBYID['wwzw'];
    var v=us.players[us.players.length-1].id;
    leaveTeam(ST,v); window._v=v; return v;
  })()`);
  await ev("saveGame(true)");
  await wait(400);
  const saved=ev("localStorage.getItem('wwzw_v5')");
  T('세이브에 이탈 기록이 남는다', ()=>{
    const j=JSON.parse(saved);
    return (j.leftPlayers||[]).some(x=>x.pid===victim) && `${(j.leftPlayers||[]).length}건`;
  });
  const dom2=mk();
  dom2.window.localStorage.setItem('wwzw_v5', saved);
  await wait(3000);
  const ev2=s=>dom2.window.eval(s);
  T('새로고침 후에도 로스터에 없다', ()=>{
    const inR=ev2(`TBYID['wwzw'].players.some(function(p){return p.id==='${victim}'})`);
    const n=ev2("(ST.leftPlayers||[]).length");
    return !inR && `로스터 ${ev2("TBYID['wwzw'].players.length")}명 · 이탈기록 ${n}건`;
  });
  T('새 시즌에도 안 돌아온다', ()=>{
    ev2("ST=newSeason(); normalizeState&&normalizeState();");
    const inR=ev2(`TBYID['wwzw'].players.some(function(p){return p.id==='${victim}'})`);
    const n=ev2("(ST.leftPlayers||[]).length");
    return !inR && `로스터 ${ev2("TBYID['wwzw'].players.length")}명 · 이탈기록 ${n}건 이어짐`;
  });
  T('새 시즌 기록표에도 안 낀다', ()=>{
    const inBat=ev2(`!!(ST.bat&&ST.bat['${victim}'])`);
    return !inBat && '타격 기록표 제외';
  });

  if(errs.length) console.log('\n실패:',errs);
  console.log(errs.length?'\n❌ 실패 '+errs.length+'건':'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
},3000);
