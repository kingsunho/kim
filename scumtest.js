/* [2.40.0] 새로고침·다시 누르기로 결과를 다시 굴리는 걸 막았는지 검사한다.

   [제보] "새로고침 하면 못 온다고 하는 사람 바뀜.
           새로고침을 이용해서 이길 때까지 돌리는 게 가능해요"

   원인이 셋이었다.
   ① buildKakaoPre 가 Math.random 으로 번복 불참을 굴렸다 — 다시 부르면 다시 뽑혔다
   ② 라인업 화면의 '카톡 발표' 버튼에 발표 잠금이 없었다 (카톡 화면 쪽에만 있었다)
   ③ makeLive 가 Date.now() 로 시드를 깔았다 — LIVE 는 저장을 안 하니까
      경기 도중 새로고침하면 완전히 다른 경기가 나왔다
   ④ 경기 화면에 잠금 없는 '사정해본다' 가 한 벌 더 있었다               */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const bad=[], jsErr=[];
const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Could not load|stylesheet|Not implemented/.test(e.message)) jsErr.push('JSDOM: '+e.message.split('\n')[0]); });
let CLOCK=0;
function P(v){return {value:v,setValueAtTime(){return this},linearRampToValueAtTime(){return this},exponentialRampToValueAtTime(){return this},setTargetAtTime(){return this},cancelScheduledValues(){return this}};}
function nd(e){return Object.assign({connect(){},disconnect(){}},e||{});}
class FakeAC{constructor(){this.sampleRate=44100;this.state='running';this.destination=nd();}
 get currentTime(){return CLOCK+=0.02;} resume(){return Promise.resolve();}
 createGain(){return nd({gain:P(1)});} createBiquadFilter(){return nd({type:'',frequency:P(1),Q:P(1),gain:P(0)});}
 createDynamicsCompressor(){return nd({threshold:P(0),knee:P(0),ratio:P(1),attack:P(0),release:P(0)});}
 createStereoPanner(){return nd({pan:P(0)});} createWaveShaper(){return nd({curve:null,oversample:''});}
 createOscillator(){return nd({type:'',frequency:P(1),detune:P(0),start(){},stop(){}});}
 createBuffer(c,l,s){return{length:l,sampleRate:s,getChannelData:()=>new Float32Array(l)};}
 createBufferSource(){return nd({buffer:null,start(){},stop(){}});}}
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',
  virtualConsole:vc, beforeParse(w){ w.AudioContext=FakeAC; w.scrollTo=()=>{};
    w.TextEncoder=TextEncoder; w.TextDecoder=TextDecoder; }});
const w=dom.window,d=w.document,ev=s=>w.eval(s);
w.confirm=()=>true;
process.on('unhandledRejection',e=>jsErr.push('REJECT: '+String(e).slice(0,120)));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0&&!/^!/.test(r));
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r.replace(/^!/,''):''));if(!ok)bad.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);bad.push(n+': '+e.message)}};

