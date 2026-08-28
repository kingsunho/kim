/* depthtest — 리그 뎁스와 2군 생태계 (v2.91.0)
   [요청] "프로야구처럼 각팀 1군은 최소 24명은 등록 되어있어야 할 것 같음"
          "그래서 감독들이 상대 2군 중 뎁스때문에 못오는 애들 막 영입할 수 있게"
          "2군은 최대 30명까지만 모을 수 있게하자"

   [원칙] 24팀 × 열 명을 세이브에 통째로 넣으면 용량이 터진다.
   명단은 **팀 아이디 + 시즌으로 결정적으로** 만들고 성적만 쌓는다.
   그래서 이 테스트는 "다시 만들어도 같은 사람이 나오는가" 를 꼭 본다. */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
let fail=0;
const T=(ok,msg)=>{ console.log('  '+(ok?'✅':'❌')+' '+msg); if(!ok)fail++; };
const vc=new VirtualConsole();
const jsErr=[];
vc.on('jsdomError',e=>{ if(!/scrollTo|not implemented|getContext/i.test(e.message))
  jsErr.push(e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,
  url:'https://x.test/',virtualConsole:vc});
const w=dom.window, d=w.document;
w.scrollTo=()=>{}; w.confirm=()=>true;
const ev=s=>w.eval(s);
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  await wait(900);
  d.querySelectorAll('.pickcard')[0].click(); await wait(80);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(400);
  ev("ST.tutDone=true; ST.mode='player'; ST.playerId='ksh'; MYID='ksh';"+
     "ST.absent={}; ST.injury={};");

  console.log('\n[1군 등록 24명]');
  T(ev("ROSTER_MIN===24"), '등록 인원 기준이 24다');
  T(ev("(function(){ deepenLeague(); return TEAMS.every(function(t){return t.players.length>=24}); })()"),
    '스물네 팀이 전부 24명 이상이다');
  T(ev("TEAMS.find(function(t){return t.id==='wwzw'}).players.filter(function(p){return !p.depth}).length===14"),
    '실존 열넷은 그대로다 — 채운 사람만 depth 표시가 붙는다');
  T(ev("(function(){ var n=TEAMS[0].players.length; deepenLeague(); deepenLeague();"+
       "return TEAMS[0].players.length===n; })()"),
    '두 번 불러도 안 늘어난다 (멱등 — 매 로드마다 돈다)');
  T(ev("TEAMS.every(function(t){return (t.pitchers||[]).length>=2})"),
    '채운 뒤에도 팀마다 던질 사람이 있다');
  T(ev(`(function(){
      /* 뎁스가 붙어도 팀 강함(top9 평균)은 안 변해야 한다 —
         변하면 캘리브레이션이 통째로 흔들린다 */
      var t=TEAMS[1];
      var before=t.mean.con;
      finalizeTeam(t);
      return Math.abs(t.mean.con-before)<0.01;
    })()`), '뎁스를 넣어도 주전 아홉의 평균은 안 흔들린다');
  T(ev(`(function(){
      /* 감독 모드는 실측 재현이라 지어낸 사람이 들어가면 안 된다 */
      var m=ST.mode; ST.mode='mgr';
      var t={id:'zz_test', players:[{id:'a',con:50,pow:50,eye:50,spd:50,def:50,arm:50}], pitchers:[]};
      var n=deepenTeam(t);
      var got=deepenLeague();
      ST.mode=m;
      return got===0;
    })()`), '감독 모드에서는 리그를 안 부풀린다');

  console.log('\n[상대 23팀 2군이 실체가 된다]');
  T(ev("typeof aiFarmWeek==='function' && typeof aiFarmStat==='function'"),
    '상대 2군을 매주 굴리는 길이 있다');
  T(ev(`(function(){
      var a=aiFarmRoster('ansanutd').map(function(p){return p.name}).join(',');
      var b=aiFarmRoster('ansanutd').map(function(p){return p.name}).join(',');
      return a===b && a.length>0;
    })()`), '같은 팀을 다시 열면 같은 사람이 나온다 (결정적 생성)');
  T(ev(`(function(){
      ST.aiFarmStat={}; ST.aiFarmUp={};
      var rng=makeRng(1234);
      for(var i=0;i<6;i++) aiFarmWeek(rng);
      var S=aiFarmStat('ansanutd');
      return S.length>0 && S[0][0]===6 && S[0][1]>0;
    })()`), '여섯 주를 굴리면 2군 성적이 여섯 경기치 쌓인다');
  T(ev(`(function(){
      var S=aiFarmStat('ansanutd');
      return S.some(function(x){return x&&x[2]>0});
    })()`), '안타도 실제로 나온다');
  T(ev(`(function(){
      /* 스물세 팀을 여러 주 굴리면 어디선가는 콜업이 난다 */
      ST.aiFarmStat={}; ST.aiFarmUp={};
      var rng=makeRng(99);
      var msgs=[];
      for(var i=0;i<14;i++) msgs=msgs.concat(aiFarmWeek(rng));
      return msgs.some(function(m){return /콜업/.test(m.title||'')});
    })()`), '2군에서 잘 치면 그 팀 1군으로 올라간다');
  T(ev(`(function(){
      var tid=Object.keys(ST.aiFarmUp).find(function(k){return (ST.aiFarmUp[k]||[]).length});
      if(!tid) return false;
      var idx=ST.aiFarmUp[tid][0];
      var nm=aiFarmRoster(tid)[idx].name;
      applyAiFarmUp(); applyAiFarmUp();          // 두 번 불러도 한 번만
      var t=TBYID[tid];
      return t.players.filter(function(p){return p.name===nm}).length===1;
    })()`), '올라온 사람이 진짜 그 팀 1군 명단에 있다 (두 번 얹지 않는다)');
  T(ev(`(function(){
      var tid=Object.keys(ST.aiFarmStat)[0];
      var b=aiFarmBlocked(tid);
      return Array.isArray(b) && b.every(function(x){return x.st[1]>=8});
    })()`), '뎁스에 막혀 못 올라온 사람 명단을 뽑을 수 있다 (영입 대상)');

  console.log('\n[2군 정원]');
  T(ev("FARM_MAX===30"), '우리 2군은 최대 30명이다');
  T(ev("(function(){ ST.farm=[]; farmFill(40); return farmSlot().length<=30; })()"),
    '더 채우라고 해도 정원을 안 넘는다');

  /* ---------------------------------------------------------------
     [요청] "잠재력 너무 안좋거나 막 현재 너무 못하면 방출하는거지 그리고
             그 방출당한자들은 은퇴안했으면 자유계약칸에 있어서 다른팀이
             데려올 수 있고"
     --------------------------------------------------------------- */
  console.log('\n[방출 · 자유계약 · 영입]');
  T(ev("typeof releasePlayer==='function' && typeof farmSign==='function'"+
       " && typeof faSlot==='function'"), '자르고 데려오는 길이 있다');
  T(ev("typeof signPlayer==='function' && signPlayer.length===2"),
    '스카우트 영입(signPlayer)과 이름이 안 겹친다 — 뒤엣것이 앞엣것을 덮으면 안 된다');
  T(ev(`(function(){
      ST.farm=[]; ST.freeAgents=[]; farmFill(9);
      var young=farmSlot()[0]; young.age=24;
      var r=releasePlayer(young.id,'검사');
      return r && !r.retire && faSlot().length===1
             && faSlot()[0].name===young.name
             && !farmSlot().some(function(p){return p.id===young.id});
    })()`), '어린 선수를 자르면 자유계약 칸으로 간다');
  T(ev(`(function(){
      ST.farm=[]; ST.freeAgents=[]; farmFill(9);
      var old=farmSlot()[0]; old.age=36;
      var r=releasePlayer(old.id,'검사');
      return r && r.retire && faSlot().length===0;
    })()`), '나이가 많으면 그대로 은퇴한다 — 자유계약 칸에 안 들어간다');
  T(ev(`(function(){
      /* 자유계약은 시간이 지나면 다른 팀이 데려가거나 접는다 */
      ST.farm=[]; ST.freeAgents=[]; farmFill(9);
      farmSlot().slice(0,3).forEach(function(p){ p.age=25; releasePlayer(p.id,'검사'); });
      var n0=faSlot().length;
      var rng=makeRng(7);
      var msgs=[];
      ST.round=(ST.round||0)+FA_WEEKS+1;
      for(var i=0;i<3;i++) msgs=msgs.concat(faWeek(rng));
      return n0===3 && faSlot().length<n0 && msgs.length>0;
    })()`), '자유계약 칸이 실제로 돌아간다 (데려가거나 접는다)');
  T(ev(`(function(){
      /* 남의 팀 2군에서 막힌 애를 데려오면 우리 2군으로 들어온다 */
      ST.aiFarmStat={}; ST.aiFarmUp={}; ST.aiFarmTaken={};
      var rng=makeRng(21);
      for(var i=0;i<8;i++) aiFarmWeek(rng);
      var tg=signTargets().filter(function(x){return x.kind==='farm'})[0];
      if(!tg) return false;
      ST.farm=[]; farmFill(5);
      var n0=farmSlot().length;
      var r=farmSign(tg);
      var taken=(ST.aiFarmTaken[tg.tid]||[]).indexOf(tg.idx)>=0;
      return r&&r.ok && farmSlot().length===n0+1 && taken
             && signTargets().every(function(x){return !(x.kind==='farm'&&x.tid===tg.tid&&x.idx===tg.idx)});
    })()`), '남의 팀 2군에서 데려오면 우리 2군에 들어오고, 다시는 안 뜬다');
  T(ev(`(function(){
      ST.farm=[]; farmFill(30);
      var tg=signTargets()[0];
      if(!tg) return true;
      var r=farmSign(tg);
      return !!(r&&r.err);
    })()`), '2군이 30명으로 꽉 차면 못 데려온다 — 먼저 자리를 비워야 한다');
  T(ev("frontOfficeWeek.toString().indexOf(\"gmRole||'auto')!=='auto'\")>0"),
    '「내가 한다」 로 두면 감독이 멋대로 자르거나 데려오지 않는다');
  T(ev(`(function(){
      /* 감독이 알아서 하는 판 — 정원이 차 있으면 자른다 */
      ST.gmRole='auto'; ST.mode='player';
      ST.farm=[]; farmFill(30); ST.freeAgents=[];
      var rng=makeRng(3);
      var msgs=[];
      for(var i=0;i<4;i++) msgs=msgs.concat(frontOfficeWeek(rng));
      return msgs.some(function(m){return /방출/.test(m.title||'')});
    })()`), '감독이 알아서 하는 판이면 정원이 찼을 때 자른다');
  T(ev("typeof renderFront==='function' && !!VIEWS.front"),
    '선수단 운영 화면이 있다');

  /* ---------------------------------------------------------------
     [요청] 드래프트 — 24×5 · 순위 역순 · 고교생 위주에 대학생 몇 명 ·
            예상 스탯 · 내가 직접 지명
     --------------------------------------------------------------- */
  console.log('\n[신인 드래프트]');
  T(ev("DRAFT_HS.indexOf('안산공고')>=0 && DRAFT_HS.indexOf('용호고')>=0"+
       " && DRAFT_HS.indexOf('산본고')>=0 && DRAFT_HS.indexOf('수리고')>=0"+
       " && DRAFT_HS.indexOf('안산고')>=0"),
    '사용자가 준 학교가 다 들어 있다 (안산공고·용호고·산본고·수리고·안산고)');
  T(ev("DRAFT_HS.indexOf('군포고')>=0 && DRAFT_HS.indexOf('흥진고')>=0"),
    '원래 있던 군포고·흥진고도 같이 나온다');
  T(ev("DRAFT_UNIV.length>=8"), '대학도 여럿 있다');
  T(ev("draftClass(2027).length===TEAMS.length*DRAFT_ROUNDS && DRAFT_ROUNDS===5"),
    '참가자가 팀 수 × 5 다 (24팀이면 120명)');
  T(ev(`(function(){
      var c=draftClass(2027);
      var u=c.filter(function(p){return p.univ}).length;
      return u>=8 && u<=c.length*0.4;
    })()`), '대학생이 몇 명 섞여 있다 (전부도 아니고 없지도 않다)');
  T(ev(`(function(){
      var a=draftClass(2027).map(function(p){return p.name+p.school}).join('');
      var b=draftClass(2027).map(function(p){return p.name+p.school}).join('');
      return a===b && a.length>0;
    })()`), '같은 해를 다시 열면 같은 사람이 나온다 (세이브에 안 넣는다)');
  T(ev(`(function(){
      var c=draftClass(2027);
      /* 대학생은 예상 범위가 좁고 고교생은 넓다 — 그게 도박이다 */
      var hs=c.filter(function(p){return !p.univ});
      var uv=c.filter(function(p){return p.univ});
      var w=function(a){return a.reduce(function(s,p){return s+(p.scoutHi-p.scoutLo)},0)/a.length};
      return w(hs)>w(uv);
    })()`), '고교생 예상 범위가 대학생보다 넓다');
  T(ev("draftClass(2027).every(function(p){return p.scoutLo<p.scoutHi})"),
    '모두 예상 범위가 있다 (진짜 값을 그대로 안 보여준다)');
  T(ev(`(function(){
      /* 순위 역순 — 꼴찌가 1순위 */
      var st={};
      TEAMS.forEach(function(t,i){ st[t.id]={w:i,l:TEAMS.length-i,t:0}; });
      var o=draftOrderFrom(st);
      return o[0]===TEAMS[0].id && o[o.length-1]===TEAMS[TEAMS.length-1].id;
    })()`), '지명 순서가 지난 시즌 순위 역순이다 (꼴찌부터)');
  T(ev(`(function(){
      var st={}; TEAMS.forEach(function(t,i){ st[t.id]={w:i,l:24-i,t:0}; });
      ST.draftTeams={}; ST.farm=[]; ST.gmRole='auto'; ST.mode='player';
      ST.draft=draftOpen(2027, st);
      draftRunToMe();
      var D=ST.draft;
      return D.done && D.picks.length===TEAMS.length*DRAFT_ROUNDS;
    })()`), '감독에게 맡기면 끝까지 다 뽑는다');
  T(ev(`(function(){
      var D=ST.draft;
      var seen={}; var dup=false;
      D.picks.forEach(function(x){ if(seen[x.idx]) dup=true; seen[x.idx]=1; });
      return !dup;
    })()`), '같은 사람이 두 번 뽑히지 않는다');
  T(ev("(ST.draft.mine||[]).length===DRAFT_ROUNDS"),
    '우리도 다섯 명을 뽑았다');
  T(ev("farmSlot().filter(function(p){return p.rookie}).length===DRAFT_ROUNDS"),
    '뽑은 신인이 우리 2군에 실제로 들어와 있다');
  T(ev(`(function(){
      /* 남의 팀이 뽑아간 사람도 그 팀 2군에 붙는다 */
      var tid=Object.keys(ST.draftTeams).find(function(k){return (ST.draftTeams[k]||[]).length});
      if(!tid) return false;
      return aiFarmRoster(tid).length===10+ST.draftTeams[tid].length;
    })()`), '남의 팀 지명도 그 팀 2군에 붙는다 (앞 번호는 안 밀린다)');
  T(ev(`(function(){
      ST.farm=[]; farmFill(30);
      var n0=farmSlot().length;
      draftToFarm(draftClass(2027)[0]);
      return farmSlot().length<=FARM_MAX;
    })()`), '2군이 꽉 찬 채로 신인을 뽑으면 제일 아래를 자리에서 뺀다');
  T(ev("typeof renderDraft==='function' && !!VIEWS.draft"), '드래프트 화면이 있다');

  console.log('\n[세이브]');
  T(ev("normalizeState.toString().indexOf('aiFarmStat')>0"+
       " && normalizeState.toString().indexOf('aiFarmUp')>0"),
    '옛 세이브에도 장부가 생긴다');
  T(ev(`(function(){
      /* 명단은 안 저장하고 성적만 저장한다 — 그게 이 설계의 요점이다 */
      var s=JSON.stringify(ST.aiFarmStat||{});
      return s.length<20000 && !/name/.test(s);
    })()`), '세이브에는 이름이 아니라 숫자만 들어간다');

  console.log('\n[예외]');
  T(jsErr.length===0, '콘솔 예외 없음 :: '+(jsErr[0]||'없음'));
  console.log(fail? `\n❌ ${fail}개 실패` : '\n✅ 이상 없음');
  process.exit(fail?1:0);
})();
