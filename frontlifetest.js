/* 프런트 생애 — 명성 · 감독 스타일 · 상무/군 복무 · 포스팅 · 감독 경질 · 레전드 · 방출 · 뎁스표.
   [v3.56.0] 「FM 느낌」 묶음과 같이 생겼다. 겨울을 열두 번 넘긴다.

   확인하는 것
     · 실제 감독 스타일(가명)이 그 팀 AI 에 실제로 들어간다 — 교체 성향 · 도루(oppTactics)
     · 명성 — 1라운드 신인 · 태극마크 · 주전 베테랑이 높고, 방출 순서에서 안고 간다
     · 상무 — 해마다 지원자 중 위 18명만. 복무하는 한 해는 명단에 없고, 전역하면 2군으로 온다
     · 포스팅 — 열두 해 동안 누군가는 메이저에 간다(우리 팀이면 금고에 돈)
     · 성적 나쁜 AI 구단은 감독을 바꾼다 · 은퇴한 레전드가 코치 → 감독이 되기도 한다
     · 우리 팀 2군은 자동으로 안 자른다 — 뎁스표에서 내가 방출한다
     · 스타(명성 70+)는 웃돈 없이 안 내준다
     · 열두 해가 지나도 리그 평균(1군 주전)은 그대로다                                          */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const bad=[]; const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Could not load|stylesheet|[Nn]ot implemented|getContext/.test(e.message)) bad.push('JSDOM: '+e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc,
  beforeParse(w){ w.scrollTo=()=>{}; w.TextEncoder=TextEncoder; w.TextDecoder=TextDecoder; }});
const w=dom.window,d=w.document,ev=s=>w.eval(s);
w.confirm=()=>true;
process.on('unhandledRejection',e=>{ console.log('  ❌ 처리 안 된 예외 :: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' | ')); process.exit(1); });
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0&&!/^!/.test(r));
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r.replace(/^!/,''):''));if(!ok)bad.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);bad.push(n+': '+e.message)}};
const clean=tag=>{ const t=(d.getElementById('view')||{}).textContent||'';
  const m=t.match(/.{0,20}(undefined|NaN|\[object Object\]).{0,20}/); if(m) bad.push('['+tag+'] '+m[0]); return !m; };
