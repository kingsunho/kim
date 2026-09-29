/* 수비 화면과 기록이 같은 말을 하나 — 잡았으면 잡은 거다 (v3.55.0)
   [제보] "2루쪽 잡았는데 갑자기 100m 2루타 뭐 2루송구를 해도 이상하고 수비가 너무 이상함"

   확인하는 것
     · 땅볼을 글러브에 넣었으면 — 아웃 · 내야안타 · 실책 · 야수선택 · 병살뿐. 2루타 이상은 없다
     · 비거리는 화면에 그린 자리다 (엔진이 따로 뽑은 70~100m 가 아니다)
     · 손이 안 닿았으면 아웃이 안 나온다 · 뜬공을 잡았으면 늘 아웃
     · 2루로 던졌는데 병살이 안 되면 야수선택 — 1루 주자가 죽고 타자가 1루에 산다
     · 3루 · 홈 송구도 엔진이 받는다                                                */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const bad=[]; const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Could not load|stylesheet|[Nn]ot implemented|getContext/.test(e.message)) bad.push('JSDOM: '+e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc,
  beforeParse(w){ w.scrollTo=()=>{}; w.TextEncoder=TextEncoder; w.TextDecoder=TextDecoder; }});
const w=dom.window,d=w.document,ev=s=>w.eval(s);
w.confirm=()=>true;
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0&&!/^!/.test(r));
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r.replace(/^!/,''):''));if(!ok)bad.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);bad.push(n+': '+e.message)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

