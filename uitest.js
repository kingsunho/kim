/* [2.20.0] UI — 짧아진 튜토리얼 · 화면 첫 진입 팁 · ? 도움말 · 구장 그림 */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|not implemented/i.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();const ok=!!r&&!(typeof r==='string'&&r[0]==='!');
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!ok)errs.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const txt=()=>d.querySelector('#view').textContent;

(async()=>{
  await wait(700);
  console.log('[튜토리얼 길이]');
  T('핵심 다섯 장으로 줄었다', ()=>{
    const n=ev("tutList().length");
    return n===5 ? `${n}장 (원본 ${ev("TUTORIAL.length")}장은 도움말에 남아 있다)` : `!${n}장`;
  });
  T('핵심에 꼭 들어가야 할 게 들어 있다', ()=>{
    const ts=ev("tutList().map(x=>x.t).join(' / ')");
    return /무슨 게임/.test(ts)&&/한 주/.test(ts)&&/공짜진루/.test(ts)&&/사람 관리/.test(ts)
      ? ts : `!${ts}`;
  });
  T('내용은 하나도 안 버렸다', ()=>ev("TUTORIAL.length")>=20);

  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300);

  console.log('\n[튜토리얼 화면]');
  T('페이지 표시가 다섯 장 기준이다', ()=>{
    ev("ST.tutDone=false; ST.tutStep=0; go('tutorial')");
    const b=[...d.querySelectorAll('#view .btn')].map(x=>x.textContent).join(' | ');
    const dots=d.querySelectorAll('.tut-dots i').length;
    return dots===5 && /1 \/ 5/.test(b) ? `점 ${dots}개 · ${b}` : `!점 ${dots} · ${b}`;
  });
  T('끝까지 넘기면 시작 버튼이 나온다', ()=>{
    for(let i=0;i<4;i++){
      const nx=[...d.querySelectorAll('#view .btn')].find(x=>/다음/.test(x.textContent));
      if(nx)nx.click();
    }
    return !![...d.querySelectorAll('#view .btn')].find(x=>x.textContent==='시작한다');
  });
  T('? 를 안내한다', ()=>/\? 를 누르면/.test(txt()));

  console.log('\n[? 도움말]');
  T('상단에 ? 버튼이 있다', ()=>!!d.querySelector('#helpbtn'));
  T('누르면 목차가 열린다', ()=>{
    ev("ST.tutDone=true"); w.go('lineup');
    d.querySelector('#helpbtn').click();
    const rows=d.querySelectorAll('#sheet-body .help-row').length;
    return rows>=20 ? `${rows}개 항목` : `!${rows}개`;
  });
  T('지금 화면 관련 항목이 맨 위로 온다', ()=>{
    const hot=[...d.querySelectorAll('#sheet-body .help-row.hot')].map(x=>x.textContent.replace('›','').trim());
    return hot.length>=1 ? hot.join(' / ') : '!없다';
  });
  T('항목을 누르면 본문이 나온다', ()=>{
    const r=d.querySelector('#sheet-body .help-row');
    const nm=r.textContent.replace('›','').trim();
    r.click();
    const b=d.querySelector('#sheet-body').textContent;
    return b.indexOf(nm)>=0 && b.length>200 ? `${nm} (${b.length}자)` : '!본문이 짧다';
  });
  T('목록으로 돌아갈 수 있다', ()=>{
    [...d.querySelectorAll('#sheet-body .btn')].find(x=>/목록/.test(x.textContent)).click();
    return d.querySelectorAll('#sheet-body .help-row').length>=20;
  });
  T('화면마다 다른 항목을 앞에 세운다', ()=>{
    const g=ev("JSON.stringify((HELP_FOR['game']||[]).map(k=>TUTORIAL[k].t))");
    const t=ev("JSON.stringify((HELP_FOR['train']||[]).map(k=>TUTORIAL[k].t))");
    return g!==t ? '경기/훈련 목록이 다르다' : '!같다';
  });
  T('도움말에 undefined 가 없다', ()=>{
    ev("openHelp('records')");
    return !/undefined/.test(d.querySelector('#sheet-body').innerHTML);
  });
  ev("$('#sheet').classList.remove('open')");

  console.log('\n[화면 첫 진입 안내]');
  T('처음 들어간 화면에서 한 번 뜬다', ()=>{
    ev("ST.seenTip={}; ST.tutDone=true");
    w.go('squad');
    const b=d.querySelector('#view .tip-box');
    return b ? b.textContent.replace(/\s+/g,' ').slice(0,44) : '!안 뜬다';
  });
  T('두 번째부터는 안 뜬다', ()=>{
    w.go('home'); w.go('squad');
    return !d.querySelector('#view .tip-box');
  });
  T('닫기 버튼이 있다', ()=>{
    ev("ST.seenTip={}"); w.go('lineup');
    const b=d.querySelector('#view .tip-box');
    if(!b) return '!안 뜬다';
    b.querySelector('.tip-x').click();
    return !d.querySelector('#view .tip-box');
  });
  T('튜토리얼을 안 끝냈으면 안 뜬다', ()=>{
    ev("ST.seenTip={}; ST.tutDone=false");
    w.go('stand');
    const r=!d.querySelector('#view .tip-box');
    ev("ST.tutDone=true");
    return r;
  });
  T('안내가 화면 맨 위에 붙는다', ()=>{
    ev("ST.seenTip={}"); w.go('records');
    const c=d.querySelector('#view');
    return c.firstChild && c.firstChild.classList && c.firstChild.classList.contains('tip-box');
  });
  T('안내 문구가 그 화면 얘기다', ()=>{
    ev("ST.seenTip={}"); w.go('train');
    const b=d.querySelector('#view .tip-box');
    return b && /훈련/.test(b.textContent) ? b.textContent.replace(/\s+/g,' ').slice(0,40) : '!엉뚱한 안내';
  });

  console.log('\n[구장 그림]');
  T('타석·마운드 화면이 캔버스로 바뀌었다', ()=>{
    const m=ev(`(function(){var m=moundView({});
      return [!!m.querySelector('.mv-cv'), !m.querySelector('.pit-fig'),
              !m.querySelector('.bat-fig'), !!m.querySelector('#mvboard')].join(',');})()`);
    return m==='true,true,true,true' ? '캔버스 · 옛 그림판 제거 · 전광판' : `!${m}`;
  });
  T('전광판에 두 팀 이름과 점수가 들어간다', ()=>{
    ev(`(function(){ ST.tutDone=true; runWeek(); ST.weekDone=true; ST.announced=true;
      ST.lineupDirty=false; ST.absent={}; ST.events=[];
      LIVE=makeLive(); LIVE.manual=true; LIVE.home.runs=3; LIVE.away.runs=5;
      window.__m=moundView({}); })()`);
    const b=ev("__m.querySelector('#mvboard').textContent");
    return /3/.test(b)&&/5/.test(b) ? b.replace(/\s+/g,' ').trim() : `!${b}`;
  });
  T('상단 띠에 이닝·아웃·주자가 나온다', ()=>{
    ev("LIVE.inning=4; LIVE.half=1; LIVE.outs=2; LIVE.bases=['x',null,'y']; mvScore(window.__m)");
    const t=ev("__m.querySelector('#mvtop').textContent");
    const on=ev("__m.querySelectorAll('#mvtop .mvt-dia u.on').length");
    return /4회 말/.test(t)&&on===2 ? `${t.trim()} · 주자 ${on}명` : `!${t} / ${on}`;
  });
  T('그라운드 홈런은 담장을 안 넘는다', ()=>{
    const a=ev("psScene({seq:1,kind:'HR',itp:true,bat:{bats:'R'}}).dist");
    const b=ev("psScene({seq:1,kind:'HR',itp:false,bat:{bats:'R'}}).dist");
    return (a<195 && b>195) ? `인정 ${a} / 담장밖 ${b} (담장 195)` : `!${a} / ${b}`;
  });

  console.log('\n[투수 손 그림]');
  T('마주 보는 우완의 던지는 팔은 화면 왼쪽이다', ()=>{
    /* 시점이 포수 뒤다. 그래서 우완일 때 도형을 뒤집어 그린다.
       [버그 이력] 이걸 반대로 해서 우완 열두 명이 좌완 모션이었다. */
    const src=ev("String(mvPaint)");
    return /!st\.pitLeft/.test(src) ? '우완이 flip' : '!아직 반대다';
  });
  T('우리 팀 좌완은 둘뿐이다', ()=>{
    const L=ev("TBYID['wwzw'].pitchers.filter(p=>throwHandOf(p)==='L').map(p=>p.name).join(',')");
    return L==='김상훈,이승민' ? L : `!${L}`;
  });
  T('상대 팀 투수는 손 정보가 없으면 우완으로 본다', ()=>{
    const bad=ev(`(function(){var n=0;TEAMS.forEach(t=>{ if(t.id==='wwzw')return;
      (t.pitchers||[]).forEach(p=>{ if(throwHandOf(p)!=='R')n++; })}); return n;})()`);
    return bad===0 ? '전원 우완' : `!${bad}명이 좌완으로 잡힌다`;
  });
  T('구장 해상도가 올라갔다', ()=>{
    const w=ev("MVW"), h=ev("MVH");
    return (w===480&&h===270) ? `${w}x${h}` : `!${w}x${h}`;
  });
  T('투구 모션이 다섯 단계다', ()=>{
    const src=ev("String(windup)");
    const has=['wind','cock','rel','follow','idle'].filter(k=>src.indexOf("'"+k+"'")>=0);
    return has.length===5 ? has.join('→') : `!${has.join(',')}`;
  });
  T('하늘이 날씨를 따라간다', ()=>{
    const a=ev("(function(){ST.weather='clear';return mvSkyKind()})()");
    const b=ev("(function(){ST.weather='rain';return mvSkyKind()})()");
    const c=ev("(function(){ST.weather='hot';return mvSkyKind()})()");
    ev("ST.weather='clear'");
    return (a==='clear'&&b==='rain'&&c==='hot') ? `${a}/${b}/${c}` : `!${a}/${b}/${c}`;
  });
  T('전광판에 이닝별 점수가 들어간다', ()=>{
    ev(`(function(){ LIVE.away.line=[1,0,2]; LIVE.home.line=[0,3]; LIVE.inning=3;
      window.__m2=moundView({}); })()`);
    const cells=ev("__m2.querySelectorAll('#mvboard .mvb-r i u').length");
    const now=ev("__m2.querySelectorAll('#mvboard .mvb-r i u.now').length");
    return cells>=21 && now>=1 ? `${cells}칸 · 현재 이닝 표시 ${now}개` : `!${cells}/${now}`;
  });

  console.log(errs.length?`\n❌ ${errs.length}건`:'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})();
