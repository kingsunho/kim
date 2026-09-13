/* lobtest — 메인 로비가 받은 사진대로 서 있는가 (v3.21.0)
   [요청] "메인화면도 이런느낌으로 하라니깐" (마구마구 메인 사진)

   사진의 뼈대 다섯 가지를 숫자로 잰다 —
     ① 야구장이 화면을 다 먹는다 (카드 배경이 아니라 진짜 구장 그림)
     ② 캐릭터가 크게 서 있다
     ③ 위 띠 · 왼쪽 아이콘 줄 · 오른쪽 배너 · 오른쪽 아래 큰 버튼
     ④ 전부 한 화면 안에 있다 — 「입장하기」 가 탭바에 잘리면 로비가 아니다
     ⑤ 야구장은 **경기에서 쓰는 그 구장**이다 (구장을 옮기면 로비도 바뀐다)

   [함정] 캔버스 픽셀을 직접 읽어서 판단한다. 「구장이 그려졌나」 는
   DOM 으로는 알 수가 없다 — 빈 캔버스도 DOM 에는 멀쩡히 있다.        */
const {chromium}=require('playwright');
const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let fail=0; const errs=[];
const T=(ok,msg,note)=>{ console.log('  '+(ok?'✅':'❌')+' '+msg+(note?' :: '+note:''));
  if(!ok){ fail++; errs.push(msg); } };

const SIZES=[[844,390,'폰 가로'],[1600,740,'태블릿 가로']];