/* 내 자리로 온 타구마다 choice 를 넣고 결과 글을 모은다. sceneM 이 있으면 화면 거리도 넘긴다 */
const run=(pos, choice, opt)=>JSON.parse(ev(`(function(){
  var O=${JSON.stringify(opt||{})};
  ST.mode='player'; ST.role='bat'; ST.myPos=${JSON.stringify(pos)}; ST.defMode='all';
  ST.hs={i:0,done:true,res:[],bat:blankBat(),pit:blankPit(),moments:[],pending:null};
  /* 라인업에 드는 타자 하나를 「나」 로 삼는다 — 첫 카드 선수가 라인업에 없을 수 있다.
     선수 모드라 recommendLineup 이 내가 고른 자리(ST.myPos)에 나를 먼저 세운다 */
  var h0=recommendLineup().find(x=>x.pos==='LF'); ST.playerId=h0.id; MYID=h0.id;
  ST.lineup=recommendLineup();
  var out=[];
  for(var g=0; g<(O.games||40); g++){
    ST.seed=(g*7919+13)>>>0;
    LIVE=makeLive(); LIVE.manual=true;
    var guard=0;
    while(!LIVE.over && guard++<400){
      var dec=LIVE.pending||LIVE.detectDecision();
      if(dec && dec.kind==='defplay'){
        var on1=LIVE.bases[0], outs0=LIVE.outs;
        if(O.sceneM) LIVE._defSceneM={seq:LIVE.paSeq, m:O.sceneM};
        if(O.tq!=null) LIVE._throwQ=O.tq;
        LIVE.applyDecision(${JSON.stringify(choice)});
        if(O.lead && on1) LIVE.applyDecision('at:lead');
        var bat=LIVE.batter(); var bid=bat&&bat.id;
        var r=LIVE.step();
        var txt=((r&&r.events)||[]).map(x=>x.text).join(' | ');
        out.push({t:txt, on1:!!on1, b0:LIVE.bases[0]===bid, runnerGone:on1?LIVE.bases.indexOf(on1)<0:null, dOuts:LIVE.outs-outs0});
        continue;
      }
      if(dec){ LIVE.applyDecision(dec.kind==='swing'?'playskip':'def:skip'); continue; }
      LIVE.step();
    }
  }
  return JSON.stringify(out);
})()`));

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(40);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click(); await wait(250);

  console.log('[땅볼을 잡았다 — 반쯤 붙어서(q 0.60)]');
  const A=run('2B','def:q:0.600:c1a0',{sceneM:24});
  const xbh=A.filter(x=>/2루타|3루타|홈런/.test(x.t)).length;
  const hits=A.filter(x=>/안타/.test(x.t)).length;
  T('타구가 충분히 왔다', ()=>A.length>40 ? A.length+'번' : '!'+A.length);
  T('2루타 이상이 한 번도 없다', ()=>xbh===0 ? '0번' : '!'+xbh+'번 — '+A.find(x=>/2루타|3루타|홈런/.test(x.t)).t);
  T('대부분 아웃 — 내야안타는 가끔', ()=>{ const r=hits/A.length; return r<0.45 && r>0 ? '안타 '+hits+'/'+A.length : '!'+hits+'/'+A.length; });
  T('비거리는 화면 자리(24m)다', ()=>{ const ms=A.map(x=>(x.t.match(/(\d+)m\)/)||[])[1]).filter(Boolean).map(Number);
    return ms.length && ms.every(m=>m===24) ? ms.length+'개 전부 24m' : '!'+[...new Set(ms)].slice(0,8).join(','); });

  console.log('\n[손이 안 닿았다]');
  const B=run('SS','def:q:0.450:c0a0',{games:30});
  T('아웃이 안 나온다', ()=>{ const o=B.filter(x=>/아웃|병살|야수선택/.test(x.t)&&!/안타|실책|2루타|3루타/.test(x.t)).length; return o===0 ? B.length+'번 전부 출루' : '!'+o+'번 아웃 — '+B.find(x=>/아웃/.test(x.t)).t; });
  T('내야에서 빠진 공은 1루타(장타 없음)', ()=>B.every(x=>!/2루타|3루타|홈런/.test(x.t)));
  const B2=run('CF','def:q:0.300:c0a0',{games:30});
  T('외야 뒤로 빠진 공은 장타도 된다', ()=>B2.some(x=>/2루타|3루타/.test(x.t)) && B2.every(x=>!/홈런/.test(x.t)) ? B2.filter(x=>/2루타|3루타/.test(x.t)).length+'/'+B2.length+' 장타' : '!');

  console.log('\n[뜬공을 잡았다]');
  const C=run('CF','def:q:0.700:c1a1',{games:30});
  T('늘 아웃', ()=>C.every(x=>!/안타|2루타|3루타|홈런|실책/.test(x.t)) ? C.length+'번 전부 아웃' : '!'+C.find(x=>/안타|2루타|3루타|홈런|실책/.test(x.t)).t);

  console.log('\n[2루 송구 — 야수선택]');
  const D=run('SS','def:q:0.950:c1a0',{games:60, lead:true, tq:0.1});
  const withR=D.filter(x=>x.on1 && /야수선택/.test(x.t));
  T('1루 주자가 있으면 2루 송구가 야수선택으로 적힌다', ()=>withR.length>0 ? withR.length+'번 — '+withR[0].t.slice(0,40) : '!없다');
  T('야수선택 — 1루 주자는 사라지고 타자가 1루에 있다', ()=>withR.length && withR.every(x=>x.runnerGone && (x.b0||x.dOuts<0)) ? '맞다' : '!'+JSON.stringify(withR.slice(0,2)));
  T('야수선택은 아웃 하나', ()=>withR.every(x=>x.dOuts===1||x.dOuts<0));

  console.log('\n[엔진이 3루 · 홈 송구를 받는다]');
  T('at:third · at:home', ()=>ev(`(function(){ LIVE.applyDecision('at:third'); var a=LIVE._throwAt; LIVE.applyDecision('at:home'); var b=LIVE._throwAt; LIVE._throwAt=null; return a==='third'&&b==='home'; })()`));
  T('화면이 3루 · 홈 송구를 그대로 넘긴다', ()=>/bestB\.b===3\?'at:third'/.test(html) && /'at:home'/.test(html));
  T('화면이 잡았는지를 엔진에 넘긴다', ()=>/':c'\+\(caught\?1:0\)\+'a'/.test(html));

  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
