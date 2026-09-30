/* 배포본 만들기 — 암호화한 index.html 하나를 dist/ 에 만든다.
   [결정 2026-09-30] 사용자: "비공개 저장소 만들어서 실명으로 가자 코드는 '김선호홈런왕1012'"
   원본(이 저장소, 비공개 kim-src)은 실명 · 연봉이 그대로 들어 있다.
   공개 저장소(kingsunho/kim — 깃허브 페이지)에는 이 스크립트가 만든 **암호문**만 올린다.
   입장 코드를 모르면 페이지 소스를 열어도 게임 내용이 안 보인다.

   · 원본 → gzip(3.5MB → 1.5MB) → AES-GCM 256(키 = PBKDF2-SHA256(입장 코드, 소금, 25만 번)) → base64
   · 풀 때는 브라우저 WebCrypto 로 복호화 → DecompressionStream 으로 gzip 풀기 → document.write
   · 한 번 맞히면 그 폰에 코드를 기억한다(wwzw_pw) — 다음부터는 바로 열린다.
     안쪽 게임의 입장 화면(GATE_CODE)도 같은 코드라 자동으로 통과시킨다(wwzw_gate).
   · 새 버전 감지(fetchLatestVersion)는 페이지 글자에서 const APP_VERSION = '…' 를 찾는다.
     그 한 줄만은 암호 밖에 둔다(버전 번호는 비밀이 아니다).

   쓰는 법:  node build-pages.js            → dist/index.html · dist/robots.txt
            node build-pages.js --check    → 만든 뒤 스스로 풀어 보고 원본과 같은지 확인 */
