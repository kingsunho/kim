/* 내 선수 — 학교 이름 직접 적기 · 드래프트 계약금.
   [v3.40.0] 「명단에 없는 사람들은 고등학교 이름도 직접 적을 수 있고 · 드래프트 과정 · 결과 · 계약금 —
   역대급 신인은 계약금 최소 15억 소리도 나온다」 로 생겼다.

   확인하는 것
     · 만들기 화면에 「직접 적기」 → 학교 이름 칸이 뜬다. 「고」 가 없으면 붙인다
     · 그 학교가 세 번째 학교(mine)가 된다 — 부원은 전부 지어낸 사람, 라이벌은 군포고
     · 제목줄 · 고교 화면에 그 학교 이름이 나온다. 졸업까지 돈다
     · 불러와도(customApply 다시) 그 학교다
     · 고졸 지명 카드에 계약금이 나오고, 입단하면 내 계약(pfMyCon)에 그 계약금이 남는다
     · 괴물 신인 계약금 — 잠재 86 → 10억, 90 → 15억                                */
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
const top=()=>{ const h=d.querySelector('.topbar h1'), s=d.querySelector('.topbar > span'); return (h?h.textContent:'')+' | '+(s?s.textContent:''); };

(async()=>{
  await wait(700);
  console.log('[학교 직접 적기]');
  d.querySelector('.pk-make').click(); await wait(40);
  const own=d.querySelector('.mk-g[data-k="school"] button[data-v="__own"]');
  T('「직접 적기」 버튼이 있다', ()=>!!own);
  T('처음엔 학교 칸이 숨어 있다', ()=>d.querySelector('.mk-own').style.display==='none');
  own.click(); await wait(10);
  T('누르면 학교 이름 칸이 뜬다', ()=>d.querySelector('.mk-own').style.display==='');
  d.querySelector('#mk-nm').value='한결'; d.querySelector('#mk-no').value='11';
  d.querySelector('#mk-sch').value='휘문';
  btn(/이 선수로 시작/).click(); await wait(300);
  T('「고」 를 붙여서 받는다', ()=>ev("ST.custom.school")==='휘문고' ? '휘문고' : '!'+ev("ST.custom.school"));
  T('세 번째 학교가 됐다', ()=>ev("hsMySchool()")==='mine' && ev("HS_SCHOOLS.mine.name")==='휘문고');
  T('라이벌은 군포고', ()=>ev("hsFoe()")==='gunpo');
  T('인적정보 학교', ()=>ev("META.my.school")==='휘문고');
  ev("ST.tutDone=true; ST.tutStep=99; ST.mode='player'; ST.role='bat'; ST.myPos='SS';");
  T('학교 명단 — 나 + 부원(실존 인물 없음)', ()=>{ const R=JSON.parse(ev("JSON.stringify(hsRoster(hsYearsFor('my')[0], ST.seed||1).mine.map(p=>[p.id,!!p.real]))"));
    const me=R.find(x=>x[0]==='my'), realOthers=R.filter(x=>x[1]&&x[0]!=='my');
    return me&&R.length>=11&&!realOthers.length ? R.length+'명' : '!'+JSON.stringify(R).slice(0,80); });
  ev("hsSlot(); go('hs'); renderHS();"); await wait(30);
  T('제목줄 — 휘문고 야구부', ()=>/휘문고 야구부/.test(top()) ? top() : '!'+top());
  clean('고교');
  ev(`(function(){ const H=hsSlot(); let g=0;
    while(!H.done && g++<60){ H.sayAt=99; H.picked=H.picked||{}; const s=hsStory()[H.i];
      if(s&&s.pick&&H.picked[H.i]==null) H.picked[H.i]=0;
      if(s&&!s.noGame) hsPlay(); H.pending=null; H.i++; if(H.i>=hsStory().length){ hsGraduate(); } }
  })()`);
  T('졸업까지 돈다', ()=>ev("ST.hs.done") ? '졸업' : '!');
  ev("renderHS()"); await wait(30);
  T('제목줄 — 휘문고 졸업', ()=>/휘문고 졸업/.test(top()) ? top() : '!'+top());
  clean('졸업');
  /* 불러오기 — 로스터를 상수에서 다시 만든다 */
  ev("delete HS_SCHOOLS.mine; customApply();");
  T('불러와도 휘문고', ()=>ev("hsMySchool()")==='mine' && ev("HS_SCHOOLS.mine.name")==='휘문고');

  console.log('\n[계약금]');
  btn(/바로 프로/).click(); await wait(40);
  { const sk=btn(/빨리 넘기기/); if(sk) sk.click(); await wait(40); }
  const card=()=>(d.querySelector('.dr-me-money')||{}).textContent||'';
  T('지명 카드에 계약금 · 첫해 연봉', ()=>/계약금/.test(card())&&/첫해 연봉/.test(card()) ? card() : '!'+card());
  T('내 줄 학교가 휘문고', ()=>/휘문고/.test((d.querySelector('.dr-row.mine')||{}).textContent||''));
  const exp=ev("pfBonusOf(ST.proSlot.round, ST.proSlot.pickIdx+1)");
  btn(/입단한다/).click(); await wait(60);
  T('내 계약에 그 계약금', ()=>ev("pfMyCon().bonus")===exp ? ev("wonStr2(pfMyCon().bonus)") : '!'+ev("pfMyCon().bonus")+'≠'+exp);
  T('신문에 계약금', ()=>ev("(ST.pro.news||[]).some(n=>/계약금/.test(n.head))"));
  T('괴물 신인 계약금 10억~15억', ()=>ev("pfPhenomBonus(86)")===100000 && ev("pfPhenomBonus(90)")===150000 ? '86→10억 · 90→15억' : '!'+ev("pfPhenomBonus(86)")+'/'+ev("pfPhenomBonus(90)"));
  /* 신인 드래프트 중계 — 지명마다 계약금 */
  ev("ST.pro.year=2027; proSeasonEnd();"); await wait(30);
  ev("for(let s=1;s<80;s++){ ST.seed=s; pfState().rookies=null; if(pfRookiePool().list.some(x=>x.phenom)) break; }");
  ev("renderRookieDraft(ST.pro.history[ST.pro.history.length-1], true); clearInterval(PF_DRAFT_T); pfRookieAutoOurs();");
  const P=JSON.parse(ev("JSON.stringify(pfRookiePool().picks)"));
  T('지명 전부에 계약금', ()=>P.length===110 && P.every(z=>z.bonus>0) ? '110명' : '!'+P.length);
  const ph=P.filter(z=>z.phenom);
  T('괴물 신인은 10억 이상', ()=>ph.length&&ph.every(z=>z.bonus>=100000) ? ph.map(z=>z.round+'R '+ev("wonStr2("+z.bonus+")")).join(', ') : '!'+JSON.stringify(ph));
  T('괴물 신인 신문', ()=>ev("(ST.pro.news||[]).some(n=>/역대급/.test(n.head))"));

  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
