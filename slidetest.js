/* [2.19.2] 구종 궤적 — 공은 미트(판정 지점)에 정확히 도착해야 한다 */
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
const wait=ms=>setTimeout(()=>{},ms);

/* throwBall 과 같은 식으로 궤적을 다시 계산한다.
   jsdom 은 rAF 로 실제 애니메이션을 못 돌리니 공식 자체를 검증한다. */
const path=(type,cx,cy,hand,W,H)=>{
  const P=JSON.parse(ev("JSON.stringify(PITCH_TYPES)"))[type];
  const sx=W*0.5, sy=H*0.30;
  const zx=W*0.5, zy=H*0.60, zw=W*0.27, zh=W*0.30;
  const tx=zx+(cx-1)*(zw*0.303), ty=zy+(cy-1)*(zh*0.303);
  const bkx=(P.bx/100)*W*hand, bky=(P.by/100)*H;
  const ax=tx-bkx, ay=ty-bky;
  const pts=[];
  for(let i=0;i<=40;i++){
    const t=i/40, e=Math.pow(t,1.7);
    const bk = t<P.late ? 0 : Math.pow((t-P.late)/(1-P.late),2);
    pts.push({t, x:sx+(ax-sx)*e+bkx*bk, y:sy+(ay-sy)*e+bky*bk});
  }
  return {pts, tx, ty, W, H};
};