(async()=>{
  const b=await chromium.launch({executablePath:CHROME});
  for(const [W,H,nm] of SIZES){
    const p=await b.newPage({viewport:{width:W,height:H}});
    const boom=[]; p.on('pageerror',e=>boom.push(String(e).split('\n')[0]));
    await p.goto('file://'+__dirname+'/index.html');
    await p.waitForTimeout(900);
    await p.evaluate(()=>{ const i=document.getElementById('lock-in');
      if(i){ i.value=GATE_CODE; document.getElementById('lock-go').click(); } });
    await p.waitForTimeout(900);
    await p.evaluate(()=>document.querySelectorAll('.pickcard')[0].click());
    await p.waitForTimeout(250);
    await p.evaluate(()=>[...document.querySelectorAll('#view .btn')]
      .find(x=>x.textContent==='이 선수로 시작').click());
    await p.waitForTimeout(800);
    await p.evaluate(()=>{ ST.tutDone=true; ST.tutStep=99; ST.round=3; saveGame(true); go('home'); });
    await p.waitForTimeout(800);

    console.log('\n['+nm+' '+W+'×'+H+']');
    const R=await p.evaluate(()=>{
      const L=document.querySelector('#view .lob');
      if(!L) return {없음:true};
      const lb=L.getBoundingClientRect();
      const r=s=>{ const e=L.querySelector(s); if(!e) return null;
        const x=e.getBoundingClientRect();
        return {w:Math.round(x.width),h:Math.round(x.height),
          t:Math.round(x.top),b:Math.round(x.bottom),
          l:Math.round(x.left),rr:Math.round(x.right)}; };
      const cv=L.querySelector('.lob-cv');
      /* 캔버스가 **진짜 야구장**인가 — 잔디(초록)와 흙(갈색)이 같이 있나 */
      let 잔디=0, 흙=0, 빔=0, tot=0;
      try{
        const g=cv.getContext('2d');
        const d=g.getImageData(0,0,cv.width,cv.height).data;
        for(let i=0;i<d.length;i+=4*97){
          const R2=d[i],G=d[i+1],B=d[i+2],A=d[i+3]; tot++;
          if(A<8){ 빔++; continue; }
          if(G>R2+18 && G>B+18) 잔디++;
          else if(R2>G+14 && G>B+8) 흙++;
        }
      }catch(e){ return {픽셀못읽음:String(e)}; }
      return {lb:{w:Math.round(lb.width),h:Math.round(lb.height),
                  t:Math.round(lb.top),b:Math.round(lb.bottom),
                  l:Math.round(lb.left),rr:Math.round(lb.right)},
        cv:r('.lob-cv'), top:r('.lob-top'), face:r('.lob-face'), mp:r('.lob-mp'),
        left:r('.lob-left'), ic:L.querySelectorAll('.lob-ic').length,
        ch:r('.lob-ch'), right:r('.lob-right'), bn:L.querySelectorAll('.lob-bn').length,
        cta:r('.lob-cta'), go:r('.lob-go'),
        잔디비:잔디/tot, 흙비:흙/tot, 빔비:빔/tot,
        cvW:cv.width, cvH:cv.height, vh:innerHeight};
    });
    if(R.없음){ T(false,'로비가 뜬다','.lob 이 없다'); await p.close(); continue; }
    if(R.픽셀못읽음){ T(false,'캔버스를 읽는다',R.픽셀못읽음); await p.close(); continue; }
    T(true,'로비가 뜬다', R.lb.w+'×'+R.lb.h);

    /* ① 야구장이 판을 다 먹는다 — 늘리지 않고(비율 유지) 정확히 */
    T(R.cv && R.cv.w>=R.lb.w-4 && R.cv.h>=R.lb.h-4,
      '야구장이 판을 다 먹는다', R.cv?R.cv.w+'×'+R.cv.h:'없음');
    T(R.빔비<0.02, '캔버스에 빈 데가 없다 — 판 비율대로 잘라 그렸다',
      (R.빔비*100).toFixed(1)+'%');
    T(Math.abs(R.cvW/R.cvH - R.lb.w/R.lb.h) < 0.06,
      '캔버스 비율이 판 비율과 같다 (사람이 안 납작해진다)',
      (R.cvW/R.cvH).toFixed(2)+' vs '+(R.lb.w/R.lb.h).toFixed(2));
    T(R.잔디비>0.30 && R.흙비>0.02,
      '진짜 야구장이다 — 잔디와 흙이 같이 있다',
      '잔디 '+(R.잔디비*100).toFixed(0)+'% · 흙 '+(R.흙비*100).toFixed(0)+'%');

    /* ③ 네 덩어리가 제자리에 */
    T(!!R.top && R.top.t-R.lb.t<20, '위 띠가 맨 위에 떠 있다');
    T(!!R.face, '내 사진이 위 띠에 있다');
    T(!!R.mp, '진행 막대가 있다');
    T(R.ic>=4 && R.left.l-R.lb.l<20, '왼쪽 아이콘 줄이 있다', R.ic+'개');
    T(R.bn>=2 && R.lb.rr-R.right.rr<20,
      '오른쪽 배너 두 장이 오른쪽 위에 있다', R.bn+'장');
    T(!!R.go, '제일 큰 노란 버튼이 있다');
    T(!!R.go && R.go.b<=R.lb.b+1 && R.go.rr<=R.lb.rr+1,
      '큰 버튼이 오른쪽 아래 구석에 있다 — 사진의 「입장하기」 자리');

    /* ④ 한 화면 안에 — 여기가 깨지면 제보가 다시 온다 */
    const 밖=['.lob-top','.lob-left','.lob-ch','.lob-right','.lob-cta','.lob-go']
      .map(s=>({s, v:R[({'.lob-top':'top','.lob-left':'left','.lob-ch':'ch',
        '.lob-right':'right','.lob-cta':'cta','.lob-go':'go'})[s]]}))
      .filter(x=>x.v && (x.v.b>R.vh+1 || x.v.t<-1));
    T(밖.length===0, '로비가 통째로 한 화면 안에 있다',
      밖.map(x=>x.s+' '+x.v.t+'~'+x.v.b).join(' / ')||('화면 '+R.vh));

    /* ⑤ 구장을 옮기면 로비 배경도 바뀐다 — 같은 그림을 쓴다는 증거 */
    const 색=async()=>p.evaluate(()=>{
      const cv=document.querySelector('#view .lob-cv');
      const g=cv.getContext('2d');
      const d=g.getImageData(0,Math.round(cv.height*0.6),cv.width,1).data;
      let a=0,b2=0,c=0; for(let i=0;i<d.length;i+=4){a+=d[i];b2+=d[i+1];c+=d[i+2];}
      return [Math.round(a/(d.length/4)),Math.round(b2/(d.length/4)),Math.round(c/(d.length/4))];
    });
    const c1=await 색();
    await p.evaluate(()=>{ ST.park=(ST.park==='singil')?'seonggok':'singil';
      saveGame(true); go('home'); });
    await p.waitForTimeout(600);
    const c2=await 색();
    T(c1.join()!==c2.join(), '구장을 옮기면 로비 배경도 같이 바뀐다',
      c1.join(',')+' → '+c2.join(','));

    T(boom.length===0,'브라우저 예외 없음', boom.slice(0,2).join(' / ')||'없음');
    await p.close();
  }
  await b.close();
  console.log(fail?('\n❌ '+fail+'건: '+errs.slice(0,5).join(' / ')):'\n✅ 전부 통과');
  process.exit(fail?1:0);
})();
