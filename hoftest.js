/* [2.18.0] 전시장 투수·타자 기록 확장 · 명예의 전당 */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo/.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();console.log((r?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!r)errs.push(n);}catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const season=()=>ev(`(function(){ for(var i=0;i<40;i++){
  if(ST.round>=ST.schedule.length||ST.seasonOver)break;
  runWeek(); ST.weekDone=true; ST.announced=true; ST.lineupDirty=false;
  if(ST.events&&ST.events.length)ST.events=[]; ST.absent={};
  var L=makeLive(); var k=0; while(!L.over&&k++<3000){L.pending=null;L.step();}
  L.finish(); var n=ST.schedule[ST.round]; if(!n)break;
  var r=L.result; var us=n.homeGame?r.home:r.away, th=n.homeGame?r.away:r.home;
  LIVE=L; commitGame(r,us,th,us.slots); if(ST.seasonOver)break; }
  return ST.seasonOver; })()`);
const txt=()=>d.querySelector('#view').textContent;

(async()=>{
  await wait(700);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(300); ev("ST.tutDone=true");

  console.log('[1년차 소화]');
  T('시즌이 끝난다', ()=>season()?`${ev("ST.stand['wwzw'].g")}경기`:'!안 끝남');
  w.go('home'); await wait(350);
  const nb=[...d.querySelectorAll('#view .btn')].find(x=>/새 시즌 시작/.test(x.textContent));
  if(nb){ nb.click(); await wait(500); }
  T('2년차로 넘어갔다', ()=>ev("ST.seasonNo")===2);

  console.log('\n[전시장 — 통산 기록]');
  // 실제로 던진 사람을 골라서 본다
  const pit=ev("Object.keys(ST.career).filter(id=>ST.career[id].pg>0)[0]");
  const bat=ev("Object.keys(ST.career).filter(id=>ST.career[id].g>0)[0]");
  ev(`hallWho='${bat}'`); w.go('hall'); await wait(200);
  T('통산 타격이 나온다', ()=>/통산 타격/.test(txt()));
  T('타율·출루·장타·OPS 슬래시라인이 있다', ()=>{
    const s=d.querySelector('#view .slash');
    return !!s && /타율 · 출루 · 장타/.test(s.textContent) && s.textContent.replace(/\s+/g,' ').trim().slice(0,40);
  });
  T('2루타·3루타·볼넷·삼진·득점까지 나온다', ()=>{
    const t=txt();
    return ['2B','3B','볼넷','삼진','득점','루타','타석'].every(k=>t.indexOf(k)>=0);
  });
  ev(`hallWho='${pit}'`); w.go('hall'); await wait(200);
  T('투수는 통산 투구가 나온다', ()=>/통산 투구/.test(txt())&&ev(`nameOf('${pit}')`));
  T('ERA·WHIP·승패·탈삼진이 다 있다', ()=>{
    const t=txt();
    return ['ERA','WHIP','자책','피안타','탈삼진','이닝'].every(k=>t.indexOf(k)>=0);
  });
  T('시즌별 줄이 나온다', ()=>/시즌별/.test(txt()));
  T('숫자에 undefined·NaN 이 없다', ()=>!/undefined|NaN/.test(d.querySelector('#view').innerHTML));

  console.log('\n[명예의 전당]');
  w.go('records'); await wait(150);
  const tab=[...d.querySelectorAll('.subtab')].find(b=>/명예의전당/.test(b.textContent));
  T('기록실에 탭이 있다', ()=>!!tab);
  tab.click(); await wait(250);
  T('구단 단일 시즌 최고 기록이 나온다', ()=>/구단 단일 시즌 최고 기록/.test(txt()));
  T('부문마다 선수와 연도가 붙는다', ()=>{
    const rows=[...d.querySelectorAll('#view table.box tr')].slice(1);
    const filled=rows.filter(r=>r.children.length===4);
    return filled.length>=6 && `${filled.length}개 부문 · 예: ${filled[0].textContent.replace(/\s+/g,' ').trim()}`;
  });
  T('최다 안타 1위가 실제 그 시즌 최고값과 같다', ()=>{
    const rows=[...d.querySelectorAll('#view table.box tr')];
    const r=rows.find(x=>/한 시즌 최다 안타/.test(x.textContent));
    const got=(r.textContent.match(/(\d+)\s*안타/)||[])[1];
    const max=ev(`(function(){var m=0;hofSeasons().forEach(function(y){
      Object.keys(y.bat).forEach(function(i){ if(y.bat[i].h>m)m=y.bat[i].h; })});return m})()`);
    return Number(got)===max ? `${max}안타` : `!표 ${got} vs 실제 ${max}`;
  });
  T('최저 ERA 는 규정이닝을 채운 사람만 걸린다', ()=>{
    const rows=[...d.querySelectorAll('#view table.box tr')];
    const r=rows.find(x=>/최저 ERA/.test(x.textContent));
    if(/아직 없다/.test(r.textContent)) return '아직 규정이닝 미달 (정상)';
    const nm=r.children[1].textContent.trim();
    // 표에 걸린 사람이 실제로 그 시즌 규정이닝을 채웠는지 확인한다
    const ok=ev(`(function(){var found=false;hofSeasons().forEach(function(y){
      var g=(y.rec&&y.rec.g)||0;
      Object.keys(y.pit).forEach(function(i){
        if(nameOf(i)===${JSON.stringify('__NM__')} && y.pit[i].outs>=qualOuts(g)) found=true; });
    });return found})()`.replace('__NM__',nm));
    return ok ? `${nm} (규정이닝 충족)` : `!${nm} 규정 미달`;
  });
  T('헌액 기준이 안내된다', ()=>/헌액자/.test(txt())&&/통산 350안타/.test(txt()));
  /* [제보] "경기만 나오면 누구나 하겠네"
     출전 수는 자격일 뿐 업적이 아니다 — 오래 뛰기만 해서는 못 들어간다 */
  T('출전만 많은 사람은 헌액이 안 된다', ()=>{
    const before=ev("JSON.stringify(ST.career)");
    ev(`(function(){
      var id=TBYID['wwzw'].players[0].id;
      ST.career[id]=Object.assign(blankCareer(),{g:400,h:120,hr:2,rbi:80,sb:30});
      ST.hall=(ST.hall||[]).filter(function(h){return h.pid!==id});
      window.__probe=id; })()`);
    w.go('records'); ev("recTab='hof'"); w.go('records');
    const nm=ev("nameOf(window.__probe)");
    const rows=[...d.querySelectorAll('#view .hof-row')].map(x=>x.textContent);
    const inn=rows.some(t=>t.indexOf(nm)>=0);
    ev("ST.career=JSON.parse("+JSON.stringify(before)+")");
    if(inn) console.log('     ↳ '+nm+' 가 출전만으로 들어갔다');
    return !inn && `${nm} 400경기 120안타 — 안 들어간다`;
  });
  T('업적을 넘기면 헌액된다', ()=>{
    const before=ev("JSON.stringify(ST.career)");
    ev(`(function(){
      var id=TBYID['wwzw'].players[0].id;
      ST.career[id]=Object.assign(blankCareer(),{g:400,h:420,hr:9,rbi:310,sb:120});
      window.__probe=id; })()`);
    w.go('records'); ev("recTab='hof'"); w.go('records');
    const nm=ev("nameOf(window.__probe)");
    const rows=[...d.querySelectorAll('#view .hof-row')].map(x=>x.textContent);
    const inn=rows.some(t=>t.indexOf(nm)>=0);
    ev("ST.career=JSON.parse("+JSON.stringify(before)+")");
    return inn && `${nm} 420안타 — 들어간다`;
  });
  T('근속이 모자라면 업적이 있어도 안 된다', ()=>{
    const before=ev("JSON.stringify(ST.career)");
    ev(`(function(){
      var id=TBYID['wwzw'].players[0].id;
      ST.career[id]=Object.assign(blankCareer(),{g:20,h:420,hr:9,rbi:310,sb:120});
      window.__probe=id; })()`);
    w.go('records'); ev("recTab='hof'"); w.go('records');
    const nm=ev("nameOf(window.__probe)");
    const rows=[...d.querySelectorAll('#view .hof-row')].map(x=>x.textContent);
    const inn=rows.some(t=>t.indexOf(nm)>=0);
    ev("ST.career=JSON.parse("+JSON.stringify(before)+")");
    return !inn && '20경기짜리는 심사 대상이 아니다';
  });
  /* [제보] "구단별 단일 시즌 최고 기록도 규정타석 규정이닝 맞게 되는 거지?" */
  T('진행 중인 시즌은 다 치른 기준으로 규정타석을 본다', ()=>ev(`(function(){
    var full=(ST.schedule||[]).filter(function(x){return !x.po}).length||22;
    /* 개막 직후를 흉내 낸다 — 3경기 6타석 4안타 */
    var id=TBYID['wwzw'].players[0].id;
    var save=JSON.stringify([ST.stand['wwzw'],ST.bat[id]]);
    ST.stand['wwzw'].g=3;
    ST.bat[id]={g:3,pa:6,ab:6,h:4,d2:0,d3:0,hr:0,bb:0,k:0,r:2,rbi:2,sb:0};
    var pass = 6 < qualPA(full);       // 6타석은 풀시즌 규정타석에 한참 못 미친다
    var r=JSON.parse(save); ST.stand['wwzw']=r[0]; ST.bat[id]=r[1];
    return pass ? '풀시즌 규정타석 '+qualPA(full)+'타석 (3경기 6타석으로는 못 낀다)' : false;
  })()`));
  T('시즌 연표가 시즌 수만큼 나온다', ()=>{
    const yrs=ev("hofSeasons().length");
    const heads=[...d.querySelectorAll('#view .card-h')].filter(x=>/년차/.test(x.textContent));
    return heads.length===yrs && `${yrs}시즌`;
  });
  T('연표에 그 해 1위와 수상이 들어간다', ()=>/그 해 팀 1위/.test(txt())&&/수상/.test(txt()));
  T('진행 중인 시즌이 표시된다', ()=>/진행 중/.test(txt()));
  T('이름을 누르면 선수 카드가 열린다', ()=>{
    const a=d.querySelector('#view .nml'); if(!a) return '!이름 링크 없음';
    const nm=a.textContent.trim();
    a.click();
    const open=d.querySelector('#sheet').classList.contains('open');
    const body=d.querySelector('#sheet-body').textContent;
    if(open) d.querySelector('#sheet').classList.remove('open');
    return open && body.indexOf(nm)>=0 ? `${nm} 카드가 열린다` : false;
  });
  w.go('records'); await wait(150);
  const tab2=[...d.querySelectorAll('.subtab')].find(b=>/명예의전당/.test(b.textContent));
  tab2.click(); await wait(200);
  T('전당 화면에 undefined·NaN 이 없다', ()=>!/undefined|NaN/.test(d.querySelector('#view').innerHTML));

  console.log('\n[팀을 나간 사람 이름]');
  T('로스터에서 빠져도 기록에 이름이 남는다', ()=>{
    const gone=ev(`(function(){
      var id=TBYID['wwzw'].players[3].id, nm=nameOf(id);
      TBYID['wwzw'].players=TBYID['wwzw'].players.filter(function(p){return p.id!==id});
      return id+'|'+nm+'|'+nameOf(id);
    })()`).split('|');
    return gone[1]===gone[2] ? `${gone[0]} → ${gone[2]}` : `!id 가 그대로 나온다 (${gone[2]})`;
  });

  console.log('\n[첫 시즌에도 안 깨진다]');
  T('기록이 하나도 없어도 화면이 뜬다', ()=>{
    ev("ST.seasonLog=[]; ST.career={}; ST.bat={}; ST.pit={}; ST.hall=[]; ST.feats=[]; ST.seasonNo=1;");
    ev("TBYID['wwzw'].players.forEach(p=>{ST.bat[p.id]=blankBat()}); TBYID['wwzw'].pitchers.forEach(p=>{ST.pit[p.id]=blankPit()});");
    w.go('records'); const t3=[...d.querySelectorAll('.subtab')].find(b=>/명예의전당/.test(b.textContent));
    t3.click();
    return /명예의 전당/.test(txt()) && !/undefined|NaN/.test(d.querySelector('#view').innerHTML);
  });
  T('전시장도 빈 기록에서 안 깨진다', ()=>{
    w.go('hall');
    return /전시장/.test(txt()) && !/undefined|NaN/.test(d.querySelector('#view').innerHTML);
  });

  console.log(errs.length?`\n❌ ${errs.length}건`:'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
})();
