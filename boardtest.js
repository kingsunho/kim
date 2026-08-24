/* [2.32.0] 중계 전광판 — 숫자가 겹치는지 폭마다 재본다.

   [제보] "아이폰 사파리인데 점수판 아직도 겹쳐"
   칸 하나가 9px 남짓인데 글자를 8px 로 고정해놔서, 두 자리 점수(10·12)가
   칸을 넘어 옆으로 밀고 들어갔다. jsdom 은 글자 폭을 안 재니까 못 잡는다.
   크로미움으로 실제로 그려서 칸끼리 겹치는지 픽셀로 본다.               */
let chromium=null;
try{ chromium=require('playwright').chromium; }catch(e){}
if(!chromium){ console.log('⚠️  playwright 가 없다 — 건너뛴다'); process.exit(0); }
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const errs=[];
const T=(n,r)=>{const ok=!!r&&!(typeof r==='string'&&r[0]==='!');
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!ok)errs.push(n);};

(async()=>{
  const b=await chromium.launch(require('fs').existsSync(EXE)?{executablePath:EXE}:{});
  console.log('[중계 전광판]'+(process.env.BOARD_HARSH==='0'?' — 제 크기':' — 사파리 최악 흉내'));
  for(const W of [320,360,390,412,768]){
    const p=await b.newPage({viewport:{width:W,height:900}});
    await p.goto('file://'+require('path').resolve(process.argv[2]||'index.html'));
    await p.waitForTimeout(900);
    await p.evaluate(()=>{const l=document.getElementById('lock');if(l)l.classList.add('off');});
    await p.waitForTimeout(150);
    await p.locator('.pickcard').first().click();
    await p.waitForTimeout(150);
    await p.getByText('이 선수로 시작').click();
    await p.waitForTimeout(500);
    /* 옛 브라우저·사파리 흉내 — flex 칸이 내용보다 작아질 수 있게 풀어놓고,
       사파리 텍스트 자동 확대처럼 글자를 1.5배로 부풀려서 최악을 만든다. */
    if(process.env.BOARD_HARSH!=='0')
      await p.addStyleTag({content:'.mvb-r i u,.mvb-r b{min-width:0}'+
        '.mv-board{font-size:12px !important}'});
    const r=await p.evaluate(()=>{
      ST.tutDone=true; ST.absent={}; ST.injury={};
      runWeek(); ST.weekDone=true; ST.announced=true; ST.lineupDirty=false; ST.events=[];
      LIVE=makeLive(); LIVE.manual=true; LIVE.round=ST.round;
      /* 두 자리 점수를 억지로 만들어 본다 — 사회인야구는 실제로 이렇게 난다 */
      LIVE.away.line=[10,0,12,3,11,0,7]; LIVE.home.line=[2,14,0,10,1,13,0];
      LIVE.away.runs=43; LIVE.home.runs=40; LIVE.inning=7;
      if(!document.getElementById('decision')){
        var d=document.createElement('div'); d.id='decision'; document.body.appendChild(d); }
      showDecision({kind:'swing',label:'타석'});
      const board=document.querySelector('#mvboard');
      if(!board) return {err:'전광판이 없다'};
      let overlap=0, clipped=0, cells=0, spillOut=0;
      [...board.querySelectorAll('.mvb-r')].forEach(row=>{
        const kids=[...row.children].flatMap(c=>
          c.tagName==='I' ? [...c.children] : [c]);
        const box=kids.map(k=>({el:k,r:k.getBoundingClientRect()}));
        /* 글자가 실제로 차지하는 폭 — 칸보다 넓으면 옆으로 샌다 */
        box.forEach(o=>{
          if(o.el.tagName!=='U'&&o.el.tagName!=='B') return;
          cells++;
          const over=o.el.scrollWidth > o.el.clientWidth+1;
          if(over) clipped++;
          /* 칸을 넘치는데 잘라내지도 않으면 그 글자는 옆 칸 위로 삐져나온다.
             제보된 화면이 딱 이거였다. */
          if(over && getComputedStyle(o.el).overflowX!=='hidden') spillOut++;
        });
        for(let i=0;i<box.length-1;i++){
          const a=box[i].r, c=box[i+1].r;
          if(a.right>c.left+0.5) overlap++;
        }
      });
      return {overlap, clipped, cells, spillOut,
        fs:board.style.fontSize, bw:board.clientWidth,
        spill: board.scrollWidth>board.clientWidth+1};
    });
    T(`폭 ${W} — 숫자가 옆 칸으로 안 넘친다`,
      r.err ? '!'+r.err
        : ((r.overlap===0&&r.spillOut===0)
            ? `전광판 ${r.bw}px · 글자 ${r.fs||'(기본)'} · 칸 ${r.cells}개`
            : `!겹침 ${r.overlap} · 삐져나옴 ${r.spillOut}`));
    /* 최악에서는 잘려도 된다 — 겹치는 것보다 낫다. 제 크기일 때만 안 잘려야 한다. */
    if(process.env.BOARD_HARSH==='0')
      T(`폭 ${W} — 두 자리 점수가 안 잘린다`,
        r.err ? '!'+r.err : (r.clipped===0 ? 'ok' : `!${r.clipped}칸 잘림`));
    await p.close();
  }
  await b.close();
  console.log(errs.length?('\n❌ '+errs.length+'건\n'+errs.join('\n')):'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})().catch(e=>{ console.log('❌ '+e.message); process.exit(1); });
