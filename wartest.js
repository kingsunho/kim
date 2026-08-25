/* [2.48.0] WAR — 상수가 아직 이 엔진과 맞는지 매번 다시 잰다.

   [요청] "투수 war 타자 war 따로 해서 선수 합쳐도 되고"

   WAR 상수(선형 가중치·승리당 득점·대체수준)는 엔진에서 실측해서 박은 값이다.
   엔진 밸런스를 건드리면 이 값들이 조용히 틀려진다 — 화면에는 여전히
   그럴듯한 숫자가 찍히니 아무도 모른다. 그래서 verify.js 처럼
   **매번 다시 재서** 박아둔 상수와 맞는지 본다.

   주의: T() 는 문자열을 '통과 + 설명' 으로 친다. 실패는 반드시 false 다.  */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const errs=[];
const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Not implemented/.test(e.message)) errs.push('JSDOM: '+e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{}; dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0);
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!ok)errs.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  await wait(700);

  console.log('[상수를 다시 잰다]');
  const M=ev(`(function(){
    const T2=buildAllTeams();
    let PA=0,RUNS=0,G=0,OUT=0,ER=0,RA=0,E=0,FG=0;
    let a={ab:0,h:0,d2:0,d3:0,hr:0,bb:0,hbp:0,sb:0,cs:0};
    const rng=makeRng(20260427);
    for(let s=0;s<3;s++) for(let i=0;i<T2.length;i++) for(let j=0;j<T2.length;j++){
      if(i===j) continue; if(((i*13+j*7+s)%6)!==0) continue;
      const res=simGame(T2[j],T2[i],{rng,innings:7,
        awayLineup:aiLineup(T2[i]),awayRotation:aiRotation(T2[i]),
        homeLineup:aiLineup(T2[j]),homeRotation:aiRotation(T2[j])});
      [[T2[i],res.away],[T2[j],res.home]].forEach(function(pr){
        const tm=pr[0], side=pr[1];
        G++; RUNS+=side.runs;
        tm.players.forEach(function(p){const b=res.box[p.id]; if(!b)return;
          PA+=b.pa||0; for(const k in a) a[k]+=b[k]||0; E+=b.e||0; if(b.pa)FG++;});
        tm.pitchers.forEach(function(q){const pb=res.pbox[q.id]; if(!pb)return;
          OUT+=pb.outs||0; ER+=pb.er||0; RA+=pb.r||0;});
      });
    }
    const agg={pa:PA,ab:a.ab,h:a.h,d2:a.d2,d3:a.d3,hr:a.hr,bb:a.bb,hbp:a.hbp,sb:a.sb,cs:a.cs};
    return {G,PA,OUT, rpa:RUNS/PA, lwpa:batRunsRaw(agg)/PA, ero:ER/OUT, rao:RA/OUT,
      ePerG:E/FG, rpg:RUNS/G};
  })()`);
  console.log(`   ${M.G}팀-경기 · ${M.PA}타석 · 팀당 ${M.rpg.toFixed(2)}득점`);

  /* ① 선형 가중치가 리그 득점을 재현하나 — WAR 전체가 여기 얹혀 있다 */
  const lwErr=Math.abs(M.lwpa/M.rpa-1)*100;
  T('선형 가중치가 리그 득점을 재현한다', ()=>
    lwErr<3 && `가중치 ${M.lwpa.toFixed(4)} vs 실제 ${M.rpa.toFixed(4)} 득점/타석 (오차 ${lwErr.toFixed(2)}%)`);

  /* ② 승리당 득점 — 실측 득점에서 다시 역산 */
  const x=Math.pow(M.rpg*2,0.287), rpw=4*M.rpg/x;
  const RPW=ev('WAR_RPW');
  T('승리당 득점(RPW)이 실측과 맞는다', ()=>
    Math.abs(rpw-RPW)<1.5 && `실측 ${rpw.toFixed(2)} vs 박아둔 값 ${RPW}`);
  T('MLB 상수를 그대로 쓰지 않았다', ()=>
    RPW>13 && `${RPW} — 9.5득점 리그라 10점당 1승이 아니다`);

  /* ③ 리그 평균 자책·실책률 */
  const ERO=ev('WAR_LG_FALLBACK.ero'), EPG=ev('WAR_LG_FALLBACK.ePerG');
  T('리그 평균 자책/아웃 기본값이 맞는다', ()=>
    Math.abs(M.ero-ERO)/ERO<0.12 && `실측 ${M.ero.toFixed(4)} vs 기본값 ${ERO}`);
  T('리그 평균 실책률 기본값이 맞는다', ()=>
    Math.abs(M.ePerG-EPG)/EPG<0.25 && `실측 ${M.ePerG.toFixed(4)} vs 기본값 ${EPG}`);
  T('비자책 비중이 무시 못 할 크기다 (투수를 자책으로 재는 이유)', ()=>{
    const share=(1-M.ero/M.rao)*100;
    return share>10 && `실점의 ${share.toFixed(1)}% 가 비자책`;
  });

  console.log('\n[한 시즌 돌려서]');
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300); ev("ST.tutDone=true");
  ev(`(function(){ for(var i=0;i<40;i++){
    if(ST.round>=ST.schedule.length||ST.seasonOver)break;
    runWeek(); ST.weekDone=true; ST.announced=true; ST.lineupDirty=false;
    if(ST.events&&ST.events.length)ST.events=[]; ST.absent={};
    var L=makeLive(); var k=0; while(!L.over&&k++<3000){L.pending=null;L.step();}
    L.finish(); var n=ST.schedule[ST.round]; if(!n)break;
    var r=L.result; var us=n.homeGame?r.home:r.away, th=n.homeGame?r.away:r.home;
    LIVE=L; commitGame(r,us,th,us.slots); if(ST.seasonOver)break; } })()`);

  const S=ev(`(function(){
    const L=leagueWoba(), E=leagueEra();
    const rows=TBYID['wwzw'].players.map(function(p){
      const f=warFull(p.id,L,E);
      return {n:p.name,bat:f.bat,def:f.def,pit:f.pit,tot:f.total,
              pa:f.pa,outs:f.outs,thin:f.thin};
    });
    let wrcSum=0,wrcN=0;
    Object.keys(ST.lgBat).forEach(function(id){const b=ST.lgBat[id];
      if(b.pa>=25){wrcSum+=wrcPlus(b,L);wrcN++;}});
    const st=ST.stand['wwzw'];
    return {rows, lgWrc:wrcSum/wrcN, lgRpa:L.rpa, era:E,
      wins:st.w+(st.t||0)*0.5, g:st.g,
      sum:rows.reduce(function(a,r){return a+r.tot},0)};
  })()`);

  T('리그 평균 wRC+ 가 100 근처다', ()=>
    Math.abs(S.lgWrc-100)<8 && `${S.lgWrc.toFixed(1)}`);
  T('리그 평균 득점/타석이 실측과 맞는다', ()=>
    Math.abs(S.lgRpa-M.rpa)/M.rpa<0.12 && `${S.lgRpa.toFixed(4)} vs ${M.rpa.toFixed(4)}`);
  T('타격+수비+투구 = 합계', ()=>
    S.rows.every(r=>Math.abs((r.bat+r.def+r.pit)-r.tot)<1e-9) && '전원 일치');
  T('전부 유한값', ()=>S.rows.every(r=>Number.isFinite(r.tot)) && `${S.rows.length}명`);
  T('안 던진 사람은 투구 WAR 이 0', ()=>
    S.rows.every(r=>r.outs>0||r.pit===0) && '이닝 없으면 0');
  /* 투타 겸업이 실제로 둘 다 잡히나 — 이게 이번 요청의 핵심이다 */
  const two=S.rows.filter(r=>r.pa>0&&r.outs>0);
  T('투타 겸업은 타격·투구가 따로 잡히고 합쳐진다', ()=>
    two.length>0 && two.every(r=>Math.abs(r.tot-(r.bat+r.def+r.pit))<1e-9)
    && two.map(r=>`${r.n} 타격${r.bat.toFixed(2)}+투구${r.pit.toFixed(2)}=${r.tot.toFixed(2)}`).join(' / '));

  /* ④ 스케일 — 대체수준 팀이 22경기에서 몇 승 자리인가.
     한 시즌은 표본이 얇아 범위를 넓게 잡는다. 10시즌 평균은 5.1승이었다. */
  const replW=(S.wins-S.sum)/S.g*22;
  T('대체수준 팀 승수가 그럴듯한 자리다', ()=>
    replW>1 && replW<10 &&
    `우리 ${S.wins}승 − WAR합 ${S.sum.toFixed(2)} → 22경기 환산 ${replW.toFixed(1)}승`);

  console.log('\n[화면]');
  ev("squadSort='war'"); w.go('squad'); await wait(120);
  const txt=()=>d.getElementById('view').textContent;
  T('WAR 판이 뜬다', ()=>/WAR — 몇 승을 보탰나/.test(txt()) && '있음');
  T('타격·수비·투구가 칸으로 갈려 있다', ()=>{
    const th=[...d.querySelectorAll('#view .warboard th')].map(x=>x.textContent);
    return ['타격','수비','투구','합계','표본'].every(k=>th.includes(k)) && th.join(' ');
  });
  T('표본(타석·이닝)을 같이 보여준다', ()=>/\d+타석/.test(txt()) && /\d+\.\d이닝/.test(txt()) && '타석·이닝 둘 다');
  T('대체수준이 무엇인지 화면에 적혀 있다', ()=>/대체선수/.test(txt()) && '설명 있음');
  T('undefined·NaN 없음', ()=>!/undefined|NaN/.test(txt()) && '깨끗');

  console.log(errs.length? '\n❌ '+errs.length+'개 실패' : '\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
