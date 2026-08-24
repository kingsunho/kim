/* [2.28.0] 만약에 순수 시뮬레이션 · 홈 진입 · 스프라이트 몸통/신발 · 공마다 노림수 시간 */
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
const nameOf_=(ev,id)=>ev(`nameOf(${JSON.stringify(id)})`);

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300); ev("ST.tutDone=true;");

  console.log('[홈 화면에서 바로 들어간다]');
  T('홈에 만약에 카드가 있다', ()=>{
    ev("go('home')");
    const cards=[...d.querySelectorAll('#view .card')];
    const wi=cards.find(c=>{const h=c.querySelector('.card-h');return h&&h.textContent.trim()==='만약에';});
    return wi ? '있다' : '!없다';
  });
  T('그 버튼을 누르면 만약에 화면이 열린다', ()=>{
    const b=[...d.querySelectorAll('#view .btn')].find(x=>x.textContent==='붙어보면 어떻게 될까');
    if(!b) return '!버튼 없음';
    b.click();
    return ev("curView")==='whatif' ? '열린다' : '!'+ev("curView");
  });
  T('안내 문구가 순수 시뮬레이션이라고 말한다', ()=>{
    const t=d.querySelector('#view').textContent;
    return /순수 시뮬레이션/.test(t) && /카톡 발표도 없다/.test(t) ? 'ok' : '!문구 없음';
  });

  console.log('\n[지금 시즌이 안 새어 들어온다]');
  T('원본 능력치를 쓴다 — 훈련으로 올린 게 안 들어간다', ()=>{
    // 실제 로스터의 능력치를 억지로 올려놓고 whatIfRoster 가 원본을 돌려주는지 본다
    return ev(`(function(){
      var t=TBYID['wwzw'], p=t.players[0];
      var orig=WWZW.find(x=>x.id===p.id);
      p.pow=orig.pow+30; p.con=orig.con+30;
      var wr=whatIfRoster(), q=wr.players.find(x=>x.id===p.id);
      var ok=(q.pow===orig.pow && q.con===orig.con);
      p.pow=orig.pow; p.con=orig.con;
      return ok ? '원본 유지' : '!'+q.pow+'/'+orig.pow;
    })()`);
  });
  T('투수 구위도 원본으로 돌아온다', ()=>ev(`(function(){
      var t=TBYID['wwzw'], q=t.pitchers[0];
      var orig=WWZW.find(x=>x.id===q.id);
      q.stf=orig.pitch.stf+25;
      var ok=whatIfRoster().pitchers.find(x=>x.id===q.id).stf===orig.pitch.stf;
      q.stf=orig.pitch.stf; return ok?'ok':'!안 돌아옴'; })()`));
  T('결장·부상이 있어도 베스트 라인업이 9명 그대로 나온다', ()=>ev(`(function(){
      ST.absent={}; ST.injury={};
      TBYID['wwzw'].players.slice(0,3).forEach(p=>{ ST.absent[p.id]='개인사정';
        ST.injury[p.id]={name:'염좌',games:3}; });
      var lu=whatIfBest();
      var out=lu.filter(s=>ST.absent[s.id]).length;
      ST.absent={}; ST.injury={};
      return (lu.length===9 && out>0) ? ('9명 · 결장자 '+out+'명 포함') : '!'+lu.length+'명/'+out;
    })()`));
  T('같은 시드는 같은 결과 — 컨디션이 흔들어도 안 바뀐다', ()=>ev(`(function(){
      whatIfInit();
      var a=whatIfRun(3);
      TBYID['wwzw'].players.forEach(p=>{ ST.cond[p.id]=10; ST.morale[p.id]=10; });
      var b=whatIfRun(3);
      TBYID['wwzw'].players.forEach(p=>{ ST.cond[p.id]=70; ST.morale[p.id]=70; });
      return (a.home.runs===b.home.runs && a.away.runs===b.away.runs)
        ? (a.away.runs+':'+a.home.runs+' 그대로') : '!'+a.home.runs+'→'+b.home.runs;
    })()`));
  T('장비 페널티가 안 먹는다', ()=>{
    const src=ev("String(whatIfRun)");
    return /gearPenalty\s*=\s*0/.test(src) ? 'gearPenalty=0' : '!장비가 들어간다';
  });
  T('양쪽 작전이 전부 normal 이다', ()=>{
    const src=ev("String(whatIfRun)");
    const n=(src.match(/bat:'normal'/g)||[]).length;
    return n>=2 ? `${n}쪽 중립` : '!'+n;
  });
  T('돌려도 세이브 기록이 하나도 안 움직인다', ()=>ev(`(function(){
      var before=JSON.stringify({bat:ST.bat,pit:ST.pit,stand:ST.stand,round:ST.round,
        cond:ST.cond,morale:ST.morale,fatigue:ST.fatigue});
      whatIfInit(); whatIfRun(11); whatIfRun(12);
      var after=JSON.stringify({bat:ST.bat,pit:ST.pit,stand:ST.stand,round:ST.round,
        cond:ST.cond,morale:ST.morale,fatigue:ST.fatigue});
      return before===after ? '무변화' : '!세이브가 바뀌었다';
    })()`));
  T('카톡 로그도 안 늘어난다', ()=>ev(`(function(){
      var n=(ST.chat||[]).length; whatIfInit(); whatIfRun(21);
      return ((ST.chat||[]).length===n) ? ('그대로 '+n+'줄') : '!늘었다';
    })()`));

  console.log('\n[라인업을 직접 짠다]');
  T('열네 명 전부 후보다 — 못 나오는 사람이 없다', ()=>ev(`(function(){
      ST.absent={}; ST.injury={};
      TBYID['wwzw'].players.slice(0,4).forEach(function(p){
        ST.absent[p.id]='개인사정'; ST.injury[p.id]={name:'염좌',games:5}; });
      whatIfInit(); go('whatif');
      var txt=document.querySelector('#view').textContent;
      var n=(WHATIF.line||[]).length;
      var benchOut=(WHATIF.line||[]).filter(function(s){return ST.absent[s.id];}).length;
      ST.absent={}; ST.injury={};
      if(/못 나온다|출전 불가|결장/.test(txt)) return '!못 나온다는 말이 뜬다';
      return (n===9) ? ('9명 · 결장 표시 없음 · 결장자 '+benchOut+'명 포함') : '!'+n+'명';
    })()`));
  T('투수 순서를 두 명 눌러 바꾼다', ()=>{
    ev("whatIfInit(); go('whatif')");
    const rows=[...d.querySelectorAll('#view .wi-pr')];
    if(rows.length<2) return '!투수 순서 목록이 없다';
    const before=ev("whatIfSp()");
    rows[0].click(); rows[2].click();
    const after=ev("whatIfSp()");
    return after&&after!==before
      ? `선발 ${nameOf_(ev,before)} → ${nameOf_(ev,after)}` : '!안 바뀐다';
  });
  T('선발이 바뀌면 야수 자리에서 빠진다', ()=>ev(`(function(){
      whatIfInit(); go('whatif'); wiPen=null;
      var rows=[].slice.call(document.querySelectorAll('#view .wi-pr'));
      rows[0].click(); rows[3].click();
      var sp=whatIfSp();
      return (WHATIF.useDH && !WHATIF.line.some(function(s){return s.id===sp;}))
        ? nameOf(sp)+' 마운드만' : '!아직 야수 자리에 있다';
    })()`));
  T('구원 순서가 실제 등판 순서다', ()=>ev(`(function(){
      whatIfInit();
      var r=whatIfRun(31);
      var used=Object.keys(r.pbox).filter(function(id){
        return TBYID['wwzw'].pitchers.some(function(p){return p.id===id;})
          && (r.pbox[id].outs||r.pbox[id].bf); });
      var want=whatIfPen().slice(0,used.length);
      return used.join()===want.join()
        ? used.map(nameOf).join(' → ') : ('!'+used.map(nameOf).join()+' vs '+want.map(nameOf).join());
    })()`));

  console.log('\n[오늘 나올 사람]');
  T('눌러서 오늘 안 나오게 뺀다', ()=>ev(`(function(){
      whatIfInit(); go('whatif');
      var chips=[].slice.call(document.querySelectorAll('#view .wi-av .wi-chip'));
      if(!chips.length) return '!명단 칩이 없다';
      var before=whatIfAvail().length;
      chips[chips.length-1].click();
      var after=whatIfAvail().length;
      return after===before-1 ? (before+'명 → '+after+'명') : '!'+before+'→'+after;
    })()`));
  T('뺀 사람은 타순에도 벤치에도 안 남는다', ()=>ev(`(function(){
      whatIfInit();
      var id=WHATIF.line[5].id;
      WHATIF.out={}; WHATIF.out[id]=1;
      var i=WHATIF.line.findIndex(function(s){return s.id===id;});
      var rep=whatIfAvail().find(function(q){
        return q.id!==whatIfSp() && !WHATIF.line.some(function(x){return x.id===q.id;}); });
      if(rep) WHATIF.line[i].id=rep.id;
      whatIfDH(); go('whatif');
      var txt=document.querySelector('#view').textContent;
      var inLine=WHATIF.line.some(function(s){return s.id===id;});
      var inPen=whatIfPen().indexOf(id)>=0;
      return (!inLine&&!inPen) ? (nameOf(id)+' 빠짐') : '!아직 남아 있다';
    })()`));
  T('아홉 명 밑으로는 못 뺀다', ()=>ev(`(function(){
      whatIfInit();
      var all=TBYID['wwzw'].players;
      WHATIF.out={};
      all.slice(0,all.length-9).forEach(function(p){ WHATIF.out[p.id]=1; });
      go('whatif');
      var chips=[].slice.call(document.querySelectorAll('#view .wi-av .wi-chip'))
        .filter(function(b){return b.className.indexOf('off')<0;});
      var before=whatIfAvail().length;
      if(chips.length) chips[0].click();
      return whatIfAvail().length===before ? (before+'명에서 안 줄어든다') : '!더 뺐다';
    })()`));

  console.log('\n[지명타자]');
  T('토글이 화면에 있다', ()=>{
    ev("whatIfInit(); go('whatif')");
    const b=[...d.querySelectorAll('#view .toggle')].find(x=>/사용|미사용/.test(x.textContent));
    return b ? b.textContent : '!토글이 없다';
  });
  T('미사용으로 바꾸면 선발 투수가 타순에 들어온다', ()=>ev(`(function(){
      whatIfInit(); go('whatif');
      var b=[].slice.call(document.querySelectorAll('#view .toggle'))
        .filter(function(x){return /사용|미사용/.test(x.textContent);})[0];
      if(!b) return '!토글이 없다';
      b.click();
      var sp=whatIfSp();
      var slot=WHATIF.line.filter(function(s){return s.id===sp;})[0];
      var dh=WHATIF.line.filter(function(s){return s.pos==='DH';}).length;
      return (WHATIF.useDH===false && slot && slot.pos==='P' && dh===0)
        ? (nameOf(sp)+' 가 투수로 타순에') : '!'+(slot?slot.pos:'없음')+' · DH '+dh;
    })()`));
  T('다시 사용으로 바꾸면 투수가 타순에서 빠진다', ()=>ev(`(function(){
      var b=[].slice.call(document.querySelectorAll('#view .toggle'))
        .filter(function(x){return /사용|미사용/.test(x.textContent);})[0];
      b.click();
      var sp=whatIfSp();
      var dh=WHATIF.line.filter(function(s){return s.pos==='DH';}).length;
      return (WHATIF.useDH===true && !WHATIF.line.some(function(s){return s.id===sp;}) && dh===1)
        ? '지명타자 한 자리' : '!DH '+dh;
    })()`));
  T('미사용으로 돌려도 아홉 명 그대로다', ()=>ev(`(function(){
      whatIfInit(); WHATIF.useDH=false; whatIfDH();
      var ids=WHATIF.line.map(function(s){return s.id;});
      var dup=ids.some(function(x,i){return ids.indexOf(x)!==i;});
      return (WHATIF.line.length===9 && !dup) ? '9명 · 중복 없음'
        : '!'+WHATIF.line.length+'명'+(dup?' 중복':'');
    })()`));
  T('미사용으로 돌려도 돌아간다', ()=>ev(`(function(){
      whatIfInit(); WHATIF.useDH=false; whatIfDH();
      var bad=whatIfLineOK(); if(bad) return '!'+bad;
      var r=whatIfRun(41);
      return (r && r.home && r.away) ? (r.away.runs+':'+r.home.runs) : '!결과가 없다';
    })()`));
  T('두 번 눌러서 타순을 바꾼다', ()=>ev(`(function(){
      whatIfInit(); go('whatif'); wiPick=null;
      var a=WHATIF.line[0].id, b=WHATIF.line[5].id;
      wiTap('line',0,a); wiTap('line',5,b);
      return (WHATIF.line[0].id===b && WHATIF.line[5].id===a) ? '1번↔6번' : '!안 바뀐다';
    })()`));
  T('벤치에서 눌러 넣는다', ()=>ev(`(function(){
      whatIfInit(); go('whatif'); wiPick=null;
      var bench=TBYID['wwzw'].players.filter(function(p){
        return !WHATIF.line.some(function(s){return s.id===p.id;}) && p.id!==WHATIF.sp; })[0];
      if(!bench) return '!벤치가 비었다';
      var out=WHATIF.line[8].id;
      wiTap('bench',-1,bench.id); wiTap('line',8,out);
      return (WHATIF.line[8].id===bench.id) ? nameOf(bench.id)+' 투입' : '!안 들어간다';
    })()`));
  T('수비 자리를 바꾸면 겹치는 사람과 맞바뀐다', ()=>ev(`(function(){
      whatIfInit(); go('whatif');
      var p0=WHATIF.line[0].pos, p1=WHATIF.line[1].pos;
      wiPosPick(0);
      var rows=[].slice.call(document.querySelectorAll('#sheet-body .pick-row'));
      var want=rows.filter(function(r){
        return r.querySelector('.pk-name').textContent===(POSNAMES[p1]||p1); })[0];
      if(!want) return '!그 자리가 목록에 없다';
      want.click();
      return (WHATIF.line[0].pos===p1 && WHATIF.line[1].pos===p0)
        ? (POSNAMES[p0]+' ↔ '+POSNAMES[p1]) : '!안 맞바뀐다';
    })()`));
  T('같은 사람이 두 번 들어가면 막는다', ()=>ev(`(function(){
      whatIfInit();
      WHATIF.line[2].id=WHATIF.line[5].id;
      var m=whatIfLineOK();
      whatIfInit();
      return m ? ('막는다: '+m) : '!그냥 돌아간다';
    })()`));
  T('내가 짠 라인업 그대로 돌린다', ()=>ev(`(function(){
      whatIfInit();
      var t=WHATIF.line[0]; WHATIF.line[0]=WHATIF.line[7]; WHATIF.line[7]=t;
      var mine=WHATIF.line.map(function(s){return s.id;}).join();
      var r=whatIfRun(9);
      return r.uline.map(function(s){return s.id;}).join()===mine
        ? '그대로' : '!다르게 돌린다';
    })()`));
  T('내가 고른 선발이 실제로 던진다', ()=>ev(`(function(){
      whatIfInit();
      var cand=TBYID['wwzw'].pitchers.filter(function(p){return p.id!==WHATIF.sp;});
      WHATIF.sp=cand[0].id;
      var i=WHATIF.line.findIndex(function(s){return s.id===WHATIF.sp;});
      if(i>=0){ var rep=TBYID['wwzw'].players.filter(function(p){
          return p.id!==WHATIF.sp && !WHATIF.line.some(function(s){return s.id===p.id;});})[0];
        WHATIF.line[i].id=rep.id; }
      var r=whatIfRun(13);
      var first=Object.keys(r.pbox).filter(function(id){
        return TBYID['wwzw'].pitchers.some(function(p){return p.id===id;});})[0];
      return first===WHATIF.sp ? nameOf(first)+' 선발' : '!'+nameOf(first);
    })()`));
  T('결과표가 실제로 돌린 타순을 그린다', ()=>ev(`(function(){
      whatIfInit();
      var r=whatIfRun(5);
      if(!r.uline) return '!uline 없음';
      var sp=Object.keys(r.pbox).filter(function(id){
        return TBYID['wwzw'].pitchers.some(function(p){return p.id===id;}); })[0];
      var best=whatIfBest(sp);
      return r.uline.map(s=>s.id).join()===best.map(s=>s.id).join()
        ? '베스트 그대로' : '!다르다';
    })()`));
  T('선발 투수가 야수 자리에 안 선다', ()=>ev(`(function(){
      whatIfInit();
      var r=whatIfRun(7);
      var sp=Object.keys(r.pbox).filter(function(id){
        return TBYID['wwzw'].pitchers.some(function(p){return p.id===id;}); })[0];
      if(!sp) return '!선발을 못 찾음';
      return r.uline.some(function(s){return s.id===sp;})
        ? ('!'+nameOf(sp)+' 이 던지면서 야수도 본다') : (nameOf(sp)+' 는 마운드만');
    })()`));

  console.log('\n[사람 그림 — 몸통과 신발]');
  T('몸통 뼈가 목→골반 방향이다', ()=>{
    const j=ev("MV_JOINTS.torso");
    return (j && j[1] < j[3]) ? `y ${j[1]}→${j[3]}` : `!거꾸로 ${j&&j[1]}→${j&&j[3]}`;
  });
  T('몸 뼈가 전부 +y 를 향한다 (배트는 대각선이라 제외)', ()=>{
    const bad=ev(`['torso','sleeve','farm','thigh','shin'].filter(function(k){
      var j=MV_JOINTS[k]; return !j || j[3]<=j[1]; }).join(',')`);
    return bad ? '!거꾸로: '+bad : '전부 정방향';
  });
  T('뒷다리를 좌우로 뒤집어 그린다', ()=>{
    const src=ev("String(mvGuySprite)");
    return /leg\(R\.legB,\s*true\s*,/.test(src) && /leg\(R\.legF,\s*false\s*,/.test(src)
      ? 'ok' : '!뒷다리 미러 없음';
  });

  console.log('\n[공마다 노림수 시간]');
  T('던지기 전에 준비 단계가 있다', ()=>{
    const src=ev("String(renderSwing)");
    return /phase='ready'/.test(src) ? 'ready 단계 있음' : '!없음';
  });
  T('두 번째 공부터도 준비 단계를 탄다', ()=>{
    const src=ev("String(renderSwing)");
    return /ready\(\s*2\s*\)/.test(src) ? 'ok' : '!첫 공만 카운트다운';
  });
  T('준비 됐다 버튼으로 건너뛴다', ()=>{
    const src=ev("String(renderSwing)");
    return /skipReady/.test(src) && /준비 됐다/.test(src) ? 'ok' : '!버튼 없음';
  });

  console.log('\n[화면이 안 죽는다]');
  T('만약에 결과 화면이 끝까지 그려진다', ()=>{
    ev("whatIfInit(); WHATIF.runs=1; WHATIF.res=whatIfRun(1); renderWhatIf();");
    const t=d.querySelector('#view').textContent;
    return /우리 타자/.test(t) && /우리 투수/.test(t) ? 'ok' : '!표가 없다';
  });
  T('지금 라인업 그대로 버튼도 살아 있다', ()=>{
    ev("whatIfInit(); go('whatif')");
    const b=[...d.querySelectorAll('#view .btn')].find(x=>x.textContent==='지금 라인업 그대로');
    if(!b) return '!버튼 없음';
    b.click();
    const t=d.querySelector('#view').textContent;
    return ev("WHATIF.line.length")===9 && !/undefined/.test(t) ? 'ok' : '!깨진다';
  });
  T('홈 화면에도 undefined 가 없다', ()=>{
    ev("go('home')");
    return !/undefined|NaN/.test(d.querySelector('#view').textContent) ? 'ok' : '!있다';
  });

  console.log(errs.length?('\n❌ '+errs.length+'건\n'+errs.slice(0,8).join('\n')):'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})();
