/* 전체 진루 · 전체 귀루 — v3.65.0
   [요청] "안타가 났을 때 앞 주자 진루도 _stretchOffer 처럼 「제안」 으로 남겨라.
           화면에 「전체 진루」 「전체 귀루」 버튼(가능하면 주자별 버튼도)을 두고,
           주자와 송구가 베이스에 먼저 닿는 쪽으로 판정한다.
           기록(득점 · 타점 · 주루사)이 화면과 맞아야 하고,
           자동 경기 · 판단창을 안 쓰는 길은 예전 advOdds 그대로."

   확인하는 것
     · 내 타석(ask) 1루타 — 앞 주자는 한 베이스만 옮기고 나머지는 제안(_advOffer)
     · 전체 귀루 · 전체 진루 · 주자별 · 앞 주자가 서면 뒤 주자는 막힌다
     · 선두 주자만 송구와 경주(force) — 뒤 주자는 송구 사이에 간다
     · 득점 · 타점 · 투수 실점 · 아웃 수가 결과와 맞다
     · 세 번째 아웃이면 반이닝이 끝나고 타자의 「돌까」 도 사라진다 · 끝내기
     · 안 누르면(auto) 예전 주사위(autoGo) 그대로 — 아웃이 안 난다 · step() 이 흘려보낸다
     · ask 가 아니면 제안이 안 생긴다(자동 경기는 예전 길)
     · livePlay — 버튼대로 주자를 보내고, 화면이 잰 경주가 엔진 결과와 같다      */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const bad=[]; const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Could not load|stylesheet|[Nn]ot implemented|getContext/.test(e.message)) bad.push('JSDOM: '+e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc,
  beforeParse(w){ w.scrollTo=()=>{}; w.TextEncoder=TextEncoder; w.TextDecoder=TextDecoder; }});
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0&&!/^!/.test(r));
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r.replace(/^!/,''):''));if(!ok)bad.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);bad.push(n+': '+e.message)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(40);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click(); await wait(250);
  ev("ST.tutDone=true; ST.mode='player'; ST.role='bat'; LIVE=makeLive(); LIVE.manual=true;");

  /* 판을 깔고 1루타(또는 2루타)를 친다 — _forceRes 로 결과만 정하고 나머지는 진짜 stepPA 가 한다 */
  /* 타석 전에 폭투 · 도루 같은 일이 먼저 나면 판이 바뀐다 — 그건 진짜 야구라 그대로 두고,
     원하는 판이 나올 때까지 다시 깐다 */
  ev(`window.__hit=function(hit, bases, ask, opts){
    for(var k=0;k<12;k++){ var h=__hit1(hit, bases, ask, opts);
      if(!ask || LIVE.advOffer()) return h; }
    return h;
  };
  window.__hit1=function(hit, bases, ask, opts){
    opts=opts||{};
    var L=LIVE; L.over=false; L._advOffer=null; L._stretchOffer=null; L.pending=null;
    if(opts.half!=null) L.half=opts.half;
    if(opts.inning!=null) L.inning=opts.inning;
    var off=L.off(); var ids=off.slots.map(function(s){return s.id;});
    var bi=off.order%9, bat=ids[bi];
    var others=ids.filter(function(x){return x!==bat;});
    L.bases=bases.map(function(b,i){ return b?others[i]:null; });
    L.bases.forEach(function(rid){ if(rid) L.runnerP[rid]=L.curPitcher(L.def()).id; });
    L.outs=opts.outs||0;
    if(opts.score){ L.away.runs=opts.score[0]; L.home.runs=opts.score[1]; }
    L._forceRes=ask?{type:hit, stretchAsk:hit}:{type:hit};
    var runs0=off.runs, rbi0=(L.box[bat]||{}).rbi||0;
    L.stepPA();
    return {bat:bat, runs0:runs0, rbi0:rbi0, runners:L.bases.slice(), off:off};
  };
  window.__st=function(h){ var o=h.off; return JSON.stringify({b:LIVE.bases.slice(), outs:LIVE.outs,
    runs:o.runs-h.runs0, rbi:((LIVE.box[h.bat]||{}).rbi||0)-h.rbi0, half:LIVE.half, over:!!LIVE.over}); };`);

  console.log('[제안 — 보장된 만큼만 옮긴다]');
  T('1루타 · 주자 1·2루 → 2·3루에 서고 제안이 남는다', ()=>{
    const r=JSON.parse(ev(`(function(){ var h=__hit('1B',[1,1,0],true); window.__h=h;
      var of=LIVE.advOffer(); return JSON.stringify({of:of&&of.runners.map(function(x){return x.at;}), st:JSON.parse(__st(h))}); })()`));
    return r.of && r.of.join()==='2,1' && r.st.runs===0 && r.st.b[0] && r.st.b[1] && r.st.b[2]
      ? '제안 '+r.of.length+'명 · 아직 0점' : '!'+JSON.stringify(r); });
  T('전체 귀루 — 그대로 선다', ()=>{
    const r=JSON.parse(ev(`(function(){ var b=LIVE.bases.slice(); LIVE.resolveAdvance('hold'); var s=JSON.parse(__st(__h)); s.same=(s.b.join()===b.join()); return JSON.stringify(s); })()`));
    return r.same && r.runs===0 && r.outs===0 ? '만루 그대로 · 0점' : '!'+JSON.stringify(r); });

  const goRun=(force)=>JSON.parse(ev(`(function(){ var h=__hit('1B',[1,1,0],true);
    var of=LIVE.advOffer(); var lead=of.runners[0].rid, tr=of.runners[1].rid;
    var pit=LIVE.pbox[of.pitId], r0=pit.r;
    var go={}; go[lead]=true; go[tr]=true; var fo={}; fo[lead]=${force};
    var out=LIVE.resolveAdvance({go:go, force:fo});
    var s=JSON.parse(__st(h)); s.pr=pit.r-r0; s.leadAt=LIVE.bases.indexOf(lead); s.trAt=LIVE.bases.indexOf(tr);
    s.leadR=(LIVE.box[lead]||{}).r; s.mv=out.moves.map(function(m){return m.ok;}).join();
    s.log=LIVE.log.slice(-3).map(function(x){return x.text;}).join(' / ');
    return JSON.stringify(s); })()`));
  console.log('\n[전체 진루 — 선두 주자만 송구와 경주한다]');
  T('경주에서 이기면 — 2루 주자 홈인 · 1루 주자 3루 · 1점 · 타점 1 · 투수 실점 1', ()=>{
    const r=goRun('true');
    return r.runs===1 && r.rbi===1 && r.pr===1 && r.trAt===2 && r.leadAt===-1 && r.outs===0 ? r.log : '!'+JSON.stringify(r); });
  T('경주에서 지면 — 홈에서 아웃(주루사) · 뒤 주자는 송구 사이에 3루 · 0점', ()=>{
    const r=goRun('false');
    return r.runs===0 && r.rbi===0 && r.outs===1 && r.trAt===2 && r.leadAt===-1 && /주루사/.test(r.log) ? r.log : '!'+JSON.stringify(r); });

  console.log('\n[주자별]');
  T('앞 주자만 보낸다 — 1루 주자는 2루에 선다', ()=>{
    const r=JSON.parse(ev(`(function(){ var h=__hit('1B',[1,1,0],true); var of=LIVE.advOffer();
      var go={}; go[of.runners[0].rid]=true; go[of.runners[1].rid]=false; var fo={}; fo[of.runners[0].rid]=true;
      LIVE.resolveAdvance({go:go, force:fo}); var s=JSON.parse(__st(h)); s.tr=LIVE.bases.indexOf(of.runners[1].rid); return JSON.stringify(s); })()`));
    return r.runs===1 && r.tr===1 && !r.b[2] ? '1점 · 1루 주자 2루' : '!'+JSON.stringify(r); });
  T('앞 주자가 서면 뒤 주자는 막힌다(못 간다)', ()=>{
    const r=JSON.parse(ev(`(function(){ var h=__hit('1B',[1,1,0],true); var of=LIVE.advOffer();
      var go={}; go[of.runners[0].rid]=false; go[of.runners[1].rid]=true;
      var out=LIVE.resolveAdvance({go:go}); var s=JSON.parse(__st(h)); s.go=out.moves.map(function(m){return m.go;}).join(); return JSON.stringify(s); })()`));
    return r.runs===0 && r.outs===0 && r.go==='false,false' ? '만루 그대로' : '!'+JSON.stringify(r); });

  console.log('\n[2루타 — 1루 주자 홈까지?]');
  T('2루타 · 주자 1루 → 3루에 서고 제안(홈)', ()=>{
    const r=JSON.parse(ev(`(function(){ var h=__hit('2B',[1,0,0],true); var of=LIVE.advOffer();
      var fo={}; fo[of.runners[0].rid]=true; var go={}; go[of.runners[0].rid]=true;
      var b=LIVE.bases.slice(); LIVE.resolveAdvance({go:go, force:fo}); var s=JSON.parse(__st(h)); s.pre=b.map(Boolean).join(); return JSON.stringify(s); })()`));
    return r.pre==='false,true,true' && r.runs===1 && r.rbi===1 ? '3루 → 홈 · 1점' : '!'+JSON.stringify(r); });

  console.log('\n[아웃 · 반이닝 · 끝내기]');
  T('선두 주자가 세 번째 아웃 — 반이닝이 끝나고 타자의 「돌까」 도 사라진다', ()=>{
    const r=JSON.parse(ev(`(function(){ var h=__hit('1B',[0,1,0],true,{outs:2,half:0}); var of=LIVE.advOffer(); var so=!!LIVE.stretchOffer();
      var go={}; go[of.runners[0].rid]=true; var fo={}; fo[of.runners[0].rid]=false;
      LIVE.resolveAdvance({go:go, force:fo});
      var st=LIVE.resolveStretch(true, 0, true);
      return JSON.stringify({so:so, half:LIVE.half, outs:LIVE.outs, st:st, b:LIVE.bases.slice()}); })()`));
    return r.so && r.half===1 && r.outs===0 && r.st===null && !r.b.some(Boolean) ? '공수 교대 · 타자 제안 없음' : '!'+JSON.stringify(r); });
  T('끝내기 — 마지막 회 말 동점, 2루 주자가 홈에 들어오면 경기가 끝난다', ()=>{
    const r=JSON.parse(ev(`(function(){ var h=__hit('1B',[0,1,0],true,{half:1, inning:LIVE.INN, score:[3,3]}); var of=LIVE.advOffer();
      var go={}; go[of.runners[0].rid]=true; var fo={}; fo[of.runners[0].rid]=true;
      var out=LIVE.resolveAdvance({go:go, force:fo});
      return JSON.stringify({done:!!out.done, over:!!LIVE.over, a:LIVE.away.runs, h:LIVE.home.runs}); })()`));
    ev("LIVE=makeLive(); LIVE.manual=true;");
    return r.done && r.over && r.h===4 ? '4:3 끝' : '!'+JSON.stringify(r); });

  console.log('\n[안 누르면 예전 그대로]');
  T('auto — 예전 주사위(autoGo)대로 다 같이 · 아웃은 안 난다', ()=>{
    let ok=0, n=0, bad2='';
    for(let i=0;i<30;i++){
      const r=JSON.parse(ev(`(function(){ var h=__hit('1B',[0,1,0],true,{half:0}); var of=LIVE.advOffer(); var ag=of.autoGo;
        LIVE.resolveAdvance('auto'); var s=JSON.parse(__st(h)); s.ag=ag; return JSON.stringify(s); })()`));
      n++; if(r.outs===0 && r.runs===(r.ag?1:0)) ok++; else bad2=JSON.stringify(r);
    }
    return ok===n ? n+'번 다 맞다' : '!'+bad2; });
  T('step() 이 받아 가지 않은 제안을 예전 주사위로 흘려보낸다', ()=>{
    const r=JSON.parse(ev(`(function(){ var h=__hit('1B',[0,1,0],true,{half:0}); var of=LIVE.advOffer();
      if(!of) return JSON.stringify({noOffer:true, st:JSON.parse(__st(h)), over:LIVE.over, pend:!!LIVE.pending, log:LIVE.log.slice(-3).map(function(x){return x.text;})});
      LIVE.step(); return JSON.stringify({left:!!LIVE.advOffer()}); })()`));
    return !r.noOffer && !r.left ? '비었다' : '!'+JSON.stringify(r); });
  T('ask 가 아니면(자동 경기) 제안이 안 생긴다', ()=>{
    const r=JSON.parse(ev(`(function(){ var h=__hit('1B',[1,1,0],false,{half:0}); return JSON.stringify({of:!!LIVE.advOffer()}); })()`));
    return !r.of ? '예전 advOdds 길' : '!'+JSON.stringify(r); });
  T('주사위는 갈래 전에 굴린다 — 난수 흐름이 안 바뀐다', ()=>/const autoGo=rng\(\)<advOdds;\s*\n\s*if\(res\.stretchAsk/.test(html));

  console.log('\n[화면 — livePlay 가 버튼대로 보내고 경주 결과를 넘긴다]');
  /* jsdom 은 캔버스가 없다 — 아무것도 안 하는 붓을 쥐여 준다 */
  ev(`HTMLCanvasElement.prototype.getContext=function(){ return new Proxy({}, {get:function(t,k){
      if(k==='measureText') return function(){return {width:10};};
      if(k in t) return t[k]; return function(){}; }, set:function(t,k,v){ t[k]=v; return true; }}); };`);
  const race=async(mode)=>{
    ev(`(function(){ window.__h=__hit('1B',[1,1,0],true,{half:0}); window.__res=null; window.__plan=null; window.__end=false;
      var host=document.createElement('div'); document.body.appendChild(host);
      window.__sc=livePlay(host,{play:{type:'1B',ang:5,dist:70}, adv:LIVE.advOffer(), spd:45, arm:46,
        rng:function(){return LIVE.rng();},
        onAdvance:function(p){ window.__plan=p; return LIVE.resolveAdvance(p); },
        onEnd:function(){ window.__end=true; }});
      ${mode==='go'?'__sc.advAll(true);':mode==='hold'?'__sc.advAll(false);':''}
    })()`);
    for(let i=0;i<120 && !ev('window.__end'); i++) await wait(100);
    return JSON.parse(ev(`(function(){ var s=JSON.parse(__st(__h)); var rc=__sc.advRace(); var st=__sc.advState();
      s.end=__end; s.plan=(typeof __plan==='string')?__plan:'obj'; s.force=(rc&&__plan.force)?__plan.force[rc.rid]:null;
      s.lead=rc?rc.rid:null; s.leadScored=rc?(LIVE.bases.indexOf(rc.rid)<0 && s.outs===0):null;
      s.scrOk=st.map(function(x){return x.res?x.res.ok:null;}).join(); return JSON.stringify(s); })()`));
  };
  const rg=await race('go');
  T('전체 진루 — 선두 주자가 송구와 경주했고, 엔진이 그 결과대로 적었다', ()=>
    rg.end && rg.plan==='obj' && typeof rg.force==='boolean'
    && (rg.force ? (rg.runs===1 && rg.outs===0) : (rg.runs===0 && rg.outs===1))
      ? (rg.force?'세이프 · 1점':'홈에서 아웃') : '!'+JSON.stringify(rg));
  T('화면의 주자 결과 = 엔진 결과', ()=> rg.scrOk===(rg.force?'true,true':'false,true') ? rg.scrOk : '!'+JSON.stringify(rg));
  const rh=await race('hold');
  T('전체 귀루 — 아무도 안 간다 · 송구 경주 없음', ()=> rh.end && rh.runs===0 && rh.outs===0 && rh.lead===null ? '만루 그대로' : '!'+JSON.stringify(rh));
  const ra=await race('none');
  T('안 누르면 코치(auto) — 아웃이 없다', ()=> ra.end && ra.plan==='auto' && ra.outs===0 ? (ra.runs?'코치가 보냈다':'코치가 세웠다') : '!'+JSON.stringify(ra));

  console.log('\n[버튼]');
  T('「전체 진루」 「전체 귀루」 버튼', ()=>/▸ 전체 진루/.test(html) && /◂ 전체 귀루/.test(html));
  T('주자가 둘 이상이면 주자별 버튼', ()=>/if\(advO\.runners\.length>1\) advO\.runners\.forEach/.test(html) && /sc\.advOne\(i, !cur\)/.test(html));
  T('캔버스가 없으면 예전 주사위로 닫는다', ()=>/if\(advO && LIVE\.resolveAdvance\) LIVE\.resolveAdvance\('auto'\)/.test(html));
  T('makeAdvOffer · resolveAdvance · advRunOdds 는 한 번씩만 선언', ()=>
    (html.match(/^LiveGame\.prototype\.resolveAdvance = /mg)||[]).length===1
    && (html.match(/^LiveGame\.prototype\.makeAdvOffer = /mg)||[]).length===1
    && (html.match(/^function advRunOdds\(/mg)||[]).length===1);

  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
