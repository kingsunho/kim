/* 신문 — [요청] "신문 내용도 더 다양하게"

   [문제] 고정 풀이 연예 10 · 사회 10 · 기록실 15 · 광고 7 이었다.
   한 호에 두 꼭지씩 뽑으니 시즌(24주) 중반이면 읽은 기사만 돌았다.
   그리고 신문이 살아 있다는 느낌은 지어낸 풀이 아니라 **내가 한 일이
   기사로 돌아올 때** 나온다 — 생성 기사가 열 개 남짓이라 매주 같은
   꼴이었다(드래프트 · 지난 경기 · 순위 · 팀 타율 1위).

   그래서 둘 다 늘렸다. 여기서는
     ① 풀이 실제로 커졌는지
     ② 열네 주를 돌렸을 때 **얼마나 안 겹치는지**
     ③ 새 생성 기사가 진짜 상태에서 나오는지
   를 본다. 풀만 키우고 안 쓰면 용량만 늘어난 것이다.               */
const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const errs=[];const vc=new VirtualConsole();
vc.on('jsdomError',e=>{if(!/scrollTo|not implemented|getContext/i.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
dom.window.scrollTo=()=>{};dom.window.confirm=()=>true;
const w=dom.window,d=w.document,ev=s=>w.eval(s);
const T=(n,f)=>{try{const r=f();const ok=!!r&&!(typeof r==='string'&&r[0]==='!');
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r:''));if(!ok)errs.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);errs.push(n)}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  await wait(800);
  d.querySelectorAll('.pickcard')[0].click(); await wait(60);
  [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
  await wait(350);

  console.log('[풀이 커졌나]');
  T('연예면 25꼭지 이상', ()=>ev(`NEWS_ENT.length>=25 ? '연예 '+NEWS_ENT.length : '!'+NEWS_ENT.length`));
  T('사회·생활 25꼭지 이상', ()=>ev(`NEWS_LIFE.length>=25 ? '사회 '+NEWS_LIFE.length : '!'+NEWS_LIFE.length`));
  T('기록실 30꼭지 이상', ()=>ev(`NEWS_KBO.length>=30 ? '기록실 '+NEWS_KBO.length : '!'+NEWS_KBO.length`));
  T('광고 15개 이상', ()=>ev(`NEWS_AD.length>=15 ? '광고 '+NEWS_AD.length : '!'+NEWS_AD.length`));
  T('독자 투고가 생겼다 (12개 이상)', ()=>ev(`
    (typeof NEWS_VOICE!=='undefined' && NEWS_VOICE.length>=12) ? '투고 '+NEWS_VOICE.length : '!없거나 적다'`));
  T('꼭지마다 제목과 본문이 다 있다', ()=>ev(`(function(){
    var bad=[];
    [['ENT',NEWS_ENT],['LIFE',NEWS_LIFE],['KBO',NEWS_KBO],['AD',NEWS_AD],
     ['VOICE',NEWS_VOICE],['FORTUNE',NEWS_FORTUNE]].forEach(function(p){
      p[1].forEach(function(x,i){ if(!x||!x[0]||!x[1]) bad.push(p[0]+'#'+i); });
    });
    return bad.length===0 ? '전부 두 칸' : '!'+bad.join(',');
  })()`));
  T('기록실은 여전히 확정된 기록뿐이다', ()=>ev(`(function(){
    /* 진행 중인 시즌 숫자를 지어내면 실존 선수에 대한 가짜 기록이 된다 */
    var bad=NEWS_KBO.filter(function(x){ return !/\\(\\d{4}(-\\d{2})?\\)|통산|연속/.test(x[0]); });
    return bad.length===0 ? NEWS_KBO.length+'개 전부 연도·통산·연속' : '!'+bad.map(function(x){return x[0]}).join(' / ');
  })()`));
  T('실명은 기록실에만 — 연예·사회면은 전부 지어낸 사람이다', ()=>ev(`(function(){
    var real=['이승엽','이종범','선동열','최동원','류현진','오타니','박찬호','김도영',
              '이대호','정민철','송진우','양준혁','이정후','강정호','박병호','이만수'];
    var hit=[];
    NEWS_ENT.concat(NEWS_LIFE,NEWS_VOICE).forEach(function(x){
      real.forEach(function(n){ if((x[0]+x[1]).indexOf(n)>=0) hit.push(n); });
    });
    return hit.length===0 ? '연예·사회면에 실명 없음' : '!'+hit.join(',');
  })()`));

  console.log('\n[열네 주를 돌리면 얼마나 안 겹치나]');
  T('연예·사회·기록실이 주마다 바뀐다', ()=>ev(`(function(){
    ST.tutDone=true;
    var seen={ent:{},life:{},rec:{}}, n=0;
    for(var r=0;r<14;r++){
      ST.round=r;
      var N=newsIssue(); if(!N) continue; n++;
      N.ent.forEach(function(x){ seen.ent[x[0]]=1; });
      N.life.forEach(function(x){ seen.life[x[0]]=1; });
      N.rec.forEach(function(x){ seen.rec[x[0]]=1; });
    }
    var e=Object.keys(seen.ent).length, l=Object.keys(seen.life).length, k=Object.keys(seen.rec).length;
    /* 14주 × 2꼭지 = 28번 뽑는다. 난수로 뽑던 시절엔 17~19개뿐이었다.
       주차 순서대로 자르면 풀을 한 바퀴 돌 때까지 안 겹친다 —
       풀이 25개면 25개가 다 나와야 한다.                          */
    return (e>=24 && l>=24 && k>=27)
      ? ('연예 '+e+'종 · 사회 '+l+'종 · 기록실 '+k+'종 (14주)')
      : '!'+e+'/'+l+'/'+k;
  })()`));
  T('같은 주를 다시 열면 같은 신문이다', ()=>ev(`(function(){
    ST.round=5;
    var a=JSON.stringify(newsIssue().ent), b=JSON.stringify(newsIssue().ent);
    return a===b ? '같은 주 = 같은 신문' : '!달라졌다';
  })()`));
  T('독자 투고가 세 꼭지 실린다', ()=>ev(`(function(){
    ST.round=3;
    var N=newsIssue();
    return (N.voice && N.voice.length===3) ? '투고 3꼭지' : '!'+(N.voice?N.voice.length:'없음');
  })()`));

  console.log('\n[생성 기사 — 진짜 상태에서 나오나]');
  const brf=`function(N){ return N.briefs.concat(N.subs).map(function(x){return x.h+' '+(x.b||'')}).join('\\n'); }`;
  T('이번 주 상대 프리뷰가 실린다', ()=>ev(`(function(){
    var f=${brf};
    ST.round=0;
    var t=f(newsIssue());
    return /이번 주 상대/.test(t) ? t.split('\\n').filter(function(x){return /이번 주 상대/.test(x)})[0].slice(0,60) : '!없다';
  })()`));
  T('이번 주 날씨가 실린다', ()=>ev(`(function(){
    var f=${brf};
    ST.weather='rainy'; ST.round=2;
    var t=f(newsIssue());
    return /이번 주 날씨/.test(t) ? t.split('\\n').filter(function(x){return /이번 주 날씨/.test(x)})[0].slice(0,60) : '!없다';
  })()`));
  T('날씨 id 를 안 틀린다 — WEATHERS 를 그대로 읽는다', ()=>ev(`(function(){
    var f=${brf}, miss=[];
    WEATHERS.forEach(function(wx){
      ST.weather=wx.id; ST.round=2;
      if(!/이번 주 날씨/.test(f(newsIssue()))) miss.push(wx.id);
    });
    return miss.length===0 ? WEATHERS.length+'가지 전부 기사가 난다' : '!빠짐 '+miss.join(',');
  })()`));
  T('부상자가 있으면 명단이 실린다', ()=>ev(`(function(){
    var f=${brf};
    var us=TBYID['wwzw'].players;
    ST.injury[us[0].id]={name:'햄스트링', games:2};
    ST.round=4;
    var t=f(newsIssue());
    delete ST.injury[us[0].id];
    return /부상자/.test(t) ? t.split('\\n').filter(function(x){return /부상자/.test(x)})[0].slice(0,60) : '!없다';
  })()`));
  T('감각이 올라온 선수를 짚어준다', ()=>ev(`(function(){
    var f=${brf};
    var us=TBYID['wwzw'].players;
    ST.form=ST.form||{};
    ST.form[us[1].id]={hot:HOT_HITS+1, cold:0, phot:0, pcold:0};
    ST.round=4;
    var t=f(newsIssue());
    ST.form[us[1].id]={hot:0,cold:0,phot:0,pcold:0};
    return /감각이 올라온/.test(t) ? '폼 기사 있다' : '!없다';
  })()`));
  T('던진 투수가 있으면 방어율 기사가 난다', ()=>ev(`(function(){
    var f=${brf};
    var p0=TBYID['wwzw'].pitchers[0];
    ST.pit=ST.pit||{};
    ST.pit[p0.id]={g:2,gs:2,w:1,l:0,outs:18,h:6,r:3,er:2,bb:2,k:7,hbp:0,sbA:1,np:88};
    ST.round=6;
    var t=f(newsIssue());
    return /마운드 .* 방어율/.test(t) ? t.split('\\n').filter(function(x){return /방어율/.test(x)})[0].slice(0,50) : '!없다';
  })()`));
  T('2군에서 치고 있으면 그것도 기사다', ()=>ev(`(function(){
    var f=${brf};
    ST.farm=Array.isArray(ST.farm)?ST.farm:[];
    ST.farm.push({id:'zz_test', name:'테스트선수', ab:20, h:8, g:5, up:false, age:20, born:2006});
    ST.round=7;
    var t=f(newsIssue());
    ST.farm=ST.farm.filter(function(x){return x.id!=='zz_test'});
    return /2군 테스트선수/.test(t) ? '2군 기사 있다' : '!없다';
  })()`));
  T('경기를 치르면 최근 흐름이 붙는다', ()=>ev(`(function(){
    var f=${brf};
    var sc=ST.schedule;
    for(var i=0;i<4;i++){ sc[i].played=true;
      sc[i].result={us:3+i, them:2}; }
    ST.round=4;
    var t=f(newsIssue());
    for(var j=0;j<4;j++){ sc[j].played=false; sc[j].result=null; }
    return /최근 \\d경기/.test(t) ? t.split('\\n').filter(function(x){return /최근 \\d경기/.test(x)})[0].slice(0,50) : '!없다';
  })()`));

  console.log('\n[화면]');
  T('신문이 펼쳐지고 독자 투고 칸이 보인다', ()=>ev(`(function(){
    ST.round=3;
    var ov=showPaper();
    var vo=document.querySelectorAll('.pp-vo li').length;
    var sec=[...document.querySelectorAll('.pp-sec')].map(function(x){return x.textContent});
    try{ ov.parentNode.removeChild(ov); }catch(e){}
    return (vo===3 && sec.indexOf('독자 투고')>=0)
      ? ('투고 '+vo+'줄 · 섹션 '+sec.join('/')) : '!'+vo+' / '+sec.join('/');
  })()`));
  T('스물네 주를 다 펴봐도 안 터진다', ()=>ev(`(function(){
    for(var r=0;r<24;r++){
      ST.round=r;
      var ov=showPaper();
      if(!ov) return '!'+r+'주차에서 안 열렸다';
      try{ ov.parentNode.removeChild(ov); }catch(e){}
    }
    return '24주 전부 열린다';
  })()`));
  T('콘솔 예외 없음', ()=>errs.length?('!'+errs.join(' / ')):'깨끗');

  console.log(errs.length?('\n❌ '+errs.length+'건'):'\n✅ 이상 없음');
  dom.window.close(); process.exit(errs.length?1:0);
})();
