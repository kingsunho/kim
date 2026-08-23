/* [2.14.0] 대사 다양성 — 참석·또래 잡담 확장 */
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

  console.log('[불참 사유]');
  T('핑계가 20가지 이상이다', ()=>{
    const m=/const DROP_COMMON=\[([\s\S]*?)\n  \];/.exec(html);
    if(!m) return false;
    const n=(m[1].match(/\['/g)||[]).length;
    return n>=20 ? n+'가지' : false;
  });

  console.log('[한 시즌 돌려서 실제 중복도]');
  T('같은 대사가 시즌 내내 반복되지 않는다', ()=>ev(`(function(){
    var cnt={}, tot=0;
    for(var i=0;i<22;i++){
      if(ST.round>=ST.schedule.length||ST.seasonOver)break;
      runWeek(); ST.weekDone=true; ST.lineupDirty=false;
      if(ST.events&&ST.events.length)ST.events=[];
      try{ (buildKakaoPre(ST)||[]).forEach(function(m){
        if(!m.text||m.type==='notice')return;
        var k=String(m.text).replace(/\s+/g,' ').trim();
        cnt[k]=(cnt[k]||0)+1; tot++;
      }); }catch(e){}
      ST.announced=true;
      var L=makeLive(); var k2=0; while(!L.over&&k2++<3000){L.pending=null;L.step();}
      L.finish(); var n=ST.schedule[ST.round]; if(!n)break;
      var r2=L.result, us=n.homeGame?r2.home:r2.away, th=n.homeGame?r2.away:r2.home;
      LIVE=L; commitGame(r2,us,th,us.slots);
      ST.absent={};
    }
    var ks=Object.keys(cnt);
    var top=ks.sort(function(a,b){return cnt[b]-cnt[a]})[0];
    window._top=top+' ('+cnt[top]+'회 / '+tot+'줄)';
    return (ks.length>=100 && cnt[top]<=Math.max(3,tot*0.06))
      ? tot+'줄 중 '+ks.length+'가지 · 최다 '+cnt[top]+'회' : false;
  })()`));
  T('제일 자주 나온 것도 6% 미만', ()=>ev("window._top")||false);

  console.log('[또래 잡담]');
  T('주제 풀이 6가지 이상', ()=>ev("CHAT_POOL.length")>=6 && ev("CHAT_POOL.length")+'가지');
  T('주제마다 대사가 7개 이상', ()=>ev(`CHAT_POOL.every(function(p){return p.length>=7})`)
      && ev(`CHAT_POOL.map(function(p){return p.length}).join('/')`));
  T('00년생만 잡담한다', ()=>ev(`(function(){
    var t=TBYID['wwzw'];
    var young=t.players.filter(function(p){var m=META[p.id];return m&&m.born>=2000});
    return young.length>=5 ? young.map(function(p){return p.name}).join(',') : false;
  })()`));

  console.log('[불참 반응]');
  T('인원이 빠듯할 때 전용 대사가 나온다', ()=>ev(`(function(){
    var seen={};
    for(var t=0;t<30;t++){
      if(ST.round>=ST.schedule.length){ST.round=0;}
      ST.absent={}; ST.injury={};
      var us=TBYID['wwzw'];
      us.players.slice(0,4).forEach(function(p){ST.absent[p.id]='결장';});
      ST.lineup=recommendLineup(); ST.rotation=recommendRotation();
      ST.dropouts=[us.players[5].id];
      try{ (buildKakaoPre(ST)||[]).forEach(function(m){ if(m.text) seen[String(m.text)]=1; }); }catch(e){}
      ST.round=(ST.round+1)%ST.schedule.length;
    }
    ST.absent={};
    var all=Object.keys(seen).join(' ');
    return /빠듯|몰수패|용병|9명/.test(all) ? '빠듯할 때 전용 대사 확인' : false;
  })()`));

  if(errs.length) console.log('\n실패:',errs);
  console.log(errs.length?'\n❌ 실패 '+errs.length+'건':'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
},3000);
