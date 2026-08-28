/* 정적 점검 — 커밋 전에 항상 돌린다
   1) 정의 없이 호출되는 함수  2) 함수 이름 중복  3) 중복 CSS 셀렉터  4) 객체 중복 키
   4) 안 쓰는 함수(참고용)      5) 파싱 오류                         */
const fs=require('fs');
const s=fs.readFileSync('index.html','utf8');
const bad=[];
const T=(n,f)=>{try{const r=f();const ok=r===true||(typeof r==='string'&&!/^!/.test(r));
  console.log((ok?'  ✅ ':'  ❌ ')+n+(typeof r==='string'?' :: '+r.replace(/^!/,''):''));if(!ok)bad.push(n);}
  catch(e){console.log('  ❌ '+n+' :: '+e.message);bad.push(n)}};

// JS 부분만 본다 (CSS 의 rgba(...) 같은 걸 함수 호출로 오해하지 않게)
const blocks=[...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const jsAll=blocks.join('\n');

/* ================= 문법 =================
   [사고 2026-08-28] `if(a) x; <새 줄>; else if(b) y;` 처럼 if/else 사슬
   **사이에** 한 줄을 끼워 넣어서 SyntaxError 가 났다. 그런데 여기 있는
   검사는 전부 정규식이라 **문법이 깨진 걸 하나도 못 잡았다.**
   문법이 깨지면 그 script 태그가 통째로 안 돌아간다 — 게임이 죽는다.
   그것보다 큰 사고가 없는데 제일 싸게 잡을 수 있다. 맨 앞에 둔다.
   (node 의 파서를 그대로 쓴다. 우리가 렉서를 만들 이유가 없다)      */
console.log('[문법 — 스크립트가 실제로 파싱되나]');
{
  const vm=require('vm');
  let broke=null;
  blocks.forEach((b,i)=>{
    if(broke) return;
    try{ new vm.Script(b, {filename:'script#'+(i+1)}); }
    catch(e){
      const m=/(\d+)\n/.exec(e.stack||'');
      const ln=(e.stack||'').split('\n').slice(0,4).join(' / ');
      broke='script#'+(i+1)+' — '+e.message+'  ('+ln.slice(0,160)+')';
    }
  });
  T('여덟 개 스크립트가 전부 파싱된다', ()=> broke? ('!'+broke) : (blocks.length+'개 OK'));
}

/* 블록주석만 지운다. 이건 안전하다(*\/ 로 확실히 끝난다).
   줄주석·문자열은 정규식으로 안전하게 못 지운다 — // 가 정규식과 URL 안에도 있다. */
const js=jsAll.replace(/\/\*[\s\S]*?\*\//g,' ');
/* 정규식으로 JS 를 정확히 렉싱할 수는 없다(// 가 정규식·URL 안에도 나온다).
   그래서 문자열을 지우려 들지 않고, 오탐만 allowlist 로 넘긴다.
   이 검사의 목적은 하나다 — 선언이 통째로 사라진 걸 잡는 것. */
/* '정의돼 있다' 로 치는 형태를 넓게 잡는다 —
   function 선언 / 할당 / 객체 속성 / 화살표 / 매개변수 / 구조분해.
   목적은 "선언이 통째로 사라진 것"을 잡는 것이지 스코프 검사가 아니다. */
const isDefined=(n)=>{
  const e=n.replace(/\$/g,'\\$');
  return new RegExp(
    `function\\s+${e}\\b`+
    `|\\b${e}\\s*[:=]`+
    `|function\\s*\\w*\\s*\\([^)]*\\b${e}\\b`+
    `|\\(([^)]*,)?\\s*${e}\\s*(,[^)]*)?\\)\\s*=>`+
    `|\\b${e}\\s*=>`+
    `|prototype\\.${e}\\b`+
    `|(^|[\\s,{])${e}\\s*\\([^)]*\\)\\s*\\{`
  ).test(js);
};
const BUILTIN=new Set(['if','for','while','switch','catch','function','return','typeof','new','do',
 'Math','JSON','Object','Array','String','Number','Date','Map','Set','Promise','parseInt','parseFloat',
 'isNaN','isFinite','setTimeout','setInterval','clearInterval','clearTimeout','console','document','window',
 'localStorage','navigator','location','fetch','btoa','atob','encodeURIComponent','decodeURIComponent',
 'requestAnimationFrame','cancelAnimationFrame','performance','alert','confirm','Boolean','Symbol','RegExp','Error','TextEncoder','TextDecoder',
 'Uint8Array','Float32Array','AudioContext','webkitAudioContext','caches','performance','structuredClone',
 'Blob','FileReader','URL','undefined','Intl','WeakMap','Proxy','Reflect','BigInt','Image',
 /* 정규식 패턴 안에만 등장하는 것들 */
 'iP','Android','OS','var','sort','minor','WAR','Version','CriOS','EdgA','SamsungBrowser','Chrome',
 'Firefox','FxiOS','Safari','Mac','SM','Galaxy','iPhone','iPad','iPod',
 /* $ 로 시작해서 \b 가 안 먹는 것 */ '$','$$',
 'async','await','else','try','delete','void','in','of','this','super','yield','import','export','matchMedia']);

console.log('[선언이 사라진 채로 호출되는 것]');
const called=new Set();
for(const m of js.matchAll(/(?:^|[^\w.$'"`])([a-zA-Z_$][\w$]*)\s*\(/g)){
  const n=m[1];
  if(BUILTIN.has(n)) continue;
  called.add(n);
}
const missing=[...called].filter(n=>!isDefined(n));
const defined=new Set([...js.matchAll(/function\s+(\w+)\s*\(/g)].map(m=>m[1]));
T('전부 선언돼 있다', ()=>missing.length===0 ? `호출 ${called.size}종 · 함수 ${defined.size}개`
  : '!'+missing.join(', '));

/* [버그 이력 2.82.0] posFit 이 두 번 선언돼 있었다. 함수 선언은 뒤엣것이
   앞엣것을 덮는다 — 진짜(훈련값·좌투 금지를 보는) posFit 이 스물다섯 판 동안
   한 번도 안 불렸고, 포지션 훈련이 통째로 죽어 있었다.
   3만 줄짜리 한 파일이라 같은 이름을 두 번 쓰기가 너무 쉽다. 여기서 잡는다.
   [주의] 최상위 선언만 본다 — 함수 안에 지역 헬퍼로 같은 이름을 쓰는 건
   흔하고 안전하다. 줄 맨 앞에서 시작하는 것만 센다.                 */
console.log('\n[함수 이름 중복 — 뒤엣것이 앞엣것을 덮는다]');
const topDecl={};
for(const m of jsAll.matchAll(/^function\s+(\w+)\s*\(/gm)){
  (topDecl[m[1]]=topDecl[m[1]]||[]).push(m.index);
}
const dupFn=Object.keys(topDecl).filter(n=>topDecl[n].length>1);
T('같은 이름이 두 번 선언되지 않았다', ()=>dupFn.length===0
  ? `최상위 함수 ${Object.keys(topDecl).length}개`
  : '!'+dupFn.map(n=>`${n} × ${topDecl[n].length}`).join(', '));

console.log('\n[CSS 중복 셀렉터]');
const css=s.match(/<style>([\s\S]*?)<\/style>/)[1];
/* [버그 이력] 예전엔 정규식 하나로 셀렉터를 뽑았다 — /^([^{@/\n][^{]*)\{/gm.
   그런데 [^{] 은 **개행도 먹는다**. 그래서 `border-radius:50%;` 같은
   속성 줄이 다음 룰의 여는 중괄호까지 통째로 삼켰고, 그 사이에 있던
   진짜 셀렉터가 통계에서 사라졌다.
   실제로 이것 때문에 `.mitt` 가 두 번 정의된 걸 못 잡았고, 포수 옆에
   갈색 네모가 찍혔다. 이제 중괄호를 세면서 훑는다.                  */
const cssNoC=css.replace(/\/\*[\s\S]*?\*\//g,'');
const seen={};
{
  let buf='', scope='';
  for(let i=0;i<cssNoC.length;i++){
    const ch=cssNoC[i];
    if(ch==='{'){
      const sel=buf.trim().replace(/\s+/g,' ');
      buf='';
      /* @media 안과 밖은 서로 다른 조건이라 이름이 같아도 충돌이 아니다 */
      if(sel.startsWith('@')){ scope=sel+' '; continue; }
      if(sel) { const k=scope+sel; seen[k]=(seen[k]||0)+1; }
      /* 선언 블록 안쪽은 통째로 건너뛴다 */
      let d=1;
      while(++i<cssNoC.length && d>0){
        if(cssNoC[i]==='{')d++; else if(cssNoC[i]==='}')d--;
      }
      i--;
      continue;
    }
    if(ch==='}'){ buf=''; scope=''; continue; }
    buf+=ch;
  }
}
const dupCss=Object.entries(seen).filter(([,v])=>v>1);
T('중복 없음', ()=>dupCss.length===0?true:'!'+dupCss.map(([k,v])=>`${k}×${v}`).join(', '));

/* [버그 이력] id 도 두 번 쓴 적이 있다 — `<b class="mitt" id="mitt">` 와
   `<div class="mitt" id="mitt">`. querySelector('#mitt') 는 앞엣것만
   잡으니까, 포수 글러브를 옮기려던 코드가 타격 범위 원을 옮겼다.    */
console.log('\n[HTML id 중복]');
const ids={};
for(const m of s.matchAll(/\sid="([A-Za-z][\w-]*)"/g)) ids[m[1]]=(ids[m[1]]||0)+1;
const dupId=Object.entries(ids).filter(([,v])=>v>1);
T('중복 없음', ()=>dupId.length===0?true:'!'+dupId.map(([k,v])=>'#'+k+'×'+v).join(', '));

console.log('\n[객체 중복 키]');
const dupKey=[];
for(const m of s.matchAll(/const (\w+)\s*=\s*\{/g)){
  const name=m[1]; if(name==='META') continue;
  let i=m.index+m[0].length-1, d=0, j=i;
  while(j<s.length){ if(s[j]==='{')d++; else if(s[j]==='}'){d--; if(!d)break;} j++; }
  const body=s.slice(i,j); if(body.length>200000) continue;
  const c={};
  for(const k of body.matchAll(/(?:^|[{,\n])\s*'([^']{1,30})'\s*:/g)) c[k[1]]=(c[k[1]]||0)+1;
  const x=Object.entries(c).filter(([,v])=>v>1);
  if(x.length) dupKey.push(`${name}(${x.map(([k,v])=>k+'×'+v).join(',')})`);
}
T('중복 없음', ()=>dupKey.length===0?true:'!'+dupKey.join(' '));

console.log('\n[안 쓰는 함수 — 참고용, 지울 땐 참조 수를 꼭 다시 세라]');
const unused=[...defined].filter(f=>(js.match(new RegExp('\\b'+f.replace(/\$/g,'\\$')+'\\b','g'))||[]).length<=1);
console.log('  '+(unused.length?unused.join(', '):'없음'));

console.log('\n[크기]');
const zlib=require('zlib');
const raw=fs.statSync('index.html').size;
const gz=zlib.gzipSync(Buffer.from(s,'utf8'),{level:9}).length;
console.log(`  ${(raw/1048576).toFixed(3)} MB · gzip ${(gz/1048576).toFixed(3)} MB`);
/* [결정] "2mb넘으면 뭐어때 인게임에만 지장안가면 된다"
   맞는 말이다 — 파일 크기는 **첫 다운로드**에만 걸리고 인게임 성능과는
   무관하다. 한 번 받으면 브라우저 캐시에 남는다.
   대신 진짜 비용은 있다: 업데이트할 때마다 팀원들이 그만큼 다시 받는다.
   gzip 기준을 같이 본다 — 실제로 망을 타는 건 그쪽이다.
   4MB(gzip 1.5MB)를 새 선으로 잡는다. LTE 에서 3~4초쯤이다.       */
T('4MB 아래', ()=>raw<4*1048576 ? `${(raw/1048576).toFixed(2)} MB` : '!너무 크다');
T('gzip 1.5MB 아래 — 실제로 망을 타는 건 이쪽이다',
  ()=>gz<1.5*1048576 ? `gzip ${(gz/1048576).toFixed(2)} MB` : '!느린 망에서 체감된다');

console.log(bad.length?`\n❌ ${bad.length}건`:'\n✅ 이상 없음');
process.exit(bad.length?1:0);
