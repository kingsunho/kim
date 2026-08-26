/* [2.50.0~] 컨택했는데 삼진 · 투구수 · 오늘 못 나오는 사람 표시.

   [제보] "투스트라이크에서 잘맞았는데 삼진이라고 나옴"
   [요청] "투구수 현황 표시도 가능한가?"

   삼진 쪽이 진짜 버그였다. 배트에 맞으면 삼진·볼넷이 안 나오게 k·bb 를
   0.0008 배로 눌러놨는데, simPA 의 clamp 하한 0.01 이 그걸 도로 끌어올리고
   있었다. 컨택 100번에 한 번은 삼진, 90번에 한 번은 볼넷이 나왔다.

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

  console.log('[컨택하면 삼진·볼넷은 없다]');
  /* 실제 경로 그대로: pitchResult('contact') → consumePlayMods() → simPA */
  const R=ev(`(function(){
    const T2=buildAllTeams(); const us=T2.find(t=>t.id==='wwzw'); const opp=T2[1];
    const bat=us.players[0], pit=opp.pitchers[0];
    const rng=makeRng(777);
    const fake={_contact:false,_contactQ:null,_contactType:null,_swingQ:null,_pitchHit:null,
      _c:{b:0,s:2}, count:function(){return this._c},
      consumePlayMods:LiveGame.prototype.consumePlayMods,
      pitchResult:LiveGame.prototype.pitchResult,
      curPitcher:function(){return pit}};
    const cnt={}; const N=30000;
    for(let i=0;i<N;i++){
      fake._c={b:0,s:2};                       // 2스트라이크
      fake.pitchResult('contact',0.62,'ff');   // 잘 맞았다
      const mods=fake.consumePlayMods({isUser:true},{isUser:false});
      const r=simPA(bat,pit,us,opp,rng,{bat:'normal'},70,null,mods);
      cnt[r.type]=(cnt[r.type]||0)+1;
    }
    return {cnt,N};
  })()`);
  const K=R.cnt.K||0, BB=R.cnt.BB||0, HBP=R.cnt.HBP||0;
  T('2스트라이크에서 잘 맞히면 삼진이 안 나온다', ()=>
    K===0 && `${R.N}번 중 0번`);
  T('컨택하면 볼넷·몸에 맞는 공도 안 나온다', ()=>
    BB===0 && HBP===0 && `볼넷 0 · 사구 0`);
  T('인플레이 결과는 정상적으로 갈린다', ()=>{
    const inplay=['1B','2B','3B','HR','OUT','E'].filter(k=>R.cnt[k]>0);
    return inplay.length>=5 && inplay.join(' ');
  });
  /* [제보] "투스트나 쓰리볼에서 스윙해서 맞았는데 삼진이나 볼넷이 나오면 안 되지"
     2스트라이크는 v2.50.0 에 못 박았는데 **3볼은 따로 재본 적이 없었다.**
     simPA 는 볼카운트를 모른다 — 그래서 2스트라이크에서 삼진이 0이면
     3볼에서 볼넷도 0이어야 맞다. 맞는지 실제로 돌려서 확인한다.
     그리고 볼카운트로 결론이 나는 경로(_forceRes)도 같이 본다.
     컨택은 카운트를 안 건드려야 한다 — 건드리면 4볼이 찍힐 수 있다.   */
  const R3=ev(`(function(){
    const T2=buildAllTeams(); const us=T2.find(t=>t.id==='wwzw'); const opp=T2[1];
    const bat=us.players[0], pit=opp.pitchers[0];
    const rng=makeRng(31337);
    const counts=[[3,0],[3,1],[3,2],[0,2],[2,2]];
    const cnt={}, forced=[];
    const N=6000;
    counts.forEach(function(c){
      const fake={_contact:false,_contactQ:null,_contactType:null,_swingQ:null,_pitchHit:null,
        _paPitches:0, _forceRes:null,
        _c:{b:c[0],s:c[1]}, count:function(){return this._c},
        consumePlayMods:LiveGame.prototype.consumePlayMods,
        pitchResult:LiveGame.prototype.pitchResult,
        curPitcher:function(){return pit}};
      for(let i=0;i<N;i++){
        fake._c={b:c[0],s:c[1]}; fake._forceRes=null;
        fake.pitchResult('contact',0.62,'ff');       // 배트에 맞았다
        /* 컨택이 카운트를 건드리면 안 된다 */
        if(fake._c.b!==c[0]||fake._c.s!==c[1]) forced.push('카운트변함 '+c.join('-'));
        if(fake._forceRes) forced.push('_forceRes '+c.join('-')+' '+fake._forceRes.type);
        const mods=fake.consumePlayMods({isUser:true},{isUser:false});
        const r=simPA(bat,pit,us,opp,rng,{bat:'normal'},70,null,mods);
        const k=c.join('-')+':'+r.type;
        cnt[k]=(cnt[k]||0)+1;
      }
    });
    return {cnt,N,forced:forced.slice(0,3),counts:counts.map(function(c){return c.join('-')})};
  })()`);
  T('3볼에서 맞히면 볼넷이 안 나온다', ()=>{
    const bad=R3.counts.filter(c=>/^3-/.test(c)).reduce((a,c)=>a+(R3.cnt[c+':BB']||0),0);
    return bad===0 && `3볼 3종 x ${R3.N}번 · 볼넷 0`;
  });
  T('3볼 2스트라이크(풀카운트)에서 맞히면 볼넷도 삼진도 없다', ()=>{
    const bb=R3.cnt['3-2:BB']||0, k=R3.cnt['3-2:K']||0;
    return bb===0&&k===0 && `${R3.N}번 중 볼넷 0 · 삼진 0`;
  });
  T('2스트라이크에서 맞히면 삼진이 안 나온다', ()=>{
    const k=(R3.cnt['0-2:K']||0)+(R3.cnt['2-2:K']||0)+(R3.cnt['3-2:K']||0);
    return k===0 && `2스트라이크 3종 x ${R3.N}번 · 삼진 0`;
  });
  T('맞히는 것 자체는 볼카운트를 안 건드린다', ()=>
    R3.forced.length===0 || '!'+R3.forced.join(', '));
  T('어느 카운트든 인플레이 결과는 정상적으로 갈린다', ()=>{
    const kinds=['1B','2B','3B','HR','OUT','E'].filter(k=>(R3.cnt['3-2:'+k]||0)>0);
    return kinds.length>=5 && '풀카운트에서도 '+kinds.join(' ');
  });

  /* clamp 하한이 다시 살아나면 여기가 빨간불이 된다 */
  T('inPlay 플래그가 확률이 아니라 못이다', ()=>{
    const src=ev("String(simPA)");
    return /mods\.inPlay/.test(src) && /kR=0/.test(src) && '삼진·볼넷 확률을 0으로 못 박는다';
  });

  console.log('\n[투구수]');
  const P=ev(`(function(){
    const T2=buildAllTeams(); const rng=makeRng(4242);
    let np=0,bf=0,G=0,zero=0,pg=0;
    for(let s=0;s<2;s++) for(let i=0;i<T2.length;i++) for(let j=0;j<T2.length;j++){
      if(i===j)continue; if(((i*11+j*5+s)%9)!==0)continue;
      const res=simGame(T2[j],T2[i],{rng,innings:7,
        awayLineup:aiLineup(T2[i]),awayRotation:aiRotation(T2[i]),
        homeLineup:aiLineup(T2[j]),homeRotation:aiRotation(T2[j])});
      G++;
      for(const pid in res.pbox){ const l=res.pbox[pid]; if(!l.bf)continue;
        pg++; np+=l.np||0; bf+=l.bf; if(!l.np)zero++; }
    }
    return {np,bf,G,zero,pg, perPA:np/bf};
  })()`);
  T('투구수가 쌓인다', ()=>P.np>0 && `${P.G}경기 · ${P.np}구`);
  T('던진 투수는 전원 투구수가 있다', ()=>P.zero===0 && `${P.pg}명 중 0구인 사람 없음`);
  T('타석당 투구수가 그럴듯하다', ()=>
    P.perPA>3.2 && P.perPA<5.2 && `${P.perPA.toFixed(2)}구/타석`);
  /* 야구 규칙 — 삼진은 최소 3구, 볼넷은 최소 4구 */
  T('삼진은 3구 미만이 될 수 없다', ()=>{
    const m=ev(`(function(){const rng=makeRng(1);let lo=99;
      for(let i=0;i<5000;i++)lo=Math.min(lo,pitchesForPA('K',rng));return lo})()`);
    return m>=3 && `최소 ${m}구`;
  });
  T('볼넷은 4구 미만이 될 수 없다', ()=>{
    const m=ev(`(function(){const rng=makeRng(2);let lo=99;
      for(let i=0;i<5000;i++)lo=Math.min(lo,pitchesForPA('BB',rng));return lo})()`);
    return m>=4 && `최소 ${m}구`;
  });

  /* 위는 simPA 를 직접 부른 것이다. 실제 경기에서는
       judge → pitchResult('contact') → endPA → applyDecision('playskip')
       → decDone → runLive → LIVE.step() → simPA
     순서로 간다. 중간에 하나라도 _contact 를 흘리면 도로 삼진이 나온다.
     그 사슬을 통째로 돌려서 확인한다.                                */
  console.log('\n[실제 경기 경로로 3볼·2스트라이크에서 맞혀본다]');
  const CH=ev(`(function(){
    const out={};
    const bad=[];
    [[3,0],[3,2],[0,2]].forEach(function(c){
      for(let i=0;i<200;i++){
        LIVE=makeLive(); LIVE.manual=true;
        /* [함정] makeLive 의 시드는 고정이다. 안 흔들면 200번이 전부
           **똑같은 타석**이 되고, 결과가 죄다 1B 하나로 나온다.
           그러면 "볼넷 0" 이 통과해도 아무것도 증명 못 한다.       */
        LIVE.rng=makeRng(i*7919+13);
        /* 우리가 공격할 때까지 굴린다 */
        let g=0; while(!LIVE.over && !LIVE.off().isUser && g++<400){
          if(LIVE.pending)LIVE.applyDecision('none'); LIVE.step(); }
        if(LIVE.over) continue;
        LIVE.cntPA=LIVE.paSeq; LIVE.cnt={b:c[0],s:c[1]};
        const r=LIVE.pitchResult('contact', 0.62, 'ff');   // 배트에 맞았다
        if(!r||r.end!=='contact') { bad.push('pitchResult '+c.join('-')); continue; }
        LIVE.applyDecision('playskip');
        /* [주의] lastPlay 는 '볼 만한 장면' 만 남는다 — 그걸 읽으면 옛 타석이
           그대로 잡혀서 죄다 1B 로 보인다. 박스스코어 증분으로 읽어야 확실하다. */
        const bat=LIVE.batter();
        const b0=Object.assign({}, LIVE.box[bat.id]||{});
        LIVE.step();
        const b1=LIVE.box[bat.id]||{};
        const d=function(k){ return (b1[k]||0)-(b0[k]||0); };
        let kind;
        if(d('k')>0)        kind='K';
        else if(d('bb')>0)  kind='BB';
        else if(d('hbp')>0) kind='HBP';
        else if(d('hr')>0)  kind='HR';
        else if(d('d3')>0)  kind='3B';
        else if(d('d2')>0)  kind='2B';
        else if(d('h')>0)   kind='1B';
        else if(d('ab')>0)  kind='OUT';
        else                kind='?';        // 그 타석이 안 끝났다(주자 사건 등)
        if(kind==='?') continue;
        const k=c.join('-')+':'+kind;
        out[k]=(out[k]||0)+1;
      }
    });
    return {out,bad:bad.slice(0,3)};
  })()`);
  T('실제 경로에서도 3볼에 맞히면 볼넷이 안 나온다', ()=>{
    const keys=Object.keys(CH.out).filter(k=>/^3-/.test(k));
    const bb=keys.filter(k=>/:(BB|IBB)$/.test(k)).reduce((a,k)=>a+CH.out[k],0);
    const tot=keys.reduce((a,k)=>a+CH.out[k],0);
    return bb===0 && tot>0 && `${tot}타석 · 볼넷 0`;
  });
  T('실제 경로에서도 2스트라이크에 맞히면 삼진이 안 나온다', ()=>{
    const keys=Object.keys(CH.out).filter(k=>/-2:/.test(k));
    const kk=keys.filter(k=>/:K$/.test(k)).reduce((a,k)=>a+CH.out[k],0);
    const tot=keys.reduce((a,k)=>a+CH.out[k],0);
    return kk===0 && tot>0 && `${tot}타석 · 삼진 0`;
  });
  T('나온 결과가 전부 인플레이다 — 종류도 제대로 갈린다', ()=>{
    const kinds=[...new Set(Object.keys(CH.out).map(k=>k.split(':')[1]))];
    const bad=kinds.filter(k=>k==='K'||k==='BB'||k==='HBP');
    return bad.length===0 && CH.bad.length===0 && kinds.length>=3 && kinds.sort().join(' ');
  });
  /* 화면이 '맞혔다' 고 말해놓고 로그에는 삼진이 찍히면 그게 제일 나쁘다.
     judge 가 삼진으로 보내는 건 q<0.18, 즉 **헛스윙** 일 때뿐이어야 한다. */
  T('화면이 삼진이라 부르는 건 헛스윙일 때뿐이다', ()=>{
    const src=ev("String(renderSwing)");
    return /if\(q<0\.18\)\{ kind='strike'; pre='헛스윙'/.test(src)
      && /else \{ kind='contact';/.test(src) && '헛스윙만 스트라이크로 간다';
  });

  console.log('\n[손으로 친 타석은 진짜 개수를 센다]');
  T('pitchResult 가 공마다 센다', ()=>{
    const n=ev(`(function(){
      const f={_paPitches:0,_c:{b:0,s:0},count:function(){return this._c},
        pitchResult:LiveGame.prototype.pitchResult};
      f.pitchResult('ball'); f.pitchResult('strike'); f.pitchResult('foul');
      f.pitchResult('foul'); f.pitchResult('contact',0.6,'ff');
      return f._paPitches;})()`);
    return n===5 && `볼·스트·파울2·컨택 = ${n}구`;
  });

  console.log('\n[화면]');
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300); ev("ST.tutDone=true");
  ev(`(function(){
    runWeek(); ST.weekDone=true; ST.announced=true; ST.lineupDirty=false;
    ST.events=[]; ST.absent={};
    ST.lineup=recommendLineup(); applyDHRule(); sanitizeRotation();
    var L=makeLive(); var k=0; while(!L.over&&k++<3000){L.pending=null;L.step();}
    L.finish(); var n=ST.schedule[ST.round];
    var r=L.result; var us=n.homeGame?r.home:r.away, th=n.homeGame?r.away:r.home;
    LIVE=L; window.__res=r; commitGame(r,us,th,us.slots);
  })()`);
  T('시즌 기록에도 투구수가 쌓인다', ()=>{
    const n=ev("Object.keys(ST.pit).reduce(function(a,k){return a+(ST.pit[k].np||0)},0)");
    return n>0 && `${n}구`;
  });
  T('리그 기록에도 쌓인다', ()=>{
    const n=ev("Object.keys(ST.lgPit).reduce(function(a,k){return a+(ST.lgPit[k].np||0)},0)");
    return n>0 && `${n}구`;
  });
  T('박스스코어 투수표에 투구 칸이 있고 숫자가 찍힌다', ()=>{
    /* 실제로 박스스코어를 그려서 확인한다 */
    const host=ev(`(function(){
      const r=window.__res;
      const side=r.away.team.id==='wwzw'?{team:r.away.team,rot:ST.gameRotation||ST.rotation}
                                        :{team:r.home.team,rot:ST.gameRotation||ST.rotation};
      const card=pitBoxCard('투수', side, r, true);
      document.body.appendChild(card);
      card.id='__pb';
      return true; })()`);
    const tb=d.getElementById('__pb');
    if(!tb) return false;
    const th=[...tb.querySelectorAll('th')].map(x=>x.textContent);
    if(th.indexOf('투구')<0) return false;
    const col=th.indexOf('투구');
    const rows=[...tb.querySelectorAll('tr')].slice(1);
    if(!rows.length) return false;
    const vals=rows.map(r=>r.children[col]&&r.children[col].textContent);
    const ok=vals.every(v=>v!=null && /^\d+$/.test(v) && Number(v)>0);
    return ok && `${th.join(' ')} / 값 ${vals.join(',')}`;
  });
  T('옛 세이브(투구수 없음)를 열어도 undefined 가 안 뜬다', ()=>{
    ev(`(function(){ Object.keys(ST.pit).forEach(function(k){delete ST.pit[k].np});
      Object.keys(ST.lgPit).forEach(function(k){delete ST.lgPit[k].np});
      normalizeState(); })()`);
    const bad=ev(`Object.keys(ST.pit).some(function(k){return ST.pit[k].np==null})`);
    return bad===false && '전부 0 으로 채워진다';
  });
  console.log('\n[투구수를 팀 합계까지 보여준다]');
  /* [제보] "투구수가 왜 이렇게 적냐"
     숫자는 멀쩡했다(경기당 팀 156구·등판 2.5명). 화면이 **지금 던지는 사람 것
     하나**만 보여줘서, 교체하면 0구부터 다시 세니 적어 보였던 것이다. */
  T('교체가 있으면 팀 누계도 같이 적는다', ()=>{
    const src=ev("String(paintNpBar)+String(npNow)");
    return /teamNp/.test(src) && /팀 \$\{nn\.teamNp\}구/.test(src) && '팀 누계 표시';
  });
  T('한 명만 던졌으면 팀 누계는 안 붙인다', ()=>{
    const src=ev("String(paintNpBar)");
    return /used>1\?/.test(src) && '투수 1명이면 생략';
  });
  T('박스스코어에도 팀 합계 줄이 있다', ()=>{
    const src=ev("String(pitBoxCard)");
    return /팀 합계 \$\{NP\}구/.test(src) && '있음';
  });

  /* ================================================================
     [2.52.0] [요청] "인게임 중에 실시간 투구수 나오게 해줘 우리든 상대든"
     v2.51.1 까지는 교체 버튼 옆에 **우리 투수 것만**, 그것도 우리가 수비
     중일 때만 떴다. 공격 중에는 상대 투수가 몇 구 던졌는지 볼 데가 없었다.
     이제 점수판 밑 #np-bar 가 양 팀을 항상 띄운다.                    */
  console.log('\n[경기 중 양 팀 투구수 판]');
  const cells=()=>[...d.querySelectorAll('#np-bar .np-cell')];
  const lit=()=>cells().findIndex(c=>c.classList.contains('on'));
  const setup=ev(`(function(){
    if(!document.getElementById('stage')){
      const st=document.createElement('div'); st.id='stage'; document.body.appendChild(st); }
    ST.weekDone=true; ST.announced=true; ST.lineupDirty=false; ST.events=[]; ST.absent={};
    ST.lineup=recommendLineup(); applyDHRule(); sanitizeRotation();
    LIVE=makeLive(); LIVE.manual=true; LIVE.round=ST.round;
    buildLiveStage(); LIVE._logSeen=0;
    /* 양 팀 투수가 다 던진 시점까지만 굴린다 — 경기를 끝내면 판이 숨는다 */
    let k=0; while(!LIVE.over && LIVE.inning<3 && k++<400){ LIVE.pending=null; LIVE.step(); }
    updateLiveUI();
    return {over:LIVE.over, inn:LIVE.inning, opp:LIVE.oppSide().team.name};
  })()`);
  T('경기 화면에 투구수 판이 붙는다', ()=>
    !setup.over && d.getElementById('np-bar') && `${setup.inn}회까지 굴림`);
  T('칸이 둘이다 — 상대와 우리', ()=>cells().length===2 && `${setup.opp} · 우완좌완`);
  T('왼쪽이 상대, 오른쪽이 우리 (점수판과 같은 순서)', ()=>{
    const w0=cells()[0].querySelector('.who').textContent;
    const w1=cells()[1].querySelector('.who').textContent;
    return w0.indexOf(setup.opp)>=0 && w1.indexOf('우완좌완')>=0 && `${w0} | ${w1}`;
  });
  T('두 칸 모두 투구수가 찍혀 있다 — 상대 것도 보인다', ()=>{
    const v=cells().map(c=>c.querySelector('b u') && c.querySelector('b u').textContent);
    if(v.some(x=>!x || !/^\d+구$/.test(x))) return false;
    /* 방금 올라온 투수는 0구가 맞다 — 교체하면 0부터 다시 센다.
       그래서 "양 팀이 던지긴 했나" 는 팀 누계로 확인한다.          */
    const t=ev("[npNow(LIVE.oppSide()).teamNp, npNow(LIVE.userSide()).teamNp]");
    return t[0]>0 && t[1]>0 && `${v.join(' / ')} · 팀 ${t[0]}구 / ${t[1]}구`;
  });
  T('이름·이닝·피안타·실점이 같이 적힌다', ()=>{
    const t=cells()[0].textContent.replace(/\s+/g,' ').trim();
    return /이닝/.test(t) && /피안타/.test(t) && /실점/.test(t) && t.slice(0,42);
  });
  T('지금 던지는 쪽에만 불이 들어온다', ()=>{
    const on=cells().filter(c=>c.classList.contains('on')).length;
    const want=ev("LIVE.def()===LIVE.userSide()?1:0");
    return on===1 && lit()===want && `${lit()}번 칸(${want?'우리':'상대'} 수비)`;
  });
  T('공수가 바뀌면 불도 따라 옮겨간다', ()=>{
    const a=lit();
    const r=ev(`(function(){const h0=LIVE.half; let k=0;
      while(!LIVE.over && LIVE.half===h0 && k++<400){ LIVE.pending=null; LIVE.step(); }
      updateLiveUI();
      return {over:LIVE.over, want:LIVE.def()===LIVE.userSide()?1:0};})()`);
    if(r.over) return false;
    return lit()===r.want && lit()!==a && `${a}번 칸 → ${lit()}번 칸`;
  });
  T('타석이 지나면 숫자가 실제로 는다', ()=>{
    const before=cells().map(c=>parseInt(c.querySelector('b u').textContent));
    /* 몇 타석만 굴린다 — 여기서 경기를 끝내버리면 판이 숨어서 볼 게 없다 */
    const r=ev(`(function(){let k=0;
      while(!LIVE.over && k++<3){ LIVE.pending=null; LIVE.step(); }
      updateLiveUI(); return LIVE.over;})()`);
    if(r) return false;
    const after=cells().map(c=>parseInt(c.querySelector('b u').textContent));
    /* 교체가 있으면 그 칸은 0구부터 다시 센다 — 팀 누계가 그걸 받아준다 */
    const grew=after.some((v,i)=>v>before[i]);
    const team=cells().map(c=>{const e=c.querySelector('em');return e?e.textContent:''});
    return grew && `${before.join('/')} → ${after.join('/')}${team.join('')?' · '+team.filter(Boolean).join(' '):''}`;
  });
  T('교체가 있는 칸은 팀 누계를 같이 적는다', ()=>{
    /* 교체가 날 때까지 굴린다. 경기가 끝나기 전에 잡아야 해서
       새 경기를 하나 더 켜고 한 타석씩 보면서 간다.                 */
    const r=ev(`(function(){
      for(let g=0;g<4;g++){
        LIVE=makeLive(); LIVE.manual=true; buildLiveStage(); LIVE._logSeen=0;
        let k=0;
        while(!LIVE.over && k++<900){
          LIVE.pending=null; LIVE.step(); updateLiveUI();
          if(LIVE.over) break;
          if(document.querySelectorAll('#np-bar .np-cell em').length)
            return {hit:true, inn:LIVE.inning};
        }
      }
      return {hit:false};})()`);
    if(!r.hit) return false;
    const em=[...d.querySelectorAll('#np-bar .np-cell em')].map(e=>e.textContent);
    return /팀 \d+구 · \d+명/.test(em[0]) && `${r.inn}회 · ${em.join(' ')}`;
  });
  T('경기가 끝나면 판이 사라진다 — 박스스코어가 이어받는다', ()=>{
    ev(`(function(){let k=0; while(!LIVE.over&&k++<3000){LIVE.pending=null;LIVE.step();}
      updateLiveUI();})()`);
    const bar=d.getElementById('np-bar');
    return bar && bar.style.display==='none' && bar.children.length===0 && '숨는다';
  });
  T('교체 버튼 옆에서는 같은 숫자를 두 번 안 그린다', ()=>{
    const src=ev("String(paintLiveCtl)");
    return !/np-now/.test(src) && !/구`/.test(src) && '중복 없음';
  });

  console.log('\n[오늘 못 나오는 사람이 눈에 띄나]');
  /* [제보] "불참율이 적어졌네 / 라인업 발표하고 나서 불참하네"
     발표 전 결장이 주당 2.3명(발표 후 번복의 5배)인데도 홈 화면 4000px
     아래에 묻혀 있어서 안 보였다. 확률이 아니라 자리가 문제였다. */
  const A=ev(`(function(){
    /* 결장자가 여럿 나오는 주를 찾는다 */
    for(let n=1;n<200;n++){
      ST.weekSeq=n; ST.round=0; ST.weekDone=false; ST.events=[];
      const r=runWeek();
      if(!r && Object.keys(ST.absent||{}).length>=2) return {seq:n,
        n:Object.keys(ST.absent).length, names:Object.keys(ST.absent).map(nameOf)};
    }
    return null;
  })()`);
  T('결장자가 여러 명 나오는 주가 있다', ()=>A && `${A.n}명 (${A.names.join(', ')})`);
  w.go('home'); await wait(150);
  T('소식 맨 위에 몇 명 빠지는지 요약이 뜬다', ()=>{
    const e=d.querySelector('#view .out-sum');
    return e && new RegExp('오늘 '+A.n+'명 못 나온다').test(e.textContent)
      && e.textContent.replace(/\s+/g,' ').trim().slice(0,40);
  });
  T('요약이 결장 카드보다 위에 있다', ()=>{
    const sum=d.querySelector('#view .out-sum');
    const first=d.querySelector('#view .evt');
    if(!sum||!first) return false;
    /* DOM 순서로 본다 — jsdom 은 레이아웃이 없다 */
    /* Node 는 이 프로세스의 전역이 아니다 — jsdom 창 것을 써야 한다 */
    return (sum.compareDocumentPosition(first)&w.Node.DOCUMENT_POSITION_FOLLOWING)>0
      && '요약 → 카드 순서';
  });
  T('결장 카드가 다른 소식보다 먼저 나온다', ()=>{
    const evts=[...d.querySelectorAll('#view .evt')];
    if(evts.length<2) return false;
    const kinds=evts.map(x=>x.className);
    const lastAbs=kinds.map((c,i)=>/evt-absent/.test(c)?i:-1).filter(i=>i>=0).pop();
    const firstOther=kinds.findIndex(c=>!/evt-absent/.test(c));
    return (firstOther<0 || lastAbs<firstOther) && `결장 ${lastAbs+1}개가 앞`;
  });
  T('경기 카드에도 오늘 빠진 사람이 적힌다', ()=>{
    const e=d.querySelector('#view .out-line');
    return e && /오늘 빠짐/.test(e.textContent)
      && e.textContent.replace(/\s+/g,' ').trim().slice(0,44);
  });

  T('도는 동안 에러 없음', ()=>jsErr.length===0 && '깨끗');

  console.log(errs.length? '\n❌ '+errs.length+'개 실패' : '\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
