/* 생김새 · 투수 발밑 · 고졸 드래프트 순번 · 지명 컷신 · 자동 경기 — v3.51.0
   [요청] "생긴게 다 너무 똑같이 생겼다 … 선글라스 … 아이패치 … 투구폼"
          "타자 뷰에 투수가 왜 공중에 떠있는 느낌이냐"
          "고교때 막 계속 홈런치거나 하면 고교 드래프트도 윗순번 가능하려나"
          "1라운드 뽑으면 다른 컷신 … 2-4라운드까지도"
          "자동타격 자동 수비 자동 투구 … 경기 전에 물어보고"                        */
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

  console.log('[생김새]');
  T('sdLookOf 는 한 번만 선언', ()=>(html.match(/^function sdLookOf\(/mg)||[]).length===1);
  T('같은 선수는 늘 같은 생김새', ()=>ev("JSON.stringify(sdLookOf({id:'a1',pow:50}))===JSON.stringify(sdLookOf({id:'a1',pow:50}))"));
  const stat=JSON.parse(ev(`(function(){
    var n=400, s={shades:0,chain:0,long:0}, s2={shades:0,chain:0,long:0}, forms={}, hairs={};
    for(var i=0;i<n;i++){
      var a=sdLookOf({id:'st'+i,pow:88,con:60}), b=sdLookOf({id:'nm'+i,pow:50,con:50});
      if(a.eye==='shades')s.shades++; if(a.chain)s.chain++; if(a.hair==='long'||a.hair==='perm')s.long++;
      if(b.eye==='shades')s2.shades++; if(b.chain)s2.chain++; if(b.hair==='long'||b.hair==='perm')s2.long++;
      forms[b.form]=(forms[b.form]||0)+1; hairs[b.hair]=(hairs[b.hair]||0)+1;
    }
    return JSON.stringify({s,s2,forms,hairs});
  })()`));
  T('S급(능력 80+)은 선글라스 · 목걸이 · 긴 머리가 훨씬 잦다', ()=>
    stat.s.shades>stat.s2.shades*2 && stat.s.chain>stat.s2.chain*3 && stat.s.long>stat.s2.long
      ? 'S급 선글라스 '+stat.s.shades+' / 보통 '+stat.s2.shades+' · 목걸이 '+stat.s.chain+' / '+stat.s2.chain : '!'+JSON.stringify(stat));
  T('투구 폼 네 가지가 다 나온다', ()=>['tq','over','side','sub'].every(k=>stat.forms[k]>0) ? JSON.stringify(stat.forms) : '!'+JSON.stringify(stat.forms));
  T('머리 모양이 여럿이다', ()=>Object.keys(stat.hairs).length>=4 ? JSON.stringify(stat.hairs) : '!');
  T('타석 · 마운드 그림에 생김새가 넘어간다', ()=>/look:st\.batLook\|\|null/.test(html) && /look:st\.pitLook\|\|null/.test(html) && /pitLook:sdLookOf\(pit\)/.test(html));
  T('투구 폼이 팔 각도를 바꾼다(사이드 · 언더)', ()=>/LKf\.form==='side'/.test(html) && /LKf\.form==='sub'/.test(html) && /LKf\.kick==='high'/.test(html));

  console.log('\n[투수 발밑]');
  T('마운드가 담장 아래(잔디)에 있다', ()=>{
    const r=JSON.parse(ev("JSON.stringify({m:MV_MOUND.y, g:(function(){var P=mvPark();return P.deep+P.wall;})()})"));
    return r.m>=r.g-2 ? '마운드 '+r.m+' · 잔디 시작 '+r.g : '!마운드 '+r.m+' 가 담장('+r.g+') 위에 있다';
  });

  console.log('\n[고졸 드래프트]');
  const hs=(g,bat)=>ev(`(function(){ ST.hsGAvg=${g}; ST.hs=ST.hs||{}; ST.hs.bat=${JSON.stringify(bat)}; ST.hs.pit=blankPit();
    var sc=hsProScore(); return JSON.stringify({sc:sc, r:proDraftSlot(sc,'hs').round}); })()`);
  const plain=JSON.parse(hs(0.5,{ab:0,h:0,hr:0}));
  const monster=JSON.parse(hs(0.95,{ab:90,h:45,hr:12}));
  T('평범한 고교 성적은 중하위 라운드', ()=>plain.r>=5 ? plain.sc+'점 → '+plain.r+'라운드' : '!'+JSON.stringify(plain));
  T('고교에서 압도하면(홈런·타율) 1라운드도 열린다', ()=>monster.r<=2 ? monster.sc+'점 → '+monster.r+'라운드' : '!'+JSON.stringify(monster));

  console.log('\n[지명 축하 컷신]');
  T('draftCelebrate 한 번만 선언', ()=>(html.match(/^function draftCelebrate\(/mg)||[]).length===1);
  const slides=(r)=>ev(`(function(){ var ov=draftCelebrate({round:${r},pick:3,team:PRO_DRAFT_ORDER[0],name:'나',school:'흥진고',hs:true});
    if(!ov) return 0; var n=+(ov.querySelector('.dcel-foot').textContent.match(/\\/ (\\d+)/)||[0,0])[1]; ov.remove(); return n; })()`);
  T('1라운드 — 다섯 장 넘게(플래시 · 현수막 · 부모님 · 감독 · 단톡방 · 인터뷰)', ()=>{ const n=slides(1); return n>=5 ? n+'장' : '!'+n; });
  T('2~4라운드 — 따로 짧게', ()=>{ const a=slides(2), b=slides(4); return a>=3&&a<6&&b===a ? a+'장' : '!'+a+'/'+b; });
  T('5라운드부터는 컷신 없이 카드만', ()=>slides(5)===0);
  T('내 지명 순간에 부른다', ()=>/draftCelebrate\(\{round:slot\.round/.test(html));

  console.log('\n[자동 경기]');
  ev("ST.mode='player'; ST.playBat='mine'; ST.playPit='mine'; ST.defMode='all'; ST.runMode='all'; ST.autoPlay={bat:false,def:false,pit:false,run:false};");
  T('직접이면 예전 설정 그대로', ()=>ev("playModeFor('bat')!=='off' && askModeOf('def')==='all'"));
  ev("ST.autoPlay={bat:true,def:true,pit:true,run:true};");
  T('자동이면 타격 · 투구 · 수비 · 주루 판단창을 안 띄운다', ()=>ev("playModeFor('bat')==='off' && playModeFor('pit')==='off' && askModeOf('def')==='off' && askModeOf('run')==='off'"));
  T('친 뒤 「한 베이스 더」 도 안 묻는다', ()=>/!autoOn\('run'\)\) LIVE\._stretch=\{ask:true\}/.test(html));
  ev("ST.autoPlay={bat:false,def:false,pit:false,run:false};");
  T('경기 시작 화면에 「오늘 직접 할 것」 줄', ()=>{
    const r=ev("(function(){ var x=autoRow(); return x.querySelectorAll('.auto-c').length; })()");
    return r===5 ? '타격 · 투구 · 수비 · 주루 · 전부 자동' : '!'+r;
  });
  T('옛 세이브는 전부 직접으로 채운다', ()=>/if\(!ST\.autoPlay\|\|typeof ST\.autoPlay!=='object'\) ST\.autoPlay=/.test(html));

  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
})();
