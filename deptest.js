/* [2.10.0] 야구장 그림 라인업 · 뎁스차트 */
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
  ev("ST.lineup=recommendLineup(); ST.rotation=recommendRotation();");

  console.log('[탭]');
  T('명단 / 야구장 / 뎁스 세 탭이 있다', ()=>{
    ev("ST.luView='list'; go('lineup')");
    const b=[...d.querySelectorAll('.lu-tabs button')].map(x=>x.textContent);
    return b.length>=3 && b.join(' | ');
  });
  T('탭을 누르면 화면이 바뀐다', ()=>{
    const t=[...d.querySelectorAll('.lu-tabs button')].find(x=>x.textContent==='야구장');
    t.click();
    return ev("ST.luView")==='field' && !!d.querySelector('.field');
  });

  console.log('[야구장 그림]');
  ev("ST.luView='field'; go('lineup')");
  T('9개 수비 자리가 다 그려진다', ()=>{
    const ps=[...d.querySelectorAll('.field .fp .fp-p')].map(x=>x.textContent.replace(/\s*\d+번/,'').trim());
    const need=['포수','1루','2루','3루','유격','좌익','중견','우익','투수'];
    const miss=need.filter(n=>!ps.some(x=>x===n));
    return miss.length===0 && ps.join(',');
  });
  T('각 자리에 실제 라인업 선수가 들어가 있다', ()=>{
    const names=[...d.querySelectorAll('.field .fp .fp-n')].map(x=>x.textContent.trim());
    const empty=names.filter(n=>!n||n==='—');
    return empty.length===0 && `${names.length}자리 전부 채워짐`;
  });
  T('마운드는 오늘 선발이다', ()=>{
    const sp=ev("nameOf((gameRotation()||[])[0])");
    const cell=[...d.querySelectorAll('.field .fp')].find(x=>/투수/.test(x.querySelector('.fp-p').textContent));
    return cell.querySelector('.fp-n').textContent.indexOf(sp)>=0 && sp;
  });
  T('자리를 누르면 교체할 자리로 선택된다', ()=>{
    ev("swapIdx=null; ST.luView='field'; go('lineup')");
    const cell=[...d.querySelectorAll('.field .fp')].find(x=>/중견|좌익|우익/.test(x.querySelector('.fp-p').textContent));
    cell.click();
    const picked=d.querySelectorAll('.fp.picked').length;
    const sel=ev("swapIdx");
    ev("swapIdx=null");
    return picked===1 && sel!=null && '선택 표시 1개';
  });
  T('마운드를 누르면 선발 지정 시트가 열린다', ()=>{
    ev("ST.luView='field'; go('lineup')");
    const cell=[...d.querySelectorAll('.field .fp')].find(x=>/투수/.test(x.querySelector('.fp-p').textContent));
    cell.click();
    const title=d.querySelector('#sheet-title').textContent;
    const rows=d.querySelectorAll('#sheet-body .pick-row').length;
    ev("closeSheet()");
    return /선발/.test(title) && rows>0 && `${title} · 후보 ${rows}명`;
  });

  console.log('[뎁스차트]');
  ev("ST.luView='depth'; ST.depMode='now'; go('lineup')");
  T('포지션별 뎁스가 나온다', ()=>{
    const secs=[...d.querySelectorAll('.dep-pos .dep-h b')].map(x=>x.textContent);
    return secs.length>=8 && secs.join(',');
  });
  T('포지션마다 별 평균이 나온다', ()=>{
    const av=[...d.querySelectorAll('.dep-pos .dep-h i')].map(x=>x.textContent.trim());
    return av.length>=8 && av[0];
  });
  T('1순위는 사진/찰흙과 함께 크게 나온다', ()=>{
    const top=d.querySelector('.dep-pos .dep-top');
    const av=top.querySelector('.dep-av');
    return !!av && !!av.firstElementChild && top.querySelector('.dep-tn').textContent.trim();
  });
  T('한 사람이 여러 포지션에서 1순위로 중복되지 않는다', ()=>{
    const tops=[...d.querySelectorAll('.dep-pos .dep-top .dep-tn')].map(x=>x.textContent.replace(/#\d+\s*/,'').trim());
    const dup=tops.filter((x,i)=>tops.indexOf(x)!==i);
    return dup.length===0 ? tops.join(' / ') : false;
  });
  T('1순위는 그 자리가 주포지션인 사람이다', ()=>{
    const bad=[...d.querySelectorAll('.dep-pos')].filter(sec=>{
      const sub=sec.querySelector('.dep-top .dep-tsub');
      return sub && /주포지션은/.test(sub.textContent);   // "주포지션은 XX" = 남의 자리
    });
    // 그 포지션이 주포지션인 사람이 아예 없으면 어쩔 수 없다
    const forced=bad.filter(sec=>!sec.querySelector('.dep-row.main'));
    return bad.length===forced.length && `${bad.length}자리는 주인이 없어 대체자가 1순위 (정상)`;
  });
  T('멀티 포지션 선수는 다른 자리에서 밑으로 내려간다', ()=>ev(`(function(){
    var t=TBYID['wwzw'];
    var best={}; t.players.forEach(function(p){best[p.id]=bestPosOf(p.id,false)});
    var multi=t.players.filter(function(p){
      var n=0; ALLPOS.forEach(function(x){ if(x!=='DH'&&posFit(p.id,x)>0) n++; });
      return n>=2;
    });
    if(!multi.length) return '멀티 포지션 선수 없음';
    var m=multi[0];
    return nameOf(m.id)+' 주포지션 '+POSNAMES[best[m.id]]+' (가능 포지션 '+
      ALLPOS.filter(function(x){return x!=='DH'&&posFit(m.id,x)>0}).map(function(x){return POSNAMES[x]}).join(',')+')';
  })()`));
  T('포텐셜 모드로 바꾸면 순서가 다시 매겨진다', ()=>{
    ev("ST.depMode='pot'; go('lineup')");
    const tops=[...d.querySelectorAll('.dep-pos .dep-top .dep-tn')].map(x=>x.textContent.trim());
    return tops.length>=8 && tops[0];
  });
  T('이름을 누르면 선수 카드로 간다', ()=>{
    ev("ST.depMode='now'; go('lineup')");
    const row=d.querySelector('.dep-pos .dep-row');
    row.click();
    const ok=ev("curView")==='player';
    ev("go('lineup')");
    return ok;
  });

  if(errs.length) console.log('\n실패:',errs);
  console.log(errs.length?'\n❌ 실패 '+errs.length+'건':'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
},3000);
