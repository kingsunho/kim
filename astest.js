/* 프로 올스타전 — v3.68.0
   [요청] "올스타전도 넣어줘 그팀 나눠진건알지 실제처럼 해주고"
   확인하는 것
     · 드림(삼성 · 롯데 · 두산 · SSG · KT) vs 나눔(LG · KIA · NC · 한화 · 키움)
     · 7월 중순(일정 60%)에 홈에 「올스타 주간」 이 뜬다 · 해마다 새로 열린다
     · 한 팀 야수 15 · 투수 11 — 포지션별 베스트(포수 · 유격 …)가 들어 있다 · 9이닝 · 투수 1이닝씩
     · 잘하면 내가 뽑히고, 직접 뛰면 드림 파랑 · 나눔 빨강 유니폼, 끝나면 원래대로
     · 사회인 리그는 그대로(동부 · 서부 · 5이닝)                                          */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const bad=[]; const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Could not load|stylesheet|[Nn]ot implemented|getContext/.test(e.message)) bad.push('JSDOM: '+e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc,
  beforeParse(w){ w.scrollTo=()=>{}; w.TextEncoder=TextEncoder; w.TextDecoder=TextDecoder; }});
const w=dom.window,d=w.document,ev=s=>w.eval(s); w.confirm=()=>true;
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0&&!/^!/.test(r));
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r.replace(/^!/,''):''));if(!ok)bad.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);bad.push(n+': '+e.message)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(40);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click(); await wait(250);
  console.log('[사회인 — 그대로]');
  T('사회인은 동부 · 서부 · 5이닝', ()=>ev("AS_NAME.east")==='동부 올스타' && ev("asInn()")===5);
  ev(`ST.tutDone=true; ST.mode='player'; ST.role='bat'; ST.myPos='SS'; ST.playerId='ksh'; MYID='ksh'; proEnter({team:'lg', round:1, pick:3, level:'1군'});
      (function(){ const p=TBYID.wwzw.players.find(x=>x.id==='ksh'); ['con','pow','eye','spd','def','arm'].forEach(k=>p[k]=90); })();`);
  console.log('\n[프로 — 드림 vs 나눔]');
  T('이름 · 9이닝', ()=>ev("AS_NAME.east+' vs '+AS_NAME.west+' · '+asInn()")==='드림 올스타 vs 나눔 올스타 · 9');
  T('구단 가르기 — 드림 삼성 · 롯데 · 두산 · SSG · KT', ()=>{ const r=JSON.parse(ev("JSON.stringify(TEAMS.map(function(t){return [proKeyOf(t.id),asSide(t.id)];}))"));
    const dream=r.filter(x=>x[1]==='east').map(x=>x[0]).sort().join(','); return dream==='dsn,kt,lot,sam,ssg' ? '드림 '+dream+' · 나눔 나머지(우리 LG 는 나눔)' : '!'+dream; });
  T('7월 중순 — 일정의 60%', ()=>{ const n=ev("allstarWeek()"); return n===Math.floor(ev("ST.schedule.length")*0.6) ? n+'경기째' : '!'+n; });
  ev("ST.round=allstarWeek(); go('home');"); await wait(30);
  T('홈에 올스타 주간이 뜬다', ()=>/올스타 주간/.test(d.getElementById('view').textContent));
  const B=JSON.parse(ev("JSON.stringify((function(){ var B=allstarBuild(); return {e:[B.east.players.length,B.east.pitchers.length], w:[B.west.players.length,B.west.pitchers.length], my:B.mySide, pos:B.west.players.map(function(p){return p.pos[0];}), sta:B.east.pitchers.map(function(q){return q.sta;}), teams:B.east.players.map(function(p){return p._team;})}; })())"));
  T('한 팀 야수 15 · 투수 11', ()=>B.e[0]===15&&B.e[1]===11&&B.w[0]===15&&B.w[1]===11 ? '드림 '+B.e+' · 나눔 '+B.w : '!'+JSON.stringify(B));
  T('포지션별 베스트 — 포수 · 유격수가 있다', ()=>B.pos.indexOf('C')>=0&&B.pos.indexOf('SS')>=0);
  T('투수는 1이닝씩(체력 17)', ()=>B.sta.every(x=>x===17));
  T('드림엔 드림 구단 선수만', ()=>B.teams.every(n=>/삼성|롯데|두산|SSG|KT/.test(n)) ? '맞다' : '!'+B.teams.join(','));
  T('리그 최고면 내가 뽑힌다(LG — 나눔)', ()=>B.my==='west' ? '나눔 올스타' : '!'+B.my);
  console.log('\n[직접 뛴다]');
  ev("go('allstar')"); await wait(20);
  ev("asSlot().step='game'; renderAllstar();"); await wait(20);
  T('「올스타전 뛴다」 · 「결과만 본다」', ()=>{ const t=d.getElementById('view').textContent; return /올스타전 뛴다/.test(t)&&/결과만 본다/.test(t); });
  ev("allstarLiveStart(allstarBuild())"); await wait(40);
  T('경기가 열린다 · 나눔 빨강 유니폼', ()=>ev("!!(LIVE&&LIVE._asl)") && ev("PS_UNI.us.cap")==='#c8102e' ? ev("LIVE.away.team.name+' @ '+LIVE.home.team.name") : '!'+ev("PS_UNI.us.cap"));
  ev("LIVE.manual=false; var gg=0; while(!LIVE.over && gg++<4000){ if(LIVE.pending) LIVE.applyDecision('auto'); LIVE.step(); } farmLiveEnd();"); await wait(30);
  T('끝나면 점수 · MVP 가 남고 유니폼이 돌아온다', ()=>{ const g=JSON.parse(ev("JSON.stringify(asSlot().game)")); return g&&g.live&&ev("PS_UNI.us.cap")==='#2f5fb0' ? g.e+':'+g.w+' · MVP '+g.mvp : '!'+JSON.stringify(g); });
  T('기록에는 안 들어간다(시즌 타석 그대로)', ()=>ev("((ST.bat.ksh||{}).pa||0)")===0);
  console.log('\n[해마다 새로]');
  ev("asSlot().done=true; ST.pro.year++;");
  T('다음 해엔 다시 열린다', ()=>{ const A=JSON.parse(ev("JSON.stringify(asSlot())")); return !A.done&&A.year===ev("ST.pro.year") ? A.year+' 새 올스타' : '!'+JSON.stringify(A); });
  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
