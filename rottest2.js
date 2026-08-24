/* [2.24.0] 구속 · 로테이션 터치 변경 · 라인업 동기화 · 홈런 비거리 */
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
const pslot=()=>ev("(function(){var s=ST.lineup.find(x=>x.pos==='P');return s?s.id:null;})()");

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300); ev("ST.tutDone=true; ST.absent={}; ST.injury={};");

  console.log('[구속 — 실제 기록 기준]');
  T('송승민 최고 구속이 실제와 맞는다', ()=>{
    const v=ev("Math.round(topKmh(TBYID['wwzw'].pitchers.find(p=>p.id==='swm')))");
    return Math.abs(v-115)<=1 ? `${v}km/h (실제 115)` : `!${v}`;
  });
  T('김준희 최고 구속이 실제와 맞는다', ()=>{
    const v=ev("Math.round(topKmh(TBYID['wwzw'].pitchers.find(p=>p.id==='kjh')))");
    return Math.abs(v-113)<=2 ? `${v}km/h (실제 113)` : `!${v}`;
  });
  T('구위가 낮으면 90대가 나온다', ()=>{
    const v=ev("Math.round(topKmh({stf:22}))");
    return (v>=93&&v<=100) ? `구위22 → ${v}km/h` : `!${v}`;
  });
  T('공마다 구속이 다르다', ()=>{
    const set=ev(`(function(){var p=TBYID['wwzw'].pitchers.find(x=>x.id==='swm');var s={};
      for(var i=0;i<60;i++) s[pitchKmh(p,'ff')]=1; return Object.keys(s).length;})()`);
    return set>=4 ? `60구에 ${set}가지 구속` : `!${set}가지뿐`;
  });
  T('최고 구속을 넘지 않는다', ()=>{
    const bad=ev(`(function(){var p=TBYID['wwzw'].pitchers.find(x=>x.id==='swm');
      var top=topKmh(p), n=0;
      for(var i=0;i<400;i++) if(pitchKmh(p,'ff')>Math.round(top)) n++;
      return n;})()`);
    return bad===0 ? '400구 전부 최고 이하' : `!${bad}구가 최고를 넘었다`;
  });
  T('최고 구속은 어쩌다 한 번 나온다', ()=>{
    const r=ev(`(function(){var p=TBYID['wwzw'].pitchers.find(x=>x.id==='swm');
      var top=Math.round(topKmh(p)), n=0;
      for(var i=0;i<400;i++) if(pitchKmh(p,'ff')>=top-1) n++;
      return n/400;})()`);
    return (r>0.02&&r<0.30) ? `${(r*100).toFixed(0)}%` : `!${(r*100).toFixed(0)}%`;
  });
  T('변화구가 직구보다 느리다', ()=>{
    const f=ev(`(function(){var p={stf:60},s=0;for(var i=0;i<200;i++)s+=pitchKmh(p,'ff');return s/200})()`);
    const c=ev(`(function(){var p={stf:60},s=0;for(var i=0;i<200;i++)s+=pitchKmh(p,'cu');return s/200})()`);
    return (f-c>15) ? `직구 ${f.toFixed(0)} · 커브 ${c.toFixed(0)}` : `!${f.toFixed(0)}/${c.toFixed(0)}`;
  });
  T('우리 팀이 리그에서 빠른 편이다', ()=>{
    const us=ev("Math.max.apply(null,TBYID['wwzw'].pitchers.map(topKmh))");
    const lg=ev(`(function(){var m=0;TEAMS.forEach(function(t){ if(t.id==='wwzw')return;
      (t.pitchers||[]).forEach(function(p){ var v=topKmh(p); if(v>m)m=v; })}); return m;})()`);
    return us>lg ? `우리 ${us.toFixed(0)} vs 리그 최고 ${lg.toFixed(0)}` : `!우리 ${us.toFixed(0)} <= 리그 ${lg.toFixed(0)}`;
  });

  console.log('\n[라인업이 로테이션을 따라간다]');
  T('경기가 끝나 로테이션이 돌면 타순 투수도 같이 돈다', ()=>{
    ev("ST.useDH=false; ST.lineup=recommendLineup(); ST.rotation=recommendRotation(); applyDHRule();");
    const out=[];
    for(let g=0;g<3;g++){
      ev(`(function(){ runWeek(); ST.weekDone=true; ST.announced=true; ST.lineupDirty=false;
        ST.absent={}; ST.events=[]; ST.useDH=false; applyDHRule();
        var L=makeLive(); var k=0; while(!L.over&&k++<3000){L.pending=null;L.step();}
        L.finish(); var n=ST.schedule[ST.round]; if(!n)return;
        var r=L.result, us=n.homeGame?r.home:r.away, th=n.homeGame?r.away:r.home;
        LIVE=L; commitGame(r,us,th,us.slots); })()`);
      ev("ST.useDH=false; applyDHRule();");
      out.push(ev("ST.rotation[0]")===pslot());
    }
    return out.every(Boolean) ? `3경기 연속 일치` : `!${out.join(',')}`;
  });
  T('어긋나 있어도 라인업 화면을 열면 맞춰진다', ()=>{
    ev("ST.useDH=false; applyDHRule();");
    ev("(function(){var a=ST.rotation; a.unshift(a.splice(3,1)[0]);})()");   // syncStarter 없이 강제로
    const before=ev("ST.rotation[0]")===pslot();
    ev("ST.luView='list'; go('lineup')");
    const after=ev("ST.rotation[0]")===pslot();
    return (!before&&after) ? `어긋남 → 화면 열자 일치 (${ev("nameOf(ST.rotation[0])")})`
                            : (after?'원래 맞아 있었다':'!안 맞는다');
  });
  T('벤치에 있던 선발이 타순으로 들어온다', ()=>{
    const sp=ev("ST.rotation[0]");
    return ev(`ST.lineup.some(x=>x.id==='${sp}')`) ? nm(sp) : '!아직 벤치다';
  });
  function nm(id){ return ev(`nameOf('${id}')`); }
  T('지명타자를 쓰면 선발은 타순 밖이 맞다', ()=>{
    ev("ST.useDH=true; ST.lineup=recommendLineup(); ST.rotation=recommendRotation(); applyDHRule();");
    ev("ST.announced=false;ST.kakao=null;ST.kakaoPost=[];ST.dropouts=[];ST.kakao=buildKakaoPre(ST);");
    const sp=ev("gameRotation()[0]");
    return !ev(`ST.lineup.some(x=>x.id==='${sp}')`) ? '타순 밖' : '!타순에 들어가 있다';
  });

  console.log('\n[로테이션 터치 변경]');
  T('이름을 누르면 선택된다', ()=>{
    ev("ST.luView='list'; go('lineup'); rotSwap=null;");
    ev("tapSwapRot(0)");
    return ev("rotSwap")===0 && !!d.querySelector('.pt-row.picked');
  });
  T('다른 자리를 누르면 순서가 맞바뀐다', ()=>{
    const a0=ev("ST.rotation[0]"), a2=ev("ST.rotation[2]");
    ev("tapSwapRot(2)");
    const b0=ev("ST.rotation[0]"), b2=ev("ST.rotation[2]");
    return (b0===a2&&b2===a0&&ev("rotSwap")===null) ? `${nm(a0)} ↔ ${nm(a2)}` : '!안 바뀐다';
  });
  T('바꾸면 타순 투수도 따라간다', ()=>{
    ev("ST.useDH=false; applyDHRule();");
    return ev("ST.rotation[0]")===pslot() ? nm(ev("ST.rotation[0]")) : '!안 따라간다';
  });
  T('같은 자리를 다시 누르면 취소된다', ()=>{
    ev("tapSwapRot(1); tapSwapRot(1)");
    return ev("rotSwap")===null && !d.querySelector('.pt-row.picked');
  });
  T('▲▼ 버튼도 그대로 된다', ()=>{
    const a1=ev("ST.rotation[1]");
    const up=[...d.querySelectorAll('.pt-row .up')][1];
    if(!up) return '!버튼이 없다';
    up.click();
    return ev("ST.rotation[0]")===a1 ? nm(a1) : '!안 올라간다';
  });

  console.log('\n[홈런 비거리]');
  T('담장을 넘긴 홈런이 120m 언저리다', ()=>{
    const ds=[];
    for(let i=1;i<=40;i++) ds.push(ev(`Math.round(psScene({seq:${i},kind:'HR',itp:false,bat:{bats:'R'}}).dist*0.605)`));
    const mn=Math.min(...ds), mx=Math.max(...ds);
    return (mn>=118&&mx<=135) ? `${mn}~${mx}m` : `!${mn}~${mx}m`;
  });
  T('그라운드 홈런은 담장 안쪽이다', ()=>{
    const m=ev("Math.round(psScene({seq:5,kind:'HR',itp:true,bat:{bats:'R'}}).dist*0.605)");
    return (m<118&&m>95) ? `${m}m (담장 118m)` : `!${m}m`;
  });
  T('예전처럼 146m 짜리는 안 나온다', ()=>{
    const mx=ev(`(function(){var m=0;for(var i=1;i<=200;i++){
      var v=Math.round(psScene({seq:i,kind:'HR',itp:false,bat:{bats:'R'}}).dist*0.605); if(v>m)m=v;}
      return m;})()`);
    return mx<=135 ? `최대 ${mx}m` : `!최대 ${mx}m`;
  });

  console.log(errs.length?`\n❌ ${errs.length}건`:'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})();
