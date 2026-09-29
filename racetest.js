/* 배트 커서 · 주루 경주 · 스타트 경주 도루 · 타자 크기 — v3.49.0
   [요청] "타격할때도 조이스틱으로 배트모양 나오게 해서 그 공 따라가서 치는데"
          "공이랑 사람이랑 동시에 오면 세잎일때가 있고 아웃일때가 있냐"
          "도루 시스템도 역대급 노잼이야 더쇼 스타일로 바꿔"
          "타자가 너무 크게 나옴"

   확인하는 것
     · resolveStretch 가 화면이 잰 경주 결과(force)를 **그대로** 쓴다 — 주사위 안 굴린다
     · livePlay 가 주자 도착(rA) · 송구 도착(bA) 을 재고 먼저 닿은 쪽으로 넘긴다
     · 도루 — 엔진이 _stealForce 를 쓰고, 경주로 난 아웃엔 오심 문구를 안 붙인다
     · 1루에서 「▸ 뛴다」 는 스타트 경주(stealChase)로 간다
     · 배트 커서 — 조이스틱을 쓰면 커서 자리로 친다 · 가로로 긴 판정 · 좌타 거울 보정
     · 타자 그림 84                                                                 */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const bad=[]; const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Could not load|stylesheet|[Nn]ot implemented|getContext/.test(e.message)) bad.push('JSDOM: '+e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc,
  beforeParse(w){ w.scrollTo=()=>{}; w.TextEncoder=TextEncoder; w.TextDecoder=TextDecoder; }});
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0&&!/^!/.test(r));
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r.replace(/^!/,''):''));if(!ok)bad.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);bad.push(n+': '+e.message)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(40);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click(); await wait(250);
  ev("ST.tutDone=true; ST.mode='player'; ST.role='bat'; LIVE=makeLive(); LIVE.manual=true;");

  console.log('[주루 — 먼저 닿은 쪽이 이긴다]');
  const stretch=(force)=>ev(`(function(){
    var side=LIVE.sides[LIVE.half], bat=side.slots[0].id;
    LIVE.bases=[bat,null,null]; LIVE.outs=0;
    LIVE._stretchOffer={hit:'1B', batId:bat, pitId:LIVE.curPitcher(LIVE.def()).id, half:LIVE.half, name:'x', defTeam:LIVE.def().team, foe:'safe'};
    var r=LIVE.resolveStretch(true, 0.9, ${force});
    return JSON.stringify({ok:r.ok, b:LIVE.bases.slice(), o:LIVE.outs});
  })()`);
  T('force=true 면 위험이 커도 세이프', ()=>{ const r=JSON.parse(stretch('true')); return r.ok&&r.b[1] ? '2루' : '!'+JSON.stringify(r); });
  T('force=false 면 아웃', ()=>{ const r=JSON.parse(stretch('false')); return !r.ok&&r.o===1 ? '2루에서 아웃' : '!'+JSON.stringify(r); });
  T('force 가 없으면 예전처럼 굴린다(자동)', ()=>/typeof force==='boolean'\) \? force/.test(ev("String(LiveGame.prototype.resolveStretch)")));
  const lp=ev("String(livePlay)");
  T('livePlay — 주자 도착(rA) · 송구 도착(bA) · 태그', ()=>/const R0=2150, TAG=70;/.test(lp) && /rA < bA\+TAG/.test(lp) ? '먼저 닿은 쪽' : '!');
  T('livePlay — 멈췄다 다시 뛰면 손해(0.18초)', ()=>/\+180\);/.test(lp));
  T('livePlay — 슬라이딩이 주자 시각을 바꾼다', ()=>/adjMs = q>0 \? -110\*q : 30/.test(lp));
  T('showRun 이 경주 결과를 엔진에 넘긴다', ()=>/LIVE\.resolveStretch\(go,risk,force\)/.test(html));

  console.log('\n[도루 — 스타트 경주]');
  T('stealChase 가 있다(한 번만 선언)', ()=>(html.match(/^function stealChase\(/mg)||[]).length===1);
  const sc=ev("String(stealChase)");
  T('스타트 등급 — 발 드는 순간과의 차이', ()=>/dj<=100/.test(sc) && /dj<=250/.test(sc) && /너무 일찍|early/.test(sc));
  T('경주 — 리드 · 발 · 반응 대 투구 1.40초 + 팝타임', ()=>/27\.4-leadM-0\.9/.test(sc) && /1\.40\+2\.30/.test(sc));
  T('크게 나가면 가끔 발 드는 척 견제', ()=>/const fake=\(o\.lead>=2\) && rnd\(\)<0\.20/.test(sc));
  T('1루에서 「▸ 뛴다」 → 스타트 경주', ()=>/if\(base1\) startChase\(\); else fin\('run:go'/.test(html));
  T('엔진이 경주 결과를 쓴다(_stealForce)', ()=>/const okSB=forcedSB \? !!this\._stealForce : \(rng\(\)<su\)/.test(html));
  T('경주로 난 아웃엔 「오심」 문구가 안 붙는다', ()=>/if\(off\.isUser && !forcedSB\) this\.maybeBadCall\('2루 도루 접전'\)/.test(html));
  T('경주로 뛴 공은 타자가 안 친다', ()=>/this\._runPlan0go && this\._stealForce==null && rng\(\)<0\.38/.test(html));
  T('도루 한 번 쓰고 비운다', ()=>/LIVE\._stealForce=null;          \/\/ 경주 결과는 이 도루 한 번에만/.test(html));

  console.log('\n[배트 커서]');
  T('조이스틱을 쓰면 커서 자리로 친다', ()=>/if\(pcUsed\)\{ judge\(\{t, x:pcX, y:pcY, pci:true\}\)/.test(html));
  T('안 쓰면 예전처럼 반쯤 따라간다', ()=>/judge\(\{t, x:1\+\(inx-1\)\*0\.55, y:1\+\(iny-1\)\*0\.55\}\)/.test(html));
  T('커서는 가로로 길다 — 세로 거리 ×1.25', ()=>/tap\.pci \? Math\.hypot\(tap\.x-bx, \(tap\.y-by\)\*1\.25\)/.test(html));
  T('좌타 · 뒤집힌 카메라 — 누른 자리 거울 보정', ()=>/\/sx\*zSideNow\(\)/.test(html));
  T('스윙 뒤 타이밍 · 배트 중심 숫자', ()=>/<b>타이밍<\/b>/.test(html) && /<b>배트 중심<\/b>/.test(html));
  T('타석 조이스틱도 아이폰 touchstart 를 막는다', ()=>/bjoy\.addEventListener\('touchstart'/.test(html));

  console.log('\n[타자 크기]');
  T('타자 그림 84(화면 42%)', ()=>ev("MV_FIG_H.bat")===84);

  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
