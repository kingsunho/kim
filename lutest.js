/* 저장된 라인업 — 타순·수비·로테이션·전술을 통째로 담고 꺼낸다 */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|Could not load|stylesheet/.test(e.message))errs.push('JSDOM: '+e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

setTimeout(async()=>{
  d.querySelectorAll('.pickcard')[0].click();await wait(50);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(250);
  ev("ST.tutDone=true; ST.absent={}; ST.injury={}; ST.weekDone=true;");
  ev("ST.lineup=recommendLineup(); ST.rotation=recommendRotation();");

  console.log('[담기]');
  T('빈 칸 네 개로 시작한다', ()=>ev("LU_SLOTS")===4 && ev("luPresets().length")===0);
  T('지금 판을 그대로 뜬다', ()=>{
    ev("ST.tactics={bat:'aggressive',run:'hold',hook:'long'}; ST.useDH=false;");
    const p=ev("JSON.parse(JSON.stringify(luSnapshot('베스트')))");
    const cur=ev("JSON.stringify(ST.lineup.map(s=>s.id+':'+s.pos))");
    return p.name==='베스트' && p.lineup.length===9
      && JSON.stringify(p.lineup.map(s=>s.id+':'+s.pos))===cur
      && p.rotation.length>0 && p.tactics.bat==='aggressive'
      && p.tactics.run==='hold' && p.tactics.hook==='long' && p.useDH===false;
  });
  T('이름은 12자로 자른다', ()=>ev("luSnapshot('가나다라마바사아자차카타파하').name").length===12);
  T('이름이 비면 대신 채운다', ()=>ev("luSnapshot('').name")==='이름 없음');

  console.log('\n[꺼내기]');
  /* 스냅샷은 지명타자 설정과 **맞아떨어진 상태**에서 떠야 한다.
     useDH 만 바꾸고 라인업을 안 맞추면 luApply 의 fixLineupPositions 가
     P/DH 자리를 다시 배정해서 당연히 달라진다. 실제 화면에서는
     지명타자 토글이 applyDHRule 을 같이 부르기 때문에 어긋날 일이 없다. */
  const rt=(()=>{
    const r=ev(`(function(){
      ST.useDH=false; applyDHRule(); fixLineupPositions();
      ST.tactics={bat:'aggressive',run:'hold',hook:'long'};
      var snap=luSnapshot('A');
      var want=ST.lineup.map(function(s){return s.id+':'+s.pos}).join(',');
      var wantRot=ST.rotation.join(',');
      ST.lineup=recommendLineup(); ST.lineup.reverse();
      ST.rotation=ST.rotation.slice().reverse();
      ST.tactics={bat:'normal',run:'normal',hook:'normal'}; ST.useDH=true;
      var res=luApply(snap);
      return JSON.stringify({ok:res.ok,
        lineup:ST.lineup.map(function(s){return s.id+':'+s.pos}).join(',')===want,
        rot:ST.rotation.join(',')===wantRot,
        tac:ST.tactics.bat==='aggressive'&&ST.tactics.run==='hold'&&ST.tactics.hook==='long',
        dh:ST.useDH===false});
    })()`);
    return JSON.parse(r);
  })();
  T('꺼내면 적용된다', ()=>rt.ok);
  T('타순과 수비 위치가 그대로 돌아온다', ()=>rt.lineup);
  T('투수 로테이션이 그대로 돌아온다', ()=>rt.rot);
  T('팀 전술이 그대로 돌아온다', ()=>rt.tac);
  T('지명타자 설정도 같이 돌아온다', ()=>rt.dh);
  T('꺼낸 뒤에도 9명이다', ()=>ev("ST.lineup.length")===9);
  T('같은 선수가 두 번 들어가지 않는다', ()=>{
    const ids=JSON.parse(ev("JSON.stringify(ST.lineup.map(s=>s.id))"));
    return new Set(ids).size===ids.length;
  });

  console.log('\n[결장자 처리]');
  T('그날 못 나오는 사람은 벤치에서 메운다', ()=>ev(`(function(){
    ST.absent={}; ST.injury={};
    ST.lineup=recommendLineup();
    var snap=luSnapshot('B');
    var victim=snap.lineup[3].id;
    ST.absent[victim]=true;                       // 이 사람이 못 나온다
    var r=luApply(snap);
    if(!r.ok) return '적용 실패';
    if(ST.lineup.some(function(s){return s.id===victim})) return '결장자가 그대로 들어갔다';
    if(ST.lineup.length!==9) return '9명이 안 된다';
    if(!r.filled.length) return '교체 기록이 없다';
    ST.absent={};
    return r.filled.length+'명 교체';
  })()`));
  T('메운 사람도 그날 나올 수 있는 사람이다', ()=>ev(`(function(){
    return ST.lineup.every(function(s){return isAvailable(s.id)});
  })()`));
  T('팀에 없는 선수는 털어낸다', ()=>ev(`(function(){
    ST.absent={}; ST.injury={};
    var snap=luSnapshot('C');
    snap.lineup[0]={id:'없는사람',pos:'LF'};       // 이적·은퇴로 사라진 경우
    var r=luApply(snap);
    if(!r.ok) return '적용 실패';
    if(ST.lineup.some(function(s){return s.id==='없는사람'})) return '유령이 들어갔다';
    if(ST.lineup.length!==9) return '9명이 안 된다';
    return r.gone.length+'명 제외';
  })()`));
  T('로테이션에 없는 투수가 섞이면 걸러진다', ()=>ev(`(function(){
    var snap=luSnapshot('D');
    snap.rotation=['없는투수'].concat(snap.rotation);
    luApply(snap);
    return ST.rotation.indexOf('없는투수')<0 && ST.rotation.length>0;
  })()`));

  console.log('\n[화면]');
  T('라인업 화면에 저장 칸이 나온다', ()=>{
    ev("ST.luSaved=[]"); w.go('lineup');
    const t=d.getElementById('view').textContent;
    return /저장된 라인업/.test(t) && d.querySelectorAll('#view .lu-slot').length===4;
  });
  T('빈 칸에는 저장 버튼이 있다', ()=>
    [...d.querySelectorAll('#view .lu-slot')].every(r=>/여기 저장/.test(r.textContent)));
  T('저장 버튼을 누르면 이름 시트가 열린다', ()=>{
    [...d.querySelectorAll('#view .lu-slot .btn')][0].click();
    return d.getElementById('sheet').classList.contains('open')
      && !!d.getElementById('lu-nm');
  });
  T('시트에서 저장하면 칸이 채워진다', ()=>{
    d.getElementById('lu-nm').value='주말용';
    [...d.querySelectorAll('#sheet-body .btn')].find(b=>b.textContent==='저장').click();
    return ev("luPresets().length")===1 && ev("luPresets()[0].name")==='주말용';
  });
  T('채워진 칸에 불러오기·지우기가 붙는다', ()=>{
    w.go('lineup');
    const r=d.querySelector('#view .lu-slot');
    return /주말용/.test(r.textContent) && /불러오기/.test(r.textContent) && /지우기/.test(r.textContent);
  });
  T('불러오기가 실제로 먹는다', ()=>{
    ev("ST.tactics={bat:'normal',run:'normal',hook:'normal'}");
    ev("luPresets()[0].tactics={bat:'contact',run:'aggressive',hook:'quick'}");
    w.go('lineup');
    [...d.querySelectorAll('#view .lu-slot .btn')].find(b=>b.textContent==='불러오기').click();
    return ev("ST.tactics.bat")==='contact' && ev("ST.tactics.run")==='aggressive';
  });
  T('지우기가 먹는다', ()=>{
    w.go('lineup');
    [...d.querySelectorAll('#view .lu-slot .btn')].find(b=>b.textContent==='지우기').click();
    return ev("luPresets().length")===0;
  });
  T('네 칸을 넘겨 저장되지 않는다', ()=>{
    ev("ST.luSaved=[luSnapshot('1'),luSnapshot('2'),luSnapshot('3'),luSnapshot('4'),luSnapshot('5')]; normalizeState();");
    return ev("luPresets().length")===4;
  });
  T('저장 칸 화면에 undefined 없음', ()=>{
    ev("ST.luSaved=[luSnapshot('가')]"); w.go('lineup');
    return !/undefined|NaN/.test(d.getElementById('view').textContent);
  });

  console.log('\n[세이브 호환]');
  T('옛 세이브(칸 없음)도 안 깨진다', ()=>{
    ev("delete ST.luSaved; normalizeState();");
    return Array.isArray(ev("ST.luSaved")) && ev("ST.luSaved.length")===0;
  });
  T('망가진 항목은 걸러낸다', ()=>{
    ev("ST.luSaved=[null,{},{lineup:'x'},luSnapshot('정상')]; normalizeState();");
    return ev("luPresets().length")===1 && ev("luPresets()[0].name")==='정상';
  });
  T('용병은 저장본에서 털어낸다', ()=>ev(`(function(){
    var m=MERC_IDS[0];                            // 진짜 용병 id 를 쓴다
    if(!m) return '용병 목록이 비었다';
    var p=luSnapshot('용병섞임');
    p.lineup[0]={id:m,pos:'LF'}; p.rotation=[m].concat(p.rotation);
    ST.luSaved=[p]; normalizeState();
    var q=luPresets()[0];
    return (!q.lineup.some(function(s){return s.id===m}) && q.rotation.indexOf(m)<0)
      ? m+' 제거됨' : false;
  })()`));
  T('저장 후 로드해도 칸이 남는다', ()=>ev(`(function(){
    ST.luSaved=[luSnapshot('보존')];
    var s=serializeState();
    var back=JSON.parse(s);
    return back.luSaved && back.luSaved.length===1 && back.luSaved[0].name==='보존';
  })()`));

  console.log(errs.length?`\n❌ ${errs.length}건\n - `+errs.join('\n - '):'\n✅ 전부 통과');
  process.exit(errs.length?1:0);
},600);
