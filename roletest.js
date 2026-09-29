/* 프로 입단 — 내가 고른 역할(타자만 · 투수만 · 투타겸업)을 지키나 (v3.54.0)
   [제보] "첨 시작할때 타자만 한다고 정해놨는데 엔씨 지명받고 타자로 0출전 투수로만 출전시킴"
   사회인 로스터에 pitch 칸이 남아 있으면 buildProTeams 가 역할을 안 보고 선발로 넣었다.

   확인하는 것
     · 타자만 — 투수진에 없다 · 타순에 선다 · 몇 주 돌리면 타석이 쌓이고 등판은 0
     · 투수만 · 투타겸업 — 예전처럼 투수진에 들어간다                                 */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const bad=[]; const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Could not load|stylesheet|[Nn]ot implemented|getContext/.test(e.message)) bad.push('JSDOM: '+e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc,
  beforeParse(w){ w.scrollTo=()=>{}; w.TextEncoder=TextEncoder; w.TextDecoder=TextDecoder; }});
const w=dom.window,d=w.document,ev=s=>w.eval(s);
w.confirm=()=>true;
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0&&!/^!/.test(r));
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r.replace(/^!/,''):''));if(!ok)bad.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);bad.push(n+': '+e.message)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(40);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click(); await wait(250);
  const snap=ev("JSON.stringify(ST)");
  const enter=(role,pos)=>ev(`(function(){ TEAMS=[]; TBYID={}; ST=JSON.parse(${JSON.stringify(snap)}); TEAMS=buildAllTeams(); TBYID={}; TEAMS.forEach(t=>TBYID[t.id]=t); normalizeState();
    ST.tutDone=true; ST.mode='player'; ST.role='${role}'; ST.myPos=${pos?"'"+pos+"'":'null'};
    var me=ST.playerId||MYID, mp=TBYID.wwzw.players.find(x=>x.id===me);
    mp.pitch=mp.pitch||{stf:60,ctl:55,sta:50,brk:30};          // 사회인 때 pitch 칸이 남아 있던 경우
    proEnter({team:'nc', round:2, pick:4, level:'1군'}); return me; })()`);

  console.log('[타자만]');
  const me=enter('bat','SS');
  T('투수진에 없다', ()=>ev(`!TBYID.wwzw.pitchers.some(p=>p.id==='${me}')`));
  T('타순에 선다', ()=>{ const r=ev(`(ST.lineup||[]).find(x=>x.id==='${me}')`); return r ? r.pos : '!없다'; });
  ev("for(var i=0;i<6;i++) runWeek();");
  T('여섯 주 — 타석이 쌓이고 등판은 0', ()=>{ const r=JSON.parse(ev(`JSON.stringify({pa:(ST.bat['${me}']||{}).pa||0, g:(ST.pit['${me}']||{}).g||0})`));
    return r.pa>0 && r.g===0 ? r.pa+'타석 · 등판 0' : '!'+JSON.stringify(r); });
  T('저장 · 불러오기 뒤에도 투수진에 없다', ()=>{ ev("saveGame(true); proRebuild();"); return ev(`!TBYID.wwzw.pitchers.some(p=>p.id==='${me}')`); });

  console.log('\n[투수만 · 투타겸업]');
  enter('pit',null);
  T('투수만 — 투수진에 있다', ()=>ev(`TBYID.wwzw.pitchers.some(p=>p.id==='${me}')`));
  enter('two','RF');
  T('투타겸업 — 투수진에 있다', ()=>ev(`TBYID.wwzw.pitchers.some(p=>p.id==='${me}')`));

  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
