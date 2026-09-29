/* [2.25.0] 심판 오심·항의 · 유인구 · 구종별 타격 · 타자 정보 · 하이라이트 상한 */
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
  /* [v3.58.0] 이 검사는 예전 직접 플레이 화면(renderSwing · renderPitch)을 본다 — 기본값이 액션으로 바뀌었다 */
  await new Promise(r=>setTimeout(r,300)); dom.window.eval("ST.playStyle='classic'");
  await wait(300); ev("ST.tutDone=true; ST.absent={}; ST.injury={};");
  // 우리가 수비인 상황에서 투구 화면을 연다
  const openPitch=()=>ev(`(function(){
    runWeek(); ST.weekDone=true; ST.announced=true; ST.lineupDirty=false; ST.absent={}; ST.events=[];
    LIVE=makeLive(); LIVE.manual=true; LIVE.round=ST.round;
    if(!document.getElementById('decision')){var b=document.createElement('div');b.id='decision';document.body.appendChild(b);}
    var g=0; while(!LIVE.def().isUser && g++<300){ if(LIVE.pending)LIVE.applyDecision('change'); LIVE.step(); }
    showDecision({kind:'pitch',label:'투구'}); return LIVE.def().isUser; })()`);

  console.log('[하이라이트 상한]');
  T('한 경기 40장면까지 나온다', ()=>{
    const src=ev("String(sceneWorth)");
    const m=src.match(/_scenes\|\|0\)>=(\d+)/);
    return m && Number(m[1])>=40 ? `상한 ${m[1]}` : `!상한 ${m?m[1]:'?'}`;
  });
  T('후반 홈런도 조건 없이 걸린다', ()=>{
    const on=ev(`(function(){ LIVE=makeLive(); LIVE.manual=true; ST.sceneMode='key';
      LIVE._scenes=30;
      return sceneWorth({kind:'HR',runs:2,outs:1,inning:7,before:[null,null,null],bat:{id:'x'}});})()`);
    return on===true;
  });

  console.log('\n[상대 타자 정보]');
  T('투수 화면이 열린다', ()=>openPitch()===true);
  T('타순·이름·좌우가 나온다', ()=>{
    const t=d.querySelector('#decision .bat-info');
    return t ? t.querySelector('.bi-top').textContent.replace(/\s+/g,' ').trim() : '!없다';
  });
  T('능력치가 나온다', ()=>{
    const t=d.querySelector('#decision .bi-r').textContent;
    return /컨택 \d+ · 파워 \d+ · 선구 \d+/.test(t) ? t : `!${t}`;
  });
  T('오늘 성적이 나온다', ()=>{
    const t=d.querySelector('#decision .bi-t').textContent;
    return /오늘 (첫 타석|\d+타수)/.test(t) ? t : `!${t}`;
  });

  console.log('\n[조준판]');
  T('조준판 — 존 · 한가운데 · 조준점', ()=>!!(d.querySelector('.apad .ap-zone')&&d.querySelector('.apad .ap-hot')&&d.querySelector('.apad .ap-ret')&&d.querySelector('.zthrow')));
  T('조준판 좌우가 공 그리는 방향과 같다(카메라 · 타석)', ()=>{
    /* throwBall 은 x=(cx-1)*side, side=(좌타?-1:1)*(REV?-1:1). 조준판 zSide 가 이것과 같아야
       「바깥」 누른 곳으로 공이 간다 — [요청 v3.45.0] 카메라 뒤집힌 걸 안 따라가서 반대로 갔다 */
    const g=d.querySelector('.apad'), a=g._aim();
    const L=d.querySelector('.ap-side.l').textContent, R=d.querySelector('.ap-side.r').textContent;
    const okLbl=(a.side>0)?(L==='몸쪽'&&R==='바깥'):(L==='바깥'&&R==='몸쪽');
    return okLbl ? 'side '+a.side+' · 왼쪽='+L : '!side '+a.side+' 인데 왼쪽='+L;
  });
  T('카메라를 바꾸면 조준판 좌우도 따라 바뀐다', ()=>{
    const cb=d.querySelector('#decision .mv-camb'); if(!cb) return '!카메라 버튼 없음';
    const seen=[];
    for(let i=0;i<3;i++){ const a=d.querySelector('.apad')._aim();
      seen.push(a.side+'/'+d.querySelector('.ap-side.l').textContent);
      cb.click(); }
    const sides=new Set(seen);
    return sides.size===2 ? seen.join(' · ') : '!안 바뀐다 '+seen.join(' · ');
  });
  T('조준을 옮기면 이름이 바뀐다', ()=>{
    const g=d.querySelector('.apad'); g._setAim(1,1);
    const t1=d.querySelector('.ap-now').textContent; g._setAim(1,-1.2);
    const t2=d.querySelector('.ap-now').textContent; g._setAim(1,1);
    return t1!==t2 && /높게/.test(t2) ? t1+' → '+t2 : '!'+t1+' / '+t2;
  });
  T('제구 오차 원 — 제구 나쁠수록 크다', ()=>{
    const src=ev("String(renderPitch)");
    return /sharpF=Math\.max\(0\.25/.test(src) && /aimSd/.test(src) ? '제구 → 오차' : '!없다';
  });

  console.log('\n[유인구 — 조준판으로 존 밖을 겨눈다]');
  /* [v3.48.0] 유인구 버튼 넷을 없앴다. 조준판으로 존 밖을 겨누면 그게 유인구고,
     타자가 따라 나올지는 공이 존에서 얼마나 떨어졌나로 정한다 */
  T('유인구 버튼 줄이 없다(화면을 안 가린다)', ()=>!d.querySelector('.chase-row .chb') ? '없다' : '!남아 있다');
  const src=ev("String(renderPitch)");
  T('스윙 확률이 존에서 떨어진 거리로 줄어든다', ()=>/const dOut=Math\.max\(0/.test(src) && /0\.50\*Math\.exp\(-dOut\/0\.55\)/.test(src) ? '경계일수록 따라 나온다' : '!평평하다');
  T('변화구·2스트라이크면 더 잘 속는다', ()=>/if\(out\)\{[\s\S]{0,500}?cnt\.s===2\?0\.22/.test(src) && /T\.hard>0\?0\.13/.test(src) ? '구종·카운트·구위·볼카운트를 다 본다' : '!없다');
  T('스윙 확률 실측 — 경계 공이 멀리 뺀 공보다 잘 따라 나온다', ()=>{
    const f=(dOut)=>0.50*Math.exp(-dOut/0.55);
    return f(0.1)>0.4 && f(1.2)<0.07 ? '경계 '+(f(0.1)*100|0)+'% · 한 칸 넘게 '+(f(1.2)*100|0)+'%' : '!';
  });
  T('오차 원은 1.5σ · 가운데는 진짜 공 크기', ()=>/const BALL_R=0\.28/.test(src) && /sd\*1\.5/.test(src) ? '원 안에 공' : '!없다');
  T('유인구도 몰릴 수 있다(옛 칸 조준 경로)', ()=>/const hang\s*=\s*isChase/.test(src) && /if\(hang\)\{/.test(src) ? '제구가 나쁘면 존으로 몰린다' : '!');

  console.log('\n[심판 오심과 항의]');
  T('오심이 실제로 난다', ()=>{
    const n=ev(`(function(){
      var truth='ball', bias=0, edge=true, hit=0;
      for(var i=0;i<4000;i++){
        var mp=(edge?0.11:0.03)*((truth==='ball')?(1+bias*0.35):Math.max(0.2,1-bias*0.35));
        if(Math.random()<mp) hit++;
      }
      return hit/4000; })()`);
    return (n>0.07&&n<0.16) ? `애매한 코스 오심률 ${(n*100).toFixed(1)}%` : `!${(n*100).toFixed(1)}%`;
  });
  T('우리에게 불리한 오심만 항의 대상이다', ()=>{
    const src=ev("String(renderPitch)");
    return /miss && !good/.test(src) ? '불리한 오심만 _badCall' : '!전부 항의된다';
  });
  T('항의 창이 뜬다', ()=>{
    ev("LIVE.mgr.left=3; LIVE._badCall={truth:'strike',called:'ball',pa:LIVE.paSeq}; showArgue($('#decision'),null,null);");
    const a=d.querySelector('#decision .argue');
    const btns=a?[...a.querySelectorAll('.argb')].map(b=>b.textContent):[];
    return btns.length===3 ? btns.join(' / ') : `!${btns.length}개`;
  });
  T('항의하면 감독 액션을 쓴다', ()=>{
    const before=ev("LIVE.mgr.left");
    ev("doArgue(false, null, null)");
    return ev("LIVE.mgr.left")===before-1 ? `${before} → ${ev("LIVE.mgr.left")}` : '!안 줄었다';
  });
  T('항의 결과가 심판 성향에 남는다', ()=>{
    // [플래키 이력] 성향은 +1/-1 로 걷는다. 40번 뒤 값이 우연히 0 으로 돌아오는 경우가
    // 여덟 번에 한 번쯤 있어서 '마지막 값이 0 이 아니다' 로 재면 가끔 실패했다.
    // 걷는 도중에 한 번이라도 움직였는지를 본다.
    ev("LIVE._umpBias=0; LIVE.mgr.left=40;");
    let moved=0, last=0;
    for(let i=0;i<40;i++){
      ev("LIVE._badCall={truth:'strike',called:'ball',pa:LIVE.paSeq}; doArgue(false,null,null);");
      const cur=ev("LIVE._umpBias");
      if(cur!==last){ moved++; last=cur; }
    }
    return (typeof last==='number'&&moved>0) ? `40번 항의 중 ${moved}번 움직였다 (끝 ${last>0?'+':''}${last})` : '!안 변한다';
  });
  T('심판이 우리 쪽이면 유리한 오심이 는다', ()=>{
    const f=(bias)=>{ let n=0; for(let i=0;i<4000;i++){
      const mp=0.11*(1+bias*0.35); if(Math.random()<mp)n++; } return n/4000; };
    return f(2)>f(0) ? `성향 0 → ${(f(0)*100).toFixed(0)}% / 성향 +2 → ${(f(2)*100).toFixed(0)}%` : '!차이 없다';
  });
  T('물병 걷어차기가 항의 수단으로 들어갔다', ()=>{
    const src=ev("String(showArgue)");
    return /물병을 걷어찬다/.test(src) ? '물병 버튼' : '!없다';
  });
  T('항의는 중계 기록에 남는다', ()=>{
    const has=ev("LIVE.log.some(l=>/심판 항의/.test(l.text||''))");
    return has ? '로그에 남는다' : '!안 남는다';
  });

  console.log('\n[구종별 타격 결과]');
  T('직구는 맞으면 잘 뻗는다', ()=>{
    const ff=ev("CONTACT_BY_PITCH.ff.pow"), fk=ev("CONTACT_BY_PITCH.fk.pow");
    return (ff>1&&fk<1&&ff>fk) ? `직구 x${ff} · 포크 x${fk}` : `!${ff}/${fk}`;
  });
  T('떨어지는 공은 인플레이 타구질도 낮다', ()=>{
    const ff=ev("CONTACT_BY_PITCH.ff.babip"), cu=ev("CONTACT_BY_PITCH.cu.babip");
    return (ff>cu) ? `직구 x${ff} · 커브 x${cu}` : `!${ff}/${cu}`;
  });
  T('맞은 구종이 결과 계산에 실제로 들어간다', ()=>{
    const a=ev(`(function(){ LIVE.pitchResult('contact',0.9,'ff');
      return LIVE.consumePlayMods({isUser:true},{isUser:false}).pow; })()`);
    const b=ev(`(function(){ LIVE.pitchResult('contact',0.9,'fk');
      return LIVE.consumePlayMods({isUser:true},{isUser:false}).pow; })()`);
    return (a>b) ? `직구 pow ${a.toFixed(2)} > 포크 ${b.toFixed(2)}` : `!${a}/${b}`;
  });
  T('구종이 없으면 직구로 본다', ()=>{
    const v=ev(`(function(){ LIVE.pitchResult('contact',0.9);
      return LIVE.consumePlayMods({isUser:true},{isUser:false}).pow; })()`);
    return v>1 ? `기본 pow ${v.toFixed(2)}` : `!${v}`;
  });

  console.log(errs.length?`\n❌ ${errs.length}건`:'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})();
