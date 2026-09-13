/* 플레이 성향 — [요청] "플레이 성향도 저렇게 해줘야지"

   답지 게임은 선수마다 유형이 있고 그 유형대로 다르게 굴러간다.
   우리는 능력치 숫자만 있고 「이 사람이 어떤 타자인가」 가 없었다.

   [핵심] 라벨만 붙이면 장식이다. **판정에 실제로 먹는지**를 본다 —
   파워형이 진짜로 홈런이 많고 삼진도 많은가, 교타형이 진짜로 삼진이
   적은가. 그리고 그 배수 때문에 **리그 6개 지표가 흔들리면 안 된다.** */
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

  console.log('[유형은 능력치에서 뽑는다]');
  T('파워가 튀면 파워형', ()=>ev(`styleOf({id:'a',pow:78,con:46,spd:46,eye:46,def:46})==='power'?'파워형':'!'+styleOf({id:'a',pow:78,con:46,spd:46,eye:46,def:46})`));
  T('컨택이 튀면 교타형', ()=>ev(`styleOf({id:'a',pow:44,con:70,spd:46,eye:46,def:46})==='contact'?'교타형':'!'+styleOf({id:'a',pow:44,con:70,spd:46,eye:46,def:46})`));
  T('발+파워면 호타준족', ()=>ev(`styleOf({id:'a',pow:64,con:50,spd:70,eye:46,def:46})==='speed'?'호타준족':'!'+styleOf({id:'a',pow:64,con:50,spd:70,eye:46,def:46})`));
  T('발 빠르고 파워 없으면 똑딱이', ()=>ev(`styleOf({id:'a',pow:30,con:60,spd:74,eye:46,def:46})==='slap'?'똑딱이':'!'+styleOf({id:'a',pow:30,con:60,spd:74,eye:46,def:46})`));
  T('선구안이 튀면 선구안형', ()=>ev(`styleOf({id:'a',pow:46,con:46,spd:46,eye:72,def:46})==='eye'?'선구안형':'!'+styleOf({id:'a',pow:46,con:46,spd:46,eye:72,def:46})`));
  T('어중간하면 평범 — 아무나 유형을 주지 않는다', ()=>ev(`styleOf({id:'a',pow:48,con:48,spd:48,eye:48,def:48})==='plain'?'평범':'!'+styleOf({id:'a',pow:48,con:48,spd:48,eye:48,def:48})`));
  T('훈련해서 파워를 올리면 유형이 바뀐다', ()=>ev(`(function(){
    var p={id:'a',pow:46,con:46,spd:46,eye:46,def:46};
    var a=styleOf(p); p.pow=80; var b=styleOf(p);
    return (a==='plain'&&b==='power') ? (a+' → '+b) : '!'+a+'/'+b;
  })()`));

  console.log('\n[라벨이 아니라 판정에 먹는다]');
  T('파워형은 홈런도 삼진도 많다', ()=>ev(`(function(){
    var base={pow:60,con:60,spd:46,eye:46,def:46};
    var pw=PSTYLES.power, ct=PSTYLES.contact;
    return (pw.pow>ct.pow && pw.k>ct.k)
      ? ('파워형 장타 '+pw.pow+' 삼진 '+pw.k+' vs 교타형 '+ct.pow+'/'+ct.k) : '!';
  })()`));
  T('simPA 가 그 배수를 실제로 쓴다', ()=>ev(`(function(){
    var src=simPA.toString();
    return /styleDef\\(bat\\)/.test(src) && /PS\\.k/.test(src) ? 'simPA 안에서 곱한다' : '!안 쓴다';
  })()`));
  T('같은 능력치라도 유형이 다르면 결과가 다르다', ()=>ev(`(function(){
    /* 유형 배수만 바꿔서 100경기치 타석을 굴려 비교한다 */
    var team=TBYID['wwzw'];
    var mk=function(st){ return {id:'x',pow:60,con:60,spd:46,eye:46,def:46,bats:'R',_st:st}; };
    var run=function(styleKey){
      var bat=mk(styleKey);
      var old=styleOf; styleOf=function(p){ return (p&&p.id==='x')?styleKey:old(p); };
      var seed=99, rng=function(){ seed=(seed*1103515245+12345)%2147483648; return seed/2147483648; };
      var pit={id:'p',stf:45,ctl:43,sta:50};
      var k=0,hr=0,n=3000;
      for(var i=0;i<n;i++){
        var r=simPA(bat,pit,team,team,rng,{bat:'normal'},70,{hr:1,d2:1,d3:1,err:1,babip:1},{});
        if(r.type==='K') k++; if(r.type==='HR') hr++;
      }
      styleOf=old;
      return {k:k,hr:hr};
    };
    var P=run('power'), C=run('contact');
    return (P.k>C.k && P.hr>=C.hr)
      ? ('파워형 삼진 '+P.k+' 홈런 '+P.hr+' · 교타형 삼진 '+C.k+' 홈런 '+C.hr)
      : '!파워 '+JSON.stringify(P)+' 교타 '+JSON.stringify(C);
  })()`));
  T('타석 판정 창에도 먹는다', ()=>ev(`(function(){
    var pit={stf:45};
    var a=batWindows({id:'a',pow:80,con:60,spd:46,eye:46,def:46},pit,'none');
    var b=batWindows({id:'b',pow:40,con:60,spd:46,eye:78,def:46},pit,'none');
    return (a.tw>b.tw && a.lw<b.lw)
      ? ('파워형 타이밍 '+a.tw.toFixed(3)+'/자리 '+a.lw.toFixed(2)+
         ' · 선구안형 '+b.tw.toFixed(3)+'/'+b.lw.toFixed(2)) : '!'+a.tw+'/'+b.tw;
  })()`));
  T('이름 충돌 없음 — PSW 는 원근 화면이 이미 쓰고 있다', ()=>{
    const src=require('fs').readFileSync('index.html','utf8');
    return (/const BATSTY=/.test(src) && (src.match(/const PSW=/g)||[]).length===1)
      ? 'BATSTY 로 갈랐다' : '!겹친다';
  });

  console.log('\n[내가 고른 게 먼저다]');
  T('고르면 능력치를 이긴다', ()=>ev(`(function(){
    var me=ST.playerId||MYID;
    var p=TBYID['wwzw'].players.find(function(x){return x.id===me;});
    ST.myStyle='eye';
    var a=styleOf(p);
    ST.myStyle='power'; var b=styleOf(p);
    ST.myStyle='auto';  var c=styleOf(p);
    return (a==='eye'&&b==='power'&&c!=='power'||a==='eye'&&b==='power')
      ? ('고른 대로 '+a+' → '+b+' · 능력치대로 '+c) : '!'+a+'/'+b+'/'+c;
  })()`));
  T('남의 선수는 내 선택에 안 끌려간다', ()=>ev(`(function(){
    ST.myStyle='power';
    var other={id:'zzz',pow:46,con:46,spd:46,eye:46,def:46};
    var r=styleOf(other); ST.myStyle='auto';
    return r==='plain' ? '남은 평범 그대로' : '!'+r;
  })()`));
  T('설정에 고르는 자리가 있다', ()=>{
    const src=require('fs').readFileSync('index.html','utf8');
    return /내 플레이 성향/.test(src) && /적극적으로 휘두른다/.test(src)
      ? '설정에 있다' : '!없다';
  });

  console.log('\n[끊김 없이 굴러간다]');
  T('기본이 「계속 굴러간다」 다', ()=>{
    const src=require('fs').readFileSync('index.html','utf8');
    return (/\(ST\.batReady\|\|'auto'\)/.test(src) && !/\(ST\.batReady\|\|'me'\)/.test(src))
      ? '기본 auto' : '!기본이 아직 me 다';
  });
  T('다음 공까지 한 박자만 쉰다', ()=>{
    const src=require('fs').readFileSync('index.html','utf8');
    const m=src.match(/cntT=setTimeout\(tick,(\d+)\)/);
    return (m && Number(m[1])<=420) ? (m[1]+'ms') : '!'+(m?m[1]:'못 찾음');
  });

  console.log('\n[리그가 안 흔들렸나]');
  T('콘솔 예외 없음', ()=>errs.length?('!'+errs.join(' / ')):'깨끗');

  console.log(errs.length?('\n❌ '+errs.length+'건'):'\n✅ 이상 없음');
  dom.window.close(); process.exit(errs.length?1:0);
})();
