/* sweeptest — 화면을 전부 실제로 그려보고 눈에 띄는 사고를 찾는다
   [왜] v2.97.0 의 「초고교급 undefined」 는 **테스트가 아니라 실제로
   찍어봐서** 잡혔다. 단정문은 내가 의심한 것만 본다. 이건 반대다 —
   전 화면을 그려놓고 **화면에 나오면 안 되는 글자**를 찾는다.
     undefined · NaN · [object Object] · null · 빈 화면 · 콘솔 예외
   새 화면을 만들면 아래 SCREENS 에 한 줄만 추가하면 된다.          */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
let fail=0;
const T=(ok,msg)=>{ console.log('  '+(ok?'✅':'❌')+' '+msg); if(!ok)fail++; };
const vc=new VirtualConsole();
const jsErr=[];
vc.on('jsdomError',e=>{ if(!/scrollTo|not implemented|getContext|canvas/i.test(e.message))
  jsErr.push(e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,
  url:'https://x.test/',virtualConsole:vc});
const w=dom.window, d=w.document;
w.scrollTo=()=>{}; w.confirm=()=>true;
const ev=s=>w.eval(s);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const BAD=/undefined|NaN|\[object Object\]|\bnull\b/;
const ST_round=()=>Number(dom.window.eval('ST.round'))||0;

(async()=>{
  await wait(900);
  d.querySelectorAll('.pickcard')[0].click(); await wait(80);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(400);

  /* 여섯 주쯤 지난 시즌 한가운데를 만든다 — 빈 상태로만 보면
     「기록이 없어서 안 뜬 것」과 「버그로 안 뜬 것」이 구별이 안 된다. */
  ev(`(function(){
    ST.tutDone=true; ST.mode='player'; ST.role='two'; ST.myPos='C';
    ST.playerId='ksh'; MYID='ksh'; ST.absent={}; ST.injury={};
    ST.year=2019; ST.round=11; ST.weekDone=true; ST.announced=true;
    ST.gmRole='me';
    deepenLeague();
    var us=TBYID['wwzw'];
    us.players.forEach(function(p,i){
      ST.bat[p.id]=ST.bat[p.id]||blankBat();
      var b=ST.bat[p.id]; b.pa=44;b.ab=40;b.h=15-i%7;b.d2=4;b.d3=1;
      b.hr=(i<3?2:0);b.rbi=11;b.bb=5;b.sb=i%3;b.k=6;b.r=8;
      ST.cond[p.id]=70; ST.morale[p.id]=70;
    });
    (us.pitchers||[]).forEach(function(q,i){
      ST.pit[q.id]=ST.pit[q.id]||blankPit();
      var l=ST.pit[q.id]; l.outs=21+i*3;l.h=14;l.r=9;l.er=7;l.bb=8;l.k=11;l.np=180;
    });
    TEAMS.forEach(function(t){ if(t.id==='wwzw')return;
      (t.players||[]).slice(0,10).forEach(function(p,i){
        ST.lgBat[p.id]=ST.lgBat[p.id]||blankBat();
        var b=ST.lgBat[p.id]; b.pa=40;b.ab=36;b.h=9+((i*3)%10);b.d2=3;
        b.hr=(i%4===0?2:0);b.rbi=8;b.bb=4;
      });
      (t.pitchers||[]).slice(0,4).forEach(function(q,i){
        ST.lgPit[q.id]=ST.lgPit[q.id]||blankPit();
        var l=ST.lgPit[q.id]; l.outs=18+i*3;l.er=4+i;l.h=12;l.bb=6;l.k=9;
      });
      ST.stand[t.id]={w:3+(i=0),l:3,t:0,rf:20,ra:18,g:6};
    });
    ST.stand['wwzw']={w:3,l:3,t:0,rf:22,ra:20,g:6};
    ST.schedule.slice(0,6).forEach(function(sc,i){
      sc.played=true; sc.result={us:6+i%4, them:4+(i*2)%5};
    });
    ST.lineup=recommendLineup(); optimizePositions(); applyDHRule(); sanitizeRotation();
    ST.calendar=holidayFor(ST.round, ST.year);
    /* 각 화면이 읽는 상태를 미리 만들어 둔다 */
    ST.farm=[]; farmFill(12);
    ST.freeAgents=[]; farmSlot().slice(0,2).forEach(function(p){ p.age=25; releasePlayer(p.id,'점검'); });
    ST.aiFarmStat={}; ST.aiFarmUp={};
    var rng=makeRng(7); for(var i=0;i<6;i++) aiFarmWeek(rng);
    ST.draft=draftOpen(ST.year+1, ST.stand); draftRunToMe();
    ST.entryDraft=entryDraftBuild(0.62);
    ST.allstar=null;
    ST.injScar={}; applyInjuryHit('ksh',{hit:{pow:-4}});
    ST.myTrainQ=[]; trainBuy('bat');
    ST.trainSessAt=-1;
    return 1;
  })()`);
  await wait(150);

  const SCREENS=[
    ['home','홈'], ['squad','선수단(1군)'], ['lineup','라인업'], ['kakao','단톡방'],
    ['train','훈련 구매'], ['trainplay','훈련 세션'], ['stand','순위표'],
    ['stats','기록'], ['records','전시장'], ['more','더보기'],
    ['cal','시즌 달력'], ['front','선수단 운영'], ['rosters','24팀 둘러보기'],
    ['glog','지난 경기'], ['hall','명예의 전당'], ['whatif','만약에'],
    ['draft','신인 드래프트'], ['entry','입단 드래프트'], ['allstar','올스타 주간'],
    ['player','내 선수'], ['pick','선수 선택'], ['mode','모드'],
  ];

  console.log('\n[전 화면 — 화면에 나오면 안 되는 글자]');
  for(const [v,nm] of SCREENS){
    let html2='', err=null;
    /* 「내 선수」 는 이름을 눌러서 들어가는 상세 화면이다 — 누구인지
       안 정하고 열면 「찾을 수 없다」 가 뜨는 게 맞다. 정해주고 연다. */
    if(v==='player') ev("profileId='ksh'");
    try{ w.go(v); await wait(90); html2=d.querySelector('#view').innerHTML; }
    catch(e){ err=e.message; }
    if(err){ T(false, nm+' :: 예외 — '+err); continue; }
    const txt=d.querySelector('#view').textContent.replace(/\s+/g,' ');
    if(txt.length<20){ T(false, nm+' :: 화면이 비었다 ('+txt.length+'자)'); continue; }
    const m=txt.match(BAD);
    if(m){
      const i=txt.search(BAD);
      T(false, nm+' :: 「'+m[0]+'」 — …'+txt.slice(Math.max(0,i-45), i+35)+'…');
    } else T(true, nm+' ('+txt.length+'자)');
  }

  console.log('\n[신문]');
  {
    w.go('home'); await wait(120);
    let bad=null;
    try{
      w.eval('showPaper()'); await wait(150);
      const pp=d.querySelector('.pp');
      const txt=pp?pp.textContent.replace(/\s+/g,' '):'';
      if(!pp) bad='신문이 안 떴다';
      else if(txt.length<200) bad='내용이 너무 짧다 ('+txt.length+'자)';
      else { const i=txt.search(BAD);
        if(i>=0) bad='「'+txt.match(BAD)[0]+'」 — …'+txt.slice(Math.max(0,i-45),i+35)+'…'; }
    }catch(e){ bad='예외 — '+e.message; }
    T(!bad, bad? ('신문 :: '+bad) : '신문 한 부 이상 없음');
  }
  {
    /* 올스타 주간 · 드래프트가 끝난 뒤 판도 본다 — 상태마다 문장이 다르다 */
    ev(`ST.allstar={year:ST.year,step:'done',done:true,
        derby:{rows:[{id:'x',name:'가나',team:'다라',r1:5,r2:3}],champ:'가나'},
        game:{e:6,w:4,mvp:'마바'}}`);
    let bad=null;
    try{
      const s2=ev('JSON.stringify(newsIssue())');
      const i=s2.search(BAD);
      if(i>=0) bad='「'+s2.match(BAD)[0]+'」 — …'+s2.slice(Math.max(0,i-45),i+35)+'…';
    }catch(e){ bad='예외 — '+e.message; }
    T(!bad, bad? ('올스타 끝난 뒤 신문 :: '+bad) : '올스타 끝난 뒤 신문도 이상 없음');
    ev('ST.allstar=null');
  }

  console.log('\n[신문 여러 주 — 풀 전체를 훑는다]');
  {
    /* 연예·사회·기록실·광고·운세는 풀에서 뽑는다. 한 부만 보면
       나쁜 항목 하나가 몇 주 뒤에야 튀어나온다. 여러 주를 돌려본다. */
    let bad=null;
    const r0=ST_round();
    for(let r=0;r<14 && !bad;r++){
      ev('ST.round='+r+'; ST.calendar=holidayFor('+r+', ST.year)');
      try{
        const s2=ev('JSON.stringify(newsIssue())');
        const i=s2.search(BAD);
        if(i>=0) bad=r+'주차 「'+s2.match(BAD)[0]+'」 …'+s2.slice(Math.max(0,i-45),i+35)+'…';
        const N=JSON.parse(s2);
        if(!N.lead||!N.lead.h) bad=r+'주차 1면이 비었다';
        if((N.rec||[]).length<2||(N.ent||[]).length<2||(N.life||[]).length<2)
          bad=r+'주차 꼭지가 모자란다';
      }catch(e){ bad=r+'주차 예외 — '+e.message; }
    }
    ev('ST.round='+r0+'; ST.calendar=holidayFor('+r0+', ST.year)');
    T(!bad, bad? ('신문 14주 :: '+bad) : '신문을 14주 돌려도 이상 없음');
  }

  console.log('\n[상태를 바꿔가며 다시]');
  const VARIANTS=[
    ['시즌 초(기록 없음)', `ST.round=0; ST.bat={}; ST.lgBat={}; ST.pit={}; ST.lgPit={};
        ST.schedule.forEach(function(s){s.played=false;s.result=null;});
        TEAMS.forEach(function(t){ST.stand[t.id]={w:0,l:0,t:0,rf:0,ra:0,g:0};});`],
    ['2군에 내려가 있다', `ST.myFarm=3; ST.farmMe={g:2,ab:7,h:2};`],
    ['부상 중', `ST.injury['ksh']={name:'손목 염좌',games:3};`],
    ['투수만', `ST.role='pit'; ST.myPos=null; ST.myFarm=0; ST.injury={};`],
  ];
  for(const [nm,setup] of VARIANTS){
    ev('(function(){'+setup+'})()');
    let worst=null;
    for(const [v,sn] of SCREENS){
      try{
        if(v==='player') ev("profileId='ksh'");
        w.go(v); await wait(50);
        const txt=d.querySelector('#view').textContent.replace(/\s+/g,' ');
        const i=txt.search(BAD);
        if(i>=0){ worst=sn+' 「'+txt.match(BAD)[0]+'」 …'+txt.slice(Math.max(0,i-40),i+30)+'…'; break; }
        if(txt.length<20){ worst=sn+' 화면이 비었다'; break; }
      }catch(e){ worst=sn+' 예외 — '+e.message; break; }
    }
    T(!worst, worst? (nm+' :: '+worst) : nm+' — 전 화면 이상 없음');
  }

  /* [지적] "선수모드는 지시같은게 다른 용어로 되어야하는거 알지?"
     맞는 말이다. 선수 모드에서 나는 **선수 한 명**이다. 「지시」 「작전」
     「감독 액션」 은 감독 말이라 화면에 남아 있으면 안 된다.
     화면을 훑어서 감독 어휘가 새어 나오는지 본다.                  */
  console.log('\n[선수 모드에 감독 말이 남아 있나]');
  {
    ev("ST.mode='player'; ST.role='two'; ST.myFarm=0; ST.injury={}; ST.round=11");
    const MGR=/지시|작전|감독 액션|물통|선수 영입|상대 분석/;
    let found=[];
    for(const [v,nm] of SCREENS){
      try{
        if(v==='player') ev("profileId='ksh'");
        w.go(v); await wait(50);
        /* 설명 문장이 아니라 **누를 것과 제목**만 본다. 남 얘기(김상훈
           소개의 「상대 분석 자료」)까지 잡으면 노이즈만 는다.       */
        const nodes=[...d.querySelectorAll('#view button, #view .card-h, #view .ms-big, #view .ms-sub, #view .subtab')];
        const hitN=nodes.map(n=>n.textContent.replace(/\s+/g,' ')).find(t=>MGR.test(t));
        if(hitN) found.push(nm+' 「'+hitN.match(MGR)[0]+'」 :: '+hitN.slice(0,50));
      }catch(e){}
    }
    T(found.length===0, found.length? ('감독 말 '+found.length+'곳 :: '+found[0]) : '감독 말이 안 보인다');
    if(found.length>1) found.slice(1,4).forEach(x=>console.log('     · '+x));
  }

  console.log('\n[콘솔]');
  T(jsErr.length===0, '예외 없음 :: '+(jsErr.slice(0,2).join(' / ')||'없음'));

  console.log(fail? `\n❌ ${fail}개 실패` : '\n✅ 이상 없음');
  process.exit(fail?1:0);
})();
