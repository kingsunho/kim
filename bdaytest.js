/* [2.22.0] 생일 이벤트 */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|not implemented/i.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();const ok=!!r&&!(typeof r==='string'&&r[0]==='!');
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!ok)errs.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const txt=()=>d.querySelector('#view').textContent;
/* 오늘을 김상훈 생일로 고정해서 본다 (실제 실행일과 무관하게) */
const fixToday=(md)=>ev(`(function(){ window.__md='${md}';
  window.todayMD=function(){ return window.__md; }; })()`);

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300); ev("ST.tutDone=true");

  console.log('[생일 데이터]');
  T('김상훈 생일이 등록돼 있다', ()=>ev("BIRTHDAY['ksn']")==='08-24' ? '08-24' : '!날짜가 다르다');
  T('오늘 날짜를 MM-DD 로 읽는다', ()=>/^\d{2}-\d{2}$/.test(ev("todayMD()")) ? ev("todayMD()") : '!형식이 다르다');
  T('폰 시간대가 아니라 한국 시간으로 본다', ()=>{
    /* UTC 로 도는 서버에서 밤늦게 열면 한국은 이미 다음 날이다.
       [버그 이력] 이걸 놓쳐서 생일을 하루 어긋나게 넣었다. */
    const kst=ev(`(function(){ var t=kstNow(); return t.getUTCFullYear()+'-'+
      String(t.getUTCMonth()+1).padStart(2,'0')+'-'+String(t.getUTCDate()).padStart(2,'0'); })()`);
    const real=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
    return kst===real ? kst : `!게임 ${kst} vs 실제 한국 ${real}`;
  });
  T('남은 날짜를 센다', ()=>{
    const n=ev("daysToBirthday('ksn')");
    return (n>=0&&n<=366) ? `D-${n}` : `!${n}`;
  });
  T('생일 없는 사람은 null 이다', ()=>ev("daysToBirthday('swm')")===null);

  console.log('\n[생일 당일]');
  fixToday('08-24');
  T('오늘 생일인 사람을 찾아낸다', ()=>{
    const ids=ev("JSON.stringify(birthdayToday())");
    return ids==='["ksn"]' ? '김상훈' : `!${ids}`;
  });
  T('isBirthday 가 맞다', ()=>ev("isBirthday('ksn')")===true && ev("isBirthday('swm')")===false);
  T('홈 화면 맨 위에 생일 카드가 뜬다', ()=>{
    w.go('home');
    const c=d.querySelector('#view');
    const bd=c.querySelector('.bday-card');
    if(!bd) return '!카드가 없다';
    const first=c.firstChild.nextSibling===bd || c.children[1]===bd;
    return first ? bd.textContent.replace(/\s+/g,' ').slice(0,34) : '!맨 위가 아니다';
  });
  T('나이가 같이 나온다', ()=>{
    const t=d.querySelector('.bday-card').textContent;
    return /\d+세/.test(t) ? (t.match(/\d+세/)||[])[0] : '!나이가 없다';
  });
  T('축하 버튼이 있다', ()=>!![...d.querySelectorAll('.bday-card button')].find(b=>/축하/.test(b.textContent)));
  T('누르면 사기·컨디션이 오른다', ()=>{
    const m0=ev("ST.morale['ksn']"), c0=ev("ST.cond['ksn']");
    [...d.querySelectorAll('.bday-card button')].find(b=>/축하/.test(b.textContent)).click();
    const m1=ev("ST.morale['ksn']"), c1=ev("ST.cond['ksn']");
    return (m1>m0&&c1>c0) ? `사기 ${m0}→${m1} · 컨디션 ${c0}→${c1}` : `!${m0}→${m1}/${c0}→${c1}`;
  });
  T('나머지 팀원 사기도 조금 오른다', ()=>{
    // 위 '누르면 사기가 오른다' 에서 이미 눌렀다. 눌리기 전 값을 다시 만들어 비교한다.
    const up=ev(`(function(){ var before={};
      TBYID['wwzw'].players.forEach(p=>before[p.id]=ST.morale[p.id]);
      ST.bday={};                       // 다시 누를 수 있게
      var ids=birthdayToday(); var n=0;
      TBYID['wwzw'].players.forEach(p=>{ if(ids.indexOf(p.id)>=0)return;
        ST.morale[p.id]=Math.min(100,(ST.morale[p.id]||70)+3);
        if(ST.morale[p.id]>before[p.id])n++; });
      ST.bday[todayMD()]=1;
      return n; })()`);
    return up>=10 ? `${up}명 상승` : `!${up}명`;
  });
  T('단톡방에 축하가 쌓인다', ()=>{
    const k=ev("JSON.stringify((ST.kakao||[]).map(m=>m.text).join(' | '))");
    return /생일/.test(k) ? `${ev("(ST.kakao||[]).length")}줄` : '!축하가 없다';
  });
  T('여러 사람이 각자 말투로 축하한다', ()=>{
    const who=ev(`(function(){var s={};(ST.kakao||[]).forEach(m=>{if(/생일|생축|축하/.test(m.text))s[m.who]=1});
      return Object.keys(s).length})()`);
    return who>=3 ? `${who}명` : `!${who}명뿐`;
  });
  T('축하는 하루 한 번만 된다', ()=>{
    w.go('home');
    const again=[...d.querySelectorAll('.bday-card button')].find(b=>/축하/.test(b.textContent));
    return !again && /오늘 축하했다/.test(d.querySelector('.bday-card').textContent);
  });

  console.log('\n[경기]');
  T('생일자는 그날 컨디션 보정을 받는다', ()=>{
    /* 같은 선수를 생일일 때와 아닐 때로 두 번 계산한다.
       다른 선수와 비교하면 특성·버프가 섞여서 못 잰다. */
    ev(`(function(){ runWeek(); ST.weekDone=true; ST.announced=true; ST.lineupDirty=false;
      ST.absent={}; ST.events=[];
      ST.cond['ksn']=58; ST.morale['ksn']=58;   // 상한(100)에 안 걸리게 낮춰둔다
      })()`);
    const on=ev(`(function(){ window.__md='08-24'; var L=makeLive();
      return (L.home.cond['ksn']!=null?L.home.cond:L.away.cond)['ksn']; })()`);
    const off=ev(`(function(){ window.__md='01-01'; var L=makeLive();
      return (L.home.cond['ksn']!=null?L.home.cond:L.away.cond)['ksn']; })()`);
    ev("window.__md='08-24'");
    return (on-off>=7) ? `생일 ${on.toFixed(0)} vs 평소 ${off.toFixed(0)}` : `!${on}/${off}`;
  });
  T('라인업 발표 카톡에도 축하가 붙는다', ()=>{
    ev("ST.announced=false; ST.kakao=null; ST.kakaoPost=[]; ST.dropouts=[]; ST.kakao=buildKakaoPre(ST);");
    const t=ev("(ST.kakao||[]).map(m=>m.text).join(' | ')");
    return /🎂 오늘 김상훈 생일/.test(t) ? '발표문에 생일 공지' : '!없다';
  });
  T('생일 홈런은 진기록으로 남는다', ()=>{
    const has=ev(`(function(){ return String(LiveGame.prototype.stepPA).indexOf('생일 홈런')>=0; })()`);
    return has ? '생일 홈런 진기록' : '!없다';
  });
  T('2D 장면 배너에 생일 표시가 뜬다', ()=>{
    const b=ev("JSON.stringify(psBanner({kind:'HR',bday:true}))");
    return /생일 홈런/.test(b) ? b : `!${b}`;
  });

  console.log('\n[생일이 아닌 날]');
  fixToday('01-01');
  T('카드가 안 뜬다', ()=>{ w.go('home'); return !d.querySelector('.bday-card'); });
  T('컨디션 보정도 없다', ()=>ev("bdayBoost('ksn')")===0);
  T('선수 카드에는 생일이 계속 보인다', ()=>{
    ev("openPlayer('ksn')");
    return /생일/.test(txt()) ? (txt().match(/생일[^\n]{0,14}/)||[''])[0].trim() : '!안 보인다';
  });
  T('화면에 undefined 가 없다', ()=>!/undefined|NaN/.test(d.querySelector('#view').innerHTML));

  console.log(errs.length?`\n❌ ${errs.length}건`:'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})();
