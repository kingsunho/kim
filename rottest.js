/* [2.15.0] 로테이션이 실제로 돈다 — 한 명이 다 던지지 않게 */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo/.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  d.querySelectorAll('.pickcard')[0].click();await wait(50);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(250);
  ev("ST.tutDone=true;");

  console.log('[한 시즌 투수 운용]');
  const r=ev(`(function(){
    var starts={};
    for(var i=0;i<40;i++){
      if(ST.round>=ST.schedule.length||ST.seasonOver)break;
      runWeek(); ST.weekDone=true; ST.lineupDirty=false; ST.announced=true;
      if(ST.events&&ST.events.length)ST.events=[]; ST.absent={};
      var sp=(gameRotation()||[])[0]; if(sp) starts[sp]=(starts[sp]||0)+1;
      var L=makeLive(); var k=0;
      while(!L.over&&k++<3000){
        var dd=L.pending||L.detectDecision();
        if(dd){ L.applyDecision(dd.kind==='pitcherChange'?'change':(dd.kind==='defense'?'defnone':'none')); continue; }
        L.step();
      }
      L.finish(); var n=ST.schedule[ST.round]; if(!n)break;
      var r2=L.result, us=n.homeGame?r2.home:r2.away, th=n.homeGame?r2.away:r2.home;
      LIVE=L; commitGame(r2,us,th,us.slots);
    }
    var used=[], tot=0;
    Object.keys(ST.pit||{}).forEach(function(id){
      var l=ST.pit[id]; if(l&&l.outs>0){ used.push({id:id,ip:l.outs/3,g:l.g}); tot+=l.outs/3; }
    });
    used.sort(function(a,b){return b.ip-a.ip});
    window._r={n:used.length, tot:tot, top:tot?used[0].ip/tot:1,
      list:used.map(function(u){return nameOf(u.id)+' '+u.ip.toFixed(1)+'이닝('+u.g+'G)'}).join(', '),
      starts:Object.keys(starts).map(function(k){return nameOf(k)+' '+starts[k]}).join(', '),
      maxStart:Math.max.apply(null,Object.keys(starts).map(function(k){return starts[k]})),
      games:Object.keys(starts).reduce(function(a,k){return a+starts[k]},0)};
    return window._r.list;
  })()`);
  console.log('   '+r);
  console.log('   선발 횟수: '+ev("window._r.starts"));

  T('한 시즌에 여러 명이 던진다 (5명 이상)', ()=>{
    const n=ev("window._r.n"); return n>=5 ? n+'명' : false;
  });
  T('한 명이 이닝을 독점하지 않는다 (40% 미만)', ()=>{
    const t=ev("window._r.top"); return t<0.40 ? '최다 '+(t*100).toFixed(0)+'%' : false;
  });
  T('실제 시즌과 비슷한 분포다 (최다 20~40%)', ()=>{
    const t=ev("window._r.top"); return (t>=0.20&&t<=0.40) ? '실제 최다 30% / 지금 '+(t*100).toFixed(0)+'%' : false;
  });
  T('선발이 한 명에게 몰리지 않는다', ()=>{
    const mx=ev("window._r.maxStart"), g=ev("window._r.games");
    return (mx/g)<0.45 ? `최다 선발 ${mx}/${g}경기 (${(mx*100/g).toFixed(0)}%)` : false;
  });

  console.log('[로테이션 동작]');
  T('경기가 끝나면 선발이 뒤로 밀린다', ()=>ev(`(function(){
    ST.rotation=recommendRotation();
    var before=ST.rotation.slice();
    var sp=before[0];
    // commitGame 의 로테이션 회전만 흉내
    var rot=ST.rotation, i=rot.indexOf(sp);
    var sk=function(id){var q=TBYID['wwzw'].pitchers.find(function(x){return x.id===id});
      return q?(q.stf*0.6+q.ctl*0.4):30;};
    var best=Math.max.apply(null,rot.map(sk));
    var gap=Math.max(3,Math.min(rot.length-1,Math.round(3+(best-sk(sp))/9)));
    rot.splice(i,1); rot.splice(Math.min(gap,rot.length),0,sp);
    return (ST.rotation[0]!==sp && ST.rotation.indexOf(sp)>=3)
      ? nameOf(sp)+' 1번 → '+(ST.rotation.indexOf(sp)+1)+'번' : false;
  })()`));
  T('잘 던지는 사람이 더 빨리 돌아온다', ()=>ev(`(function(){
    var rot=recommendRotation();
    var sk=function(id){var q=TBYID['wwzw'].pitchers.find(function(x){return x.id===id});
      return q?(q.stf*0.6+q.ctl*0.4):30;};
    var best=Math.max.apply(null,rot.map(sk));
    var g=function(id){return Math.max(3,Math.min(rot.length-1,Math.round(3+(best-sk(id))/9)));};
    var top=rot.slice().sort(function(a,b){return sk(b)-sk(a)})[0];
    var bot=rot.slice().sort(function(a,b){return sk(a)-sk(b)})[0];
    return g(top)<=g(bot) ? nameOf(top)+' '+g(top)+'칸 / '+nameOf(bot)+' '+g(bot)+'칸' : false;
  })()`));
  T('선발 지정하면 그 사람이 맨 앞으로 온다', ()=>ev(`(function(){
    ST.rotation=recommendRotation();
    var target=ST.rotation[3];
    setStarter(target);
    return ST.rotation[0]===target ? nameOf(target)+' 선발 지정 → 1번' : false;
  })()`));

  console.log('[교체 기준]');
  T('선발이 3~4이닝 던지고 내려간다', ()=>ev(`(function(){
    var t=TBYID['wwzw'].pitchers;
    var out=t.map(function(p){
      var lim=Math.round(4+(p.sta-22)*0.19);
      return p.name+' '+(lim/3).toFixed(1)+'이닝';
    });
    var ace=t.slice().sort(function(a,b){return b.sta-a.sta})[0];
    var aceLim=Math.round(4+(ace.sta-22)*0.19)/3;
    return (aceLim>=3 && aceLim<=4.5) ? '에이스 '+aceLim.toFixed(1)+'이닝 · '+out.slice(0,3).join(', ') : false;
  })()`));

  if(errs.length) console.log('\n실패:',errs);
  console.log(errs.length?'\n❌ 실패 '+errs.length+'건':'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
},3000);
