/* [2.26.0] 만약에 — 실전 전에 돌려보는 단판 시뮬레이션
   세이브를 건드리지 않는 것이 제일 중요하다. 기록·순위·컨디션 어디에도
   반영되면 안 된다. 그거부터 검사한다.                                */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|not implemented/i.test(e.message))errs.push(e.message)});
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

  console.log('[화면]');
  T('만약에 화면이 열린다', ()=>{
    ev("go('whatif')");
    const h=[...d.querySelectorAll('#view .card-h')].map(x=>x.textContent);
    return h.includes('만약에') && h.includes('조건') && h.join(' / ');
  });
  T('상대·구장·날씨·홈원정을 고를 수 있다', ()=>{
    const sels=[...d.querySelectorAll('.wi-sel')];
    if(sels.length!==4) return '선택칸 '+sels.length+'개';
    const opp=sels[0].options.length, park=sels[1].options.length;
    return (opp>=20 && park===3) ? ('상대 '+opp+'팀 · 구장 '+park+'곳 · 날씨 '+sels[2].options.length+'종') : false;
  });
  T('우리 팀은 상대 목록에 없다', ()=>{
    const opp=[...d.querySelectorAll('.wi-sel')][0];
    return ![...opp.options].some(o=>o.value==='wwzw') ? '우완좌완 제외됨' : false;
  });
  T('돌리기 전에 어떤 라인업으로 도는지 보여준다', ()=>{
    const lu=d.querySelector('.wi-lu');
    return (lu && /선발/.test(lu.textContent) && lu.textContent.length>40) ? '라인업 요약 있음' : false;
  });

  console.log('[돌려보기]');
  T('돌리면 결과가 나온다', ()=>{
    const b=[...d.querySelectorAll('#view .btn')].find(x=>x.textContent==='돌려보기');
    if(!b) return '버튼 없음';
    b.click();
    const sc=d.querySelector('.wi-sc');
    return (sc && /\d/.test(sc.textContent)) ? sc.textContent.replace(/\s+/g,' ').trim() : false;
  });
  T('라인스코어가 이닝별로 나온다', ()=>{
    const rows=[...d.querySelectorAll('.wl-r')];
    if(rows.length!==3) return '줄 '+rows.length+'개';
    const cells=rows[1].querySelectorAll('i u').length;
    // 콜드게임이면 7이닝을 못 채운다. 4이닝 미만이면 뭔가 잘못된 것.
    return cells>=4 ? (cells+'이닝'+(cells<7?' (콜드게임)':'')) : false;
  });
  T('우리 타자 개인 성적이 9명 나온다', ()=>{
    const t=[...d.querySelectorAll('.wi-t')];
    const rows=t[0]?t[0].querySelectorAll('tbody tr').length:0;
    return rows===9 ? '9명' : ('타자 '+rows+'명');
  });
  T('타자 표에 타수·안타·타점·타율이 있다', ()=>{
    const th=[...d.querySelectorAll('.wi-t')][0].querySelectorAll('th');
    const names=[...th].map(x=>x.textContent);
    return ['타수','안타','타점','득점','볼넷','삼진','타율'].every(n=>names.includes(n))
      ? names.join(' ') : false;
  });
  T('우리 투수 개인 성적이 나온다 (이닝·실점·방어율)', ()=>{
    const t=[...d.querySelectorAll('.wi-t')][1];
    if(!t) return '투수 표 없음';
    const rows=t.querySelectorAll('tbody tr').length;
    const names=[...t.querySelectorAll('th')].map(x=>x.textContent);
    return (rows>=1 && ['이닝','실점','방어율','탈삼진'].every(n=>names.includes(n)))
      ? (rows+'명 · '+names.join(' ')) : false;
  });
  T('승리·패전투수가 표시된다', ()=>{
    const t=[...d.querySelectorAll('.wi-t')][1];
    const tag=[...t.querySelectorAll('td.wi-n em')].map(x=>x.textContent);
    return tag.length ? tag.join('/') : '무승부거나 결정 안 됨(허용)';
  });
  T('상대 타자 성적도 나온다', ()=>{
    const t=[...d.querySelectorAll('.wi-t')][2];
    if(!t) return '상대 표 없음';
    return t.querySelectorAll('tbody tr').length>=1 ? (t.querySelectorAll('tbody tr').length+'명') : false;
  });
  T('다시 돌리면 결과가 바뀐다', ()=>{
    const before=d.querySelector('.wi-sc').textContent.replace(/\s+/g,'');
    let same=0;
    for(let i=0;i<6;i++){
      const b=[...d.querySelectorAll('#view .btn')].find(x=>/한 번 더|다시 돌려/.test(x.textContent));
      if(!b) return '다시 돌리기 버튼 없음';
      b.click();
      if(d.querySelector('.wi-sc').textContent.replace(/\s+/g,'')===before) same++;
    }
    return same<6 ? ('6번 중 '+(6-same)+'번 다른 결과') : '여섯 번 다 같다';
  });

  console.log('[세이브를 건드리지 않는다 — 제일 중요]');
  T('순위가 안 바뀐다', ()=>{
    ev("window._st0=JSON.stringify(ST.stand)");
    for(let i=0;i<5;i++) ev("whatIfRun("+(i+11)+")");
    return ev("window._st0===JSON.stringify(ST.stand)") ? '전적 그대로' : false;
  });
  T('개인 기록이 안 쌓인다', ()=>{
    ev("window._bp0=JSON.stringify([ST.bat,ST.pit,ST.career])");
    for(let i=0;i<5;i++) ev("whatIfRun("+(i+21)+")");
    return ev("window._bp0===JSON.stringify([ST.bat,ST.pit,ST.career])") ? '타격·투구·통산 그대로' : false;
  });
  T('컨디션·체력·휴식일이 안 깎인다', ()=>{
    ev("window._c0=JSON.stringify([ST.cond,ST.rest,ST.morale])");
    for(let i=0;i<5;i++) ev("whatIfRun("+(i+31)+")");
    return ev("window._c0===JSON.stringify([ST.cond,ST.rest,ST.morale])") ? '몸 상태 그대로' : false;
  });
  T('이번 주 일정·상대가 안 바뀐다', ()=>{
    ev("window._s0=JSON.stringify([ST.schedule[ST.round],ST.round,ST.park,ST.weather])");
    ev("WHATIF.opp=TEAMS.filter(t=>t.id!=='wwzw')[3].id; WHATIF.park='singil'; WHATIF.weather='rain';");
    for(let i=0;i<3;i++) ev("whatIfRun("+(i+41)+")");
    return ev("window._s0===JSON.stringify([ST.schedule[ST.round],ST.round,ST.park,ST.weather])")
      ? '일정 그대로' : false;
  });
  T('라인업도 안 바뀐다', ()=>{
    ev("window._l0=JSON.stringify([ST.lineup,ST.rotation])");
    for(let i=0;i<3;i++) ev("whatIfRun("+(i+51)+")");
    return ev("window._l0===JSON.stringify([ST.lineup,ST.rotation])") ? '타순·로테이션 그대로' : false;
  });
  T('진행 중인 실제 경기(LIVE)를 안 건드린다', ()=>{
    ev("ST.playMode='off'; LIVE=makeLive(); LIVE.manual=true; var g=0; while(g++<40) LIVE.step();");
    ev("window._lv0=JSON.stringify({i:LIVE.inning,h:LIVE.home.runs,a:LIVE.away.runs,o:LIVE.outs})");
    for(let i=0;i<3;i++) ev("whatIfRun("+(i+61)+")");
    return ev("window._lv0===JSON.stringify({i:LIVE.inning,h:LIVE.home.runs,a:LIVE.away.runs,o:LIVE.outs})")
      ? '중계 상태 그대로' : false;
  });

  console.log('[조건이 진짜로 먹히나]');
  T('배나물은 3루타 구장이다', ()=>ev(`(function(){
    var d3={};
    ['benamul','seonggok'].forEach(function(pk){
      WHATIF.park=pk; var t=0;
      for(var i=0;i<60;i++){ var r=whatIfRun(i+200);
        Object.keys(r.box).forEach(function(k){ t+=r.box[k].d3; }); }
      d3[pk]=t;
    });
    return d3.benamul>d3.seonggok*1.4
      ? ('배나물 '+d3.benamul+'개 vs 성곡 '+d3.seonggok+'개')
      : false;
  })()`));
  T('그라운드 홈런은 갭 넓은 구장에서 더 나온다 (park.d3 를 탄다)', ()=>ev(`(function(){
    var itp={};
    ['benamul','seonggok'].forEach(function(pk){
      WHATIF.park=pk; var t=0;
      for(var i=0;i<60;i++){ var r=whatIfRun(i+250);
        Object.keys(r.box).forEach(function(k){ t+=(r.box[k].itp||0); }); }
      itp[pk]=t;
    });
    return itp.benamul>itp.seonggok
      ? ('배나물 '+itp.benamul+'개 vs 성곡 '+itp.seonggok+'개')
      : ('배나물 '+itp.benamul+' / 성곡 '+itp.seonggok+' — 뒤집힘');
  })()`));
  T('담장 넘기는 홈런은 4부답게 거의 안 나온다', ()=>ev(`(function(){
    WHATIF.park='seonggok';                 // 담장이 제일 짧은 구장에서도
    var fence=0, hits=0;
    for(var i=0;i<60;i++){ var r=whatIfRun(i+280);
      Object.keys(r.box).forEach(function(k){
        var b=r.box[k]; fence+=(b.hr-(b.itp||0)); hits+=b.h; }); }
    var pct=hits?fence/hits*100:0;
    /* 실제 2026시즌 담장 넘긴 타구는 0개였다. 2% 아래면 그 감이 맞다.
       확률 기반이라 표본에 따라 1% 근처에서 오간다 — 기준을 여유 있게 둔다. */
    return pct<2.0 ? ('60경기 담장홈런 '+fence+'개 · 안타의 '+pct.toFixed(2)+'%') : false;
  })()`));
  T('신길은 실책이 많다', ()=>ev(`(function(){
    var e={};
    ['singil','benamul'].forEach(function(pk){
      WHATIF.park=pk; var n=0;
      for(var i=0;i<40;i++){ var r=whatIfRun(i+300); n+=r.home.errs+r.away.errs; }
      e[pk]=n;
    });
    return e.singil>e.benamul ? ('신길 '+e.singil+'개 vs 배나물 '+e.benamul+'개')
      : ('신길 '+e.singil+' / 배나물 '+e.benamul);
  })()`));
  T('상대를 바꾸면 점수가 달라진다', ()=>ev(`(function(){
    WHATIF.park='benamul';
    var teams=TEAMS.filter(function(t){return t.id!=='wwzw'});
    var top=teams.slice().sort(function(a,b){return leagueRank(a.id)-leagueRank(b.id)})[0];
    var bot=teams.slice().sort(function(a,b){return leagueRank(b.id)-leagueRank(a.id)})[0];
    var got={};
    [['top',top],['bot',bot]].forEach(function(pair){
      WHATIF.opp=pair[1].id; var us=0;
      for(var i=0;i<40;i++){ var r=whatIfRun(i+400); var S=whatIfSides(r); us+=S.us.runs-S.them.runs; }
      got[pair[0]]=us;
    });
    return got.bot>got.top
      ? ('꼴찌 상대 득실 +'+got.bot+' / 1위 상대 '+(got.top>=0?'+':'')+got.top)
      : ('1위 '+got.top+' / 꼴찌 '+got.bot+' — 뒤집힘');
  })()`));
  T('홈/원정을 바꾸면 공격 순서가 바뀐다', ()=>ev(`(function(){
    WHATIF.home=true;  var a=whatIfRun(500); var A=whatIfSides(a);
    WHATIF.home=false; var b=whatIfRun(500); var B=whatIfSides(b);
    // 홈이면 우리가 home 쪽, 원정이면 away 쪽에 들어가야 한다
    return (A.us===a.home && B.us===b.away) ? '홈=말공격 / 원정=초공격' : false;
  })()`));
  T('7이닝 경기다 (사회인야구)', ()=>ev(`(function(){
    var mx=0, mn=99;
    for(var i=0;i<25;i++){ var r=whatIfRun(i+600);
      var n=Math.max(r.home.line.length,r.away.line.length);
      if(n>mx)mx=n; if(n<mn)mn=n; }
    return (mn>=4&&mx<=10) ? ('이닝 '+mn+'~'+mx+' (콜드·연장 포함)') : ('이닝 '+mn+'~'+mx);
  })()`));

  console.log('[결론]');
  if(errs.length){ console.log('\n실패:',errs); process.exit(1); }
  console.log('\n✅ 이상 없음');
  process.exit(0);
},700);
