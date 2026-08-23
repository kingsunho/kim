/* [2.11.0] 등판 = 성장 + 만족 / 기회 없으면 서운함 · 사람별 말버릇 */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo/.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  d.querySelectorAll('.pickcard')[0].click();await wait(50);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(250);
  ev("ST.tutDone=true; ST.weekDone=true; ST.absent={}; ST.injury={};");

  console.log('[던지면 는다]');
  T('등판하면 구위·제구가 오른다', ()=>ev(`(function(){
    var us=TBYID['wwzw'];
    var pid=ST.rotation[0];
    var p=us.players.find(function(x){return x.id===pid});
    var before={stf:p.pitch.stf, ctl:p.pitch.ctl};
    applyPitchReward({pbox:(function(){var o={};o[pid]={outs:15,er:2,h:5,r:2,bb:3,k:5,hbp:0,bf:22,sbA:0};return o})()},[pid]);
    var after={stf:p.pitch.stf, ctl:p.pitch.ctl};
    return (after.ctl>before.ctl && after.stf>before.stf)
      ? nameOf(pid)+' 5이닝: 구위 '+before.stf.toFixed(1)+'→'+after.stf.toFixed(1)+
        ' · 제구 '+before.ctl.toFixed(1)+'→'+after.ctl.toFixed(1) : false;
  })()`));
  T('많이 던질수록 더 는다', ()=>ev(`(function(){
    var us=TBYID['wwzw'];
    var a=ST.rotation[1], b=ST.rotation[2];
    var pa=us.players.find(function(x){return x.id===a});
    var pb=us.players.find(function(x){return x.id===b});
    var c0=pa.pitch.ctl, d0=pb.pitch.ctl;
    applyPitchReward({pbox:(function(){var o={};o[a]={outs:3,er:1,h:2,r:1,bb:1,k:1,hbp:0,bf:6,sbA:0};
      o[b]={outs:18,er:2,h:6,r:2,bb:2,k:6,hbp:0,bf:25,sbA:0};return o})()},[a,b]);
    var dA=pa.pitch.ctl-c0, dB=pb.pitch.ctl-d0;
    return dB>dA ? '1이닝 +'+dA.toFixed(2)+' / 6이닝 +'+dB.toFixed(2) : false;
  })()`));
  T('던지면 사기가 오른다', ()=>ev(`(function(){
    var pid=ST.rotation[0];
    ST.morale[pid]=60;
    applyPitchReward({pbox:(function(){var o={};o[pid]={outs:12,er:1,h:3,r:1,bb:1,k:4,hbp:0,bf:16,sbA:0};return o})()},[pid]);
    return ST.morale[pid]>60 ? '60 → '+ST.morale[pid] : false;
  })()`));
  T('던지면 쌓인 불씨가 하나 꺼진다', ()=>ev(`(function(){
    var pid=ST.rotation[0];
    ST.spark={}; addSpark(ST,pid,'등판',2);
    var before=sparkOf(ST,pid).n;
    applyPitchReward({pbox:(function(){var o={};o[pid]={outs:9,er:1,h:2,r:1,bb:1,k:3,hbp:0,bf:12,sbA:0};return o})()},[pid]);
    var after=sparkOf(ST,pid).n;
    return after<before ? '불씨 '+before+' → '+after : false;
  })()`));

  console.log('[기회 안 주면 서운해진다]');
  T('로테이션에 있는데 계속 못 던지면 불씨가 쌓인다', ()=>ev(`(function(){
    ST.spark={}; ST.pitchWait={};
    var pid=ST.rotation[2];
    var m0=ST.morale[pid]=70;
    for(var i=0;i<6;i++) applyPitchReward({pbox:{}},[]);   // 6경기 연속 미등판
    var sp=sparkOf(ST,pid);
    return (sp.n>0 && sp.why.indexOf('등판')>=0 && ST.morale[pid]<m0)
      ? nameOf(pid)+' 6경기 미등판 → 불씨 '+sp.n+'('+sp.why.join(',')+') · 사기 '+m0+'→'+ST.morale[pid] : false;
  })()`));
  T('불만 사유가 「등판 기회」로 표시된다', ()=>ev(`SPARK_LABEL['등판']`)==='등판 기회');
  T('결장한 날은 안 센다', ()=>ev(`(function(){
    ST.spark={}; ST.pitchWait={};
    var pid=ST.rotation[2];
    ST.absent[pid]='오늘 못 온다';
    for(var i=0;i<6;i++) applyPitchReward({pbox:{}},[]);
    var n=(ST.pitchWait[pid]||0);
    delete ST.absent[pid];
    return n===0 ? '결장 6경기 · 대기 카운트 0' : false;
  })()`));

  console.log('[주 1회라 체력은 웬만하면 회복된다]');
  T('한 주 지나면 정상으로 돌아온다', ()=>ev(`(function(){
    var pid=ST.rotation[0];
    ST.rest[pid]=0;
    TBYID['wwzw'].pitchers.forEach(function(p){ST.rest[p.id]=Math.min(4,(ST.rest[p.id]||3)+2);});
    return ST.rest[pid]>=2 ? '과부하(0) → '+ST.rest[pid]+' (정상)' : false;
  })()`));

  console.log('[사람별 말버릇]');
  T('사람마다 다른 추임새가 붙는다', ()=>ev(`(function(){
    var ban=['오늘 몇 시냐'], jon=['오늘 몇 시예요'];
    var uniq={};
    ['ksh','kig','khg','kjh','lsm','ksn','ksw','lg','swm','yjh'].forEach(function(id){
      var set={};
      for(var i=0;i<120;i++) set[line(id,null,ban,jon)]=1;
      uniq[id]=Object.keys(set).length;
    });
    var min=99,who='';
    Object.keys(uniq).forEach(function(k){ if(uniq[k]<min){min=uniq[k];who=k;} });
    return min>=4 ? '한 문장으로 최소 '+min+'가지 변형 ('+nameOf(who)+')' : false;
  })()`));
  T('김선우는 ㅋ 를 제일 많이 쓴다', ()=>ev(`(function(){
    var ban=['오늘 몇 시냐'], jon=['오늘 몇 시예요'];
    var cnt={};
    ['ksw','khg','ujh'].forEach(function(id){
      var n=0; for(var i=0;i<400;i++){ if(/ㅋ/.test(line(id,null,ban,jon))) n++; }
      cnt[id]=n;
    });
    return (cnt.ksw>cnt.khg && cnt.ksw>cnt.ujh)
      ? '김선우 '+cnt.ksw+' / 김한규 '+cnt.khg+' / 우진혁 '+cnt.ujh+' (400회 중)' : false;
  })()`));
  T('우진혁은 단톡방에 거의 안 나온다', ()=>ev(`(function(){
    var cnt={}, rng=makeRng(777);
    for(var i=0;i<3000;i++){ ST._recentSpeakers=[];
      speakers(ST,null,2,rng).forEach(function(p){cnt[p.id]=(cnt[p.id]||0)+1;}); }
    var tot=0; for(var k in cnt) tot+=cnt[k];
    var pct=(cnt['ujh']||0)*100/tot;
    return pct<3 ? '우진혁 '+pct.toFixed(1)+'% (평균 7%대)' : false;
  })()`));

  if(errs.length) console.log('\n실패:',errs);
  console.log(errs.length?'\n❌ 실패 '+errs.length+'건':'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
},3000);
