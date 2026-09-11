/* 마구마구 참고 — 코스 히트맵 · 수비 조작

   [참고] 사용자가 마구마구 인게임 사진을 가져왔다.
     · 타격: 「타격노림분석」 — 상대가 어디로 던지는지 %로 깔아준다
     · 수비: 송구 버튼이 **실제 베이스 자리**에 놓이고, 야수마다 이름표가
             붙고, 조이스틱 옆에 점프 버튼이 따로 있다

   [핵심] 히트맵은 **화면에 적는 값과 실제로 던지는 값이 같아야** 한다.
   여태 존 안 코스는 완전 균등 난수(bx=(rng()*3)|0)였다. 그 위에 히트맵만
   얹으면 그건 거짓말이다. 엔진도 같은 표를 쓰는지를 여기서 본다.        */
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

(async()=>{
  await wait(800);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300);

  console.log('[코스 성향표]');
  T('아홉 칸이고 합이 1이다', ()=>ev(`(function(){
    var W=pitchZoneW({id:'x',ctl:50,stf:50},false);
    var s=W.reduce(function(a,b){return a+b;},0);
    return (W.length===9 && Math.abs(s-1)<1e-9) ? '9칸 · 합 '+s.toFixed(6) : '!'+W.length+'/'+s;
  })()`));
  T('제구가 좋을수록 낮게 던진다', ()=>ev(`(function(){
    var lo=function(c){ var W=pitchZoneW({id:'x',ctl:c},false);
      return W[6]+W[7]+W[8]; };                       // 아랫줄 합
    var a=lo(25), b=lo(70);
    return b>a+0.05 ? ('제구25 아랫줄 '+(a*100).toFixed(0)+'% → 제구70 '+(b*100).toFixed(0)+'%')
      : '!'+a+'/'+b;
  })()`));
  T('같은 손 맞대결이면 바깥으로 흘린다', ()=>ev(`(function(){
    var p={id:'zz',ctl:50,stf:50,throws:'L'};
    var out=function(bl){ var W=pitchZoneW(p,bl); return W[2]+W[5]+W[8]; };
    var same=out(true), opp=out(false);              // 좌투 vs 좌타 = 같은 손
    return same>opp+0.03 ? ('좌타 상대 바깥 '+(same*100).toFixed(0)+'% · 우타 '+(opp*100).toFixed(0)+'%')
      : '!'+same+'/'+opp;
  })()`));
  T('한복판은 덜 던진다', ()=>ev(`(function(){
    var W=pitchZoneW({id:'x',ctl:45},false);
    var mid=W[4], avg=W.reduce(function(a,b){return a+b;},0)/9;
    return mid<avg ? ('한복판 '+(mid*100).toFixed(0)+'% · 평균 '+(avg*100).toFixed(0)+'%') : '!'+mid;
  })()`));
  T('같은 투수는 언제 봐도 같은 표다', ()=>ev(`(function(){
    var a=pitchZoneW({id:'p1',ctl:55},false).join(',');
    var b=pitchZoneW({id:'p1',ctl:55},false).join(',');
    var c=pitchZoneW({id:'p2',ctl:55},false).join(',');
    return (a===b && a!==c) ? '같은 id 같은 표 · 다른 id 다른 표' : '!'+(a===b)+'/'+(a!==c);
  })()`));

  console.log('\n[엔진이 그 표대로 던진다 — 화면 숫자가 거짓말이 아니다]');
  T('균등 난수로 코스를 뽑던 자리가 없어졌다', ()=>{
    const src=ev("String(renderSwing)");
    return !/bx=\(LIVE\.rng\(\)\*3\)\|0/.test(src) ? '없앴다' : '!아직 균등 난수다';
  });
  T('renderSwing 이 pitchZoneW 를 쓴다', ()=>{
    const src=ev("String(renderSwing)");
    return /pitchZoneW\(myP/.test(src) ? '같은 표를 쓴다' : '!안 쓴다';
  });
  T('뽑는 식이 표를 실제로 재현한다 (2만 번)', ()=>ev(`(function(){
    var W=pitchZoneW({id:'chk',ctl:58,throws:'R'},false);
    var rng=makeRng(20260911), N=20000, cnt=[0,0,0,0,0,0,0,0,0];
    for(var t=0;t<N;t++){
      var r=rng(), i=0;
      while(i<8 && r>W[i]){ r-=W[i]; i++; }
      cnt[i]++;
    }
    var worst=0, at=-1;
    for(var k=0;k<9;k++){ var e=Math.abs(cnt[k]/N-W[k]); if(e>worst){worst=e;at=k;} }
    return worst<0.012 ? ('최대 오차 '+(worst*100).toFixed(2)+'%p ('+(at+1)+'번 칸)')
      : '!오차 '+(worst*100).toFixed(2)+'%p';
  })()`));
  T('제구가 좋은 투수는 실제로 낮은 쪽에 더 온다', ()=>ev(`(function(){
    var low=function(c){
      var W=pitchZoneW({id:'q',ctl:c,throws:'R'},false);
      var rng=makeRng(777), N=8000, n=0;
      for(var t=0;t<N;t++){ var r=rng(), i=0;
        while(i<8 && r>W[i]){ r-=W[i]; i++; }
        if(i>=6) n++; }
      return n/N; };
    var a=low(25), b=low(70);
    return b>a+0.05 ? ('제구25 '+(a*100).toFixed(0)+'% → 제구70 '+(b*100).toFixed(0)+'%') : '!'+a+'/'+b;
  })()`));

  console.log('\n[수비 조작 — 마구마구 배치]');
  T('베이스 버튼이 다이아몬드로 놓인다', ()=>{
    const css=html.match(/\.baserow\{[^}]*\}/)[0];
    const has=/grid/.test(css)
      && /\[data-b="2"\]\{grid-column:2;grid-row:1\}/.test(html)
      && /\[data-b="3"\]\{grid-column:1;grid-row:2\}/.test(html)
      && /\[data-b="1"\]\{grid-column:3;grid-row:2\}/.test(html)
      && /\[data-b="0"\]\{grid-column:2;grid-row:3\}/.test(html);
    return has ? '2루 위 · 3루 왼쪽 · 1루 오른쪽 · 홈 아래' : '!아직 가로 일렬이다';
  });
  T('네 베이스를 항상 띄운다 (자리가 안 바뀐다)', ()=>{
    const src=ev("String(renderDefPlay)");
    return /ALL=\[\{b:2/.test(src) && /b\.disabled=!ok/.test(src)
      ? '못 던지는 곳은 죽여서 보여준다' : '!있는 것만 그린다';
  });
  T('야수마다 이름표가 붙는다', ()=>{
    const a=ev("typeof psLabel==='function'");
    const b=/psLabel\(g,qq\.x,qq\.y-9,nm,false\)/.test(html);
    const c=/psLabel\(g,fx,fy-9,mine,true\)/.test(html);
    return (a&&b&&c) ? '남의 야수 + 내 야수(금색)' : '!'+a+'/'+b+'/'+c;
  });
  T('이름표는 오늘 그 자리에 선 사람이다 (라인업이 아니라 slots)', ()=>{
    const src=ev("String(renderDefPlay)");
    return /def\.slots\|\|\[\]/.test(src) && /fieldNames/.test(src)
      ? '교체가 있으면 교체된 사람이 뜬다' : '!안 본다';
  });
  T('지명타자를 써도 투수 이름표가 있다', ()=>{
    const src=ev("String(renderDefPlay)");
    return /if\(!out\.P\)/.test(src) && /curPitcher\(def\)/.test(src)
      ? '타순에 없으면 마운드에서 가져온다' : '!비어 있다';
  });
  T('다이빙이 있다 — 수비의 두 번째 동사', ()=>{
    const src=ev("String(defScene)");
    return /DIVE_MS/.test(src) && /diving\(/.test(src) && /lagging\(/.test(src)
      ? '0.45초 넓어지고 놓치면 0.35초 못 일어난다' : '!없다';
  });
  T('다이빙 중에는 못 움직인다', ()=>{
    const src=ev("String(defScene)");
    return /phase==='chase' && !diving\(now\) && !lagging\(now\)/.test(src)
      ? '몸을 날리면 방향을 못 바꾼다' : '!움직인다';
  });
  T('다이빙이 닿는 거리를 넓힌다', ()=>{
    const src=ev("String(defScene)");
    return /o\.reach\*1\.60/.test(src) && /GRAB\*1\.35/.test(src)
      ? '닿는 거리 1.6배 · 깨끗하게 잡는 거리 1.35배' : '!안 넓어진다';
  });
  T('연타로 계속 날 수는 없다', ()=>{
    const src=ev("String(defScene)");
    return /if\(diving\(n2\)\|\|lagging\(n2\)\) return false/.test(src) ? '쿨다운 있다' : '!연타된다';
  });

  console.log('\n[예외]');
  T('콘솔 예외 없음', ()=>errs.length?('!'+errs.slice(0,2).join(' / ')):'깨끗');
  const real=errs.filter(e=>typeof e==='string');
  console.log(real.length?('\n❌ '+real.length+'건'):'\n✅ 이상 없음');
  process.exit(real.length?1:0);
})();
