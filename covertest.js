/* 베이스 커버 · 헛스윙 모션 · 뜬공 문구 — v3.46.0
   [제보] "1루수가 땅볼잡았는데 비어있는 베이스에 던지고 아웃이라니"
          "투수할때 상대 헛스윙 하는 모션이 안나오고 무슨 돌려 있는 자세인데"
          "뜬공인데 무리하지 않았다는 뭐야"

   확인하는 것
     · 공 잡은 야수 대신 누가 베이스에 들어가나(psCoverKey) — 야구 규칙대로
     · 커버 들어간 사람이 실제로 베이스까지 간다(psCoverAt)
     · 베이스 옆에서 잡으면 직접 밟는다(psSelfTag)
     · 네 장면(livePlay · defScene · groundScene · psPlay)이 전부 커버를 그린다
     · 투구 화면이 휘두르면 mvSwing 을 부른다 — 공 도착에 맞춰
     · 고를 게 없던 타구에 「무리하지 않았다」 가 안 뜬다                        */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync(process.argv[2]||'index.html','utf8');
const bad=[]; const vc=new VirtualConsole();
vc.on('jsdomError',e=>{ if(!/scrollTo|Could not load|stylesheet|[Nn]ot implemented|getContext/.test(e.message)) bad.push('JSDOM: '+e.message.split('\n')[0]); });
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc,
  beforeParse(w){ w.scrollTo=()=>{}; w.TextEncoder=TextEncoder; w.TextDecoder=TextDecoder; }});
const w=dom.window,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&r.length>0&&!/^!/.test(r));
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r.replace(/^!/,''):''));if(!ok)bad.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);bad.push(n+': '+e.message)}};

