/* [2.82.0] 선수단 둘러보기 — 1군/2군 · 우리 팀/상대 팀
   [요청] "1군 2군 뎁스나 라인업도 볼 수 있게 해줘야겠는데 뭐 다른팀이든 우리팀이든" */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|not implemented|getContext/i.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();const ok=!!r&&!(typeof r==='string'&&r[0]==='!');
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!ok)errs.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const txt=()=>d.getElementById('view').textContent;

(async()=>{
  await wait(800);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300);
  ev("ST.tutDone=true; ST.mode='player'; ST.playerId='ksh'; ST.role='bat'; ST.myPos='C'; normalizeState(); ST.farm=[]; farmFill(9);");

  console.log('[들어가는 길]');
  T('더보기에 입구가 있다', ()=>{
    ev("go('more')");
    return [...d.querySelectorAll('#view .btn')].some(b=>/선수단 보기/.test(b.textContent))
      ? '선수단 보기' : '!없다';
  });
  T('순위표에서 팀을 누르면 열린다', ()=>{
    ev("go('stand')");
    const rows=[...d.querySelectorAll('#view table.stand tr')].filter(r=>r.onclick);
    if(!rows.length) return '!누를 수 있는 줄이 없다';
    rows[rows.length-1].click();
    return ev("curView")==='rosters' ? `${rows.length}팀 전부 눌린다` : '!안 열린다';
  });

  console.log('[우리 팀 1군]');
  T('명단이 전부 나온다', ()=>{
    ev("rvTeam='wwzw'; rvLevel='first'; rvView='list'; go('rosters')");
    const n=ev("rvRoster('wwzw','first').length");
    const rows=d.querySelectorAll('#view table.stand tr').length-1;
    return rows===n && n>=9 ? `${n}명` : `!표 ${rows} / 명단 ${n}`;
  });
  T('뎁스가 자리마다 나온다', ()=>{
    ev("rvView='depth'; go('rosters')");
    const sec=d.querySelectorAll('#view .rv-pos').length;
    return sec>=8 ? `${sec}자리` : `!${sec}자리`;
  });
  T('투수 칸이 비지 않는다', ()=>ev(`(function(){
    rvTeam='wwzw'; rvLevel='first';
    var n=rvRoster('wwzw','first').filter(function(p){return rvIsPitcher('wwzw','first',p);}).length;
    return n>=3 ? n+'명' : '!'+n+'명';
  })()`));

  console.log('[상대 팀]');
  T('스물세 팀 전부 명단이 있다', ()=>ev(`(function(){
    var bad=[];
    TEAMS.forEach(function(t){ if(t.id==='wwzw') return;
      if(rvRoster(t.id,'first').length<9) bad.push(t.name); });
    return bad.length? '!'+bad.join(',') : (TEAMS.length-1)+'팀 전부 9명 이상';
  })()`));
  T('상대 팀 투수도 명단에 잡힌다', ()=>ev(`(function(){
    var bad=[];
    TEAMS.forEach(function(t){ if(t.id==='wwzw') return;
      var n=rvRoster(t.id,'first').filter(function(p){return rvIsPitcher(t.id,'first',p);}).length;
      if(n<1) bad.push(t.name); });
    return bad.length? '!투수 없는 팀 '+bad.length : '전부 투수가 있다';
  })()`));
  T('팀마다 뎁스가 다르다', ()=>ev(`(function(){
    /* META 를 쓰면 상대 팀은 전부 40 으로 나와서 스물세 팀 뎁스가 똑같아진다.
       선수 객체를 보고 세는지 확인한다. */
    var sig=TEAMS.filter(function(t){return t.id!=='wwzw';}).slice(0,8).map(function(t){
      var r=rvRoster(t.id,'first');
      return r.map(function(p){return Math.round(rvScore(p,'SS'));}).sort().join(',');
    });
    return new Set(sig).size===sig.length ? sig.length+'팀 전부 다르다' : '!겹친다';
  })()`));
  T('구경만 해도 상대 팀 수비력이 안 바뀐다', ()=>ev(`(function(){
    /* aiLineup 은 team._slotDef 를 덮어쓴다. 진짜 팀 객체를 넘기면
       뎁스 한 번 봤다고 그 팀 수비가 바뀐다. */
    var t=TEAMS.find(function(x){return x.id!=='wwzw';});
    var before=t._slotDef;
    rvTeam=t.id; rvLevel='first'; rvView='line'; renderRosters();
    return t._slotDef===before ? '그대로' : '!'+before+' → '+t._slotDef;
  })()`));

  console.log('[2군]');
  T('선수 모드면 2군 칩이 뜬다', ()=>{
    ev("ST.mode='player'; rvTeam='wwzw'; rvView='depth'; go('rosters')");
    return [...d.querySelectorAll('#view .btn')].some(b=>b.textContent==='2군') ? '2군 칩' : '!없다';
  });
  T('감독 모드면 2군이 없다', ()=>{
    ev("ST.mode='mgr'; rvLevel='farm'; go('rosters')");
    const has=[...d.querySelectorAll('#view .btn')].some(b=>b.textContent==='2군');
    return (!has && ev("rvLevel")==='first') ? '1군으로 돌아간다' : '!2군이 보인다';
  });
  T('우리 2군은 안 올라온 사람들이다', ()=>ev(`(function(){
    ST.mode='player';
    var r=rvRoster('wwzw','farm');
    var up=ST.farm.filter(function(p){return p.up;}).length;
    return r.length===ST.farm.length-up ? r.length+'명 (올라간 '+up+'명 빼고)'
      : '!'+r.length+' / '+(ST.farm.length-up);
  })()`));
  T('상대 팀 2군도 볼 수 있다', ()=>ev(`(function(){
    var t=TEAMS.find(function(x){return x.id!=='wwzw';});
    var r=aiFarmRoster(t.id);
    return r.length>=9 ? t.name+' 2군 '+r.length+'명' : '!'+r.length;
  })()`));
  T('같은 팀을 다시 열면 같은 사람이다', ()=>ev(`(function(){
    var t=TEAMS.find(function(x){return x.id!=='wwzw';});
    var a=aiFarmRoster(t.id).map(function(p){return p.name;}).join(',');
    var b=aiFarmRoster(t.id).map(function(p){return p.name;}).join(',');
    return a===b ? '같다' : '!달라진다';
  })()`));
  T('팀마다 2군이 다르다', ()=>ev(`(function(){
    var sig=TEAMS.filter(function(x){return x.id!=='wwzw';}).slice(0,6)
      .map(function(t){return aiFarmRoster(t.id).map(function(p){return p.name;}).join(',');});
    return new Set(sig).size===sig.length ? '6팀 전부 다르다' : '!겹친다';
  })()`));
  T('2군 가상 선수도 투구 능력치가 있다', ()=>ev(`(function(){
    /* [버그 이력 2.81.0] pitch 안에만 넣어놔서 상대 2군이 전부 빈 값이었다 */
    var bad=aiFarmRoster('ansanutd').filter(function(p){
      return p.stf==null||p.ctl==null||p.sta==null; });
    return bad.length? '!'+bad.length+'명' : '열 명 전부';
  })()`));
  T('2군 뎁스도 그려진다', ()=>{
    ev("ST.mode='player'; rvTeam='wwzw'; rvLevel='farm'; rvView='depth'; go('rosters')");
    return d.querySelectorAll('#view .rv-pos').length>=5 ? '자리별로 나온다' : '!안 나온다';
  });

  console.log('[라인업]');
  T('상대 팀 예상 라인업은 아홉 명', ()=>{
    ev("ST.mode='mgr'; rvTeam=TEAMS.find(t=>t.id!=='wwzw').id; rvLevel='first'; rvView='line'; go('rosters')");
    const rows=d.querySelectorAll('#view table.stand tr').length-1;
    return rows>=9 ? `${rows}줄 (라인업 9 + 로테이션)` : `!${rows}줄`;
  });
  T('로테이션도 같이 나온다', ()=>/로테이션/.test(txt()) ? '나온다' : '!없다');
  T('선수 모드에선 우리 라인업을 발표 전에 안 보여준다', ()=>{
    ev("ST.mode='player'; ST.announced=false; rvTeam='wwzw'; rvLevel='first'; rvView='line'; go('rosters')");
    return /발표 전/.test(txt()) ? '발표를 봐야 안다' : '!그냥 보인다';
  });
  T('발표하면 보인다', ()=>{
    ev("ST.announced=true; go('rosters')");
    return !/발표 전/.test(txt()) && /로테이션/.test(txt()) ? '라인업이 나온다' : '!안 나온다';
  });
  T('감독 모드는 언제나 보인다', ()=>{
    ev("ST.mode='mgr'; ST.announced=false; rvTeam='wwzw'; rvView='line'; go('rosters')");
    return !/발표 전/.test(txt()) ? '보인다' : '!막혀 있다';
  });

  console.log('[카드]');
  T('2군 선수를 누르면 시트가 뜬다', ()=>{
    ev("ST.mode='player'; rvTeam='wwzw'; rvLevel='farm'; rvView='list'; go('rosters')");
    const row=d.querySelector('#view table.stand tr:nth-child(2)');
    if(!row) return '!줄이 없다';
    row.click();
    const open=d.getElementById('sheet').classList.contains('open');
    return open && /컨택/.test(d.getElementById('sheet-body').textContent) ? '능력치가 뜬다' : '!안 뜬다';
  });
  T('보다가 화면이 안 날아간다', ()=>ev("curView")==='rosters' ? '둘러보던 자리 그대로' : '!화면이 바뀐다');

  console.log('[안전]');
  T('없는 팀을 넣어도 안 죽는다', ()=>{
    ev("rvTeam='nope'; go('rosters')");
    return ev("rvTeam")==='wwzw' ? '우리 팀으로 돌아간다' : '!'+ev("rvTeam");
  });
  T('2군이 비어도 안 죽는다', ()=>{
    ev("ST.mode='player'; ST.farm=[]; ST.farmReal={}; ST.myFarm=0; rvTeam='wwzw'; rvLevel='farm'; rvView='depth'; go('rosters')");
    return /아무도 없다/.test(txt()) ? '비었다고 말해준다' : '!'+txt().slice(0,40);
  });
  T('콘솔 예외 없음', ()=>errs.length?('!'+errs.join(' / ')):'깨끗');

  console.log(errs.length?`\n❌ ${errs.length}개 실패`:'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})();