(async()=>{
  await wait(700);
  d.dispatchEvent(new w.Event('pointerdown'));
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300);
  ev("ST.tutDone=true"); w.go('home'); await wait(80);
  // 주간을 연다
  for(let i=0;i<4;i++){
    w.go('home'); await wait(80);
    const wk=[...d.querySelectorAll('#view .btn')].find(x=>/이번 주 시작/.test(x.textContent));
    if(wk){ wk.click(); await wait(140); break; }
  }
  ev("ST.lineup=recommendLineup(); applyDHRule();");

  console.log('\n[번복 불참 다시 굴리기]');
  /* 같은 주 상태에서 발표를 두 번 굴려서 명단이 같은지 본다.
     ST 를 통째로 되돌려 놓고 다시 부른다 — 새로고침한 것과 같은 조건이다 */
  /* 아무도 안 빠지는 주면 '늘 같다' 가 우연히 통과한다.
     실제로 빠지는 사람이 나오는 주를 먼저 찾아서 거기서 검사한다 */
  let snap=ev("JSON.stringify(ST)");
  const rollWith=(sn)=>{ ev("ST=JSON.parse("+JSON.stringify(sn)+"); normalizeState();");
    ev("buildKakaoPre(ST)"); return ev("JSON.stringify((ST.dropouts||[]).slice().sort())"); };
  for(let k=0;k<40;k++){
    ev("ST=JSON.parse("+JSON.stringify(snap)+"); ST.weekSeq="+(200+k)+";");
    const cand=ev("JSON.stringify(ST)");
    if(JSON.parse(rollWith(cand)).length>0){ snap=cand; break; }
  }
  const roll=()=>rollWith(snap);
  const a=roll(), b=roll(), c2=roll();
  T('발표를 다시 굴려도 못 온다는 사람이 같다', ()=>
    (a===b&&b===c2) ? '세 번 다 '+(JSON.parse(a).length?JSON.parse(a).join(','):'없음')
                    : '!'+a+' / '+b+' / '+c2);
  /* 다른 주면 달라져야 한다 — 아예 굳어버리면 그것도 곤란하다 */
  ev("ST=JSON.parse("+JSON.stringify(snap)+"); normalizeState();");
  const seeds=new Set();
  for(let k=0;k<12;k++){
    ev("ST=JSON.parse("+JSON.stringify(snap)+"); normalizeState(); ST.weekSeq="+(50+k)+";");
    ev("buildKakaoPre(ST)");
    seeds.add(ev("JSON.stringify((ST.dropouts||[]).slice().sort())"));
  }
  T('주가 다르면 명단도 달라진다', ()=> seeds.size>=2 ? seeds.size+'가지' : '!늘 같은 사람만 빠진다');
  ev("ST=JSON.parse("+JSON.stringify(snap)+"); normalizeState();");

  console.log('\n[발표 버튼 잠금]');
  ev("ST.announced=false; ST.dropouts=[];");
  w.go('lineup'); await wait(90);
  const findBtn=(re)=>[...d.querySelectorAll('#view button')].find(x=>re.test(x.textContent));
  T('발표 전에는 발표 버튼이 있다', ()=> !!findBtn(/^카톡 발표$/));
  findBtn(/^카톡 발표$/).click(); await wait(120);
  const after=ev("JSON.stringify((ST.dropouts||[]).slice().sort())");
  /* 번복 불참이 나오면 '라인업 확정' 이 그 자리를 차지한다 — 그것도 못 굴리는
     상태지만, 여기서 보려는 건 발표 잠금이라 확정까지 마친 뒤에 본다 */
  ev("ST.lineupDirty=false;");
  w.go('lineup'); await wait(90);
  T('발표 뒤에는 발표 버튼이 없다', ()=>
    !findBtn(/^카톡 발표$/) ? '카톡방 열기로 바뀐다' : '!아직 다시 누를 수 있다');
  const again=findBtn(/카톡방 열기/);
  T('그 자리 버튼을 눌러도 다시 안 굴린다', ()=>{
    if(!again) return '!버튼이 없다';
    again.click();
    return ev("JSON.stringify((ST.dropouts||[]).slice().sort())")===after
      ? '명단 그대로' : '!다시 굴렸다';
  });
  w.go('kakao'); await wait(90);
  T('카톡 화면에도 발표 버튼이 없다', ()=>
    ![...d.querySelectorAll('#view button')].some(x=>/^라인업 발표$/.test(x.textContent))
      ? '이미 발표함' : '!다시 누를 수 있다');

  console.log('\n[경기 다시 굴리기]');
  const stream=()=>{ const L=ev("makeLive()"); const o=[]; for(let i=0;i<8;i++)o.push(L.rng().toFixed(6)); return o.join(','); };
  const s1=stream(); await wait(40); const s2=stream();
  T('경기 난수가 시계를 안 탄다', ()=> s1===s2 ? '40ms 뒤에도 같은 공' : '!새로고침하면 다른 경기가 된다');
  const before=ev("ST.weekSeq");
  ev("ST.weekSeq="+(before+1));
  const s3=stream();
  ev("ST.weekSeq="+before);
  T('주가 바뀌면 경기도 바뀐다', ()=> s3!==s1 ? '다른 공' : '!우취 재경기가 늘 똑같다');

  console.log('\n[사정해본다 잠금]');
  /* 라인업에 든 사람을 빼야 '인원 부족' 경로로 들어간다.
     벤치 인원만 빼면 자동 보충으로 조용히 넘어가서 버튼이 안 뜬다 */
  ev("ST.absent={}; ST.begAsked={}; ST.injury={};"
     +"ST.lineup.slice(0,7).forEach(s=>ST.absent[s.id]='개인 사정');");
  ev("ST.announced=true; ST.lineupDirty=false;"
     +"ST.events=(ST.events||[]).filter(e=>e.type!=='rain'&&e.type!=='postpone');");
  w.go('game'); await wait(120);
  const begs=[...d.querySelectorAll('#view button')].filter(x=>/사정해본다/.test(x.textContent));
  T('경기 화면 사정 버튼이 한 개다', ()=> begs.length===1 ? '1개' : '!'+begs.length+'개 (잠금 없는 옛 판이 남아 있다)');
  T('사정 버튼에 남은 인원이 붙는다', ()=> begs.length&&/\d+명 남음/.test(begs[0].textContent)
      ? begs[0].textContent : '!'+(begs[0]&&begs[0].textContent));
  let asked=0;
  for(let i=0;i<12;i++){
    w.go('game'); await wait(90);
    const bb=[...d.querySelectorAll('#view button')].find(x=>/사정해본다/.test(x.textContent));
    if(!bb||bb.disabled) break;
    bb.click(); await wait(90); asked++;
  }
  T('한 사람당 한 번만 물어본다', ()=>
    asked<=7 ? asked+'번 물어보고 멈췄다' : '!무한히 다시 굴릴 수 있다 ('+asked+'번)');

  T('돌리는 동안 에러 없음', ()=> jsErr.length===0 ? '깨끗' : '!'+jsErr[0]);
  console.log(bad.length? '\n❌ '+bad.length+'개 실패' : '\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
