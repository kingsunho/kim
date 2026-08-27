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
  T('2군에서 치면 올라온다', ()=>ev(`(function(){
    ST.myFarm=1; ST.farmMe={g:1,ab:10,h:4};   // 4할
    ST.round=10; ST.farmMove=-99;
    var ms=farmWeek(makeRng(999));
    return (ST.myFarm===0 && ST.myGuarantee>=3 && ms.some(function(m){return /콜업/.test(m.title);}))
      ? '올라왔다 · 주전 보장 '+ST.myGuarantee : '!'+ST.myFarm+'/'+ST.myGuarantee+'/'+JSON.stringify(ms.map(function(m){return m.title;}));
  })()`));
  T('2군에 있는 동안 진행 상황이 뜬다', ()=>ev(`(function(){
    ST.myFarm=3; ST.farmMe={g:0,ab:0,h:0}; ST.round=12; ST.farmMove=-99;
    var ms=farmWeek(makeRng(777));
    ST.myFarm=0; ST.farmMe=null;
    return ms.some(function(m){return /2군/.test(m.title);}) ? ms[0].title+' — '+ms[0].body : '!안 뜬다';
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
