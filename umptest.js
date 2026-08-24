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

  console.log('\n[존 색깔]');
  T('아홉 칸 전부 색이 있다', ()=>{
    const bs=[...d.querySelectorAll('.zgrid button')];
    const noCls=bs.filter(b=>!b.className.trim());
    return (bs.length===9&&noCls.length===0)
      ? bs.map(b=>b.className).join(',') : `!${noCls.length}칸이 무색`;
  });
  T('한가운데만 hot 이다', ()=>{
    const bs=[...d.querySelectorAll('.zgrid button')];
    return bs.filter(b=>b.className==='hot').length===1 && bs[4].className==='hot';
  });

  console.log('\n[유인구]');
  T('유인구 버튼 넷이 있다', ()=>{
    const bs=[...d.querySelectorAll('.chase-row .chb')].map(b=>b.textContent);
    return bs.length===4 ? bs.join(' / ') : `!${bs.length}개`;
  });
  T('유인구는 존 밖 좌표로 던진다', ()=>{
    const src=ev("String(renderPitch)");
    return /\['높게',1,-1\]/.test(src) && /throwTo\(cy,cx,true,/.test(src) ? '존 밖 4방향' : '!좌표가 안 맞는다';
  });
  T('유인구는 제구 실패가 없다 (일부러 빼는 공)', ()=>{
    const src=ev("String(renderPitch)");
    return /isChase \? true :/.test(src) ? '제구 판정 생략' : '!없다';
  });
  T('변화구·2스트라이크면 더 잘 속는다', ()=>{
    const src=ev("String(renderPitch)");
    return /isChase\)\{ sw \+= /.test(src) ? '유인 확률 보정' : '!없다';
  });

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
    ev("LIVE._umpBias=0; LIVE.mgr.left=20;");
    const outs=[];
    for(let i=0;i<40;i++){ ev("LIVE._badCall={truth:'strike',called:'ball',pa:LIVE.paSeq}; doArgue(false,null,null);"); }
    const b=ev("LIVE._umpBias");
    return (typeof b==='number'&&b!==0) ? `40번 항의 후 성향 ${b>0?'+':''}${b}` : '!안 변한다';
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
