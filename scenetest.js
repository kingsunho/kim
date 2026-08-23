/* [2.19.0] 2D 그라운드 장면 · 경기 전 리그 랭킹 */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|not implemented/i.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
/* 문자열이 '!' 로 시작하면 실패다 — 그냥 truthy 로 두면 실패가 ✅ 로 찍힌다 */
const T=(n,f)=>{try{const r=f();const ok=!!r&&!(typeof r==='string'&&r[0]==='!');
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!ok)errs.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const txt=()=>d.querySelector('#view').textContent;

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300); ev("ST.tutDone=true");

  console.log('[장면 기술서]');
  T('타석이 끝나면 엔진이 장면 기술서를 남긴다', ()=>ev(`(function(){
    runWeek(); ST.weekDone=true; ST.announced=true; ST.lineupDirty=false; ST.absent={}; ST.events=[];
    LIVE=makeLive(); LIVE.manual=false;
    for(var i=0;i<40&&!LIVE.over;i++){ if(LIVE.pending)LIVE.applyDecision('change'); LIVE.step(); if(LIVE.lastPlay)break; }
    var p=LIVE.lastPlay;
    return p ? p.kind+' / '+p.bat.name+' / 주자전 '+JSON.stringify(p.before).length : '';
  })()`));
  T('기술서에 필요한 칸이 다 있다', ()=>{
    const k=ev("Object.keys(LIVE.lastPlay).sort().join(',')");
    return ['after','bat','before','half','inning','kind','outs','pit','runs','seq','text','us']
      .every(x=>k.indexOf(x)>=0) && k;
  });
  T('종류가 엔진 결과와 맞다', ()=>ev(`(function(){
    var ok=true, seen={};
    for(var i=0;i<300&&!LIVE.over;i++){
      if(LIVE.pending)LIVE.applyDecision('change');
      LIVE.step();
      var p=LIVE.lastPlay; if(!p)continue;
      seen[p.kind]=(seen[p.kind]||0)+1;
      if(['K','BB','HBP','E','GB','FB','DP','SF','AS','1B','2B','3B','HR'].indexOf(p.kind)<0)ok=false;
    }
    return ok? Object.keys(seen).join(',') : '';
  })()`));

  console.log('\n[어떤 장면을 보여줄까]');
  T('홈런은 항상 보여준다', ()=>ev(`(function(){ST.sceneMode='key';LIVE.manual=true;
    return sceneWorth({kind:'HR',runs:1,outs:1,before:[null,null,null],bat:{id:'x'}})})()`));
  T('평범한 땅볼 아웃은 안 보여준다', ()=>ev(`(function(){
    return !sceneWorth({kind:'GB',runs:0,outs:1,before:[null,null,null],bat:{id:'x'}})})()`));
  T('점수가 나면 보여준다', ()=>ev(`(function(){
    return sceneWorth({kind:'1B',runs:2,outs:1,before:[null,null,'a'],bat:{id:'x'}})})()`));
  T('끄면 아무것도 안 나온다', ()=>ev(`(function(){ST.sceneMode='off';
    var r=sceneWorth({kind:'HR',runs:4,outs:1,before:[null,null,null],bat:{id:'x'}});
    ST.sceneMode='key'; return !r})()`));
  T('자동 진행 중에는 안 뜬다', ()=>ev(`(function(){LIVE.manual=false;
    var r=sceneWorth({kind:'HR',runs:4,outs:1,before:[null,null,null],bat:{id:'x'}});
    LIVE.manual=true; return !r})()`));

  console.log('\n[그라운드 좌표]');
  T('베이스 네 개가 다이아몬드를 이룬다', ()=>{
    const b=ev("JSON.stringify(PS_B)");
    const P=JSON.parse(b);
    const d1=Math.hypot(P[1].x-P[0].x,P[1].y-P[0].y);
    const d2=Math.hypot(P[2].x-P[1].x,P[2].y-P[1].y);
    const d3=Math.hypot(P[3].x-P[2].x,P[3].y-P[2].y);
    const ok=Math.abs(d1-d2)<8&&Math.abs(d2-d3)<8;
    return ok?`한 변 ${d1.toFixed(0)}px`:`!변 길이가 다르다 ${d1.toFixed(0)}/${d2.toFixed(0)}/${d3.toFixed(0)}`;
  });
  T('파울 라인이 1·3루 베이스를 지난다', ()=>{
    const p=JSON.parse(ev("JSON.stringify([psSpot(PS_FOUL,93.7), psSpot(-PS_FOUL,93.7), PS_B[1], PS_B[3]])"));
    return Math.hypot(p[0].x-p[2].x,p[0].y-p[2].y)<3 && Math.hypot(p[1].x-p[3].x,p[1].y-p[3].y)<3;
  });
  T('타구는 방향에 맞는 야수에게 간다', ()=>{
    const r=ev(`(function(){
      var L=psSpot(-40,150), R=psSpot(40,150), C=psSpot(0,150);
      return [psNearest(L),psNearest(C),psNearest(R)].join(',');
    })()`);
    return r==='LF,CF,RF' ? r : `!${r}`;
  });
  T('내야 땅볼은 내야수에게 간다', ()=>{
    const r=ev("psNearest(psSpot(-20,60))+','+psNearest(psSpot(20,60))");
    return /^(SS|3B|2B|1B),(SS|3B|2B|1B)$/.test(r) ? r : `!${r}`;
  });
  T('캔버스를 못 쓰면 조용히 넘어간다 (경기가 안 막힌다)', ()=>{
    let called=false;
    ev("window.__done=false");
    ev(`psPlay({seq:1,kind:'HR',bat:{id:'swm',name:'송',bats:'R'},pit:{id:'p',name:'p'},
      us:true,before:[null,null,null],after:[null,null,null],runs:1,outs:0,inning:1,half:0,text:'x'},
      function(){ window.__done=true; })`);
    called=ev("window.__done");
    return called && !d.querySelector('.ps-ov');
  });

  console.log('\n[경기 전 리그 랭킹]');
  // 리그 기록이 실제로 쌓인 상태에서 본다
  ev(`(function(){ for(var i=0;i<5;i++){
    if(ST.round>=ST.schedule.length||ST.seasonOver)break;
    runWeek(); ST.weekDone=true; ST.announced=true; ST.lineupDirty=false; ST.absent={}; ST.events=[];
    var L=makeLive(); var k=0; while(!L.over&&k++<3000){L.pending=null;L.step();}
    L.finish(); var n=ST.schedule[ST.round]; if(!n)break;
    var r=L.result, us=n.homeGame?r.home:r.away, th=n.homeGame?r.away:r.home;
    LIVE=L; commitGame(r,us,th,us.slots); } })()`);
  T('경기를 치르면 예상이 아니라 실제 기록으로 바뀐다', ()=>{
    const pre=ev("rankRows('pit').pre");
    return pre===false ? '실제 기록' : '!아직 예상 순위';
  });
  T('투수·타자 순위가 10명씩 나온다', ()=>{
    const p=ev("rankRows('pit').rows.length"), b=ev("rankRows('bat').rows.length");
    return p===10&&b===10 ? `투수 ${p}명 · 타자 ${b}명` : `!${p}/${b}`;
  });
  T('리그 전체가 대상이다 (우리 팀만이 아니다)', ()=>{
    const teams=ev("JSON.stringify(rankRows('bat').all.map(x=>x.team).filter((v,i,a)=>a.indexOf(v)===i).length)");
    return Number(teams)>=5 ? `${teams}개 팀` : `!${teams}개 팀뿐`;
  });
  T('최종 점수 = 기본 + 기여', ()=>{
    const r=JSON.parse(ev("JSON.stringify(rankRows('pit').rows[0])"));
    return Math.abs((r.base+r.win)-r.tot)<0.01 ? `${r.base.toFixed(1)}+${r.win.toFixed(1)}=${r.tot.toFixed(1)}` : '!안 맞는다';
  });
  T('점수 순으로 정렬돼 있다', ()=>{
    const rs=JSON.parse(ev("JSON.stringify(rankRows('bat').rows.map(x=>x.tot))"));
    return rs.every((v,i)=>i===0||rs[i-1]>=v);
  });
  T('개막 전에는 예상 순위로 대체된다', ()=>ev(`(function(){
    var bak=ST.lgBat; ST.lgBat={};
    var R=rankRows('bat');
    ST.lgBat=bak;
    return R.pre && R.rows.length===10;
  })()`));
  T('화면이 뜨고 경기 시작 버튼이 있다', ()=>{
    ev("showRankIntro(function(){window.__started=true})");
    const ov=d.querySelector('.rk-ov');
    const rows=ov?ov.querySelectorAll('.rk-row').length:0;
    const btn=ov?[...ov.querySelectorAll('button')].find(b=>b.textContent==='경기 시작'):null;
    return !!(ov&&rows>=10&&btn) && `${rows}줄`;
  });
  T('탭을 누르면 타자 순위로 바뀐다', ()=>{
    const ov=d.querySelector('.rk-ov');
    ov.querySelector('.rk-tabs button[data-k="bat"]').click();
    return /타자 순위/.test(ov.textContent);
  });
  T('이름을 누르면 선수 카드가 열린다', ()=>{
    const ov=d.querySelector('.rk-ov');
    const row=ov.querySelector('.rk-row');
    const nm=row.querySelector('b').textContent.trim();
    row.click();
    const open=d.querySelector('#sheet').classList.contains('open');
    if(open)d.querySelector('#sheet').classList.remove('open');
    return open ? nm : false;
  });
  T('경기 시작을 누르면 넘어간다', ()=>{
    const ov=d.querySelector('.rk-ov');
    [...ov.querySelectorAll('button')].find(b=>b.textContent==='경기 시작').click();
    return ev("window.__started")===true && !d.querySelector('.rk-ov');
  });
  T('랭킹 화면에 undefined·NaN 이 없다', ()=>{
    ev("showRankIntro(function(){})");
    const h=d.querySelector('.rk-ov').innerHTML;
    d.querySelector('.rk-ov').remove();
    return !/undefined|NaN/.test(h);
  });

  console.log('\n[설정]');
  T('설정에서 경기 장면을 끄고 켤 수 있다', ()=>{
    w.go('more');
    const bs=[...d.querySelectorAll('#view .btn')].filter(b=>/중요한 장면만|매 타석|끄기/.test(b.textContent));
    const off=[...d.querySelectorAll('#view .btn')].filter(b=>b.textContent==='끄기');
    if(off.length<2) return '!장면 설정이 없다';
    off[1].click();
    const r=ev("ST.sceneMode")==='off';
    ev("ST.sceneMode='key'");
    return r;
  });

  console.log(errs.length?`\n❌ ${errs.length}건`:'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})();
