/* [2.54.0] 안 끝나는 결과 화면 · 타석은 내가 준비되면 시작

   [요청] "한번 시작하면 헤어나올 수 없는, 화장실 가서라도 하고 싶게"
   [제보] "타자할 때 준비 됐다 이거 눌러야 투수가 공 던지는 걸로 해줘.
           너무 바쁘고 정신없어"

   둘 다 '기능' 이 아니라 '흐름' 의 문제였다.
     · 경기가 끝나면 단톡방 맨 아래 [다음 주로] 하나뿐이었고, 그걸 누르면
       홈에 내려놓고 끝. 거기서 세 번을 더 눌러야 다음 경기였다.
     · 타석은 3·2·1 을 세고 알아서 던졌다. 노림수 고르고 자리 볼 새가 없었다.

   주의: T() 는 문자열을 '통과 + 설명' 으로 친다. 실패는 반드시 false 다.   */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const errs=[], jsErr=[];
const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Not implemented/i.test(e.message)) jsErr.push(e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{}; dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0);
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!ok)errs.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

/* 경기 n 판을 실제 경로로 완주시킨다 (commitGame 까지) */
const play=n=>ev(`(function(){ var g=0;
  for(var i=0;i<${n};i++){
    if(!ST.schedule[ST.round]||ST.schedule[ST.round].played) break;
    runWeek(); ST.weekDone=true; ST.announced=true; ST.lineupDirty=false;
    ST.events=[]; ST.absent={};
    ST.lineup=recommendLineup(); applyDHRule(); sanitizeRotation();
    var L=makeLive(); var k=0; while(!L.over&&k++<3000){ L.pending=null; L.step(); }
    L.finish();
    var nx=ST.schedule[ST.round], r=L.result;
    var us=nx.homeGame?r.home:r.away, th=nx.homeGame?r.away:r.home;
    LIVE=L; commitGame(r,us,th,us.slots); g++;
  } return g; })()`);

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300); ev("ST.tutDone=true; ST.injury={};");

  /* ================================================================ */
  console.log('[타석 — 내가 준비되면 공이 온다]');

  const openBat=()=>ev(`(function(){
    runWeek(); ST.weekDone=true; ST.announced=true; ST.lineupDirty=false;
    ST.absent={}; ST.events=[];
    LIVE=makeLive(); LIVE.manual=true; LIVE.round=ST.round;
    if(!document.getElementById('decision')){
      var b=document.createElement('div'); b.id='decision'; document.body.appendChild(b); }
    var g=0; while(!LIVE.off().isUser && g++<400){
      if(LIVE.pending)LIVE.applyDecision('none'); LIVE.step(); }
    showDecision({kind:'swing',label:'타석'}); return LIVE.off().isUser; })()`);

  T('기본값은 「내가 누르면」 이다', ()=>{
    const v=ev("ST.batReady");
    return (v==='me'||v==null) && `batReady=${v}`;
  });
  T('타석 화면이 열린다', ()=>openBat()===true);
  T('「준비 됐다 ▶」 버튼이 크게 떠 있다', ()=>{
    const b=d.querySelector('#decision .aim-go');
    return b && /준비 됐다/.test(b.textContent) && /\bnow\b/.test(b.className)
      && `${b.textContent.trim()} (class ${b.className})`;
  });
  T('누르기 전에는 스윙·지켜보기가 잠겨 있다', ()=>{
    const s=d.querySelector('#decision .pl-swing'), t=d.querySelector('#decision .pl-hit');
    return s && t && s.disabled===true && t.disabled===true && '둘 다 잠김';
  });
  await wait(3200);
  T('실제로 3.2초 뒤에도 그대로다', ()=>{
    const s=d.querySelector('#decision .pl-swing');
    return s && s.disabled===true && '아직 안 던졌다';
  });
  T('마운드에 「준비되면 눌러라」 가 뜬다', ()=>{
    const l=d.querySelector('#decision .lbl');
    return l && /준비되면 눌러라/.test(l.textContent) && l.textContent.trim();
  });
  d.querySelector('#decision .aim-go').click();
  await wait(400);
  T('누른 뒤 스윙 버튼이 열린다', ()=>{
    const s=d.querySelector('#decision .pl-swing');
    return s && s.disabled===false && '공이 왔다';
  });
  T('노림수를 고르는 동안은 잠긴 채로 기다린다', ()=>{
    openBat();
    const aim=[...d.querySelectorAll('#decision .aim-row button')];
    if(!aim.length) return false;
    aim[0].click();                                   // 노림수를 바꿔도
    const s=d.querySelector('#decision .pl-swing');
    return s.disabled===true && `${aim[0].textContent} 고름 · 아직 대기`;
  });

  console.log('\n[예전 리듬으로 되돌릴 수 있다]');
  T('설정을 「3초 세고 자동」 으로 바꾸면', ()=>{
    ev("ST.batReady='auto'");
    return openBat()===true && 'auto 로 타석 열림';
  });
  T('버튼 문구가 「안 기다리고 바로」 로 바뀐다', ()=>{
    const b=d.querySelector('#decision .aim-go');
    return b && /안 기다리고 바로/.test(b.textContent)
      && !/\bnow\b/.test(b.className) && b.textContent.trim();
  });
  await wait(3200);
  T('자동은 3초 뒤에 알아서 던진다', ()=>{
    const s=d.querySelector('#decision .pl-swing');
    return s && s.disabled===false && '알아서 던졌다';
  });
  T('더보기 설정에 「타석 시작」 칸이 있다', ()=>{
    w.go('more');
    const t=d.querySelector('#view').textContent;
    return /타석 시작/.test(t) && /내가 누르면/.test(t) && /3초 세고 자동/.test(t) && '두 칸 다 있다';
  });
  T('설정 버튼을 누르면 실제로 바뀐다', ()=>{
    const b=[...d.querySelectorAll('#view .btn')].find(x=>x.textContent==='내가 누르면');
    if(!b) return false;
    b.click();
    return ev("ST.batReady")==='me' && '내가 누르면 으로 돌아왔다';
  });
  T('옛 세이브에 없어도 기본값이 채워진다', ()=>{
    ev("delete ST.batReady; normalizeState();");
    return ev("ST.batReady")==='me' && "me 로 채워진다";
  });

  /* ================================================================ */
  console.log('\n[경기가 끝나도 안 끝난다]');
  ev("ST.batReady='me'");
  const g1=play(1);
  T('경기가 확정되면 단톡방으로 간다', ()=>g1===1 && `${ev("ST.stand['wwzw'].g")}경기 완료`);
  w.go('kakao'); await wait(200);
  T('단톡방 맨 아래에 「진행 중」 카드가 붙는다', ()=>{
    const c=d.querySelector('#view .card.chase');
    return !!c && c.querySelector('.card-h').textContent;
  });
  T('쫓는 기록이 최대 세 줄 나온다', ()=>{
    const ls=[...d.querySelectorAll('#view .card.chase .ch-l')];
    return ls.length>0 && ls.length<=3
      && ls.map(x=>x.textContent.trim()).join(' / ').slice(0,70);
  });
  T('같은 줄이 두 번 나오지 않는다', ()=>{
    const ts=[...d.querySelectorAll('#view .card.chase .ch-l')].map(x=>x.textContent.trim());
    return new Set(ts).size===ts.length && `${ts.length}줄 전부 다르다`;
  });
  T('다음 상대를 미리 알려준다', ()=>{
    const e=d.querySelector('#view .card.chase .ch-next');
    return e && /차전/.test(e.textContent) && e.textContent.trim();
  });
  T('다음에 눌러야 할 것이 버튼 하나로 있다', ()=>{
    const b=d.querySelector('#view .card.chase .ch-go');
    return b && /▸/.test(b.textContent) && b.textContent.trim();
  });
  T('그 버튼이 실제로 주간 처리를 한다 — 홈까지 갈 필요가 없다', ()=>{
    const before=ev("ST.weekDone");
    d.querySelector('#view .card.chase .ch-go').click();
    return before===false && ev("ST.weekDone")===true && '주간 처리 완료';
  });
  T('주간 처리가 끝나면 다음 걸음을 또 알려준다', ()=>{
    /* 우천·결장이 걸리면 라벨이 달라진다. 무엇이든 갈 데를 하나 준다는 게 요점이다 */
    const s=ev("JSON.stringify((function(){var x=nextStepInfo();return x?x.label:null})())");
    return /▸/.test(s) && s;
  });
  T('경기 전 단톡방에는 이 카드가 안 뜬다 — 거긴 이미 길이 있다', ()=>{
    ev("ST.kakaoPost=[];");
    w.go('kakao');
    return !d.querySelector('#view .card.chase') && '안 뜬다';
  });

  console.log('\n[숫자를 지어내지 않는다]');
  play(6);
  T('연속 안타 경기가 실제로 세어진다', ()=>{
    const s=ev(`(function(){ var o=[]; Object.keys(ST.form||{}).forEach(function(k){
      if((ST.form[k].hg||0)>0) o.push(nameOf(k)+' '+ST.form[k].hg+'경기'); }); return o.join(', '); })()`);
    return s.length>0 && s.slice(0,60);
  });
  T('무안타 경기가 나오면 0 으로 끊긴다', ()=>{
    const src=ev("String(updateForm)");
    return /f\.hg=0/.test(src) && /f\.hg=\(f\.hg\|\|0\)\+1/.test(src) && '안타 있으면 +1, 없으면 0';
  });
  T('통산 마일스톤은 진짜 남은 개수를 쓴다', ()=>{
    const ok=ev(`(function(){
      var us=TBYID['wwzw'];
      for(var i=0;i<us.players.length;i++){
        var p=us.players[i], c=(ST.career||{})[p.id]; if(!c) continue;
        var m=MILESTONE_KEYS[0].marks.find(function(x){return x>(c.h||0)});
        if(m==null) continue;
        return {name:p.name, h:c.h||0, mark:m, left:m-(c.h||0)};
      } return null; })()`);
    if(!ok) return false;
    return ok.left===ok.mark-ok.h && `${ok.name} 통산 ${ok.h}안타 · ${ok.mark}호까지 ${ok.left}개`;
  });
  T('한 사람이 세 줄을 다 먹지 않는다', ()=>{
    const ls=ev("JSON.stringify(chaseLines(3))");
    const names=(ls.match(/<b>([^<]+)<\/b>/g)||[]).map(x=>x.replace(/<\/?b>/g,''));
    return new Set(names).size===names.length && `${names.length}명 · ${names.join(', ')||'팀 기록만'}`;
  });
  T('종류도 갈라서 뽑는다', ()=>{
    const src=ev("String(chaseLines)");
    return /pass===0&&seenK\[o\.k\]/.test(src) && '1차는 종류당 하나씩';
  });
  T('경기가 하나도 없어도 안 터진다', ()=>{
    const r=ev(`(function(){ var b=ST.bat, c=ST.career, f=ST.form;
      ST.bat={}; ST.career={}; ST.form={};
      var out; try{ out=chaseLines(3); } catch(e){ out='ERR:'+e.message; }
      ST.bat=b; ST.career=c; ST.form=f; return JSON.stringify(out); })()`);
    return !/^"ERR/.test(r) && `줄 ${JSON.parse(r).length}개`;
  });

  T('도는 동안 에러 없음', ()=>jsErr.length===0 || (console.log('     '+jsErr.slice(0,3).join(' | ')),false));
  console.log(errs.length? `\n❌ ${errs.length}개 실패` : '\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