setTimeout(()=>{
  console.log('[누가 들어가나]');
  const K=(b,fk,x)=>ev(`psCoverKey(${b},'${fk}',{x:${x},y:150})`);
  T('1루수가 잡으면 투수가 1루에 들어간다', ()=>K(1,'1B',210)==='P');
  T('다른 사람이 잡으면 1루수가 1루', ()=>K(1,'SS',120)==='1B' && K(1,'3B',100)==='1B');
  T('2루수가 잡으면 유격수가 2루 · 유격수가 잡으면 2루수', ()=>K(2,'2B',200)==='SS' && K(2,'SS',120)==='2B');
  T('3루쪽 공이면 2루수가 2루, 1루쪽이면 유격수', ()=>K(2,'3B',100)==='2B' && K(2,'1B',220)==='SS');
  T('3루수가 잡으면 유격수가 3루', ()=>K(3,'3B',100)==='SS');
  T('포수가 잡으면 투수가 홈', ()=>K(0,'C',160)==='P');
  T('한 타구에 한 사람이 두 베이스를 안 맡는다', ()=>{
    const fks=['P','C','1B','2B','SS','3B','LF','CF','RF'], xs=[100,160,220];
    for(const fk of fks) for(const x of xs){
      const who=[1,2,3,0].map(b=>K(b,fk,x));
      if(new Set(who).size!==4) return '!'+fk+'@'+x+' → '+who.join(',');
      if(who.includes(fk)) return '!'+fk+' 가 공도 잡고 커버도 한다';
    }
    return '9자리 × 3방향 전부 따로';
  });

  console.log('\n[베이스까지 간다]');
  T('투수가 1루 커버로 1루 앞까지 간다', ()=>{
    const r=ev("(function(){var p0=psPosOf('P'),a=psCoverAt('P',p0,'1B',{x:220,y:160},[1],0),b=psCoverAt('P',p0,'1B',{x:220,y:160},[1],1);"+
      "return [a.x,a.y,b.x,b.y,Math.hypot(b.x-PS_B[1].x,b.y-PS_B[1].y)]})()");
    return r[4]<8 ? '마운드 → 1루 '+r[4].toFixed(1)+'px' : '!'+r.join(',');
  });
  T('커버 안 하는 사람은 제자리(null)', ()=>ev("psCoverAt('LF',psPosOf('LF'),'1B',{x:220,y:160},[1],1)")===null);
  T('공 잡은 사람은 커버 안 한다', ()=>ev("psCoverAt('1B',psPosOf('1B'),'1B',{x:220,y:160},[1],1)")===null);

  console.log('\n[직접 밟는다]');
  T('1루 바로 옆에서 잡은 1루수는 직접 밟는다', ()=>ev("psSelfTag('1B',{x:PS_B[1].x-10,y:PS_B[1].y-12},1)")===true);
  T('멀리서 잡은 1루수는 던진다', ()=>ev("psSelfTag('1B',{x:190,y:140},1)")===false);
  T('유격수는 1루를 직접 못 밟는다', ()=>ev("psSelfTag('SS',{x:PS_B[1].x,y:PS_B[1].y},1)")===false);

  console.log('\n[장면마다 커버를 그린다]');
  const src=n=>ev(`String(${n})`);
  T('타석 장면(livePlay)', ()=>/psCoverAt\(/.test(src('livePlay')) && /psSelfTag\(/.test(src('livePlay')));
  T('수비 장면(defScene)', ()=>/psCoverAt\(/.test(src('defScene')) && /selfTag=psSelfTag\(/.test(src('defScene')));
  T('주루 장면(groundScene)', ()=>/psCoverAt\(/.test(src('groundScene')));
  T('다시보기(psPlay)', ()=>/psCoverAt\(/.test(src('psPlay')));

  console.log('\n[투구 화면 — 타자가 배트를 돌린다]');
  const rp=src('renderPitch');
  T('휘두르면 mvSwing 을 부른다', ()=>/if\(swung\) setTimeout\(\(\)=>\{ try\{ mvSwing\(mv/.test(rp));
  T('휘두를지는 공 던지기 전에 정한다(도착에 맞춰 돌리려고)', ()=>{
    const a=rp.indexOf('const swung'), b=rp.indexOf('throwBall(mv,type');
    return a>0 && b>0 && a<b ? '던지기 전' : '!순서 '+a+' / '+b;
  });
  T('판정이 나면 잔상 색을 알려준다(mvSwingQ)', ()=>/mvSwingQ\(mv, kind==='strike'/.test(rp));

  console.log('\n[뜬공 문구]');
  T('「무리하지 않았다」 는 고를 게 있었을 때만', ()=>!/:\s*'무리하지 않았다'/.test(html) ? '고를 게 없으면 타구 결과를 쓴다' : '!아직 그대로');
  T('뜬공이면 「뜬공 — 잡혔다」', ()=>/'뜬공 — 잡혔다\. 베이스로 돌아온다'/.test(html));

  console.log('\n[수비 — v3.48.0]');
  const ds=src('defScene');
  T('못 잡을 순간(머리 위 · 창 밖)은 가장 가까운 거리로 안 친다', ()=>/if\(now>=window0 && !high\)\{ best=Math\.min\(best, near\)/.test(ds) ? '잡을 수 있을 때만 잰다' : '!아무 때나 잰다');
  T('다이빙하면 몸이 그 방향으로 날아간다', ()=>/diveDir\.x\*sp\*dt/.test(ds) ? '날아간다' : '!제자리');
  T('점프 중에도 다이빙이 된다(공중)', ()=>/if\(diving\(n2\)\|\|lagging\(n2\)\) return false;   \/\/ 연타 금지/.test(ds) ? '된다' : '!막혀 있다');
  T('다이빙 · 점프 모션을 그린다', ()=>/g\.rotate\(sx\*Math\.PI\/2/.test(ds) && /글러브를 머리 위로/.test(ds) ? '눕는다 · 글러브를 뻗는다' : '!');
  T('아이폰 — 조이스틱 touchstart 를 막는다', ()=>/joy\.addEventListener\('touchstart',\(ev\)=>\{ ev\.preventDefault\(\); \},\{passive:false\}\)/.test(html) ? '막는다' : '!');
  T('아이폰 — 판단창에서 글자 선택 · 복사 메뉴를 끈다', ()=>/#decision,#decision \*\{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none/.test(html) ? '끈다' : '!');
  T('조이스틱 밖으로 손가락이 나가도 안 놓친다', ()=>!/joy\.addEventListener\('pointerleave', up\)/.test(html) ? 'pointerleave 로 안 끊는다' : '!끊는다');

  console.log(bad.length?('\n❌ '+bad.length+'건:\n'+bad.slice(0,12).join('\n')):'\n✅ 이상 없음');
  process.exit(bad.length?1:0);
}, 700);
