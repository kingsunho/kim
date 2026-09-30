/* 프로 실명 전환 (v3.63.0)
   [결정 2026-09-29] "사회인야구단 제외하고 프로는 다 실명해"

   확인하는 것
     · 구단 이름이 실명(두산 베어스 · LG 트윈스 …)
     · 현역 · 외국인 · 감독 · 역대 기록 · 영구결번 · 2027 신인이 실명
     · 우완좌완(사회인) 열넷 · 이안 · 지우는 그대로
     · 옛 세이브의 가명(이적 스냅샷 · 신문 · 통산 장부)이 한 번에 실명으로 바뀐다 — 연달아 잘못 바뀌지 않는다 */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const bad=[]; const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Could not load|stylesheet|[Nn]ot implemented|getContext/.test(e.message)) bad.push('JSDOM: '+e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc,
  beforeParse(w){ w.scrollTo=()=>{}; w.TextEncoder=TextEncoder; w.TextDecoder=TextDecoder; }});
const w=dom.window,d=w.document,ev=s=>w.eval(s);
w.confirm=()=>true;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0&&!/^!/.test(r));
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r.replace(/^!/,''):''));if(!ok)bad.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);bad.push(n+': '+e.message)}};
const clean=tag=>{ const t=(d.getElementById('view')||{}).textContent||'';
  const m=t.match(/.{0,20}(undefined|NaN|\[object Object\]).{0,20}/); if(m) bad.push('['+tag+'] '+m[0]); return !m; };
