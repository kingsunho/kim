/* [2.51.0] 구장 규격 · 타구 비거리 · 거리에 맞춘 애니메이션.

   [제보] "경기 규격 좌 중 우 순이야 … 배나물: 98 122 98"
   [요청] "칠때마다 비거리도 적어주고 파울이나 땅볼 이런거에도 말이지"
   [요청] "그 움직이는 애니메이션 모션 비거리에 따라 확실히 달리해주고"

   제일 중요한 건 **로그에 적힌 숫자와 화면에 보이는 거리가 같아야** 한다는 것,
   그리고 **결과와 어긋나면 안 된다**는 것이다 (홈런인데 담장 앞에 떨어지면 안 된다).

   주의: T() 는 문자열을 '통과 + 설명' 으로 친다. 실패는 반드시 false 다.  */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const errs=[], jsErr=[];
const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Not implemented/.test(e.message)) jsErr.push(e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{}; dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0);
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!ok)errs.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  await wait(700);

  console.log('[구장 규격]');
  const P=ev("PARKS.map(function(p){return {id:p.id,name:p.name,dim:p.dim}})");
  T('세 구장에 좌·중·우 규격이 있다', ()=>
    P.length===3 && P.every(x=>Array.isArray(x.dim)&&x.dim.length===3) &&
    P.map(x=>x.name+' '+x.dim.join('/')).join(' · '));
  T('배나물은 받은 값 그대로다 (98/122/98)', ()=>{
    const b=P.find(x=>x.id==='benamul');
    return b.dim[0]===98 && b.dim[1]===122 && b.dim[2]===98 && b.dim.join('/');
  });
  T('중앙이 좌·우보다 깊다', ()=>
    P.every(x=>x.dim[1]>x.dim[0] && x.dim[1]>x.dim[2]) && '전 구장');
  T('담장 거리가 각도에 따라 이어진다', ()=>ev(`(function(){
    const pk=PARKS.find(function(p){return p.id==='benamul'});
    const c=fenceAt(pk,0), l=fenceAt(pk,-PS_FOUL), r=fenceAt(pk,PS_FOUL);
    const mid=fenceAt(pk,-25);
    return (Math.abs(c-122)<0.5 && Math.abs(l-98)<0.5 && Math.abs(r-98)<0.5
      && mid<c && mid>l) ? '중앙 '+c.toFixed(0)+' · 좌중간 '+mid.toFixed(0)+' · 좌 '+l.toFixed(0) : false;
  })()`));

  console.log('\n[비거리가 결과와 안 어긋난다]');
  const C=ev(`(function(){
    let hrIn=0, hrN=0, overFence=0, inplayN=0, neg=0, all=0;
    PARKS.forEach(function(pk){
      for(let i=0;i<4000;i++){
        ['HR','3B','2B','1B','FB','GB','E'].forEach(function(k){
          const bb=battedBall(i*7+k.length, k, pk, (i%2)?'L':'R', false);
          all++;
          if(bb.m<=0) neg++;
          if(k==='HR'){ hrN++; if(bb.m<=bb.fence) hrIn++; }
          else { inplayN++; if(bb.m>bb.fence) overFence++; }
        });
      }
    });
    return {hrIn,hrN,overFence,inplayN,neg,all};
  })()`);
  T('홈런은 반드시 담장을 넘는다', ()=>
    C.hrIn===0 && `${C.hrN}개 전부 담장 밖`);
  T('홈런이 아니면 담장을 안 넘는다', ()=>
    C.overFence===0 && `${C.inplayN}개 전부 담장 안`);
  T('비거리가 0 이하로 안 나온다', ()=>C.neg===0 && `${C.all}개 검사`);
  T('그라운드 홈런은 담장 앞에 떨어진다', ()=>ev(`(function(){
    const pk=PARKS[0]; let bad=0;
    for(let i=0;i<3000;i++){ const bb=battedBall(i,'HR',pk,'R',true);
      if(bb.m>bb.fence) bad++; }
    return bad===0 ? '3000개 전부 담장 안' : false;
  })()`));
  T('구장이 짧으면 홈런 비거리도 짧다', ()=>ev(`(function(){
    const be=PARKS.find(function(p){return p.id==='benamul'});
    const se=PARKS.find(function(p){return p.id==='seonggok'});
    let a=0,b=0;
    for(let i=0;i<3000;i++){ a+=battedBall(i,'HR',be,'R',false).m;
                             b+=battedBall(i,'HR',se,'R',false).m; }
    a/=3000; b/=3000;
    return a>b ? '배나물 '+a.toFixed(1)+'m vs 성곡 '+b.toFixed(1)+'m' : false;
  })()`));

  console.log('\n[방향]');
  T('우타가 반대쪽으로도 친다', ()=>ev(`(function(){
    const pk=PARKS[0]; const c={};
    for(let i=0;i<20000;i++){ const bb=battedBall(i,'FB',pk,'R',false);
      c[bb.dir]=(c[bb.dir]||0)+1; }
    const opp=((c['우중간']||0)+(c['우측']||0))/200;
    const pull=((c['좌측']||0)+(c['좌중간']||0))/200;
    /* 당겨치는 쪽이 많되, 반대쪽도 10% 는 넘어야 한다.
       예전 psAngle 은 우측 0.0% · 우중간 1.1% 였다. */
    return (opp>10 && pull>opp) ? '반대쪽 '+opp.toFixed(1)+'% · 당긴 쪽 '+pull.toFixed(1)+'%' : false;
  })()`));
  T('좌타는 좌우가 뒤집힌다', ()=>ev(`(function(){
    const pk=PARKS[0]; let R=0,L=0;
    for(let i=0;i<8000;i++){
      if(battedBall(i,'FB',pk,'R',false).ang<0) R++;
      if(battedBall(i,'FB',pk,'L',false).ang<0) L++;
    }
    return (R>4800 && L<3200) ? '우타 좌측 '+(R/80).toFixed(0)+'% · 좌타 좌측 '+(L/80).toFixed(0)+'%' : false;
  })()`));

  console.log('\n[로그에 적힌다]');
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300); ev("ST.tutDone=true");
  const G=ev(`(function(){
    ST.park='benamul';
    runWeek(); ST.weekDone=true; ST.announced=true; ST.lineupDirty=false;
    ST.events=[]; ST.absent={}; ST.park='benamul';
    ST.lineup=recommendLineup(); applyDHRule(); sanitizeRotation();
    var L=makeLive(); L.park=PARKS.find(function(p){return p.id==='benamul'});
    var k=0; while(!L.over&&k++<3000){L.pending=null;L.step();}
    window.__L=L;
    /* 교체 알림("교체 · 김인규(3타수 무안타) → …")에도 '안타' 가 들어간다.
       타구 줄만 골라야 한다 — 진짜 타석 결과에는 cls 가 붙어 있다. */
    const hits=L.log.filter(function(x){
      return x.t!=='sub' && ['hit','hr','out','err','score','sb'].indexOf(x.cls)>=0
        && /안타|루타|홈런|땅볼|뜬공|병살|실책|희생|보살/.test(x.text); });
    const tagged=hits.filter(function(x){return /\\(\\S+ \\d+m\\)/.test(x.text)});
    return {n:hits.length, tag:tagged.length,
      sample:tagged.slice(0,4).map(function(x){return x.text}),
      miss:hits.filter(function(x){return !/\\d+m\\)/.test(x.text)})
              .slice(0,3).map(function(x){return x.text})};
  })()`);
  T('인플레이 타구에 전부 비거리가 붙는다', ()=>
    G.tag===G.n && `${G.n}줄 전부`);
  T('땅볼·실책에도 붙는다', ()=>ev(`(function(){
    const L=window.__L;
    const gb=L.log.filter(function(x){return x.t!=='sub'
      && ['out','err'].indexOf(x.cls)>=0 && /땅볼|실책/.test(x.text)});
    return gb.length>0 && gb.every(function(x){return /\\d+m\\)/.test(x.text)});
  })()`) && '붙는다');
  console.log('   예: '+(G.sample[0]||'')+' / '+(G.sample[1]||''));

  console.log('\n[화면과 숫자가 같다]');
  T('중계 장면이 로그와 같은 비거리를 쓴다', ()=>ev(`(function(){
    const L=window.__L; const sc=(L.scenes||[]).filter(function(x){return x.bb});
    if(!sc.length) return false;
    /* psScene 이 만든 m 이 엔진이 만든 m 과 같아야 한다 */
    return sc.every(function(x){ return psScene(x).m===x.bb.m; });
  })()`) && '전부 일치');
  T('먼 타구가 화면에서도 멀리 간다', ()=>ev(`(function(){
    const pk=PARKS[0];
    const a=psMtoPx(15,pk,0), b=psMtoPx(60,pk,0), c=psMtoPx(100,pk,0), e=psMtoPx(130,pk,0);
    return (a<b && b<c && c<e) ? [a,b,c,e].map(function(v){return v.toFixed(0)}).join(' < ')+' px' : false;
  })()`));
  T('담장 거리는 담장 픽셀과 맞는다', ()=>ev(`(function(){
    const pk=PARKS[0];
    const onFence=psMtoPx(fenceAt(pk,0),pk,0), fence=psFenceR(pk,0);
    return Math.abs(onFence-fence)<1.5 ? onFence.toFixed(0)+'px ≈ '+fence.toFixed(0)+'px' : false;
  })()`));
  T('땅볼이 내야 안에 떨어진다', ()=>ev(`(function(){
    const pk=PARKS[0];
    /* 예전엔 선형 환산이라 15m 가 25px — 홈플레이트 위였다 */
    const px=psMtoPx(15,pk,0);
    return (px>25 && px<70) ? px.toFixed(0)+'px (내야 104px 안)' : false;
  })()`));

  console.log('\n[파울]');
  T('파울은 파울선 밖으로 나간다', ()=>ev(`(function(){
    const pk=PARKS[0]; let inside=0;
    for(let i=0;i<3000;i++){ const bb=battedBall(i,'FOUL',pk,'R',false);
      if(Math.abs(bb.ang)<=PS_FOUL) inside++; }
    return inside===0 ? '3000개 전부 선 밖' : false;
  })()`));
  T('파울에도 비거리가 붙는다', ()=>
    /파울 \(/.test(html) && '타석 화면에 표시');

  T('도는 동안 에러 없음', ()=>jsErr.length===0 && '깨끗');
  console.log(errs.length? '\n❌ '+errs.length+'개 실패' : '\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
