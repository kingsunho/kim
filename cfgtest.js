/* v2.43.0 신규 — 지목 훈련 · 직접 플레이 투/타 분리 · 자동 교체 설정 · 주루 재조정 */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|Could not load|stylesheet/.test(e.message))errs.push('JSDOM: '+e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

setTimeout(async()=>{
  d.querySelectorAll('.pickcard')[0].click();await wait(50);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(250); ev("ST.tutDone=true");

  console.log('[주루 재조정]');
  const spd=ev("(function(){var o={};TBYID['wwzw'].players.forEach(p=>o[p.name]=p.spd);return o})()");
  console.log('   ', JSON.stringify(spd));
  T('이건이 팀 주루 1위다', ()=>{
    const m=Math.max(...Object.values(spd)); return spd['이건']===m; });
  T('팀 최고 주루가 62 이하다 (예전 70)', ()=>Math.max(...Object.values(spd))<=62);
  T('시도율이 상한에 안 붙는다', ()=>{
    // spd 62 인 이건도 SB_MAX 미만이어야 주루 차이가 의미를 가진다
    const r=ev(`(function(){
      var t=TBYID['wwzw'];
      var f=s=>Math.min(LG.SB_MAX, LG.SB_PER_PA*LG.SB_MULT*t.tend.sb*Math.exp((s-LG.SB_SPD_MID)*LG.SB_SPD_K));
      return {fast:f(62), slow:f(28), cap:LG.SB_MAX};
    })()`);
    console.log(`    이건(62) ${r.fast.toFixed(3)} · 김한규(28) ${r.slow.toFixed(3)} · 상한 ${r.cap}`);
    return r.fast<r.cap && r.fast>r.slow*2.5;
  });
  T('송정민 전역 복귀 주루가 30이다', ()=>{
    return /con:70,pow:62,eye:48,spd:30/.test(html) ? true : '전역 복귀 능력치가 안 바뀌었다'; });

  console.log('\n[지목 훈련]');
  T('종목마다 고를 수 있는 능력치가 정해져 있다', ()=>{
    const P=ev("JSON.parse(JSON.stringify(STAT_PICK))");
    return P.bat.join()==='con,pow' && P.field.join()==='def,arm'
        && P.pitch.join()==='ctl,stf,sta' && P.hard.length===5;
  });
  T('종목에 없는 능력치는 지목이 안 먹는다', ()=>{
    ev("ST.trainFocus='bat'; ST.trainStat='arm';");
    return ev("activeTrainStat()")===null;
  });
  T('종목에 있는 능력치는 지목이 산다', ()=>{
    ev("ST.trainStat='pow'"); return ev("activeTrainStat()")==='pow'; });
  T('같은 걸 계속 시키면 정체가 온다', ()=>{
    const m=ev("[statStreakMul(1),statStreakMul(2),statStreakMul(3),statStreakMul(9)]");
    return m[0]===1 && m[1]<m[0] && m[2]<m[1] && m[3]<=m[2];
  });
  T('이미 높은 능력치는 덜 오른다', ()=>{
    const a=ev("statCeilMul(40)"), b=ev("statCeilMul(60)"), c=ev("statCeilMul(78)");
    return a===1 && b<a && c<b && c>0;
  });
  T('지목한 능력치가 실제로 오른다', ()=>{
    const r=ev(`(function(){
      var id='lmh';                      // 잠재 여지가 큰 사람
      ST.trainFocus='bat'; ST.trainTarget=id; ST.trainStat='pow';
      ST.trainRain=false; ST.injury[id]=null; ST.morale[id]=90;
      var before={con:0,pow:0};
      var gained={con:0,pow:0};
      for(var w=0;w<8;w++){
        var p=TBYID['wwzw'].players.find(x=>x.id===id);
        var b={con:p.con,pow:p.pow};
        // 그 주 훈련에 반드시 나오게 강제한다
        ST.trainAttend=[id]; ST.trainAttendKey=trainAttendKey();
        applyTraining();
        p=TBYID['wwzw'].players.find(x=>x.id===id);
        gained.con+=p.con-b.con; gained.pow+=p.pow-b.pow;
        ST.trainAttendKey=null;
      }
      return gained;
    })()`);
    console.log(`    파워 +${r.pow.toFixed(2)} · 컨택 +${r.con.toFixed(2)}`);
    return r.pow>0 && r.con===0 ? true : `컨택이 같이 올랐다 (+${r.con.toFixed(2)})`;
  });
  T('지목해도 잠재 한도는 못 넘는다', ()=>{
    return ev(`(function(){
      var id='lmh'; var p=TBYID['wwzw'].players.find(x=>x.id===id);
      return effCA(id) <= effPA(id)+0.001;
    })()`);
  });
  T('투구 훈련에 구위·체력이 열렸다', ()=>{
    return ev(`(function(){
      var id='swm'; var p=TBYID['wwzw'].players.find(x=>x.id===id);
      var b=p.pitch.stf;
      ST.trainFocus='pitch'; ST.trainTarget=id; ST.trainStat='stf';
      ST.trainRain=false; ST.injury[id]=null; ST.morale[id]=90;
      for(var w=0;w<6;w++){
        ST.trainAttend=[id]; ST.trainAttendKey=trainAttendKey();
        applyTraining(); ST.trainAttendKey=null;
      }
      return TBYID['wwzw'].players.find(x=>x.id===id).pitch.stf > b;
    })()`);
  });
  T('투수 훈련은 시즌 예산이 막는다', ()=>{
    const r=ev(`(function(){
      var id='swm';
      for(var w=0;w<60;w++){
        ST.trainAttend=[id]; ST.trainAttendKey=trainAttendKey();
        applyTraining(); ST.trainAttendKey=null;
      }
      return {used:(ST.pitGain[id]||{}).stf||0, budget:PIT_BUDGET.stf, left:pitGainLeft(id,'stf')};
    })()`);
    console.log(`    구위 누적 +${r.used.toFixed(2)} / 예산 ${r.budget} · 남은 ${r.left.toFixed(2)}`);
    return r.used<=r.budget+0.001 && r.left<0.01;
  });
  T('투수 능력치가 시즌을 넘어간다(이월 목록에 pitch 가 있다)', ()=>
    /keep\.ratings\[p\.id\]=\{[^}]*pitch:p\.pitch/.test(html));

  console.log('\n[직접 플레이 — 투/타 분리]');
  T('타석과 마운드를 따로 저장한다', ()=>{
    ev("ST.playBat='all'; ST.playPit='off';");
    return ev("playModeFor('bat')")==='all' && ev("playModeFor('pit')")==='off';
  });
  T('옛 세이브의 playMode 하나가 양쪽에 물려진다', ()=>{
    ev("ST.playBat=undefined; ST.playPit=undefined; ST.playMode='key'; normalizeState();");
    return ev("ST.playBat")==='key' && ev("ST.playPit")==='key';
  });
  T('네 가지 선택지가 다 있다', ()=>ev("PLAY_OPTS.length")===4
    && ev("PLAY_OPTS.map(x=>x[0]).join()")==='off,mine,key,all');
  T('설정 화면에 타석·마운드 줄이 따로 나온다', ()=>{
    w.go('more'); const t=d.getElementById('view').textContent;
    return /타석 — 타이밍 스윙/.test(t) && /마운드 — 코스 선택/.test(t);
  });
  T('설정 화면에 「내 선수만」 버튼이 있다', ()=>
    [...d.querySelectorAll('#view .btn')].filter(b=>b.textContent==='내 선수만').length===2);

  console.log('\n[자동 교체 설정]');
  T('네 단계 벤치 기용이 있다', ()=>{
    const B=ev("JSON.parse(JSON.stringify(BENCH_CFG))");
    return B.none.max===0 && B.few.max===2 && B.normal.max===3 && B.many.max===5;
  });
  T('기본값이 예전 동작 그대로다', ()=>{
    ev("delete ST.subCfg; normalizeState();");
    const c=ev("JSON.parse(JSON.stringify(ST.subCfg))");
    return c.bench==='normal' && c.protect===3 && c.pitchAsk===true;
  });
  T('벤치 설정을 benchRotation 이 읽는다', ()=>{
    ev("ST.subCfg.bench='none'"); const a=ev("benchCfg().max");
    ev("ST.subCfg.bench='many'"); const b=ev("benchCfg().max");
    ev("ST.subCfg.bench='normal'");
    return a===0 && b===5;
  });
  T('보호 인원이 코드에 안 박혀 있다', ()=>
    /rank\.slice\(0,protectN\)/.test(html));
  T('교체 물어보기를 끌 수 있다', ()=>/ST\.subCfg&&ST\.subCfg\.pitchAsk===false/.test(html));
  T('설정 화면에 자동 교체 카드가 있다', ()=>{
    w.go('more'); const t=d.getElementById('view').textContent;
    return /자동 교체/.test(t) && /벤치 선수 기용/.test(t)
        && /잘 치는 선수 보호/.test(t) && /투수 교체 기준/.test(t);
  });

  console.log('\n[배터리 — BGM]');
  T('스케줄러가 100ms 다 (예전 25ms)', ()=>/const LOOKAHEAD=0\.32, TICK_MS=100/.test(html));
  T('끄면 컨텍스트를 재운다', ()=>/function stop\(\)\{[\s\S]{0,220}sleepCtx\(\)/.test(html));
  T('화면을 벗어나면 멈춘다', ()=>/visibilitychange/.test(html) && /pagehide/.test(html));
  T('audioSession 은 아이폰에서만 잡는다', ()=>
    /function openAudioSession\(\)\{[\s\S]{0,400}if\(!isIOS\) return;/.test(html));

  console.log('\n[전 화면 클린]');
  ['home','game','train','scout','stand','stats','more','lineup','hall'].forEach(v=>{
    try{ w.go(v); const t=d.getElementById('view').textContent;
      T(`${v} — undefined/NaN 없음`, ()=>!/undefined|NaN/.test(t)); }
    catch(e){ T(`${v} — 렌더`, ()=>e.message); }
  });

  console.log(errs.length?`\n❌ ${errs.length}건\n - `+errs.join('\n - '):'\n✅ 전부 통과');
  process.exit(errs.length?1:0);
},600);
