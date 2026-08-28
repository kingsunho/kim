/* fbtest — 2026-08-28 피드백으로 고친 것들 (v2.86.0)
   진행 불가 버그 둘 · 기록과 화면이 어긋나던 셋 · 조작 넷.
   여기 있는 항목은 전부 "실제로 해보니 이랬다" 는 제보에서 나왔다.

   [함정] jsdom 에는 캔버스가 없다. 그라운드가 그려지는지가 아니라
   **자리를 잡았는지·엔진에 닿았는지**로 본다. */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
let fail=0;
const T=(ok,msg)=>{ console.log('  '+(ok?'✅':'❌')+' '+msg); if(!ok)fail++; };

const vc=new VirtualConsole();
const jsErr=[];
vc.on('jsdomError',e=>{ if(!/scrollTo|not implemented|getContext/i.test(e.message))
  jsErr.push(e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,
  url:'https://x.test/',virtualConsole:vc});
const w=dom.window, d=w.document;
w.scrollTo=()=>{}; w.confirm=()=>true;
const ev=s=>w.eval(s);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const txt=sel=>{ const e=d.querySelector(sel); return e?e.textContent.replace(/\s+/g,' ').trim():''; };

(async()=>{
  await wait(800);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300);
  ev("ST.tutDone=true; ST.mode='player'; ST.role='bat'; ST.myPos='SS';"+
     "ST.playerId='ksh'; MYID='ksh';");

  /* ---------------------------------------------------------------
     [제보] "왜 내가 플레이 하는데 개인사정 결장은 뭐고 결과만 본다
             안눌리네 그래서 진행이 안되잖아 심각한 버그네"
     --------------------------------------------------------------- */
  console.log('\n[내 선수는 개인 사정으로 안 빠진다]');
  T(ev("typeof canGoAbsent==='function'"), '결장 관문(canGoAbsent)이 있다');
  T(ev("canGoAbsent('ksh')===false"), '선수 모드의 내 선수는 결장 대상이 아니다');
  T(ev("canGoAbsent('khg')===true"), '남들은 그대로 못 나올 수 있다');
  T(ev("(function(){var m=ST.mode; ST.mode='mgr'; var r=canGoAbsent('ksh'); ST.mode=m; return r===true;})()"),
    '감독 모드에서는 아무도 안 봐준다 — 예전 그대로다');
  /* 200주를 굴려도 내가 결장자로 안 뽑히는가 */
  T(ev(`(function(){
      for(var i=0;i<200;i++){
        var rng=makeRng((i*7717+13)>>>0);
        var evts=rollWeekEvents(ST,rng)||[];
        for(var j=0;j<evts.length;j++){
          var e=evts[j];
          if((e.type==='absent'||e.type==='boycott') && e.pid==='ksh') return false;
        }
      }
      return true;
    })()`), '200주를 굴려도 내 결장 이벤트가 안 나온다');

  console.log('\n[「결과만 본다」 가 눌린다]');
  T(ev("renderGame.toString().indexOf(\"stA.id='stage'\")>0"),
    '결장 화면이 경기 무대(#stage)를 직접 깐다');
  T(ev("renderGame.toString().indexOf('c.appendChild(stA)')>0"),
    '무대를 화면에 붙인다 — buildLiveStage 가 붙을 데를 찾는다');
  ev(`(function(){ ST.weekDone=true; ST.announced=true; ST.lineupDirty=false;
      ST.events=[]; ST.absent={}; ST.absent['ksh']='개인 사정';
      ST.lineup=recommendLineup(); applyDHRule(); sanitizeRotation(); LIVE=null;
      go('game'); })()`);
  await wait(200);
  const wb=[...d.querySelectorAll('#view button')].find(b=>/결과만 본다/.test(b.textContent));
  T(!!wb, '「결과만 본다 ▸」 버튼이 있다');
  if(wb){ wb.click(); await wait(500); }
  T(ev("!!(LIVE && LIVE.over)"), '누르면 경기가 실제로 끝까지 굴러간다');
  T(jsErr.length===0, '누르는 동안 예외가 안 난다 :: '+(jsErr[0]||'없음'));

  /* ---------------------------------------------------------------
     [제보] "1루쪽 땅볼이나 유격쪽 땅볼도 뭐 이상한 우익 실책으로 기록"
             "공이 2루에 갔는데 3루수 실책이래"
     --------------------------------------------------------------- */
  console.log('\n[실책은 그 타구를 쫓아간 야수가 한다]');
  T(ev("typeof errPosFor==='function'"), '타구 방향으로 자리를 찾는 함수가 있다');
  T(ev("errPosFor({ang:-18,m:22})==='SS'"), '유격수 앞 땅볼이면 유격수');
  T(ev("errPosFor({ang:20,m:20})==='1B'"), '1루 쪽 땅볼이면 1루수');
  T(ev("errPosFor({ang:-2,m:24})==='2B'"), '2루 쪽으로 간 공이면 2루수');
  T(ev("errPosFor({ang:-38,m:20})==='3B'"), '3루 쪽 땅볼이면 3루수');
  T(ev("errPosFor({ang:-16,m:54})==='CF'"), '얕은 뜬공은 외야수 몫이다');
  T(ev("errPosFor(null)===null && errPosFor({ang:null})===null"),
    '방향을 모르면 예전 가중치로 떨어진다');
  T(ev(`(function(){
      var side={slots:[{id:'a',pos:'3B'},{id:'b',pos:'SS'},{id:'c',pos:'2B'},
                       {id:'e',pos:'1B'},{id:'f',pos:'RF'}],
                team:{players:[{id:'a',def:60},{id:'b',def:20},{id:'c',def:60},
                               {id:'e',def:60},{id:'f',def:60}]}};
      var rng=makeRng(1);
      for(var i=0;i<50;i++) if(pickErrorFielder(side,rng,{ang:20,m:20})!=='e') return false;
      return true;
    })()`), '수비가 나쁜 사람이 있어도 공이 간 자리가 이긴다 (50번 다)');

  /* ---------------------------------------------------------------
     [제보] "포수 수비 나올때 뭐 던진다 있어서 눌렀는데 던진다 누르면
             계속 무한반복 화면 나오는데 뭐가뭔지 모르겠어"
     --------------------------------------------------------------- */
  console.log('\n[포수는 진짜로 뛰었을 때만 묻는다]');
  T(ev("LiveGame.prototype.detectDecision.toString().indexOf(\"kind:'throw'\")<0"),
    '타석마다 묻던 분기를 걷어냈다');
  T(ev("LiveGame.prototype.stepPA.toString().indexOf('_sbHold')>0"),
    '도루 판정 안에서 묻는다 (스타트를 끊은 그 순간)');
  T(ev("LiveGame.prototype.stepPA.toString().indexOf(\"this.pending={kind:'throw'\")>0"),
    '멈추는 방식이 pending 이라 판단창이 맨 위에서 잡힌다');
  T(ev(`(function(){
      /* 1루에 주자를 세워두고 200타석을 굴린다. 도루가 안 났는데
         포수한테 물어보는 일이 한 번이라도 있으면 실패다. */
      ST.weekDone=true; ST.announced=true; ST.absent={}; ST.myPos='C';
      ST.lineup=recommendLineup(); applyDHRule(); sanitizeRotation();
      var L=makeLive(); L.manual=true; L.myId='ksh';
      var asked=0, steals=0, g=0;
      while(!L.over && g++<400){
        if(L.pending && L.pending.kind==='throw'){
          asked++;
          var n=L.log.length;
          L.applyDecision('thr:go');
          L.step();
          /* [v3.4.0] 도루 실패의 일부가 **협살**로 간다 — 문구가
             「협살 — 사이에 걸려 아웃」 / 「협살에 걸렸다가 살았다」 다.
             「도루」 라는 글자만 찾으면 그걸 놓친다.               */
          var got=L.log.slice(n).filter(function(x){return /도루|협살/.test(x.text||'')});
          if(!got.length) return false;         // 물어봤는데 도루가 없었다
          steals++;
          continue;
        }
        if(L.pending) L.applyDecision('change');
        L.step();
      }
      return asked===0 || asked===steals;
    })()`), '물어본 횟수와 실제 도루 횟수가 같다 (허탕이 없다)');

  console.log('\n[던지고 나면 아웃인지 세이프인지 보여준다]');
  T(ev("renderThrow.toString().indexOf('playThenClose')>0"),
    '고르자마자 닫지 않고 엔진 판정을 기다린다');
  T(ev("/아웃!/.test(renderThrow.toString()) && /세이프/.test(renderThrow.toString())"),
    '결과를 그 그라운드 위에 크게 적는다');
  T(ev("renderLead.toString().indexOf(\"choice!=='run:go'\")>0"),
    '주자 쪽도 「뛴다」 면 그 도루를 끝까지 보여준다');

  /* ---------------------------------------------------------------
     [제보] "투수할때 바깥쪽 던지면 좌타한테는 좌타기준 바깥쪽으로가네
             내가 누르는건 오른쪽인데 (…) 우타는 괜찮은데"
     --------------------------------------------------------------- */
  console.log('\n[좌타 상대 존은 화면대로 뒤집힌다]');
  T(ev("renderPitch.toString().indexOf('buildZone')>0"),
    '존을 타자마다 다시 깐다 (예전엔 열 때 한 번뿐이었다)');
  T(ev("/batLeft\\?\\[2,1,0\\]:\\[0,1,2\\]/.test(renderPitch.toString())"),
    '좌타면 칸 순서를 좌우로 뒤집는다');

  /* ---------------------------------------------------------------
     [제보] "자꾸 뭐할때마다 스크롤이 자동으로 올라가서 (…) 조이스틱
             누르기가 힘들어"
     --------------------------------------------------------------- */
  console.log('\n[화면이 멋대로 안 올라간다]');
  T(ev("plLock.toString().indexOf('PL_LOCK_Y')>0 && plLock.toString().indexOf('b.style.top')>0"),
    '잠글 때 보던 자리를 붙잡아 둔다 (iOS 가 맨 위로 튕기던 것)');
  T(html.indexOf('body.pl-lock{position:fixed')>0,
    '잠금이 position:fixed 다 — overflow:hidden 만으로는 튄다');
  T(ev("renderDefPlay.toString().indexOf(\"block:'end'\")>0"),
    '수비는 아래쪽(조이스틱·베이스 버튼)을 맞춰서 끌어온다');

  console.log('\n[이닝 교대를 알려준다]');
  T(ev("typeof innFlash==='function'"), '공수 교대 알림이 있다');
  T(ev("flushLog.toString().indexOf('innFlash')>0"), '이닝 줄이 뜨면 같이 뜬다');
  T(ev("flushLog.toString().indexOf('LIVE.manual')>0"),
    '자동 진행에서는 안 뜬다 — 한 번에 다 굴리니 의미가 없다');

  console.log('\n[처음 한 번 설명]');
  T(ev("typeof PLAY_HELP==='object' && !!PLAY_HELP['def:IF'] && !!PLAY_HELP['def:OF']"+
       " && !!PLAY_HELP['def:C'] && !!PLAY_HELP['run']"),
    '내야 · 외야 · 포수 · 주루 네 자리 설명이 있다');
  /* myPos() 는 경기 중이면 라인업 자리를, 그 다음 라인업을 먼저 본다.
     여기서 보려는 건 자리 → 설명 대응이라 둘 다 치우고 ST.myPos 로 본다 */
  ev("LIVE=null; ST.lineup=[]; ST.myPos='SS'");
  T(ev("playHelpKey({kind:'defplay'})==='def:IF'"), '유격수면 내야 설명');
  T(ev("(function(){var p=ST.myPos; ST.myPos='CF'; var k=playHelpKey({kind:'defplay'});"+
       "ST.myPos=p; return k==='def:OF';})()"), '중견수면 외야 설명');
  T(ev("playHelpKey({kind:'throw'})==='def:C'"), '도루 저지면 포수 설명');
  T(ev("playHelpKey({kind:'lead'})==='run'"), '리드면 주루 설명');
  T(ev("normalizeState.toString().indexOf('helpSeen')>0"),
    '읽은 표시가 옛 세이브에도 만들어진다');

  console.log('\n[예외]');
  T(jsErr.length===0, '콘솔 예외 없음 :: '+(jsErr[0]||'없음'));

  console.log(fail? `\n❌ ${fail}개 실패` : '\n✅ 이상 없음');
  process.exit(fail?1:0);
})();
