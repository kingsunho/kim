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

  console.log('\n[타자·존 비율]');
  T('존이 타자보다 작다', ()=>{
    /* 화면(480x270) 기준 — 존 폭 10%(48px) · 높이 12.9%of폭(62px),
       타자 키 80px. 예전엔 존 96px > 타자 62px 이라 뒤집혀 있었다. */
    const css=ev("document.querySelector('style')?'':''"); // (스타일은 아래 문자열로 검사)
    const html=ev("document.documentElement.innerHTML");
    const m=html.match(/\.szone\{[^}]*width:([\d.]+)%;padding-top:([\d.]+)%/);
    if(!m) return '!존 크기를 못 읽는다';
    const zw=480*Number(m[1])/100, zh=480*Number(m[2])/100;
    const bat=80;
    return (zh<bat && zw<bat) ? `존 ${zw.toFixed(0)}x${zh.toFixed(0)} < 타자 ${bat}` : `!존 ${zw}x${zh}`;
  });
  T('존 가로:세로가 실제 비율(1:1.3)에 가깝다', ()=>{
    const html=ev("document.documentElement.innerHTML");
    const m=html.match(/\.szone\{[^}]*width:([\d.]+)%;padding-top:([\d.]+)%/);
    const r=Number(m[2])/Number(m[1]);
    return (r>1.15&&r<1.45) ? `1 : ${r.toFixed(2)}` : `!1 : ${r.toFixed(2)}`;
  });
  T('투수는 타자의 절반쯤이다', ()=>{
    /* v2.35.0 부터 완성 포즈 그림이라 키가 MV_FIG_H 에 있다 */
    const pit=Number(ev("MV_FIG_H.pit"));
    const bat=Number(ev("MV_FIG_H.bat"));
    const r=pit/bat;
    return (r>0.4&&r<0.68) ? `투수 ${pit} / 타자 ${bat} = ${(r*100).toFixed(0)}%` : `!${pit}/${bat}`;
  });
  T('공이 존보다 훨씬 작다', ()=>{
    const html=ev("document.documentElement.innerHTML");
    const m=html.match(/\.ball\{[^}]*width:(\d+)px/);
    return Number(m[1])<=10 ? `${m[1]}px` : `!${m[1]}px`;
  });

  console.log('\n[좌우 맞대결 안내]');
  T('투구 화면에 타자의 좌우가 표시된다', ()=>{
    ev(`(function(){ LIVE=makeLive(); LIVE.manual=true; LIVE.round=ST.round;
      if(!document.getElementById('decision')){var b=document.createElement('div');b.id='decision';document.body.appendChild(b);}
      var g=0; while(!LIVE.def().isUser && g++<200){ if(LIVE.pending)LIVE.applyDecision('change'); LIVE.step(); }
      showDecision({kind:'pitch',label:'투구'}); })()`);
    /* [2.25.0] 타자 정보가 머리말에서 전용 카드(.bat-info)로 옮겨갔다 */
    const bi=d.querySelector('#decision .bat-info');
    if(!bi) return '!타자 카드가 없다';
    const t=bi.querySelector('.bi-top').textContent.replace(/\s+/g,' ').trim();
    return /(좌타|우타)/.test(t) ? t : `!${t}`;
  });
  T('변화구가 어느 쪽으로 휘는지 알려준다', ()=>{
    const t=d.querySelector('.zinfo').textContent;
    return /(바깥으로|몸쪽으로) (흘러|파고)/.test(t) ? t.split('한가운데')[0].trim().slice(0,52) : `!${t.slice(0,40)}`;
  });

  console.log('\n[그림 해상도 · 플레이 요소]');
  T('캔버스를 화면 해상도로 그린다', ()=>{
    /* [제보] "픽셀 단위가 너무 잘 보여"
       작게 그려서 확대하면 블록이 보인다. 논리 좌표의 MVS 배로 만든다. */
    const m=ev(`(function(){var m=moundView({});var c=m.querySelector('.mv-cv');
      return c.width+'x'+c.height;})()`);
    return m===(480*3)+'x'+(270*3) ? m : `!${m}`;
  });
  T('확대 픽셀 처리(pixelated)를 안 쓴다', ()=>{
    const html=ev("document.documentElement.innerHTML");
    const mv=(html.match(/\.mv-cv\{[^}]*\}/)||[''])[0];
    const ps=(html.match(/\.ps-cv\{[^}]*\}/)||[''])[0];
    return (!/pixelated/.test(mv)&&!/pixelated/.test(ps)) ? '두 캔버스 다 부드럽게' : '!아직 pixelated';
  });
  /* [2.27.0] 손으로 그리던 선화를 파츠 시트로 갈아끼웠다.
     예전 검사는 mvGuy 안에 arc/quadraticCurveTo 가 있는지 봤는데,
     이제 mvGuy 는 갈림길만 하고 실제로는 파츠를 관절로 이어 붙인다.
     선화(mvGuyVec)는 시트를 못 읽을 때의 대비책으로 남아 있어야 한다. */
  T('사람을 파츠 시트로 그린다', ()=>{
    const parts=ev("Object.keys(MV_PARTS).length");
    const poses=ev("Object.keys(MV_POSES).length");
    const ik=ev("typeof mvIK==='function'");
    const sheet=ev("MV_SHEET_SRC.slice(0,15)");
    return (parts>=12 && poses>=6 && ik && /^data:image\/webp/.test(sheet))
      ? `파츠 ${parts}개 · 포즈 ${poses}개 · 역기구학 있음` : `!파츠${parts} 포즈${poses} ik${ik}`;
  });
  T('시트를 못 읽으면 선화로 그린다', ()=>{
    const vec=ev("String(mvGuyVec)");
    const has=['arc(','quadraticCurveTo','createLinearGradient'].filter(k=>vec.indexOf(k)>=0);
    const falls=ev("(function(){var o=MV_SHEET_OK; MV_SHEET_OK=false; var r=mvSheetFor({cap:'#2f5fb0'}); MV_SHEET_OK=o; return r===null})()");
    return (has.length===3 && falls) ? '대비책 있음' : `!곡선${has.length} 대비책${falls}`;
  });
  T('구장 셋이 서로 다르게 그려진다', ()=>{
    const ids=ev("Object.keys(MV_PARKS)");
    const keys=['back','stand','board','grass','infieldGrass'];
    const rows=ids.map(id=>keys.map(k=>JSON.stringify(ev(`MV_PARKS['${id}'].${k}`))).join('|'));
    const uniq=new Set(rows).size;
    return uniq===3 ? `${ids.join(' / ')} 전부 다름` : `!같은 구장이 있다 (${uniq}종)`;
  });
  T('구속이 구위·구종을 따라간다', ()=>{
    /* [2.24.0] 구속은 공마다 랜덤이라 한 번 값으로는 못 잰다.
       최고 구속(topKmh)과 여러 번의 평균으로 본다. */
    const hi=ev("topKmh({id:'swm',stf:60})"), lo=ev("topKmh({stf:22})");
    const avg=(stf,t)=>ev(`(function(){var s=0;for(var i=0;i<200;i++)s+=pitchKmh({stf:${stf}},'${t}');return s/200})()`);
    const ff=avg(60,'ff'), cu=avg(60,'cu');
    return (hi>lo && ff>cu && hi<=120 && lo>=93)
      ? `최고 구위60 ${hi.toFixed(0)} / 구위22 ${lo.toFixed(0)} · 평균 직구 ${ff.toFixed(0)} 커브 ${cu.toFixed(0)}`
      : `!${hi}/${lo}/${ff}/${cu}`;
  });
  T('타이밍 게이지가 타격 화면에 있다', ()=>{
    const src=ev("String(renderSwing)");
    return /swg/.test(src) && /onTick/.test(src) ? '게이지 + 진행 표시' : '!없다';
  });
  T('스윙 순간이 눈금으로 남는다', ()=>{
    const src=ev("String(renderSwing)");
    return /swg-mark/.test(src) ? '눈금 표시' : '!없다';
  });

  console.log(errs.length?`\n❌ ${errs.length}건`:'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})();
