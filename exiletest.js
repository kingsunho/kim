/* [2.49.0] 분탕형 — 내쫓은 선수가 다른 팀에서 우리 상대로 나온다.

   [계획서] 플레이어 유형 3번(분탕형)의 처방:
   "내쫓은 선수가 다른 팀 가서 우리 상대로 나오게 하기"

   예전엔 나간 사람이 그냥 사라졌다. 불만을 방치해도 대가가 없었던 셈이다.

   주의: T() 는 문자열을 '통과 + 설명' 으로 친다. 실패는 반드시 false 다.  */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const errs=[], jsErr=[];
const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Not implemented/.test(e.message)) jsErr.push(e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{}; dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0);
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!ok)errs.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300); ev("ST.tutDone=true");

  console.log('[내보낸다]');
  const r0=ev(`(function(){
    /* 내가 고른 선수는 안 나가니 다른 사람을 고른다 */
    var me=ST.playerId||MYID;
    var p=TBYID['wwzw'].players.find(function(x){return x.id!==me});
    window.__pid=p.id; window.__nm=p.name;
    var before=TBYID['wwzw'].players.length;
    var msgs=leaveTeam(ST,p.id);
    var rec=(ST.leftPlayers||[]).find(function(z){return z.pid===p.id});
    return {nm:p.name, before:before, after:TBYID['wwzw'].players.length,
      to:rec&&rec.to, toName:(rec&&rec.to&&TBYID[rec.to])?TBYID[rec.to].name:'',
      msg:msgs.map(function(m){return m.text||m.txt||''}).join(' | ')};
  })()`);
  T('로스터에서 빠진다', ()=>r0.after===r0.before-1 && `${r0.before} → ${r0.after}명`);
  T('갈 팀이 정해진다', ()=>!!r0.to && `${r0.nm} → ${r0.toName}`);
  T('어디로 갔는지 알려준다', ()=>new RegExp(r0.toName).test(r0.msg) && '이탈 알림에 팀 이름이 있다');

  console.log('\n[상대 로스터에 들어갔나]');
  const r1=ev(`(function(){
    var t=TBYID[ (ST.leftPlayers[0]||{}).to ];
    var inRoster=t.players.some(function(p){return p.id===window.__pid});
    var lineup=aiLineup(t);
    return {team:t.name, n:t.players.length, inRoster:inRoster,
      inLineup:lineup.some(function(s){return s.id===window.__pid}),
      exiled:exiledOn(t.id).map(function(x){return x.name}).join(',')};
  })()`);
  T('상대 팀 로스터에 들어간다', ()=>r1.inRoster && `${r1.team} (${r1.n}명)`);
  T('상대 라인업에 실제로 선다', ()=>r1.inLineup && '선발 9명 안에 있다');
  T('exiledOn 이 찾아준다', ()=>r1.exiled.length>0 && r1.exiled);

  console.log('\n[새로고침해도 유지되나]');
  /* 선수 능력치는 세이브에 안 들어간다. 매 부팅마다 상수에서 새로 만들어지니
     normalizeState 가 매번 다시 꽂아줘야 한다. 이게 이 기능의 제일 약한 고리다. */
  const r2=ev(`(function(){
    var save=JSON.parse(serializeState());
    TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(function(t){TBYID[t.id]=t});
    ST=save; normalizeState();
    var t=TBYID[ (ST.leftPlayers[0]||{}).to ];
    return {us:TBYID['wwzw'].players.some(function(p){return p.id===window.__pid}),
            them:t.players.filter(function(p){return p.id===window.__pid}).length,
            pit:(t.pitchers||[]).filter(function(q){return q.id===window.__pid}).length};
  })()`);
  T('새로고침 후에도 우리 팀엔 없다', ()=>r2.us===false && '안 돌아온다');
  T('새로고침 후에도 상대 팀에 있다', ()=>r2.them===1 && '그대로 있다');
  T('여러 번 불려도 중복으로 안 들어간다', ()=>{
    ev("normalizeState(); normalizeState(); normalizeState();");
    const n=ev(`(function(){var t=TBYID[(ST.leftPlayers[0]||{}).to];
      return {p:t.players.filter(function(p){return p.id===window.__pid}).length,
              q:(t.pitchers||[]).filter(function(q){return q.id===window.__pid}).length};})()`);
    return n.p===1 && n.q<=1 && `타자 ${n.p}명 · 투수 ${n.q}명`;
  });

  console.log('\n[같은 팀으로 가나 — 새로고침 재추첨 방지]');
  T('시드가 같으면 같은 팀이 나온다', ()=>{
    const a=ev(`(function(){var me=ST.playerId||MYID;
      var p=TBYID['wwzw'].players.find(function(x){return x.id!==me});
      return pickNewTeam(ST,p.id)+'|'+pickNewTeam(ST,p.id)+'|'+pickNewTeam(ST,p.id);})()`);
    const parts=a.split('|');
    return parts[0]===parts[1] && parts[1]===parts[2] && parts[0];
  });

  console.log('\n[화면에 뜨나]');
  const shown=ev(`(function(){
    var to=(ST.leftPlayers[0]||{}).to;
    /* 그 팀과 붙는 주로 맞춰놓는다 */
    var i=ST.schedule.findIndex(function(x){return x.opp===to});
    if(i<0){ ST.schedule[ST.round].opp=to; } else { ST.round=i; }
    /* 지난 경기는 결과까지 채워야 홈 화면이 안 깨진다 (result.us 를 읽는다) */
    ST.schedule.forEach(function(x,k){
      x.played=k<ST.round;
      x.result=x.played?{us:5,them:4,w:true}:null; });
    ST.weekDone=true; ST.announced=true; ST.lineupDirty=false;
    ST.events=[]; ST.absent={};
    return true;
  })()`);
  w.go('game'); await wait(150);
  const gtxt=d.getElementById('view').textContent;
  T('경기 화면에서 내쫓은 선수를 짚어준다', ()=>
    /우리가 내보낸/.test(gtxt) && new RegExp(r0.nm).test(gtxt) && `"${r0.nm}" 표시됨`);
  w.go('home'); await wait(150);
  T('홈 준비 화면에도 한 줄 뜬다', ()=>{
    const h=d.getElementById('view').textContent;
    return /우리가 내보낸 사람이 저기 있다/.test(h) && '있음';
  });

  console.log('\n[실제로 우리 상대로 뛰나]');
  const played=ev(`(function(){
    ST.lineup=recommendLineup(); applyDHRule(); sanitizeRotation();
    var L=makeLive(); var k=0; while(!L.over&&k++<3000){L.pending=null;L.step();}
    L.finish();
    var b=L.result.box[window.__pid];
    return {pa:(b&&b.pa)||0, opp:ST.schedule[ST.round].opp};
  })()`);
  T('우리 경기에 타석에 선다', ()=>played.pa>0 && `${r0.nm} ${played.pa}타석`);
  T('도는 동안 에러 없음', ()=>jsErr.length===0 && '깨끗');

  console.log(errs.length? '\n❌ '+errs.length+'개 실패' : '\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