const btn=re=>[...d.querySelectorAll('#view .btn')].find(b=>re.test(b.textContent));

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(40);
  btn(/^이 선수로 시작$/).click(); await wait(250);
  ev("ST.tutDone=true; ST.mode='player'; ST.role='bat'; ST.myPos='CF'; ST.playerId='ksh'; MYID='ksh';");
  const amateur=ev("TBYID.wwzw.players.map(p=>p.name).join(',')");
  ev("proEnter({team:'dsn', round:3, pick:10, level:'1군'}); go('home');"); await wait(80);
  const all=()=>JSON.parse(ev("JSON.stringify(TEAMS.filter(t=>proKeyOf(t.id)).map(t=>[t.name, pfAll(t).map(p=>p.name)]))"));

  console.log('[구단 · 선수]');
  T('구단 이름이 실명', ()=>{ const n=all().map(x=>x[0]); return ['두산 베어스','LG 트윈스','KIA 타이거즈','삼성 라이온즈','롯데 자이언츠','KT 위즈','NC 다이노스','SSG 랜더스','한화 이글스','키움 히어로즈'].every(x=>n.indexOf(x)>=0||x===ev("proName(ST.pro.team)")) ? n.join(', ') : '!'+n.join(','); });
  const names=[].concat(...all().map(x=>x[1]));
  T('현역 실명 — 양의지 · 곽빈 · 김도영 · 류현진 · 최정 · 오스틴', ()=>['양의지','곽빈','김도영','류현진','최정','오스틴'].every(x=>names.indexOf(x)>=0) ? true : '!'+['양의지','곽빈','김도영','류현진','최정','오스틴'].filter(x=>names.indexOf(x)<0));
  T('가명이 안 남았다', ()=>{ const P=ev("JSON.stringify(Object.keys(PRO_PSEUDO_OF))"); const left=names.filter(n=>JSON.parse(P).indexOf(n)>=0 && Object.values(JSON.parse(ev('JSON.stringify(PRO_PSEUDO_OF)'))).indexOf(n)<0); return left.length?'!'+left.slice(0,10):true; });
  T('감독 실명', ()=>{ const m=JSON.parse(ev("JSON.stringify(PRO_MGR)")); return m.dsn&&/김원형/.test(JSON.stringify(m)) ? Object.values(m).join(' · ') : '!'+JSON.stringify(m); });
  T('역대 기록 실명 — 이승엽 56홈런 · 선동열', ()=>ev("JSON.stringify(PRO_HIST_TOP)").indexOf("'")<0 && /이승엽/.test(ev("JSON.stringify(PRO_HIST_TOP)")) && /선동열/.test(ev("JSON.stringify(PRO_HIST_TOP)")));
  T('영구결번 실명', ()=>/최동원/.test(ev("JSON.stringify(PRO_TEAMS.map(t=>t.retired))")) && /이종범/.test(ev("JSON.stringify(PRO_TEAMS.map(t=>t.retired))")));
  T('2027 신인 실명 — 1순위 하현승', ()=>ev("PRO_DRAFT_2027[0][0][0]")==='하현승');
  T('실제 연봉 표 키도 실명', ()=>ev("PF_REAL_SAL['dsn|양의지']")===420000);
  T('사회인 우완좌완은 그대로', ()=>{ const a=amateur.split(','); return a.length>=14 && ev("WWZW.map(p=>p.name).join(',')").split(',').every(n=>a.indexOf(n)>=0) ? a.slice(0,5).join(',')+'…' : '!'+amateur; });

  console.log('\n[명성 · 프랜차이즈 · 주장 · FA 미아]');
  T('메이저 · 통산 10걸이 명성에 — 김광현 · 양현종 80+', ()=>{ const r=JSON.parse(ev("JSON.stringify(['김광현','양현종'].map(n=>{ let v=0; TEAMS.forEach(t=>pfAll(t).forEach(p=>{ if(p.name===n) v=Math.max(v,pfRep(p)); })); return v; }))")); return r.every(v=>v>=80) ? r.join(' · ') : '!'+r; });
  T('프랜차이즈 · 영구결번 후보 표시', ()=>{ const s=ev("(function(){ const o=[]; TEAMS.forEach(t=>{ const k=proKeyOf(t.id); pfAll(t).forEach(p=>{ const f=pfFranchiseTag(p,k); if(f) o.push(p.name+':'+f); }); }); return o.join(','); })()"); return /최정:영구결번 후보/.test(s)&&/양현종:영구결번 후보/.test(s) ? s : '!'+s; });
  T('주장 — 1군 명성 제일 높은 베테랑', ()=>{ const c=ev("proCaptain().name"); const top=ev("(function(){ const t=TBYID.wwzw; return [].concat(t.players,t.pitchers).filter(x=>x.id!==ST.playerId&&!x.farm&&pfAge(x)>=30).sort((a,b)=>pfRep(b)-pfRep(a))[0].name; })()"); return c===top ? c : '!'+c+' vs '+top; });
  const fa=JSON.parse(ev(`(function(){ const out={stay:0,moved:0,mia:0,by:{}}; for(let i=0;i<4;i++){ const F=pfState(); F.fa=null; ST.pro.year+=1; const fa=pfFAOpen(); pfFAClose();
      fa.list.forEach(x=>{ if(x.done==='stay') out.stay++; else if(x.done==='late'||x.done==='limbo'||x.done==='retire') out.mia++; else { out.moved++; out.by[x.done]=(out.by[x.done]||0)+1; } }); }
      ST.pro.year-=4; return JSON.stringify(out); })()`));
  T('FA — 대부분 잔류 · 이적은 여러 구단에 흩어진다', ()=>fa.stay>fa.moved && Object.values(fa.by).every(v=>v<=8) ? '잔류 '+fa.stay+' · 이적 '+fa.moved+' · 미아 '+fa.mia : '!'+JSON.stringify(fa));
  T('FA 미아가 가끔 나온다', ()=>fa.mia>=1 && fa.mia<=fa.moved ? fa.mia+'명(4년)' : '!'+fa.mia);

  console.log('\n[옛 세이브]');
  const r=JSON.parse(ev(`(function(){
    ST.pro.realNames=false;
    ST.pro.news=(ST.pro.news||[]).concat([{tag:'이적', head:'서울 곰 양의진, 곽반과 함께', body:'김민혼(1라운드)'}]);
    const F=pfState(); F.moves=F.moves||[]; F.moves.push({snap:{id:'dc27_x', name:'김민혼', no:77}, from:null, to:'dsn', why:'신인 드래프트', year:ST.pro.year, slot:'2군'});
    F.car=F.car||{}; F.car['x']={n:'오스텐', s:1, tm:{lg:1}};
    proRealMigrate();
    const G=pfState(), n=ST.pro.news[ST.pro.news.length-1];
    return JSON.stringify({head:n.head, body:n.body, snap:G.moves[G.moves.length-1].snap.name, car:G.car['x'].n, flag:ST.pro.realNames});
  })()`));
  T('신문 제목이 실명으로', ()=>r.head==='두산 베어스 양의지, 곽빈과 함께' ? r.head : '!'+r.head);
  T('이적 스냅샷 — 김민혼 → 김민훈(연달아 김민준으로 안 간다)', ()=>r.snap==='김민훈' && r.body==='김민훈(1라운드)' ? r.snap : '!'+r.snap+' / '+r.body);
  T('통산 장부 이름', ()=>r.car==='오스틴');
  T('한 번만 한다', ()=>r.flag===true && ev("proRealMigrate()")===false);
  ev("go('home')"); await wait(40); clean('홈');

  console.log(bad.length?'\n❌ '+bad.length+'건:\n'+bad.join('\n'):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
