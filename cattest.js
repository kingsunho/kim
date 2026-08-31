/* 포수가 하는 일 — 도루 저지 · 원바운드 블로킹 · 파울 플라이
   [제보] "그리고 뭐 도루저지밖에 없냐"

   4부 리그 포수가 제일 많이 하는 일은 도루 저지가 아니라 원바운드를
   막는 것이다. 마스크를 벗고 뒤로 뛰는 파울 플라이도 포수 몫이다.   */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|Not implemented/.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n);if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};

setTimeout(async()=>{
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300);

  console.log('[포수로 60경기 — 세 장면이 다 나오나]');
  const r=JSON.parse(ev(`(function(){
    ST.mode='player'; ST.role='two'; ST.myPos='C'; ST.defMode='all';
    ST.helpSeen={'def:IF':1,'def:OF':1,'def:C':1,'run':1};
    ST.hs={i:0,done:true,res:[],bat:blankBat(),pit:blankPit(),moments:[],pending:null};
    ST.lineup=recommendLineup(); optimizePositions();
    const me=ST.playerId||MYID;
    const s0=ST.lineup.find(x=>x.id===me); if(s0)s0.pos='C';
    const cnt={sb:0,block:0,foul:0}, res={}; let games=0, err=null, quiet=0;
    for(let g=0; g<60; g++){
      ST.seed=(g*7919+13)>>>0;
      LIVE=makeLive(); LIVE.manual=true;
      let guard=0;
      try{
      while(!LIVE.over && guard++<800){
        const dec=LIVE.pending||LIVE.detectDecision();
        if(dec && dec.kind==='throw'){
          const kind=dec.what||'sb';
          cnt[kind]=(cnt[kind]||0)+1;
          const pick = kind==='sb'?'thr:go' : kind==='block'?(g%2?'blk:body':'blk:dive') : 'foul:go';
          LIVE.applyDecision(pick);
          const before=LIVE.log.length;
          /* playThenClose 와 같은 규칙으로 굴린다 — 장면이 나오거나
             다음 판단이 뜨면 멈춘다. 한 타석에 포수 판단이 두 번
             뜨는 경우가 있다(파울 플라이 놓침 → 원바운드). */
          let again=false;
          for(let k=0;k<4;k++){
            LIVE.step();
            if(LIVE.log.slice(before).some(l=>l.t==='play')) break;
            if(LIVE.pending){ again=true; break; }
          }
          const txt=LIVE.log.slice(before).map(x=>x.text||'').join(' | ');
          if(!txt && !again){ quiet++; res['빈:'+kind]=(res['빈:'+kind]||0)+1; }
          if(kind==='block') res[/막았다/.test(txt)?'막음':'흘림']=(res[/막았다/.test(txt)?'막음':'흘림']||0)+1;
          if(kind==='foul')  res[/파울 플라이/.test(txt)?'파울잡음':'파울놓침']=(res[/파울 플라이/.test(txt)?'파울잡음':'파울놓침']||0)+1;
          continue;
        }
        if(dec){ LIVE.applyDecision(dec.kind==='swing'?'playskip':(dec.kind==='defplay'?'def:q:0.9':'def:skip')); continue; }
        LIVE.step();
      }
      }catch(e){ err=e.message; break; }
      games++;
    }
    return JSON.stringify({games,err,cnt,res,quiet});
  })()`));
  console.log('   '+r.games+'경기 완주 · 장면 '+JSON.stringify(r.cnt));
  console.log('   결과 '+JSON.stringify(r.res));
  T('60경기가 예외 없이 끝난다', ()=>r.games===60 && !r.err);
  T('도루 저지가 나온다', ()=>r.cnt.sb>50);
  T('원바운드 블로킹이 나온다', ()=>r.cnt.block>=5);
  T('파울 플라이가 나온다', ()=>r.cnt.foul>=20);
  T('파울 플라이가 경기당 2번을 안 넘는다 — 그건 방해다', ()=>r.cnt.foul/60<=2);
  T('막기도 하고 흘리기도 한다', ()=>(r.res['막음']||0)>0 && (r.res['흘림']||0)>0);
  T('파울을 잡기도 하고 놓치기도 한다', ()=>(r.res['파울잡음']||0)>0 && (r.res['파울놓침']||0)>0);
  T('물어봤는데 아무 일 없이 끝나는 판이 없다', ()=>r.quiet===0);

  console.log('\n[화면이 세 갈래로 갈린다]');
  ev(`(function(){
    ST.mode='player'; ST.role='two'; ST.myPos='C'; ST.defMode='all';
    ST.helpSeen={'def:IF':1,'def:OF':1,'def:C':1,'run':1};
    ST.lineup=recommendLineup(); optimizePositions();
    const me=ST.playerId||MYID; const s=ST.lineup.find(x=>x.id===me); if(s)s.pos='C';
    LIVE=makeLive(); LIVE.manual=true;
    LIVE.bases=[LIVE.off().slots[0].id,null,null];
    if(!document.getElementById('decision')){var b=document.createElement('div');
      b.id='decision'; b.className='decision'; document.body.appendChild(b);}
  })()`);
  const txt=()=>(d.querySelector('#decision')||{}).textContent||'';
  ev("showDecision({kind:'throw', what:'sb'})"); await wait(100);
  T('도루 — 던질 건가', ()=>/던질 건가|던진다/.test(txt()));
  T('도루도 판으로 뜬다', ()=>d.getElementById('decision').classList.contains('sheet'));
  ev("showDecision({kind:'throw', what:'block'})"); await wait(100);
  T('원바운드 — 막아라', ()=>/원바운드/.test(txt()));
  T('몸으로 막기와 달려들기가 있다', ()=>/몸으로 막는다/.test(txt()) && /달려들어 잡는다/.test(txt()));
  T('성공률을 숫자로 보여준다', ()=>/성공 \d+%/.test(txt()));
  ev("showDecision({kind:'throw', what:'foul'})"); await wait(100);
  T('파울 플라이 — 쫓아갈 건가', ()=>/파울 플라이/.test(txt()));
  T('놓쳐도 손해가 없다고 알려준다', ()=>/손해는 없다|그냥 파울/.test(txt()));
  T('세 장면 다 판으로 뜬다', ()=>d.getElementById('decision').classList.contains('sheet'));

  console.log('\n[화면에 적은 확률과 엔진이 같은 식을 쓰나]');
  T('파울 플라이 성공률이 한 군데서만 나온다', ()=>{
    const ui=ev("renderFoulPop.toString()"), en=ev("LiveGame.prototype.applyDecision.toString()");
    return /34\+\(cdv-46\)\*0\.72/.test(ui) && /0\.34\+\(cdv-46\)\*0\.0072/.test(en);
  });

  console.log('\n[예외]');
  T('콘솔 예외 없음', ()=>errs.filter(x=>typeof x==='string'&&/Error|not a function|not defined/.test(x)).length===0);

  console.log(errs.length?'\n실패 '+errs.length+'개':'\n전부 통과');
  if(errs.length){console.log(errs.join('\n'));process.exit(1);}
  process.exit(0);
},1500);
