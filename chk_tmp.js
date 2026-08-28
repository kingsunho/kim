const {JSDOM,VirtualConsole}=require('jsdom');
const html=require('fs').readFileSync('index.html','utf8');
const vc=new VirtualConsole();
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc});
const w=dom.window,d=w.document; w.scrollTo=()=>{}; w.confirm=()=>true;
setTimeout(()=>{
  d.querySelectorAll('.pickcard')[0].click();
  setTimeout(()=>{
    [...d.querySelectorAll('#view .btn')].find(b=>b.textContent==='이 선수로 시작').click();
    setTimeout(()=>{
      const r=w.eval(`(function(){
        ST.tutDone=true; ST.mode='player'; ST.playerId='ksh'; MYID='ksh';
        var out=[];
        /* ① 원본 상수값 */
        var base={}; TBYID['wwzw'].players.forEach(function(p){
          base[p.id]={con:p.con,pow:p.pow,eye:p.eye,spd:p.spd,def:p.def,arm:p.arm}; });
        /* ② 고교 팀 — 실존 동급생이 어른 능력치를 들고 있나 */
        var T=hsTeamOf('gunpo', 2017, ST.seed||1, 'ksh', 0);
        var swm=T.players.find(function(x){return x.id==='swm'});
        out.push('고교 송승민 컨택 '+(swm?swm.con:'-')+' (어른 '+base['swm'].con+')');
        var meHs=hsTeamOf('heung',2017,ST.seed||1,'ksh',0).players.find(function(x){return x.id==='ksh'});
        out.push('고교 나(김선호) 컨택 '+(meHs?meHs.con:'-')+' (어른 '+base['ksh'].con+')');
        /* ③ 졸업 시뮬 — 내 능력치만 바뀌나 */
        ST.hsRatings={con:34,pow:30,eye:28,spd:31,def:29,arm:30};
        applyHsStart();
        var changed=[];
        TBYID['wwzw'].players.forEach(function(p){
          var b=base[p.id];
          if(['con','pow','eye','spd','def','arm'].some(function(k){return Math.abs(p[k]-b[k])>0.01}))
            changed.push(p.id+'('+p.name+')');
        });
        out.push('졸업 후 값이 바뀐 사람: '+(changed.join(', ')||'없음'));
        return out.join('\\n');
      })()`);
      console.log(r);
    },700);
  },200);
},1400);
