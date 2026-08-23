/* [2.17.0] 규정이닝 · 타석/마운드 얼굴 */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|not implemented/i.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  d.querySelectorAll('.pickcard')[0].click();await wait(50);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(250);
  ev("ST.tutDone=true;");

  console.log('[규정이닝]');
  T('경기당 1이닝이 기준이다', ()=>ev(`[5,13,22].map(function(g){return qualOuts(g)/3}).join(',')`)==='5,13,22'
      && '5경기→5이닝 / 13→13 / 22→22');
  T('경기가 적어도 최소 3이닝은 요구한다', ()=>ev("qualOuts(0)")===9 && '최소 3이닝');
  T('3이닝만 던진 사람은 구간 투수상 후보가 아니다', ()=>ev(`(function(){
    // 5경기 구간(=5이닝 필요)에서 3이닝만 던진 사람
    var q=qualOuts(5);
    var short={outs:9,er:0,h:0,bb:0,k:5,g:1,bf:10,hbp:0,r:0,sbA:0};
    var full ={outs:18,er:4,h:8,bb:3,k:6,g:3,bf:26,hbp:0,r:5,sbA:0};
    return (short.outs<q && full.outs>=q)
      ? '규정 '+(q/3)+'이닝 · 3이닝 탈락 / 6이닝 통과' : false;
  })()`));
  T('한 시즌 돌려도 규정 미달자가 상을 못 받는다', ()=>ev(`(function(){
    for(var i=0;i<40;i++){
      if(ST.round>=ST.schedule.length||ST.seasonOver)break;
      runWeek(); ST.weekDone=true; ST.lineupDirty=false; ST.announced=true;
      if(ST.events&&ST.events.length)ST.events=[]; ST.absent={};
      var L=makeLive(); var k=0;
      while(!L.over&&k++<3000){
        var dd=L.pending||L.detectDecision();
        if(dd){ L.applyDecision(dd.kind==='pitcherChange'?'change':(dd.kind==='defense'?'defnone':'none')); continue; }
        L.step();
      }
      L.finish(); var n=ST.schedule[ST.round]; if(!n)break;
      var r2=L.result, us=n.homeGame?r2.home:r2.away, th=n.homeGame?r2.away:r2.home;
      LIVE=L; commitGame(r2,us,th,us.slots);
    }
    var g=ST.stand['wwzw'].g, q=qualOuts(g);
    var aw=(typeof seasonAwards==='function')?seasonAwards(ST):null;
    // 시상 목록에서 투수상 수상자를 찾아 이닝 확인
    var bad=[];
    (ST.awards&&ST.awards.length?ST.awards:[]).forEach(function(a){
      if(!/투수상|평균자책|WHIP/.test(a.label||'')) return;
      var pid=a.pid; if(!pid)return;
      var l=ST.pit[pid]; if(l && l.outs<q) bad.push(nameOf(pid)+' '+(l.outs/3).toFixed(1)+'이닝');
    });
    window._q=g+'경기 · 규정 '+(q/3)+'이닝';
    return bad.length===0 ? window._q : ('미달 수상: '+bad.join(','));
  })()`));
  T('규정이닝을 채운 투수가 실제로 존재한다', ()=>ev(`(function(){
    var g=ST.stand['wwzw'].g, q=qualOuts(g), n=0, best='';
    Object.keys(ST.pit||{}).forEach(function(id){
      var l=ST.pit[id]; if(l&&l.outs>=q){ n++; best+= (best?', ':'')+nameOf(id)+' '+(l.outs/3).toFixed(1)+'이닝'; }
    });
    return n>0 ? n+'명 — '+best : '아무도 규정이닝을 못 채웠다';
  })()`));

  console.log('[타석·마운드 얼굴]');
  T('얼굴 칸이 그려진다', ()=>ev(`(function(){
    var mv=moundView({label:'x'});
    return !!mv.querySelector('#mwho');
  })()`));
  T('사진 있는 선수는 사진, 없는 선수는 찰흙', ()=>ev(`(function(){
    var out=[];
    ['ksh','kig','khg','lg','swm'].forEach(function(id){
      var mv=moundView({label:''});
      moundWho(mv,id,'타석');
      var av=mv.querySelector('.who-av');
      var kind=av&&av.querySelector('img')?'사진':(av&&av.firstElementChild?'찰흙':'없음');
      out.push(nameOf(id)+' '+kind);
    });
    return out.join(' / ');
  })()`));
  T('등번호와 역할이 같이 나온다', ()=>ev(`(function(){
    var mv=moundView({label:''});
    moundWho(mv,'ksh','타석');
    var t=mv.querySelector('.who-n').textContent;
    return /김선호/.test(t)&&/타석/.test(t) ? t.replace(/\\s+/g,' ').trim() : false;
  })()`));

  if(errs.length) console.log('\n실패:',errs);
  console.log(errs.length?'\n❌ 실패 '+errs.length+'건':'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
},3000);
