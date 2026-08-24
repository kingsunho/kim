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
      whatIfInit(); WHATIF.useMine=false;
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

  console.log('\n[라인업 소스 고르기]');
  T('기본은 원본 베스트다', ()=>{ ev("whatIfInit()"); return ev("WHATIF.useMine")===false; });
  T('토글이 화면에 있다', ()=>{
    ev("whatIfInit(); go('whatif')");
    const t=d.querySelector('#view').textContent;
    return /원본 베스트/.test(t) && /지금 짜둔 라인업/.test(t) ? 'ok' : '!토글 없음';
  });
  T('결과표가 실제로 돌린 타순을 그린다', ()=>ev(`(function(){
      whatIfInit(); WHATIF.useMine=false;
      var r=whatIfRun(5);
      if(!r.uline) return '!uline 없음';
      var sp=Object.keys(r.pbox).filter(function(id){
        return TBYID['wwzw'].pitchers.some(function(p){return p.id===id;}); })[0];
      var best=whatIfBest(sp);
      return r.uline.map(s=>s.id).join()===best.map(s=>s.id).join()
        ? '베스트 그대로' : '!다르다';
    })()`));
  T('선발 투수가 야수 자리에 안 선다', ()=>ev(`(function(){
      whatIfInit(); WHATIF.useMine=false;
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
    return /leg\(R\.legB,\s*true\)/.test(src) && /leg\(R\.legF,\s*false\)/.test(src)
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
  T('지금 라인업 모드로도 그려진다', ()=>{
    ev("WHATIF.useMine=true; WHATIF.res=whatIfRun(2); renderWhatIf();");
    const t=d.querySelector('#view').textContent;
    return /우리 타자/.test(t) && !/undefined/.test(t) ? 'ok' : '!'+(/undefined/.test(t)?'undefined':'표 없음');
  });
  T('홈 화면에도 undefined 가 없다', ()=>{
    ev("go('home')");
    return !/undefined|NaN/.test(d.querySelector('#view').textContent) ? 'ok' : '!있다';
  });

  console.log(errs.length?('\n❌ '+errs.length+'건\n'+errs.slice(0,8).join('\n')):'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})();