const fs=require('fs'), zlib=require('zlib'), crypto=require('crypto'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const code=(src.match(/const GATE_CODE = '([^']+)'/)||[])[1];
const ver=(src.match(/const APP_VERSION = '([^']+)'/)||[])[1];
if(!code||!ver){ console.error('GATE_CODE · APP_VERSION 을 못 찾았다'); process.exit(1); }
const KEYS_SRC=((src.match(/function gateKeys\(v\)\{([\s\S]*?)\n\}/)||[])[1]||'').trim();
if(!KEYS_SRC){ console.error('gateKeys 를 못 찾았다'); process.exit(1); }
const ITER=250000;
const salt=crypto.randomBytes(16), iv=crypto.randomBytes(12);
const key=crypto.pbkdf2Sync(code.trim().toLowerCase(), salt, ITER, 32, 'sha256');
const gz=zlib.gzipSync(Buffer.from(src,'utf8'),{level:9});
const c=crypto.createCipheriv('aes-256-gcm', key, iv);
const ct=Buffer.concat([c.update(gz), c.final(), c.getAuthTag()]);      // WebCrypto 는 태그를 끝에 붙인 모양을 받는다
const b64=x=>x.toString('base64');

/* 게임 안 입장 화면이 쓰는 해시 — index.html 의 gateHash 와 같아야 한다 */
function gateHash(v){ let h=2166136261; for(let i=0;i<v.length;i++){ h^=v.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0).toString(36); }

const page=`<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow,noarchive,noimageindex">
<title>우완좌완 야구 매니저</title>
<style>
html,body{margin:0;height:100%;background:#0d0d18;color:#e8e6f0;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif}
.w{min-height:100%;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}
.b{width:100%;max-width:340px;text-align:center}
h1{font-size:20px;color:#b98cff;margin:0 0 10px}
p{font-size:13px;opacity:.8;line-height:1.6;margin:0 0 18px}
input{width:100%;box-sizing:border-box;padding:14px;border-radius:10px;border:1px solid #6b55c9;background:#1c1a33;color:#fff;font-size:16px;text-align:center}
button{width:100%;margin-top:14px;padding:14px;border:0;border-radius:10px;background:linear-gradient(90deg,#7b3fe4,#d9337a);color:#fff;font-size:15px;font-weight:800}
#m{min-height:20px;margin-top:12px;font-size:13px;color:#ff8a8a}
small{display:block;margin-top:26px;opacity:.5;font-size:11px}
</style></head><body>
<div class="w"><div class="b">
<h1>우완좌완 야구 매니저</h1>
<p>팀 사람들만 쓰는 게임이다.<br>단톡방에 올라온 <b>입장 코드</b>를 넣어라.</p>
<input id="c" type="password" autocomplete="current-password" placeholder="입장 코드" aria-label="입장 코드">
<button id="g">들어가기</button><div id="m"></div>
<small>이 게임은 비영리 팬메이드이고 팀 내부용이다. 링크와 코드를 밖으로 퍼뜨리지 마라.</small>
</div></div>
<script>
/* [주의] 전부 함수 안에 둔다 — document.write 는 같은 window 를 다시 쓴다. 여기서 맨 위에 const APP_VERSION 을
   선언했더니 게임 쪽 const APP_VERSION 이 「이미 선언됨」 으로 통째로 죽었다(첫 시험에서 겪었다) */
(function(){
const APP_VERSION = '${ver}';
const P={s:'${b64(salt)}',i:'${b64(iv)}',n:${ITER}};
const D='${b64(ct)}';
const ub=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
function keys(v){ ${KEYS_SRC} }
function gh(v){ let h=2166136261; for(let i=0;i<v.length;i++){ h^=v.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0).toString(36); }
async function open_(pw, quiet){
  const m=document.getElementById('m');
  if(!(window.crypto&&crypto.subtle&&window.DecompressionStream)){ m.textContent='브라우저가 너무 오래됐다. 크롬 · 사파리를 업데이트해라.'; return; }
  m.style.color='#cfc6ff'; m.textContent='여는 중…';
  try{
    pw=keys(pw.trim()).toLowerCase();           // 한글로 쳐도 자판 글쇠로 바꾼다(비밀번호 칸은 폰에서 영문 자판)
    const pk=await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    const k=await crypto.subtle.deriveKey({name:'PBKDF2', salt:ub(P.s), iterations:P.n, hash:'SHA-256'}, pk, {name:'AES-GCM', length:256}, false, ['decrypt']);
    const gz=await crypto.subtle.decrypt({name:'AES-GCM', iv:ub(P.i)}, k, ub(D));
    const html=await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    try{ localStorage.setItem('wwzw_pw', pw); localStorage.setItem('wwzw_gate', gh(pw)); }catch(e){}
    document.open(); document.write(html); document.close();
  }catch(e){
    try{ localStorage.removeItem('wwzw_pw'); }catch(e2){}
    m.style.color='#ff8a8a'; m.textContent=quiet?'':'코드가 다르다. 단톡방을 확인해라.';
    const c=document.getElementById('c'); c.value=''; c.focus();
  }
}
document.getElementById('g').onclick=()=>open_(document.getElementById('c').value);
document.getElementById('c').onkeydown=e=>{ if(e.key==='Enter') open_(e.target.value); };
let saved=null; try{ saved=localStorage.getItem('wwzw_pw'); }catch(e){}
if(saved) open_(saved, true); else setTimeout(()=>document.getElementById('c').focus(),150);
})();
</script></body></html>
`;
fs.mkdirSync(path.join(__dirname,'dist'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'dist','index.html'), page);
fs.copyFileSync(path.join(__dirname,'robots.txt'), path.join(__dirname,'dist','robots.txt'));
console.log('dist/index.html '+(page.length/1024/1024).toFixed(2)+'MB · 원본 '+(src.length/1024/1024).toFixed(2)+'MB · v'+ver);

if(process.argv.includes('--check')){
  /* 스스로 풀어 본다 — 원본과 똑같아야 한다. 코드를 모르면 안 풀려야 한다 */
  const back=(pw)=>{ try{ const k=crypto.pbkdf2Sync(pw.trim().toLowerCase(), salt, ITER, 32, 'sha256');
    const d=crypto.createDecipheriv('aes-256-gcm', k, iv); d.setAuthTag(ct.subarray(ct.length-16));
    return zlib.gunzipSync(Buffer.concat([d.update(ct.subarray(0,ct.length-16)), d.final()])).toString('utf8'); }catch(e){ return null; } };
  const ok=back(code)===src, bad=back('001012')===null;
  const kf=new Function('v', KEYS_SRC);
  const kor=back(kf('김선호홈런왕1012').toLowerCase())===src;
  console.log((kor?'✅':'❌')+' 한글(김선호홈런왕1012)로 쳐도 풀린다');
  const leak=['양의지','김광현','PF_REAL_SAL','GATE_CODE'].filter(w=>page.indexOf(w)>=0);
  console.log((ok?'✅':'❌')+' 코드로 풀면 원본과 같다');
  console.log((bad?'✅':'❌')+' 옛 코드(001012)로는 안 풀린다');
  console.log((leak.length?'❌ 배포본에 글자가 샌다: '+leak.join(','):'✅ 배포본에 실명 · 코드가 안 보인다'));
  console.log((gateHash(code)===gateHash(code.trim())?'✅':'❌')+' 안쪽 입장 화면 해시가 맞는다');
  if(!ok||!bad||!kor||leak.length) process.exit(1);
}
