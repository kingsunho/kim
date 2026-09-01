/* [2.76.0] 2군 콜업·강등 · 리그 이적 시장
   [요청] "2군 콜업 강등 만들자 그냥 가상선수진들 좀 늘리더라도 뎁스 두껍게"
          "사야팀들 다 뭐 몸값은 있으니깐 성적기준 그 사고 파고 지들끼리
           알아하게 근데 너무자주 되지는 말고"                          */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|not implemented|getContext/i.test(e.message))errs.push(e.message)});
const mk=()=>{const v2=new VirtualConsole();v2.on('jsdomError',()=>{});
  const dm=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:v2});
  dm.window.scrollTo=()=>{};dm.window.confirm=()=>true;return dm;};
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();const ok=!!r&&!(typeof r==='string'&&r[0]==='!');
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!ok)errs.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  await wait(800);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300);
  ev("ST.tutDone=true; ST.mode='player'; ST.playerId='ksh'; ST.role='bat'; normalizeState();");

  console.log('[2군 명단]');
  T('시즌이 열리면 2군이 찬다', ()=>ev(`(function(){
    ST.farm=[]; farmFill(9);
    return ST.farm.length===9 ? '9명' : '!'+ST.farm.length;
  })()`));
  T('가상 선수에 필요한 칸이 다 있다', ()=>ev(`(function(){
    var bad=ST.farm.filter(function(p){
      return !p.id||!p.name||p.con==null||p.pow==null||p.def==null||!(p.pos||[]).length;
    });
    return bad.length? '!'+bad.length+'명 빈칸' : '이름·능력치·포지션 전부';
  })()`));
  T('아이디가 안 겹친다', ()=>ev(
    "new Set(ST.farm.map(p=>p.id)).size===ST.farm.length"));
  T('투수도 섞여 있다', ()=>ev(`(function(){
    ST.farm=[]; farmFill(30);
    var n=ST.farm.filter(function(p){return !!p.pitch;}).length;
    ST.farm=ST.farm.slice(0,9);
    return n>0 ? n+'/30 명이 투수' : '!한 명도 없다';
  })()`));

  console.log('\n[콜업 — 1군 로스터에 실제로 올라간다]');
  T('올리면 로스터에 들어간다', ()=>ev(`(function(){
    var before=TBYID['wwzw'].players.length;
    ST.farm[0].up=true;
    var n=applyFarm();
    var after=TBYID['wwzw'].players.length;
    return (n===1 && after===before+1 && TBYID['wwzw'].players.some(function(p){return p.id===ST.farm[0].id;}))
      ? before+'명 → '+after+'명' : '!'+n+'/'+before+'/'+after;
  })()`));
  T('두 번 불러도 한 번만 올라간다 (멱등)', ()=>ev(`(function(){
    var before=TBYID['wwzw'].players.length;
    applyFarm(); applyFarm();
    return TBYID['wwzw'].players.length===before ? '그대로 '+before+'명' : '!늘었다';
  })()`));
  T('META 가 생긴다 (없으면 화면이 터진다)', ()=>ev(`(function(){
    var id=ST.farm[0].id;
    var m=META[id];
    return (m && m.traits && m.pos && m.throws) ? '특성 '+m.traits.join(',')+' · 자리 '+Object.keys(m.pos).length+'개'
      : '!'+JSON.stringify(m);
  })()`));
  T('기록 칸도 같이 열린다', ()=>ev(`(function(){
    var id=ST.farm[0].id;
    return (ST.bat[id]&&ST.pit[id]&&ST.cond[id]!=null&&ST.morale[id]!=null)
      ? '타격·투구·컨디션·사기' : '!빈 칸이 있다';
  })()`));
  T('내리면 로스터에서 빠진다', ()=>ev(`(function(){
    var id=ST.farm[0].id;
    var before=TBYID['wwzw'].players.length;
    farmDown(id);
    return (TBYID['wwzw'].players.length===before-1 && !ST.farm[0].up)
      ? before+'명 → '+TBYID['wwzw'].players.length+'명' : '!안 빠졌다';
  })()`));

  console.log('\n[너무 자주 되지 않는다]');
  T('콜업·강등에 3주 쿨다운이 걸린다', ()=>ev(
    "farmWeek.toString().indexOf('ST.round - cool < 3')>0"));
  T('이적은 4주 쿨다운 + 확률', ()=>ev(
    "rollTrade.toString().indexOf('ST.round - cool < 4')>0 && rollTrade.toString().indexOf('rng() > 0.28')>0"));
  T('한 시즌에 몇 번이나 움직이나 (실측)', ()=>ev(`(function(){
    ST.farm=[]; farmFill(9); ST.farmMove=-99; ST.myFarm=0; ST.trades=[]; ST.tradeRound=-99;
    var up=0,down=0;
    var n0=TBYID['wwzw'].players.length;
    for(var r=0;r<22;r++){
      ST.round=r;
      var rng=makeRng((12345+r*7717)>>>0);
      var ms=farmWeek(rng);
      ms.forEach(function(m){ if(/콜업/.test(m.title)) up++; if(/2군행/.test(m.title)) down++; });
    }
    return (up+down)<=8 ? '22주에 콜업 '+up+' · 강등 '+down : '!너무 잦다 '+up+'/'+down;
  })()`));

  console.log('\n[리그도 사람이 오간다]');
  T('이적하면 팀이 실제로 바뀐다', ()=>ev(`(function(){
    ST.trades=[]; ST.tradeRound=-99;
    var from=TEAMS.find(function(t){return t.id!=='wwzw';});
    var p=from.players[0];
    var to=TEAMS.find(function(t){return t.id!=='wwzw'&&t.id!==from.id;});
    ST.trades.push({pid:p.id, from:from.id, to:to.id, round:1, season:1, name:p.name});
    applyTrades();
    var gone=!from.players.some(function(q){return q.id===p.id;});
    var came=to.players.some(function(q){return q.id===p.id;});
    return (gone&&came) ? p.name+' '+from.name+' → '+to.name : '!'+gone+'/'+came;
  })()`));
  T('두 번 불러도 한 번만 옮긴다 (멱등)', ()=>ev(`(function(){
    var t=ST.trades[0];
    var to=TBYID[t.to];
    var before=to.players.length;
    applyTrades(); applyTrades();
    return to.players.length===before ? '그대로 '+before+'명' : '!늘었다';
  })()`));
  T('몸값과 성적을 기준으로 고른다', ()=>ev(
    "rollTrade.toString().indexOf('playerValue(p, META[p.id]')>0 && rollTrade.toString().indexOf('st.w/gp')>0"));
  T('로스터가 얇은 팀은 안 판다', ()=>ev(
    "rollTrade.toString().indexOf('pool.length<10')>0"));

  console.log('\n[내가 2군에 내려간다]');
  T('2군에 있으면 1군 경기에 못 나간다', ()=>ev(`(function(){
    ST.myFarm=2;
    var a=isAvailable('ksh'), b=myLineupBias('ksh');
    ST.myFarm=0;
    return (!a && b<-1000) ? '출전 불가 · 라인업 제외' : '!'+a+'/'+b;
  })()`));
  /* [요청] "2군 경기 수를 두지말고 2군에서 잘하면 콜업 1군에서 못하면 강등"
     기간이 사라졌다. 타율이 기준을 넘기는 **그 주에** 올라온다.
     [주의] 콜업에 주전 보장은 안 붙는다 — "왜 올라오자마자 주전보장
     3경기가 된거야" 를 받고 뺐다. 예전 검사는 그걸 아직 요구하고 있었다. */
  T('2군에서 기준을 넘기면 그 주에 올라온다', ()=>ev(`(function(){
    ST.myFarm=1; ST.farmBar=0.280; ST.farmMe={g:4,ab:16,h:7};   // .438
    ST.round=10; ST.farmMove=-99;
    var ms=farmWeek(makeRng(999));
    return (ST.myFarm===0 && ms.some(function(m){return /콜업/.test(m.title);}))
      ? '올라왔다' : '!'+ST.myFarm+'/'+JSON.stringify(ms.map(function(m){return m.title;}));
  })()`));
  T('콜업에 주전 보장은 안 붙는다', ()=>ev("(ST.myGuarantee||0)===0")
    ? '보장 없음 — 자리는 뺏는 거다' : '!보장이 붙었다');
  /* 직접 친 주는 그 기록만 쓴다(farmDone) — 여기서는 계속 못 친 기록을
     들고 있게 해서 「기간이 지나서」 올라오는 길이 없는지만 본다.     */
  T('못 치면 몇 주가 지나도 안 올라온다 (기간이 없다)', ()=>ev(`(function(){
    ST.myFarm=1; ST.farmBar=0.300; ST.round=14; ST.farmMove=-99;
    ST.farmDone=0; ST.farmDoneSeen=0;
    for(var i=0;i<8;i++){
      ST.farmMe={g:4+i,ab:20+i*4,h:Math.round((20+i*4)*0.14)};   // 계속 1할4푼
      ST.farmDone=i+1;                       // 내가 직접 친 주 — 가짜 타석 안 붙는다
      farmWeek(makeRng(1000+i));
      if(ST.myFarm<=0) break;
    }
    var r=ST.myFarm;
    ST.myFarm=0; ST.farmMe=null; ST.farmDone=0; ST.farmDoneSeen=0;
    return r>0 ? '여덟 주를 굴려도 그대로 2군' : '!기간이 차서 올라왔다';
  })()`));
  T('반대로 잘 치면 그 주에 바로 올라온다 (오래 있을 필요 없다)', ()=>ev(`(function(){
    ST.myFarm=1; ST.farmBar=0.300; ST.round=14; ST.farmMove=-99;
    ST.farmMe={g:4,ab:13,h:6}; ST.farmDone=9; ST.farmDoneSeen=8;   // .462 · 첫 판정
    var ms=farmWeek(makeRng(4242));
    var up=(ST.myFarm===0);
    ST.myFarm=0; ST.farmMe=null; ST.farmDone=0; ST.farmDoneSeen=0;
    return up ? '13타석 .462 — 한 주 만에 콜업' : '!'+ST.myFarm;
  })()`));
  T('표본이 모자라면 아직 판단하지 않는다', ()=>ev(`(function(){
    ST.myFarm=1; ST.farmBar=0.280; ST.farmMe={g:1,ab:4,h:4};    // 4타수 4안타
    ST.round=10; ST.farmMove=-99; ST.farmDone=1; ST.farmDoneSeen=1;
    var ms=farmWeek(makeRng(31337));
    var r=(ST.myFarm>0);
    ST.myFarm=0; ST.farmMe=null;
    return r ? '10할이어도 타석 수를 채워야 한다' : '!네 타석에 올려버렸다';
  })()`));
  T('오래 있으면 기준이 조금씩 내려간다', ()=>ev(`(function(){
    ST.farmBar=0.300;
    var a=farmReady({ab:12,h:3});      // .250 — 열두 타석에는 모자란다
    var b=farmReady({ab:60,h:15});     // .250 — 예순 타석이면 기준이 내려와 있다
    return (!a && b) ? '12타석 .250 안 됨 → 60타석 .250 통과' : '!'+a+'/'+b;
  })()`));
  T('2군에 있는 동안 진행 상황이 뜬다', ()=>ev(`(function(){
    ST.myFarm=1; ST.farmBar=0.280; ST.farmMe={g:0,ab:0,h:0}; ST.round=12; ST.farmMove=-99;
    ST.farmDone=0; ST.farmDoneSeen=0;
    var ms=farmWeek(makeRng(777));
    ST.myFarm=0; ST.farmMe=null;
    return ms.some(function(m){return /2군/.test(m.title);}) ? ms[0].title+' — '+ms[0].effect : '!안 뜬다';
  })()`));
  T('내려갈 때도 기간이 아니라 기준을 받는다', ()=>ev(`(function(){
    var src=farmWeek.toString();
    return (src.indexOf('ST.myFarm=1')>0 && src.indexOf('ST.farmBar=')>0
            && src.indexOf('ST.myFarm--')<0) ? '주를 안 센다' : '!아직 주를 센다';
  })()`));

  console.log('\n[새로고침해도 남는다]');
  const code=ev("(function(){ST.farm[1].up=true;applyFarm();return JSON.stringify(ST);})()");
  const upId=ev("ST.farm[1].id");
  const rosterA=ev("TBYID['wwzw'].players.length");
  const tradeN=ev("ST.trades.length");
  const B=mk(); await wait(900);
  const eb=s2=>B.window.eval(s2);
  eb("ST=JSON.parse("+JSON.stringify(code)+"); MYID=ST.playerId; normalizeState();");
  T('콜업한 선수가 새로고침을 넘어간다', ()=>{
    const has=eb("TBYID['wwzw'].players.some(p=>p.id==="+JSON.stringify(upId)+")");
    return has ? '로스터에 그대로' : '!사라졌다';
  });
  T('이적한 선수도 넘어간다', ()=>{
    const t=eb("ST.trades[0]");
    const ok=eb("(function(){var t=ST.trades[0];return TBYID[t.to].players.some(p=>p.id===t.pid)&&!TBYID[t.from].players.some(p=>p.id===t.pid);})()");
    return ok ? '옮긴 그대로' : '!되돌아갔다';
  });
  T('2군 명단도 남는다', ()=>eb("Array.isArray(ST.farm)&&ST.farm.length>=9")?'9명 이상':'!사라졌다');

  console.log('\n[감독 모드에는 2군이 없다]');
  T('감독 모드면 주간에 2군이 안 돈다', ()=>ev(
    "runWeek.toString().indexOf('if(isPlayerMode()){')>0 && runWeek.toString().indexOf('farmWeek(rng)')>0"));
  T('감독 모드면 2군 카드가 안 뜬다', ()=>ev(`(function(){
    var keep=ST.mode; ST.mode='mgr';
    var a=farmCard(), b=tradeCard();
    ST.mode=keep;
    return (a===null&&b===null) ? '둘 다 안 뜬다' : '!'+(a?'2군카드 ':'')+(b?'이적카드':'');
  })()`));
  T('선수 모드면 뜬다', ()=>ev(`(function(){
    ST.mode='player'; ST.farm=[]; farmFill(9);
    return farmCard()? '2군 카드 있다' : '!안 뜬다';
  })()`));

  console.log('\n[실존 선수도 2군에 간다]');
  T('실존 선수도 강등 후보에 들어간다', ()=>ev(
    "firstTeamWorst.toString().indexOf('return true;')>0 && firstTeamWorst.toString().indexOf('!!p.farm')<0"));
  T('내리면 출전이 막힌다 (로스터는 안 건드린다)', ()=>ev(`(function(){
    var us=TBYID['wwzw'];
    var tgt=us.players.find(function(p){return p.id!=='ksh'&&!p.pitch&&!p.farm;});
    var before=us.players.length;
    farmDownReal(tgt.id, 2);
    var still=us.players.some(function(p){return p.id===tgt.id;});
    var avail=isAvailable(tgt.id);
    return (still && !avail && us.players.length===before)
      ? tgt.name+' — 로스터엔 그대로, 출전만 막힘' : '!'+still+'/'+avail;
  })()`));
  T('감독·투수·나는 안 내린다', ()=>ev(
    "firstTeamWorst.toString().indexOf('p.id===coachId()')>0 && firstTeamWorst.toString().indexOf('if(p.pitch) return false')>0"));
  T('2군에서 치면 돌아온다', ()=>ev(`(function(){
    var pid=Object.keys(ST.farmReal)[0];
    if(!pid) return '!내려간 사람이 없다';
    ST.farmReal[pid]={weeks:1, g:2, ab:10, h:4};    // 4할
    var ms=farmRealWeek(makeRng(4242));
    return (!ST.farmReal[pid] && isAvailable(pid) && ms.some(function(m){return /복귀/.test(m.title);}))
      ? nameOf(pid)+' 복귀' : '!'+JSON.stringify(ST.farmReal[pid])+'/'+ms.length;
  })()`));
  T('실존 선수는 진짜 못 칠 때만 내려간다', ()=>ev(
    "farmWeek.toString().indexOf('worst.farm || bad')>0"));

  console.log('\n[우리 팀에서도 사람이 나간다]');
  T('벤치에서 밀린 사람이 이적 대상이다', ()=>ev(
    "usTradeOut.toString().indexOf('(ST.lineup||[]).some')>0 && usTradeOut.toString().indexOf('p.id===me) return false')>0"));
  T('나가면 이탈 명단에 남고 상대 팀으로 간다', ()=>ev(`(function(){
    ST.leftPlayers=[]; ST.mode='player'; ST.playerId='ksh';
    ST.lineup=[]; ST.unhappy=ST.unhappy||{};
    var us=TBYID['wwzw'];
    var tgt=us.players.find(function(p){return p.id!=='ksh'&&!p.pitch&&!isFarmed(p.id)&&p.id!==coachId();});
    ST.unhappy[tgt.id]={level:4,streak:0}; ST.morale[tgt.id]=20;
    var before=us.players.length;
    var ms=usTradeOut(function(){return 0.0;});
    if(!ms.length) return '!아무도 안 나갔다';
    var rec=ST.leftPlayers[0];
    var landed=rec&&TBYID[rec.to]&&TBYID[rec.to].players.some(function(p){return p.id===rec.pid;});
    return (us.players.length===before-1 && rec && landed)
      ? rec.name+' → '+TBYID[rec.to].name : '!'+us.players.length+'/'+before+'/'+JSON.stringify(rec);
  })()`));
  T('얇아지면 안 판다 (몰수패 방지)', ()=>ev(
    "usTradeOut.toString().indexOf('us.players.length<=12')>0"));
  T('감독 모드에서는 아무도 안 나간다', ()=>ev(`(function(){
    var keep=ST.mode; ST.mode='mgr';
    var n=usTradeOut(function(){return 0.0;}).length;
    ST.mode=keep;
    return n===0 ? '안 나간다' : '!'+n+'명 나갔다';
  })()`));

  console.log('\n[시즌을 넘어간다]');
  T('콜업한 선수가 새 시즌에도 남는다', ()=>ev(`(function(){
    ST.farm=[]; farmFill(9);
    ST.farm[0].up=true; applyFarm();
    var id=ST.farm[0].id;
    /* 1군에서 한 해 훈련해서 올랐다고 치자 */
    var p=TBYID['wwzw'].players.find(function(x){return x.id===id;});
    p.pow=Math.round(p.pow)+8;
    var grown=p.pow;
    /* 시즌 롤오버가 하는 것과 같은 순서 */
    var keep={ratings:{}};
    TBYID['wwzw'].players.forEach(function(q){ keep.ratings[q.id]={con:q.con,pow:q.pow,eye:q.eye,
      spd:q.spd,def:q.def,arm:q.arm,pitch:q.pitch?{...q.pitch}:null}; });
    TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(function(t){TBYID[t.id]=t;});
    applyFarm();
    TBYID['wwzw'].players.forEach(function(q){ var r=keep.ratings[q.id]; if(r)Object.assign(q,r); });
    (ST.farm||[]).forEach(function(f){
      if(!f||!f.up) return;
      var q=TBYID['wwzw'].players.find(function(x){return x.id===f.id;}); if(!q) return;
      ['con','pow','eye','spd','def','arm'].forEach(function(k){ if(q[k]!=null) f[k]=q[k]; });
    });
    return (ST.farm[0].pow===grown) ? '한 해 올린 파워 '+grown+' 이 명단에도 적혔다'
      : '!'+ST.farm[0].pow+' vs '+grown;
  })()`));
  T('롤오버 코드가 실제로 그 순서를 탄다', ()=>ev(
    "renderHome.toString().indexOf('applyFarm()')>0"));

  console.log('\n[2군에서 시작한다]');
  T('고교를 못 보내면 2군에서 시작한다', ()=>ev(`(function(){
    ST.mode='player'; ST.playerId='ksh'; ST.role='bat'; ST.myPos='C';
    ST.myRatings=null; ST.myRatingsOK=false; ST.myFarm=0; ST.myGuarantee=0;
    ST.hs={i:0,done:false,res:[],bat:blankBat(),pit:blankPit(),moments:[],
           pending:null,eff:{},picks:[],picked:{}};
    ST.hs.bat.g=7; ST.hs.bat.pa=22; ST.hs.bat.ab=20; ST.hs.bat.h=2;   // 1할
    hsGraduate();
    return ST.myFarm>0 ? ('2군에서 시작 · 기준 '+fmt3(ST.farmBar)) : '!바로 1군이다';
  })()`));
  /* [결정 유지] "2군 안걸치고 왜 바로 1군 온거지?" — 누구든 2군을 거친다.
     잘 보냈으면 **기준이 낮아서** 한두 주면 올라온다. 안 거치는 길은 없다.
     예전 검사는 바로 1군을 요구하고 있었다 — 그 결정 전에 쓴 것이다.  */
  T('고교를 잘 보내면 2군 기준이 낮다 (그래도 2군은 거친다)', ()=>ev(`(function(){
    ST.myRatings=null; ST.myRatingsOK=false; ST.myFarm=0; ST.myGuarantee=0;
    ST.hs={i:0,done:false,res:[],bat:blankBat(),pit:blankPit(),moments:[],
           pending:null,eff:{},picks:[],picked:{}};
    ST.hs.bat.g=7; ST.hs.bat.pa=30; ST.hs.bat.ab=26; ST.hs.bat.h=11;  // 4할2푼
    ST.hs.bat.d2=4; ST.hs.bat.hr=3; ST.hs.bat.bb=4; ST.hs.bat.sb=4; ST.hs.bat.d3=2;
    hsGraduate();
    var good=ST.farmBar;
    ST.hs.bat.h=2; ST.hs.bat.ab=20; ST.myRatings=null; ST.myRatingsOK=false;
    hsGraduate();
    var bad=ST.farmBar;
    return (ST.myFarm>0 && good<bad) ? ('잘 보내면 '+fmt3(good)+' · 못 보내면 '+fmt3(bad))
      : '!'+ST.myFarm+'/'+good+'/'+bad;
  })()`));
  T('2군 팀이 아홉을 채운다', ()=>ev(`(function(){
    ST.farm=[]; farmFill(9); ST.myFarm=3; ST.farmMe={g:0,ab:0,h:0};
    var t=farmOurTeam();
    return (t.players.length>=10 && t.pitchers.length>=1)
      ? t.players.length+'명 · 투수 '+t.pitchers.length+'명' : '!'+t.players.length;
  })()`));
  T('2군에서도 내가 고른 자리에 선다', ()=>ev(`(function(){
    var B=farmBuild();
    var m=B.uLine.find(function(x){return x.id==='ksh';});
    return (m && m.pos===ST.myPos) ? '내 자리 '+m.pos : '!'+(m?m.pos:'라인업에 없다');
  })()`));
  T('2군 투수도 능력치가 있다 (undefined 면 경기가 안 끝난다)', ()=>ev(`(function(){
    var B=farmBuild();
    var bad=[];
    [B.us,B.foe].forEach(function(t){
      (t.pitchers||[]).forEach(function(q){
        if(q.stf==null||q.ctl==null||q.sta==null) bad.push(t.name+'/'+q.name); });
    });
    return bad.length? '!'+bad.slice(0,3).join(',') : '양 팀 투수 전부 정상';
  })()`));
  T('2군 경기가 실제로 끝까지 돈다', ()=>ev(`(function(){
    var B=farmBuild();
    var T2={bat:'normal',run:'normal',hook:'normal'};
    var L=new LiveGame({
      away:B.homeUs?B.foe:B.us, home:B.homeUs?B.us:B.foe,
      awayLineup:B.homeUs?B.fLine:B.uLine, homeLineup:B.homeUs?B.uLine:B.fLine,
      awayRotation:B.homeUs?B.fRot:B.uRot, homeRotation:B.homeUs?B.uRot:B.fRot,
      awayTactics:T2, homeTactics:T2, awayCond:{}, homeCond:{},
      userIsHome:B.homeUs, myId:B.me, rng:B.rng, innings:7,
      park:{hr:0.9,d2:1,d3:1,err:1.2,babip:1}});
    L.manual=false;
    var n=0; while(!L.over && n++<3000){ if(L.pending)L.applyDecision('change'); L.step(); }
    return L.over ? (n+'타석에 끝났다 · '+L.away.runs+':'+L.home.runs) : '!안 끝났다('+n+')';
  })()`));

  console.log('\n[훈련 코인]');
  T('경기 성적이 코인이 된다', ()=>ev(`(function(){
    var good=coinsForGame({box:{ksh:{...blankBat(), pa:4,ab:4,h:3,d2:1,hr:1,rbi:3}}}, true, false);
    var bad =coinsForGame({box:{ksh:{...blankBat(), pa:4,ab:4,h:0,e:1}}}, false, false);
    return (good.n>bad.n && good.n>=10 && bad.n<0)
      ? '3안타 홈런 승리 +'+good.n+' vs 무안타 실책 패배 '+bad.n : '!'+good.n+'/'+bad.n;
  })()`));
  /* [주의] 코인은 **살 때** 빠진다(trainBuy). applyMyTrain 은 산 것을
     몸에 붙일 뿐이다 — 예전 검사는 붙일 때 빠지는 줄 알고 있었다.   */
  T('훈련을 사면 그 자리에서 코인이 빠진다', ()=>ev(`(function(){
    ST.coin=40; ST.myTrainQ=[]; ST.myTrain=null; ST.myFarm=0;
    var cost=trainCost(pmTrainDef('bat'));
    var before=ST.coin;
    var err=trainBuy('bat');
    return (!err && ST.coin===before-cost && trainQueue().length===1)
      ? before+' → '+ST.coin+' (타격 '+cost+'코인)' : '!'+err+'/'+before+'→'+ST.coin;
  })()`));
  T('무르면 돌려받는다', ()=>ev(`(function(){
    var before=ST.coin;
    var cost=trainCost(pmTrainDef('bat'));
    trainRefund(0);
    return (ST.coin===before+cost && trainQueue().length===0)
      ? '돌려받았다' : '!'+before+'→'+ST.coin;
  })()`));
  T('코인이 모자라면 못 산다', ()=>ev(`(function(){
    ST.coin=1; ST.myTrainQ=[]; ST.myTrain=null;
    var err=trainBuy('bat');
    return (err && /코인이/.test(err) && trainQueue().length===0)
      ? err : '!'+err;
  })()`));
  T('산 것이 다음 주에 몸에 붙는다', ()=>ev(`(function(){
    ST.coin=40; ST.myTrainQ=[]; ST.myTrain=null; ST.myFarm=0;
    var p=TBYID['wwzw'].players.find(function(x){return x.id==='ksh';});
    var before=p.con;
    trainBuy('bat');
    applyMyTrain();
    return (p.con>before) ? '컨택 '+before.toFixed(1)+' → '+p.con.toFixed(1)
      : '!'+before+'→'+p.con;
  })()`));
  T('쉬는 건 공짜다', ()=>ev("trainCost(pmTrainDef('rest'))===0"));
  T('0 밑으로는 안 내려간다', ()=>ev("(function(){ST.coin=1;coinAdd(-99);return ST.coin===0;})()"));

  /* [제보] "2군인데 왜 단톡방으로 버튼이 있고 단톡방 버튼을 누르면
             2군 경기 진행안하고 1군 결과만 보기 누르고 다음주로 넘어가지네
             가끔 라인업에 껴있기도하네"                              */
  console.log('\n[2군일 때 홈이 어디로 보내나]');
  const inFarm=(played)=>ev(`(function(){
    ST.mode='player'; ST.playerId='ksh'; MYID='ksh';
    ST.myFarm=1; ST.farmBar=0.280; ST.farmMe={g:0,ab:0,h:0};
    ST.weekDone=true; ST.announced=false; ST.lineupDirty=false;
    ST.round=3; ST.events=[]; ST.absent={}; ST.injury={};
    ST.farmDone=${played?1:0}; ST.farmDoneSeen=0;
    var st=nextStepInfo();
    return st? (st.label+' | '+(st.sub||'')) : '!없다';
  })()`);
  T('2군인데 아직 안 쳤으면 「2군 경기」 로 보낸다', ()=>{
    const r=inFarm(false);
    return /2군 경기/.test(r) ? r : '!'+r;
  });
  T('단톡방(1군 라인업 발표)으로 안 보낸다', ()=>{
    const r=inFarm(false);
    return !/단톡방/.test(r) ? '안 보낸다' : '!'+r;
  });
  T('2군 경기를 치고 나면 그때 1군 결과로 보낸다', ()=>{
    const r=inFarm(true);
    return /1군 결과/.test(r) ? r : '!'+r;
  });
  T('2군이면 「그날」(아침·단톡방·차·구장)을 안 연다', ()=>ev(`(function(){
    ST.myFarm=1; ST.weekDone=true; ST.day={step:0,picks:{},log:[],done:false,night:-1,nlog:[],ndone:false};
    var a=dayPending();
    ST.myFarm=0;
    var b=dayPending();
    ST.myFarm=0; ST.day=null;
    return (!a && b) ? '2군이면 안 열리고 1군이면 열린다' : '!'+a+'/'+b;
  })()`));
  T('홈 「오늘」 칸이 2군 경기 입구가 된다', ()=>ev(`(function(){
    ST.myFarm=1; ST.farmMe={g:0,ab:0,h:0}; ST.weekDone=true; ST.announced=true;
    ST.farmDone=0; ST.farmDoneSeen=0;
    ST.schedule[ST.round].played=false;
    renderHomePlayer();
    var t=document.querySelector('#view').textContent;
    var tap=document.querySelectorAll('#view .mystatus.tapon').length;
    ST.myFarm=0;
    return (/2군 경기다/.test(t) && tap>0) ? '눌러서 경기장으로' : '!'+tap+'/'+t.slice(0,60);
  })()`));
  /* [주의] 강등은 로스터 13명 이상 + 확률 45% + 3주 쿨다운이라 한 번
     굴려서는 안 난다. 조건을 매번 다시 깔고 충분히 굴린다 — 안 그러면
     앞 검사가 로스터를 줄여놨을 때 간헐로 실패한다.                */
  T('내려보내면 그 자리에서 라인업에서 빠진다', ()=>ev(`(function(){
    ST.myFarm=0; ST.myGuarantee=0; ST.myBenched=0; ST.injury={}; ST.absent={};
    ST.farm=[]; farmFill(12);
    ST.farm.slice(0,4).forEach(function(p){ p.up=true; });
    applyFarm();
    var down=false;
    for(var i=0;i<80;i++){
      ST.bat['ksh']={...blankBat(), ab:30, h:3, pa:32};   // 1할
      ST.lineup=recommendLineup(); applyDHRule();
      if(!ST.lineup.some(function(x){return x.id==='ksh';}))
        ST.lineup[0]={id:'ksh', pos:'C'};
      ST.round=12; ST.farmMove=-99;
      farmWeek(makeRng(500+i));
      if((ST.myFarm||0)>0){ down=true; break; }
    }
    if(!down) return '!강등이 안 났다 (로스터 '+TBYID['wwzw'].players.length+'명)';
    var inLine=(ST.lineup||[]).some(function(x){return x.id==='ksh';});
    ST.myFarm=0; ST.farmMe=null; ST.absent={};
    return !inLine ? '타순에서 빠졌다' : '!아직 타순에 있다';
  })()`));
  T('아홉이 안 되면 거짓말 대신 진짜로 콜업한다', ()=>ev(`(function(){
    ST.myFarm=1; ST.farmMe={g:0,ab:0,h:0}; ST.round=15; ST.farmMove=-99;
    ST.farmDone=0; ST.farmDoneSeen=0;
    /* 나 빼고 전부 결장시킨다 */
    var us=TBYID['wwzw']; ST.absent={};
    us.players.forEach(function(p){ if(p.id!=='ksh') ST.absent[p.id]='사정'; });
    var ms=farmWeek(makeRng(31337));
    var up=(ST.myFarm===0);
    ST.absent={}; ST.myFarm=0; ST.farmMe=null;
    return (up && ms.some(function(m){return /콜업/.test(m.title);}))
      ? '급하게 올렸다' : '!'+ST.myFarm;
  })()`));
  T('2군이면 저녁(회식·자기 전 단톡방)도 안 연다', ()=>ev(`(function(){
    ST.myFarm=1; ST.day={step:0,picks:{},log:[],done:true,night:-1,nlog:[],ndone:false};
    nightOpen(); var a=nightPending();
    ST.myFarm=0; nightOpen(); var b=nightPending();
    ST.myFarm=0; ST.day=null;
    return (!a && b) ? '2군이면 안 열리고 1군이면 열린다' : '!'+a+'/'+b;
  })()`));
  T('2군인 나는 라인업 후보에서 빠진다', ()=>ev(`(function(){
    ST.myFarm=1; ST.absent={}; ST.injury={};
    var lu=recommendLineup();
    var inL=lu.some(function(x){return x.id==='ksh';});
    ST.myFarm=0;
    return !inL ? '후보에 없다' : '!끼어 있다';
  })()`));

  console.log('\n[화면]');
  T('선수단 화면에 2군이 뜬다', ()=>ev(`(function(){
    go('squad');
    var t=document.querySelector('#view').textContent;
    return /2군 \\(/.test(t) ? '2군 카드 있다' : '!없다';
  })()`));
  T('화면에 undefined 가 없다', ()=>ev(
    "!/undefined|NaN/.test(document.querySelector('#view').textContent)"));

  console.log('\n[예외]');
  T('콘솔 예외 없음', ()=>errs.length?('!'+errs.slice(0,2).join(' / ')):'깨끗');
  console.log(errs.length?`\n❌ ${errs.length}개 실패`:'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})();