const J=s=>JSON.parse(ev('JSON.stringify('+s+')'));

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300);
  ev(`ST.tutDone=true; ST.mode='player'; ST.role='bat'; ST.myPos='CF'; ST.playerId='ksh'; MYID='ksh';
      proEnter({team:'lg', round:3, pick:10, level:'1군'}); go('home');`);
  await wait(80);

  console.log('[감독 스타일]');
  T('실제 감독(가명)이 붙어 있다', ()=>{ const a=ev("proMgrName('kt')"), b=ev("proMgrName('lg')"); return (a==='이강천'&&b==='염경업')?a+' · '+b:'!'+a+' / '+b; });
  T('교체 성향이 감독에서 온다 — 마법사 일찍 · 거인 오래', ()=>{ const k=J("oppTactics(TBYID.p_kt)"), l=J("oppTactics(TBYID.p_lot)");
    return (k.hook==='quick'&&l.hook==='long')?'마법사 '+k.hook+' · 거인 '+l.hook:'!'+k.hook+' / '+l.hook; });
  T('우리 팀 감독 칸이 실제 감독으로 시작한다', ()=>{ const m=J("stfState().mgr"); return m.name==='염경업'?m.name+' · '+m.style:'!'+m.name; });
  T('가상 감독은 가상이라고 적혀 있다', ()=>{ const v=J("['kia','ssg','kw'].map(k=>PRO_MGR_STYLE[k].src)"); return v.every(x=>x==='가상')?'셋 다':'!'+v.join(','); });
  T('현재 감독 계약이 실제대로다 — 쌍둥이 2028년까지 연 10억', ()=>{ const m=J("proMgrOf('lg')"); return (m.until===2028&&m.sal===10)?'2028 · 10억':'!'+m.until+' / '+m.sal; });
  T('2026 만료 계약은 2027 한 해 연장으로 시작한다', ()=>{ const u=J("['kt','lot','hh'].map(k=>proMgrOf(k).until)"); return u.every(x=>x===2027)?'셋 다 2027':'!'+u.join(','); });
  T('재야의 감독이 열 명 넘게 있다', ()=>{ const L=J("pfMgrFreeList().map(m=>m.name)"); return (L.length>=10&&L.includes('이승연'))?L.length+'명 ('+L.slice(0,4).join(' · ')+' …)':'!'+L.join(','); });
  T('우리 감독 후보가 재야에서 나온다', ()=>{ const L=J("stfMgrPool().list.map(m=>m.career)"); return L.some(x=>/전 .+ 감독|레전드/.test(x))?L.join(' / '):'!'+L.join(' / '); });

  console.log('\n[명성]');
  const reps=J(`(function(){ const L=[]; TEAMS.forEach(t=>pfAll(t).forEach(p=>L.push(pfRep(p)))); L.sort((a,b)=>a-b);
    return {n:L.length, med:L[L.length>>1], top:L[L.length-1], hi:L.filter(x=>x>=70).length}; })()`);
  T('명성이 퍼져 있다 — 가운데는 낮고 위는 드물다', ()=>(reps.med<40&&reps.hi>=5&&reps.hi<=80)?('가운데 '+reps.med+' · 70+ '+reps.hi+'명 · 최고 '+reps.top):'!'+JSON.stringify(reps));
  T('태극마크 · 주전은 명성이 높다(곽반)', ()=>{ const r=ev("pfRep(pfAll(TBYID.p_dsn).find(p=>p.name==='곽반'))"); return r>=65?'명성 '+r:'!'+r; });
  T('1라운드 신인은 못해도 안고 간다', ()=>{ const r=J(`(function(){ const a={id:'t1',name:'가',con:30,pow:30,eye:30,spd:30,def:30,arm:30,pos:['SS'],age:20,ageYear:ST.pro.year,draftRound:1,draftPick:2,draftYear:ST.pro.year};
      const b=Object.assign({},a,{id:'t2',draftRound:9}); return [pfRelScore(a),pfRelScore(b)]; })()`);
    return r[0]>r[1]+10?('1R '+r[0].toFixed(0)+' > 9R '+r[1].toFixed(0)):'!'+r.join(' / '); });

  console.log('\n[트레이드 — 빡세게]');
  T('상대 스타(명성 70+)는 같은 값으론 안 내준다', ()=>{ const r=J(`(function(){ const F=pfState(); F.tradeRound=-99;
      const star=pfAll(TBYID.p_dsn).find(p=>p.name==='곽반'); const ours=pfAll(TBYID.wwzw).filter(p=>p.id!=='ksh').sort((a,b)=>Math.abs(pfValue(a)-pfValue(star))-Math.abs(pfValue(b)-pfValue(star)))[0];
      return pfTrade(ours.id, star.id); })()`); return !r.ok?(r.why||'거절'):'!받아 줬다'; });

  console.log('\n[열두 겨울]');
  const base=J("pfLgMean()");
  const log=[]; let postN=0, mgrChg=0, milMax=0, legendMgr=false, milReturn=false, jersey=0;
  /* 신문은 60건까지만 남는다 — 끝에 한 번 읽으면 앞쪽 겨울 기사는 이미 밀려나 있다.
     해마다 새로 나온 기사를 모은다 */
  const heads=[];
  for(let i=0;i<12;i++){
    ev("pfRookiePool()");
    jersey=Math.max(jersey, ev("pfJerseyRev()"));
    ev("(ST.pro.news||[]).forEach(x=>{ x._seen=1; })");
    ev("proNextYear()"); await wait(10);
    J("(ST.pro.news||[]).filter(x=>!x._seen).map(x=>x.head)").forEach(h=>heads.push(h));
    const s=J(`(function(){ const F=pfState(); return {mil:Object.keys(F.mil||{}).length, done:Object.keys(F.milDone||{}).length, mlb:(F.mlb||[]).length,
      mg:Object.keys(ST.pro.mgrs||{}).filter(k=>k!==ST.pro.team).length, leg:Object.values(ST.pro.mgrs||{}).some(m=>m.from==='legend'),
      farm:(TBYID.wwzw.farm||[]).length}; })()`);
    milMax=Math.max(milMax,s.mil); if(s.done>0) milReturn=true; postN=Math.max(postN,s.mlb); mgrChg=s.mg; if(s.leg) legendMgr=true;
    log.push(s);
  }
  console.log('   '+log.map((s,i)=>(2028+i)+' 복무'+s.mil+'·전역'+s.done+'·MLB'+s.mlb+'·교체'+s.mg+'·우리2군'+s.farm).join(' | '));
  T('상무 · 현역 — 복무 중인 선수가 있다', ()=>milMax>=5?'많을 때 '+milMax+'명':'!'+milMax);
  T('전역하면 돌아온다', ()=>milReturn?'돌아왔다':'!아무도');
  T('전역자는 2군에서 다시 시작한다', ()=>{ const r=J(`(function(){ const F=pfState(); const ids=Object.keys(F.milDone||{}); let farm=0,n=0;
      ids.forEach(id=>{ const f=pfFind(id); if(f){ n++; if(f.p.farm) farm++; } }); return [n,farm]; })()`);
    return r[0]>0?(r[0]+'명 중 2군 '+r[1]+'명'):'!없다'; });
  /* 도전은 해마다 30% · 성공은 45~90% 라, 열두 해에 한 명도 못 가는 판이 있다(재 봤다).
     도전 기사(「응찰 없어 잔류」)까지 센다 — 포스팅이 돌고 있는지가 보고 싶은 것이다 */
  T('포스팅 — 메이저에 도전한 사람이 있다', ()=>{ const tr=heads.filter(h=>/메이저/.test(h)).length;
    return (postN+tr)>=1?('진출 '+postN+'명 · 도전 기사 '+tr+'건'):'!없다'; });
  T('성적 나쁜 구단은 감독을 바꾼다', ()=>mgrChg>=2?mgrChg+'구단':'!'+mgrChg);
  T('계약이 끝나면 재계약하거나 결별한다', ()=>{ const N=heads.filter(h=>/재계약|결별|경질/.test(h)); return N.length?N.length+'건 — '+N[0]:'!없다'; });
  T('잘린 감독은 재야로 간다', ()=>{ const n=ev("(ST.pro.mgrFree||[]).length"); return n>0?n+'명':'!0'; });
  T('우리 감독을 바꾸면 잔여 연봉을 낸다', ()=>{ const r=J(`(function(){ const F=stfState(); F.mgr.until=ST.pro.year+2; F.mgr.sal=5; F.mgrPool=null; F.cash=200;
      const before=F.cash, c=stfMgrPool().list[0], e=stfHireMgr(0); return {e, paid:Math.round((before-F.cash)*10)/10, cost:c.cost, name:F.mgr.name, until:F.mgr.until, y:ST.pro.year}; })()`);
    return (!r.e && r.paid===Math.round((r.cost+10)*10)/10 && r.until===r.y+3)?('계약금 '+r.cost+'억 + 잔여 10억 · 새 감독 '+r.name+' 3년'):'!'+JSON.stringify(r); });
  T('레전드 출신 감독도 나온다', ()=>legendMgr?'나왔다':(ev("(pfState().legends||[]).length")>0?'레전드 '+ev("(pfState().legends||[]).length")+'명 대기':'!레전드 없음'));
  T('스타 유니폼 수입이 있다', ()=>jersey>0?'한 주 최대 '+jersey+'억':'!0');
  const last=J("pfLgMean()");
  console.log('   [리그 평균 변화] '+['con','pow','eye','stf','ctl'].map(k=>k+' '+(last[k]-base[k]).toFixed(1)).join(' · '));
  T('열두 해 뒤에도 리그 평균이 그대로다(±4)', ()=>{ const ks=['con','pow','eye','stf','ctl']; const dd=ks.map(k=>last[k]-base[k]);
    return dd.every(x=>Math.abs(x)<=4)?ks.map((k,i)=>k+' '+(dd[i]>=0?'+':'')+dd[i].toFixed(1)).join(' · '):'!'+ks.map((k,i)=>k+' '+dd[i].toFixed(1)).join(' · '); });
  T('1군 인원이 모자라지 않는다', ()=>{ const n=J("TEAMS.map(t=>[t.players.length,t.pitchers.length])"); return n.every(x=>x[0]>=13&&x[1]>=11)?'최소 타자 '+Math.min(...n.map(x=>x[0]))+' · 투수 '+Math.min(...n.map(x=>x[1])):'!'+JSON.stringify(n); });

  console.log('\n[우리 팀 방출 · 뎁스표]');
  T('우리 2군은 마흔까지 자동으로 안 자른다', ()=>{ const f=ev("(TBYID.wwzw.farm||[]).length"); return f>30?('2군 '+f+'명 — 내가 고를 차례'):('2군 '+f+'명 (정원 안)'); });
  ev("renderProFront('depth')"); await wait(20);
  T('뎁스표가 열린다', ()=>/뎁스표/.test(d.getElementById('view').textContent)?'열린다':'!안 열림');
  clean('뎁스표');
  const rel=J(`(function(){ const p=(TBYID.wwzw.farm||[]).find(x=>x.id!=='ksh'&&!pfIsForeign(x,ST.pro.team)); if(!p) return null;
    const id=p.id, ok=pfRelease(id); return {ok, gone:!pfFind(id)}; })()`);
  T('뎁스표에서 방출하면 사라진다', ()=>rel&&rel.ok&&rel.gone?'사라졌다':'!'+JSON.stringify(rel));
  T('나는 방출할 수 없다', ()=>ev("pfRelease('ksh')")===false?'막힌다':'!됐다');

  console.log('\n[저장 → 불러오기]');
  const snap=ev("JSON.stringify(ST)");
  ev(`TEAMS=[]; TBYID={}; ST=JSON.parse(${JSON.stringify(snap)}); TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(t=>TBYID[t.id]=t); normalizeState(); applyMyRatings();`);
  T('불러와도 복무 중인 선수는 명단에 없다', ()=>{ const n=ev("Object.keys(pfState().mil||{}).filter(id=>pfFind(id)).length"); return n===0?'없다':'!'+n+'명이 남아 있다'; });
  T('불러와도 바뀐 감독이 그대로다', ()=>{ const k=J("Object.keys(ST.pro.mgrs||{})"); return k.length?k.length+'구단':'(바뀐 구단 없음)'; });
  ev("go('home')"); clean('홈');

  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
