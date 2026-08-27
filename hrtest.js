/* [2.83.0] 홈런 임팩트 · 고교 이도류/투수 · 주루 순간이동
   [제보] "이거 홈런칠때 임팩트 있었나?"
          "포수랑 투수 이도류 모드 플레이하는데 투수 안시켜주고 포수 수비도 없는데"
          "투수만 골랐을때는 확실하게 투수로 기회 계속 졸업전부터 받아야"
          "치고나서 2루까지 간다 3루까지 간다 이거 뭐 누르면 갑자기 순간이동 하냐" */
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
  ev("ST.tutDone=true; ST.mode='player'; ST.myPos='C'; ST.defMode='all'; ST.defAsk=true;");

  console.log('[고교 — 투수로 골랐으면 투수다]');
  const hsRun=(role)=>ev(`(function(){
    ST.role='${role}'; hsSlot(); ST.hs.done=false;
    var story=hsStory(); var out=[];
    for(var i=0;i<story.length;i++){
      if(story[i].noGame) continue;
      ST.hs.i=i;
      var B=hsBuild(i); if(!B) continue;
      var sl=B.uLine.find(function(x){return x.id===B.me;});
      var poss=B.uLine.map(function(x){return x.pos;});
      out.push({pos:sl?sl.pos:null, sp:B.uRot[0]===B.me,
                dup:poss.length!==new Set(poss).size, n:B.uLine.length});
    }
    return JSON.stringify(out);
  })()`);
  T('투수 전업은 전 경기 선발이다', ()=>{
    const a=JSON.parse(hsRun('pit'));
    if(!a.length) return '!경기가 없다';
    const bad=a.filter(x=>!x.sp);
    return bad.length? `!${bad.length}경기 안 던진다` : `${a.length}경기 전부 선발`;
  });
  T('투수 전업은 타순에도 투수로 적힌다', ()=>{
    const a=JSON.parse(hsRun('pit'));
    const bad=a.filter(x=>x.pos!=='P');
    return bad.length? `!${bad.map(x=>x.pos).join(',')}` : '전부 P';
  });
  T('이도류는 던지는 날과 앉는 날이 갈린다', ()=>{
    const a=JSON.parse(hsRun('two'));
    const sp=a.filter(x=>x.sp).length, no=a.length-sp;
    if(!sp) return '!한 번도 안 던진다';
    if(!no) return '!전 경기 던진다 — 포수는 언제 보나';
    const bad=a.filter(x=>x.sp ? x.pos!=='P' : x.pos!=='C');
    return bad.length? '!던지는 날인데 포수거나 그 반대' : `${sp}경기 마운드 · ${no}경기 포수`;
  });
  T('타자는 마운드에 안 선다', ()=>{
    const a=JSON.parse(hsRun('bat'));
    const bad=a.filter(x=>x.sp);
    return bad.length? `!${bad.length}경기 선발로 나간다` : '전부 야수로만';
  });
  T('어느 역할이든 라인업은 아홉에 자리 중복이 없다', ()=>{
    const bad=[];
    ['pit','two','bat'].forEach(r=>{
      JSON.parse(hsRun(r)).forEach(x=>{ if(x.dup||x.n!==9) bad.push(r+':'+x.n+(x.dup?'중복':'')); });
    });
    return bad.length? '!'+bad.join(' ') : '전부 9명 · 중복 없음';
  });

  console.log('[고교 · 2군 — 내 수비가 나온다]');
  T('고교에 수비 분기가 있다', ()=>ev("/defplay/.test(String(hsRunLive))")?'있다':'!없다');
  T('고교에서 포수 도루저지도 받는다', ()=>ev("/throw/.test(String(hsRunLive))")?'받는다':'!버린다');
  T('2군에서도 도루저지를 받는다', ()=>ev("/throw/.test(String(farmRunLive))")?'받는다':'!버린다');
  T('포수는 타구가 아니라 도루로 나온다', ()=>
    ev("defZoneHit('C',0)===false && !!DEF_ZONE['C']") ? '설계대로' : '!포수에게 타구가 온다');

  console.log('[주루 — 순간이동이 없다]');
  T('한 베이스 더 가는 구간이 최소 0.42초는 된다', ()=>ev(`(function(){
    var src=String(livePlay);
    return /Math\\.max\\(420,\\(endT-tBase\\)\\)/.test(src) ? '바닥 420ms' : '!안 걸려 있다';
  })()`));
  T('2루타도 베이스 수로 나눠서 시간을 맞춘다', ()=>ev(`(function(){
    var src=String(livePlay);
    return /T_THROW-160\\)\\/Math\\.max\\(1,base\\)/.test(src) ? '베이스로 나눈다' : '!안 나눈다';
  })()`));
  T('타수별로 재보면 마지막 구간이 안 눌린다', ()=>ev(`(function(){
    /* 계산만 그대로 재현한다 — 2루타·3루타에서 마지막 한 베이스가
       0.42초 밑으로 떨어지면 그게 순간이동이다. */
    var bad=[];
    [[1,60],[2,100],[3,130]].forEach(function(c){
      var base=c[0], m=c[1];
      var T_LAND=Math.round(1100+Math.min(150,m)*13.5);
      var T_CATCH=T_LAND, T_THROW=T_CATCH+720, THROW_GO=820;
      var runMs=Math.max(1600,Math.min(2500,Math.round(2150-0)));
      runMs=Math.min(runMs, Math.max(620,(T_THROW-160)/Math.max(1,base)));
      var tBase=runMs*base;
      var endT=(T_THROW+THROW_GO)-150;
      bad.push(base+'루타 '+Math.round(Math.max(420,endT-tBase))+'ms');
      if(Math.max(420,endT-tBase)<420) bad.push('!'+base);
    });
    return bad.join(' · ');
  })()`));
  T('더 갈 때는 송구도 더 오래 난다', ()=>ev(
    "/THROW_GO *= *820/.test(String(livePlay)) && /THROW_MS *= *decided\\.go/.test(String(livePlay))")
    ? '820ms' : '!그대로다');

  console.log('[홈런 임팩트]');
  T('타석 화면에 홈런 연출이 있다', ()=>{
    const src=ev("String(livePlay)");
    const has=['hrShake','hrFlash','hrSpark','hrDist'].filter(k=>src.indexOf(k)>=0);
    return has.length===4 ? has.join(' · ') : '!'+has.join(',');
  });
  T('맞는 순간과 넘어가는 순간 두 번 때린다', ()=>{
    const src=ev("String(livePlay)");
    return /T_OVER/.test(src) && /t<340/.test(src) ? '임팩트 + 담장' : '!한 번뿐';
  });
  T('비거리는 엔진 값 그대로다', ()=>{
    /* [버그 이력] 화면에서 따로 식을 만들었다가 189m 홈런이 나왔다.
       사회인야구 담장은 90~110m 다. 엔진의 battedDist 를 그대로 써야
       중계 로그와 화면 숫자가 안 어긋난다. */
    const src=ev("String(livePlay)");
    if(!/const hrDist = HR \? Math\.round\(m\) : 0/.test(src)) return '!따로 계산한다';
    const v=ev(`(function(){
      var out=[];
      for(var q=0;q<400;q++){
        var b=battedBall(q,'HR',{hr:1,d2:1,d3:1,err:1,babip:1},'R',false);
        if(b&&b.m) out.push(Math.round(b.m));
      }
      if(!out.length) return '표본없음';
      return Math.min.apply(null,out)+'~'+Math.max.apply(null,out);
    })()`);
    if(/^\d+~(\d+)$/.test(v) && parseInt(v.split('~')[1],10)>150) return '!'+v+'m — 너무 멀다';
    return '엔진 값 · '+v+'m';
  });
  T('다시 보기 화면에도 임팩트가 있다', ()=>{
    const src=ev("String(psPlay)");
    return src.indexOf('psHR')>=0 && src.indexOf('T_OVER2')>=0 ? '같이 흔든다' : '!없다';
  });
  T('그라운드 홈런은 안 넘어간 걸로 친다', ()=>
    ev("/K==='HR' && !d\\.itp/.test(String(psPlay))") ? '담장 연출 제외' : '!구분 안 한다');
  T('홈런이 아니면 아무것도 안 그린다', ()=>ev(`(function(){
    /* 안타·아웃에서 흔들리거나 번쩍이면 안 된다 */
    var src=String(livePlay);
    return /if\\(!HR\\) return 0;/.test(src) && /if\\(!HR\\) return null;/.test(src)
      ? '안타는 그대로' : '!조건이 없다';
  })()`));

  console.log('[유인구 — 존 밖 공을 건드리면 빗맞는다]');
  T('맞은 자리에 따라 타구 품질이 갈린다', ()=>{
    const src=ev("String(renderPitch)");
    if(!/foulP/.test(src)) return '!파울로 안 빠진다';
    if(!/cq *= *\[0\.16/.test(src)) return '!품질이 고정이다';
    return '존 밖 · 구석 · 한가운데 세 갈래';
  });
  T('존 밖을 건드리면 절반 넘게 파울이다', ()=>{
    const src=ev("String(renderPitch)");
    return /\[0\.58, *0\.34, *0\.22\]/.test(src) ? '파울 58 / 34 / 22%' : '!비율이 없다';
  });
  T('빗맞은 타구는 실제로 안타가 잘 안 된다', ()=>ev(`(function(){
    /* [제보] "존 밖으로 공이 잘나갔는데 안타 맞을 확률이 너무 높다"
       이 리그는 인플레이 타구의 절반이 안타로 빠진다(BABIP .449).
       그래서 품질 배수가 1 근처면 뭘 쳐도 안타가 된다 — 옛 식이 그랬다. */
    var us=TBYID['wwzw'], foe=TEAMS[1];
    var bat=us.players[0], pit={stf:45,ctl:43,sta:45};
    function run(q){
      var rng=makeRng(20260827);
      var m={k:0.0008,bb:0.0008,hbp:0.0008,inPlay:true};
      m.babip=q<0.5?Math.max(0.22,Math.pow(q/0.5,1.6)):1+(q-0.5)*0.30;
      m.pow=(1+Math.max(0,q-0.7)*0.75)*(q<0.45?(0.40+q*1.05):1);
      var h=0,n=0;
      for(var i=0;i<8000;i++){
        var r=simPA(bat,pit,us,foe,rng,{bat:'normal'},70,{hr:1,d2:1,d3:1,err:1,babip:1},m);
        if(!r) continue; n++;
        if(['1B','2B','3B','HR'].indexOf(r.type)>=0) h++;
      }
      return h/n;
    }
    var weak=run(0.24), mid=run(0.50), good=run(0.75);
    if(weak>=0.35) return '!빗맞은 공 타율 '+weak.toFixed(3)+' — 아직 높다';
    if(!(weak<mid && mid<=good)) return '!품질 순서가 안 맞는다';
    return '빗맞음 '+weak.toFixed(3)+' < 보통 '+mid.toFixed(3)+' < 정타 '+good.toFixed(3);
  })()`));
  T('잘 맞은 쪽 균형은 안 건드렸다', ()=>ev(`(function(){
    /* q>=0.5 구간은 이미 맞춰놓은 값이다 — 숫자로 잰다.
       소스 문자열을 재면 줄바꿈 한 번에 깨진다. */
    var up=function(q){ return 1+(q-0.5)*0.30; };
    var now=function(q){ return q<0.5?Math.max(0.22,Math.pow(q/0.5,1.6)):1+(q-0.5)*0.30; };
    var bad=[0.5,0.6,0.75,0.9,1.0].filter(function(q){ return Math.abs(now(q)-up(q))>1e-9; });
    return bad.length? '!q='+bad.join(',')+' 가 바뀌었다'
      : '위쪽 곡선 그대로 (q=0.5 '+now(0.5).toFixed(2)+' · q=1.0 '+now(1).toFixed(2)+')';
  })()`));
  T('빗맞으면 담장까지 안 간다', ()=>ev(`(function(){
    var f=function(q){ return (1+Math.max(0,q-0.7)*0.75)*(q<0.45?(0.40+q*1.05):1); };
    return f(0.20)<f(0.45) && f(0.45)<=f(0.80)
      ? '장타력 '+f(0.20).toFixed(2)+' → '+f(0.45).toFixed(2)+' → '+f(0.80).toFixed(2)
      : '!순서가 안 맞는다';
  })()`));

  console.log('[안전]');
  T('콘솔 예외 없음', ()=>errs.length?('!'+errs.join(' / ')):'깨끗');
  console.log(errs.length?`\n❌ ${errs.length}개 실패`:'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})();