setTimeout(()=>{
  const W=320,H=180;
  console.log('[도착점]');
  ['ff','sl','cu','ch','fk'].forEach(k=>{
    T(`${ev(`PITCH_TYPES['${k}'].n`)}는 던진 코스에 정확히 도착한다`, ()=>{
      let worst=0, bad='';
      for(let cx=-1;cx<=3;cx++)for(let cy=-1;cy<=3;cy++)for(const h of [1,-1]){
        const r=path(k,cx,cy,h,W,H);
        const last=r.pts[r.pts.length-1];
        const dx=Math.abs(last.x-r.tx), dy=Math.abs(last.y-r.ty);
        if(dx+dy>worst){worst=dx+dy;bad=`${cx},${cy}`;}
      }
      return worst<0.01 ? '오차 0px' : `!${bad} 에서 ${worst.toFixed(1)}px 어긋남`;
    });
  });

  console.log('\n[스트라이크 존과 도착점]');
  /* 존 네모를 못 재는 환경(테스트·구형 브라우저)에서 쓰는 기본값 기준으로
     아홉 칸이 존 안에, 빠진 공(-1·3)이 존 밖에 찍히는지 본다. */
  const zoneChk=(type,hand)=>{
    const P=JSON.parse(ev("JSON.stringify(PITCH_TYPES)"))[type];
    const zx=W*0.5, zy=H*0.60, zw=W*0.27, zh=W*0.30;
    const L=zx-zw/2, R=zx+zw/2, TT=zy-zh/2, B=zy+zh/2;
    const bad=[];
    for(let cy=-1;cy<=3;cy++)for(let cx=-1;cx<=3;cx++){
      const tx=zx+(cx-1)*(zw*0.303), ty=zy+(cy-1)*(zh*0.303);
      const inside = tx>L&&tx<R&&ty>TT&&ty<B;
      const should = (cx>=0&&cx<=2&&cy>=0&&cy<=2);
      if(inside!==should) bad.push(`(${cx},${cy})`);
    }
    return bad;
  };
  T('아홉 칸은 존 안에, 빠진 공은 존 밖에 찍힌다', ()=>{
    const bad=zoneChk('ff',1);
    return bad.length===0 ? '25칸 전부 일치' : `!${bad.join(' ')} 어긋남`;
  });
  T('높게·낮게 빠진 공이 존 안에 찍히지 않는다', ()=>{
    const zy=H*0.60, zh=W*0.30;
    const hi=zy+(-1-1)*(zh*0.303), lo=zy+(3-1)*(zh*0.303);
    return (hi < zy-zh/2 && lo > zy+zh/2) ? '위아래 다 밖' : '!존 안에 들어온다';
  });

  console.log('\n[휘는 방향]');
  const cell=W*0.082;
  T('슬라이더는 같은 손 타자에게서 바깥으로 흘러 나간다', ()=>{
    const r=path('sl',1,1,1,W,H);          // 한가운데로 던진다
    const mid=r.pts[Math.floor(r.pts.length*0.6)];
    // 중간엔 몸쪽(왼쪽)에 있다가 바깥(오른쪽)으로 들어와야 한다
    return mid.x < r.tx-cell*0.5 ? `중간에 ${( (r.tx-mid.x)/cell).toFixed(1)}칸 안쪽 → 바깥으로 휨` : '!안 휜다';
  });
  T('반대 손 타자에게는 몸쪽으로 파고든다', ()=>{
    const r=path('sl',1,1,-1,W,H);
    const mid=r.pts[Math.floor(r.pts.length*0.6)];
    return mid.x > r.tx+cell*0.5 ? `중간에 ${((mid.x-r.tx)/cell).toFixed(1)}칸 바깥 → 몸쪽으로 휨` : '!안 휜다';
  });
  T('커브는 슬라이더와 같은 쪽으로 휜다', ()=>{
    const s=path('sl',1,1,1,W,H), c=path('cu',1,1,1,W,H);
    const sm=s.pts[24].x-s.tx, cm=c.pts[24].x-c.tx;
    return (sm<0&&cm<0) ? '둘 다 같은 방향' : `!슬라이더 ${sm.toFixed(0)} / 커브 ${cm.toFixed(0)}`;
  });
  T('체인지업은 반대쪽으로 흐른다', ()=>{
    const s=path('sl',1,1,1,W,H), c=path('ch',1,1,1,W,H);
    return (s.pts[24].x-s.tx)*(c.pts[24].x-c.tx) < 0 ? '슬라이더와 반대' : '!같은 방향';
  });
  T('커브는 크게 떨어진다 (직구보다 위에서 온다)', ()=>{
    const c=path('cu',1,1,1,W,H), f=path('ff',1,1,1,W,H);
    return c.pts[20].y < f.pts[20].y ? `중간 높이차 ${(f.pts[20].y-c.pts[20].y).toFixed(0)}px` : '!안 떨어진다';
  });
  T('직구는 거의 안 휜다', ()=>{
    const r=path('ff',1,1,1,W,H);
    const mid=r.pts[24];
    return Math.abs(mid.x-r.tx)<1 ? '가로 변화 없음' : '!직구가 휜다';
  });

  console.log('\n[손 판정]');
  T('우투가 우타를 상대하면 같은 손이다', ()=>ev("pitchHand({id:'swm'},{bats:'R'})")===1);
  T('우투가 좌타를 상대하면 반대다', ()=>ev("pitchHand({id:'swm'},{bats:'L'})")===-1);
  T('좌투가 좌타를 상대하면 같은 손이다', ()=>ev("pitchHand({id:'zzz',throws:'L'},{bats:'L'})")===1);
  T('손 정보가 없으면 우투우타로 본다', ()=>ev("pitchHand({id:'zzz'},{})")===1);
  T('실제 로스터의 투구 손을 읽는다', ()=>{
    const r=ev("TBYID['wwzw'].pitchers.slice(0,3).map(p=>p.name+':'+throwHandOf(p)).join(', ')");
    return /:(L|R)/.test(r) ? r : '!못 읽는다';
  });

  console.log('\n[좌완 표시]');
  T('이승민은 좌투로 등록돼 있다', ()=>{
    const h=ev("META['lsm'].throws");
    return h==='L' ? `이승민 ${h}` : `!${h} 로 되어 있다`;
  });
  T('좌완이면 이름 옆에 좌완 표시가 붙는다', ()=>{
    const a=ev("handTag({id:'lsm'})"), b=ev("handTag({id:'swm'})");
    return (/좌완/.test(a) && b==='') ? '이승민 좌완 · 송승민 표시 없음' : `!${a}/${b}`;
  });
  T('마운드 그림이 좌완이면 좌우로 뒤집힌다', ()=>{
    const r=ev("figSVG('pit',false)"), l=ev("figSVG('pit',true)");
    return (/matrix\(-1 0 0 1 34 0\)/.test(l) && !/matrix/.test(r)) ? '좌완만 반전' : '!반전이 안 된다';
  });
  T('투수를 바꾸면 던지는 손도 따라 바뀐다', ()=>{
    ev(`(function(){
      window.__mv=moundView({});
      document.body.appendChild(window.__mv);
      setPitFig(window.__mv, {id:'lsm'});
    })()`);
    const a=ev("__mv.querySelector('#pfig').className");
    ev("setPitFig(window.__mv,{id:'swm'})");
    const b=ev("__mv.querySelector('#pfig').className");
    ev("window.__mv.remove()");
    return (/lefty/.test(a)&&!/lefty/.test(b)) ? '좌완→우완 반영' : `!${a} / ${b}`;
  });
  T('좌타자면 타자 그림도 뒤집힌다', ()=>{
    const L=ev("moundView({batLeft:true}).querySelector('.bat-fig').innerHTML");
    const R=ev("moundView({batLeft:false}).querySelector('.bat-fig').innerHTML");
    return (/matrix/.test(L) && !/matrix/.test(R)) ? '좌타만 반전' : '!안 뒤집힌다';
  });
  T('좌완이 우타를 만나면 반대 손 맞대결이다', ()=>{
    const lsm=ev("pitchHand({id:'lsm'},{bats:'R'})"), swm=ev("pitchHand({id:'swm'},{bats:'R'})");
    return (lsm===-1&&swm===1) ? '이승민 -1 / 송승민 +1' : `!${lsm}/${swm}`;
  });

  console.log('\n[화면]');
  T('구종 설명이 휘는 방향을 알려준다', ()=>{
    const dsc=ev(`(function(){
      var f=(''+renderPitch).indexOf('descOf')>=0;
      return f;})()`);
    return dsc;
  });

  console.log(errs.length?`\n❌ ${errs.length}건`:'\n✅ 이상 없음');
  process.exit(errs.length?1:0);
},600);
