/* KBO 명예의 전당 · 영구결번 · 등번호 겹침 · 2027 드래프트 동기 (v3.60.0)
   [요청] "왜 27년 드래프트 같이 된애들은 선수단에 안들어 오는건지 모르겠고 등번호 겹치는 문제도 해결해라
           성적 엄청잘뽑고 팀내 상징이 되어버린 선수는 영구결번 같은것도 하고 kbo 명예의 전당 이런것도 만들고"

   확인하는 것
     · 드래프트 날 「입단한다」 를 누르면 같이 뽑힌 신인들이 각 구단 2군에 들어가고, 우리 선수단 화면에 보인다
     · 어느 구단에도 같은 등번호가 둘 없다 — 불러와도 그대로
     · 시즌 기록이 통산 장부(F.car)에 쌓이고 두 번 안 더해진다
     · 통산 점수가 넘는 프랜차이즈가 은퇴하면 헌액 + 영구결번 · 그 번호는 다시 안 준다
     · 기록실 명예의 전당 탭(프로)이 뜨고 undefined · NaN 이 없다                    */
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
  ev("ST.tutDone=true; ST.tutStep=99; ST.mode='player'; ST.role='bat'; ST.myPos='CF';");
  ev("ST.proSlot=null; ST.tryout={score:70, year:2026}; renderProDraft()"); await wait(40);
  for(let i=0;i<60;i++){ const b=btn(/입단한다/); if(b){ b.click(); break; } const all=[...d.querySelectorAll('#view .btn')]; if(all.length) all[all.length-1].click(); await wait(30); }
  await wait(100);
  const dups=()=>ev("TEAMS.filter(t=>proKeyOf(t.id)).reduce((n,t)=>{ const m={}; pfAll(t).forEach(p=>{ if(p.no!=null) m[p.no]=(m[p.no]||0)+1; }); return n+Object.values(m).filter(v=>v>1).length; },0)");

  console.log('[2027 드래프트 동기]');
  T('프로에 들어왔다', ()=>ev("isPro()"));
  T('같이 뽑힌 신인들이 리그에 들어왔다', ()=>{ const n=ev("TEAMS.reduce((n,t)=>n+pfAll(t).filter(p=>/^dc27_/.test(p.id)).length,0)"); return n>=100?n+'명':'!'+n; });
  T('우리 구단 2군에도 있다', ()=>{ const s=ev("pfAll(TBYID.wwzw).filter(p=>/^dc27_/.test(p.id)&&p.farm).map(p=>p.name).join(', ')"); return s?s:'!없다'; });
  ev("go('squad')"); await wait(40);
  const farmBtn=[...d.querySelectorAll('#view button')].find(b=>/2군/.test(b.textContent)); if(farmBtn){ farmBtn.click(); await wait(40); }
  T('선수단 화면(2군)에 보인다', ()=>{ const nm=ev("(pfAll(TBYID.wwzw).find(p=>/^dc27_/.test(p.id))||{}).name"); return nm&&d.getElementById('view').textContent.indexOf(nm)>=0 ? nm : '!'+nm; });
  clean('선수단');

  console.log('\n[등번호]');
  T('어느 구단에도 같은 번호가 둘 없다', ()=>{ const n=dups(); return n===0?true:'!'+n+'쌍'; });
  ev("saveGame(true); proRebuild();"); await wait(30);
  T('다시 세워도 그대로', ()=>dups()===0);

  console.log('\n[통산 장부]');
  ev("window._K=PRO_TEAMS.map(x=>x.key).find(k=>k!==ST.pro.team); window._K2=PRO_TEAMS.map(x=>x.key).filter(k=>k!==ST.pro.team)[1]; window._T=TBYID[pfIdOf(_K)];");
  ev(`(function(){ const t=_T; ST.lgBat=ST.lgBat||{}; pfAll(t).slice(0,5).forEach(p=>{ ST.lgBat[p.id]={g:100,pa:400,ab:360,h:100,d2:0,d3:0,hr:10,bb:30,hbp:0,k:60,rbi:50,r:40,sb:5,cs:0,e:0}; }); })()`);
  ev("pfCareerAccrue(); pfCareerAccrue();");
  T('한 시즌이 쌓인다 · 두 번 안 더한다', ()=>{ const c=JSON.parse(ev("JSON.stringify(pfState().car[pfAll(_T)[0].id])")); return c&&c.s===1&&c.h===100 ? c.n+' '+c.h+'안타' : '!'+JSON.stringify(c); });

  console.log('\n[명예의 전당 · 영구결번]');
  const r=JSON.parse(ev(`(function(){
    const t=_T, key=_K;
    const p=pfAll(t).filter(q=>!q.farm&&q.no!=null&&!pfIsPit(q)&&pfRep(q)<80).sort((a,b)=>pfAge(b)-pfAge(a))[0];
    const F=pfState(); F.car[p.id]={n:p.name,s:12,tm:{[_K]:12},g:1500,pa:6000,ab:5300,h:1700,hr:250,rbi:950,sb:60,bb:600,pg:0,outs:0,er:0,w:0,l:0,k:0};
    const no=+p.no, snap=JSON.parse(JSON.stringify(p));
    pfHofJudge(p, key, snap); pfMove(p, key, null, '은퇴'); pfForget(p.id);
    const heads=(ST.pro.news||[]).map(x=>x.head);
    return JSON.stringify({name:p.name, no, hof:(F.hof||[]).some(h=>h.id===p.id), ret:((F.retNos||{})[_K]||[]).some(x=>x.no===no),
      news:heads.filter(h=>/명예의 전당|영구결번/.test(h)).length, free:pfFreeNo(_K, no)});
  })()`));
  T('통산이 넘는 프랜차이즈 — 헌액', ()=>r.hof ? r.name : '!'+JSON.stringify(r));
  T('그 구단이 번호를 건다', ()=>r.ret ? r.no+'번' : '!'+JSON.stringify(r));
  T('신문에 난다', ()=>r.news>=2 ? r.news+'건' : '!'+r.news);
  T('건 번호는 다시 안 준다', ()=>r.free!==r.no ? '원하면 '+r.no+' → '+r.free : '!'+r.free);
  T('그 번호를 새로 단 사람은 비켜 준다', ()=>{ ev(`(function(){ const q=pfAll(_T).find(x=>x.no!=null); q.no=${r.no}; pfDedupNos(); window._q=q; })()`); return ev("_q.no")!==r.no ? r.no+' → '+ev("_q.no") : '!그대로'; });
  T('평범한 은퇴는 헌액 안 된다', ()=>ev(`(function(){ const p=pfAll(TBYID[pfIdOf(_K2)]).filter(q=>pfRep(q)<60&&q.no!=null).pop(); const F=pfState(); delete F.car[p.id]; const n0=(F.hof||[]).length, r0=((F.retNos||{})[_K2]||[]).length; pfHofJudge(p,_K2,JSON.parse(JSON.stringify(p))); return (F.hof||[]).length===n0 && ((F.retNos||{})[_K2]||[]).length===r0; })()`));
  ev("saveGame(true)"); await wait(60);
  ev("recTab='hof'; go('records')"); await wait(60);
  T('기록실 — KBO 명예의 전당', ()=>{ const t=d.getElementById('view').textContent; return /KBO 명예의 전당/.test(t)&&t.indexOf(r.name)>=0&&/영구결번/.test(t) ? '헌액자 · 영구결번 보인다' : '!'+t.slice(0,120); });
  T('나의 헌액 진행이 보인다', ()=>/나의 헌액 진행/.test(d.getElementById('view').textContent));
  clean('명예의 전당');

  console.log(bad.length?'\n❌ '+bad.length+'건:\n'+bad.join('\n'):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
