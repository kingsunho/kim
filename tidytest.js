/* 설정 정리 · 프로에서 사회인 실제 기록 숨기기 · 신문 감사 띠 — v3.70.0
   [요청] "설정 세팅 다했어? 그 지저분한것들?" · "크보 오면 우리 사회인 야구 실제 기록은 안보여도 된다니깐"
          "한규가 너무 열심히 찾아주니깐 신문에 계속 금장으로 이름 박아주자 감사합니다 하면서"          */
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
const top=()=>[...d.querySelectorAll('#view > .card > .card-h')].map(h=>h.textContent.trim());
const all=()=>[...d.querySelectorAll('#view .card-h')].map(h=>h.textContent.trim());
(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(40);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click(); await wait(250);
  console.log('[설정 — 사회인]');
  ev("ST.tutDone=true; go('more')"); await wait(20);
  T('위에는 여덟 장만(테마 · 직접 플레이 · 세이브 · 사운드 · 버전 · 선수단 · 이름 · 플레이타임)', ()=>{ const t=top(); return t.length===8 ? t.join(' · ') : '!'+t.join(','); });
  T('사회인은 장비 · 만약에가 접힌 데 남아 있다', ()=>all().indexOf('장비')>=0 && all().indexOf('만약에')>=0);
  ev(`ST.mode='player'; ST.role='bat'; ST.playerId='ksh'; MYID='ksh'; proEnter({team:'lg', round:3, pick:10, level:'1군'}); go('more');`); await wait(20);
  console.log('\n[설정 — 프로]');
  T('위에는 여덟 장만', ()=>top().length===8);
  T('사회인 전용(장비 · 경기장 · 특성 설명 · 만약에 · 플레이 선수)은 아예 없다', ()=>{ const a=all(); const left=['장비','경기장','특성 설명','만약에','플레이 선수'].filter(x=>a.indexOf(x)>=0); return left.length?'!'+left:'없다'; });
  console.log('\n[기록실 — 프로]');
  ev("recTab='real'; go('records')"); await wait(20);
  T('「실제」(2026 사회인) 탭이 없다 · 내 기록으로 연다', ()=>{ const t=[...d.querySelectorAll('.subtab')].map(b=>b.textContent); const on=(d.querySelector('.subtab.on')||{}).textContent;
    return t.indexOf('실제')<0 && on==='내 기록' ? t.join(',') : '!'+t.join(',')+' on='+on; });
  T('사회인 실제 기록 문구가 안 보인다', ()=>!/UNIQPLAY|2026시즌 실제 경기 기록/.test(d.getElementById('view').textContent));
  console.log('\n[신문 — 김한규 명예기자]');
  ev("showPaper()"); await wait(20);
  T('제호 밑 금색 감사 띠', ()=>{ const t=(d.querySelector('.pp-thx')||{}).textContent||''; return /김한규/.test(t)&&/감사/.test(t) ? t : '!'+t; });
  T('프로 신문 꼬리말에 「실제와 다릅니다」 가 없다(v3.63 부터 실명)', ()=>!/실제와 다릅니다/.test((d.querySelector('.pp-foot')||{}).textContent||''));
  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
