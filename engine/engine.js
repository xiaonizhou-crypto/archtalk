/* ArchTalk · 架构讲图 —— 绘图引擎。MIT License, (c) 2026 xiaoni zhou / 心晴九天.
   页面结构：<div id="stage"><svg id="world"></svg><svg id="hud"></svg></div>
   由 archtalk-runtime.js 根据场景描述调用；一般不用直接写。
   键位：→ / 空格 下一镜；← 上一镜；R 重播；H 隐藏图例；L 浅色；A 自动播放；C 口播字幕。?s=5 直达第 5 镜。 */
(function(){
'use strict';
const NS='http://www.w3.org/2000/svg';
const DA=window.DA={};
let world,hudsvg,L={},H={},defs;
function el(tag,attrs={},parent){const e=document.createElementNS(NS,tag);for(const k in attrs){if(attrs[k]!=null)e.setAttribute(k,attrs[k])}if(parent)parent.appendChild(e);return e}
function text(parent,x,y,s,cls,attrs={}){
  const t=el('text',{x,y,class:cls,...attrs},parent);
  const lines=String(s).split('\n');
  if(lines.length===1){t.textContent=s;return t}
  lines.forEach((ln,i)=>{const sp=el('tspan',{x,dy:i?'1.35em':0},t);sp.textContent=ln});
  return t;
}
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=seed||1;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function roughD(x,y,w,h,seed,amp=1.5){
  const r=rng(seed),j=()=>(r()-.5)*2*amp,R=Math.min(16,h/3.2,w/6),f=v=>v.toFixed(1),P=(a,b)=>`${f(a)},${f(b)}`;
  let d=`M${P(x+R+j(),y+j())}`;
  d+=` Q${P(x+w/2+j(),y+j()*1.6)} ${P(x+w-R+j(),y+j())}`;
  d+=` Q${P(x+w+j()*.5,y+j()*.5)} ${P(x+w+j(),y+R+j())}`;
  d+=` Q${P(x+w+j()*1.6,y+h/2+j())} ${P(x+w+j(),y+h-R+j())}`;
  d+=` Q${P(x+w+j()*.5,y+h+j()*.5)} ${P(x+w-R+j(),y+h+j())}`;
  d+=` Q${P(x+w/2+j(),y+h+j()*1.6)} ${P(x+R+j(),y+h+j())}`;
  d+=` Q${P(x+j()*.5,y+h+j()*.5)} ${P(x+j(),y+h-R+j())}`;
  d+=` Q${P(x+j()*1.6,y+h/2+j())} ${P(x+j(),y+R+j())}`;
  d+=` Q${P(x+j()*.5,y+j()*.5)} ${P(x+R+j()+2,y+j())}`;
  return d;
}
function roughBox(parent,x,y,w,h,id,fill=true){
  const g=el('g',{},parent);
  if(fill) el('rect',{x,y,width:w,height:h,rx:12,class:'fill-node'},g);
  el('path',{d:roughD(x,y,w,h,hash(id)),class:'stroke-main draw'},g);
  el('path',{d:roughD(x+.8,y-.6,w,h,hash(id+'#2'),2.2),class:'stroke-ghost draw'},g);
  return g;
}
const MK={call:'blue',fact:'amber',proj:'mint',dep:'dim',cfg:'cfg',evt:'violet'};
const E={},N={},I={},nodes={},frames={},outerTabs=[];
let eyebrow,titleG,counter,legend,info,vig,ticker,pills=[],badgeG,badges=[],brand='';
const onReset=[];

DA.init=function(opt={}){
  brand=opt.brand||'';
  world=document.getElementById('world');hudsvg=document.getElementById('hud');
  defs=el('defs',{},world);
  defs.innerHTML=`
<filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .07 0"/></filter>
<pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" style="fill:var(--grid)"/></pattern>
<radialGradient id="vig" cx="50%" cy="48%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".55"/></radialGradient>
<linearGradient id="topfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--bg);stop-opacity:1"/><stop offset=".72" style="stop-color:var(--bg);stop-opacity:.92"/><stop offset="1" style="stop-color:var(--bg);stop-opacity:0"/></linearGradient>
<linearGradient id="botfade" x1="0" y1="1" x2="0" y2="0"><stop offset="0" style="stop-color:var(--bg);stop-opacity:1"/><stop offset=".6" style="stop-color:var(--bg);stop-opacity:.9"/><stop offset="1" style="stop-color:var(--bg);stop-opacity:0"/></linearGradient>`;
  ['blue','amber','mint','dim','cfg','coral','violet'].forEach(c=>{
    defs.insertAdjacentHTML('beforeend',`<marker id="ar-${c}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1,1.2 L9,5 L1,8.8" fill="none" style="stroke:var(--${c})" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></marker>`);
  });
  el('rect',{x:-2000,y:-2000,width:6000,height:6000,fill:'url(#dots)'},world);
  ['frames','edges','nodes','elabels','notes','badges','particles'].forEach(k=>L[k]=el('g',{id:'L-'+k},world));
  ['fade','header','insets','info','fx'].forEach(k=>H[k]=el('g',{id:'H-'+k},hudsvg));
  el('rect',{x:0,y:0,width:1920,height:150,fill:'url(#topfade)'},H.fade);
  el('rect',{x:0,y:1022,width:1920,height:58,fill:'url(#botfade)'},H.fade);
  vig=el('rect',{width:1920,height:1080,fill:'url(#vig)'},H.fx);
  el('rect',{width:1920,height:1080,filter:'url(#grain)',style:'mix-blend-mode:overlay',opacity:.9},H.fx);
  eyebrow=text(H.header,120,54,'','t-eyebrow');
  titleG=el('g',{},H.header);
  if(opt.mark) text(H.header,1800,1062,opt.mark,'hand',{'text-anchor':'end','font-size':28,style:'fill:var(--ink2)'});
  info=el('g',{id:'hudinfo'},H.info);
  counter=text(info,1640,1062,'','mono',{'text-anchor':'end','font-size':15,style:'fill:var(--dim)'});
  legend=el('g',{},info);
  (opt.legend||[['call','调用'],['fact','写入事实'],['proj','投影 / 读取'],['dep','依赖'],['evt','事件 / 通知']]).forEach(([t,s],i)=>{
    const x=120+i*200;
    el('path',{d:`M${x},1056 L${x+46},1056`,class:`edge ${t} on`,style:'opacity:.9'},legend);
    text(legend,x+58,1062,s,'t-small');
  });
  badgeG=el('g',{class:'badges'},L.badges);
  ticker=el('g',{class:'ticker'},H.insets);
};
function setTitle(s){
  titleG.innerHTML='';
  const parts=s.split(/(\[[^\]]+\])/).filter(Boolean);let x=120;
  parts.forEach(p=>{
    const hi=p.startsWith('[');const str=hi?p.slice(1,-1):p;
    if(hi){
      const g=el('g',{},titleG);const r=el('rect',{y:68,height:62,rx:31,style:'fill:var(--mint);fill-opacity:.16;stroke:var(--mint);stroke-width:2'},g);
      const t=text(g,x+20,114,str,'t-title',{style:'fill:var(--mint)'});const w=t.getComputedTextLength();
      r.setAttribute('x',x+4);r.setAttribute('width',w+32);x+=w+44;
    }else{const t=text(titleG,x,114,str,'t-title');x+=t.getComputedTextLength()+4}
  });
}
DA.frame=function(id,x,y,w,h,label,keys,cls=''){
  const g=el('g',{class:`frame dimmable ${cls}`,'data-k':keys,id:'f-'+id},L.frames);
  roughBox(g,x,y,w,h,id,false);
  if(label) text(g,x+22,y+34,label,'t-mod');
  frames[id]={g,x,y,w,h};return g;
};
/* 外框：虚线大框，标签压在上边线 */
DA.outer=function(id,x,y,w,h,label,keys,color='mint'){
  const g=DA.frame(id,x,y,w,h,'',keys,'outer');
  const t=el('g',{class:'dimmable','data-k':keys},L.frames);
  const lab=text(t,x+28,y+10,label,'t-mod',{style:`fill:var(--${color})`});
  t._fit=()=>{const b=lab.getBBox();const r=el('rect',{x:b.x-12,y:b.y-2,width:b.width+24,height:b.height+4,style:'fill:var(--bg)'});t.insertBefore(r,lab)};
  outerTabs.push(t);return g;
};
DA.node=function(id,x,y,w,h,label,sub,keys,size=24){
  const g=el('g',{class:'node dimmable','data-k':keys+' '+id,id:'n-'+id},L.nodes);
  roughBox(g,x,y,w,h,id);
  const big=h>=80;
  text(g,x+w/2,y+(sub?(big?h*.44:h*.45):h*.6),label,'t-label',{'text-anchor':'middle','font-size':size});
  if(sub) text(g,x+w/2,y+(big?h*.76:h*.82),sub,'t-sub',{'text-anchor':'middle','font-size':big?19:16});
  nodes[id]={g,x,y,w,h};return g;
};
DA.edge=function(id,d,type,label,lp=.5,dx=0,dy=-12){
  const p=el('path',{d,class:`edge ${type}`,id:'e-'+id,'marker-end':`url(#ar-${MK[type]})`},L.edges);
  let lab=null;
  if(label){
    lab=el('g',{class:'elabel'},L.elabels);
    const len=p.getTotalLength(),pt=p.getPointAtLength(len*lp);
    const bg=el('rect',{rx:6},lab);
    const t=text(lab,pt.x+dx,pt.y+dy,label,'t-elabel',{'text-anchor':'middle',style:`fill:var(--${MK[type]==='dim'?'ink2':MK[type]})`});
    lab._fit=()=>{const b=t.getBBox();bg.setAttribute('x',b.x-6);bg.setAttribute('y',b.y-2);bg.setAttribute('width',b.width+12);bg.setAttribute('height',b.height+4)};
  }
  E[id]={p,type,lab,len:p.getTotalLength()};return p;
};
DA.note=function(id,x,y,s,color='amber',size=23,anchor='start'){
  const g=el('g',{class:'note',id:'note-'+id},L.notes);
  const bg=el('rect',{class:'bg',rx:8},g);
  const t=text(g,x,y,s,'t-note',{style:`fill:var(--${color})`,'font-size':size,'text-anchor':anchor});
  g._fit=()=>{const b=t.getBBox();bg.setAttribute('x',b.x-10);bg.setAttribute('y',b.y-6);bg.setAttribute('width',b.width+20);bg.setAttribute('height',b.height+12)};
  N[id]=g;return g;
};
DA.inset=function(id,x,y,w,h,ttl){
  const g=el('g',{class:'inset',id:'inset-'+id},H.insets);
  el('rect',{x,y,width:w,height:h,rx:16,class:'ibg'},g);
  el('path',{d:roughD(x,y,w,h,hash(id),1.2),class:'stroke-ghost'},g);
  if(ttl) text(g,x+28,y+46,ttl,'hand',{'font-size':30});
  I[id]=g;return g;
};
DA.chip=function(parent,x,y,w,h,s,id,size=19,cls=''){
  const g=el('g',{class:'chip '+cls},parent);
  if(id) g.id=id;
  el('rect',{x,y,width:w,height:h,rx:10},g);
  text(g,x+w/2,y+h/2+size*.36,s,'mono',{'text-anchor':'middle','font-size':size});
  return g;
};
DA.arrow=function(parent,d,color='ink2',dash=null){
  return el('path',{d,fill:'none',style:`stroke:var(--${color})`,'stroke-width':2,'stroke-linecap':'round','stroke-dasharray':dash||'none','marker-end':`url(#ar-${color==='ink2'?'dim':color})`},parent);
};
/* 状态归属表：rows = [[tag,color,module,owns,boundary],...] */
DA.ownerTable=function(id,rows,opt={}){
  const x=opt.x||150,y=opt.y||150,w=opt.w||1620,rh=opt.rh||Math.min(96,Math.floor((866-90)/rows.length));
  const g=DA.inset(id,x,y,w,90+rows.length*rh,'');
  const c1=x+32,c2=x+90,c3=x+(opt.c3||480),c4=x+(opt.c4||1040);
  text(g,c1,y+54,'模块','hand',{'font-size':22,style:'fill:var(--ink2)'});
  text(g,c3,y+54,'它拥有的状态','hand',{'font-size':22,style:'fill:var(--ink2)'});
  text(g,c4,y+54,'不能混的边界','hand',{'font-size':22,style:'fill:var(--ink2)'});
  rows.forEach(([n,col,m,own,bd],i)=>{
    const yy=y+76+i*rh;
    const r=el('g',{class:'row',id:`${id}-${i}`},g);
    el('line',{x1:x+24,x2:x+w-24,y1:yy,y2:yy,style:'stroke:var(--dim);stroke-opacity:.35'},r);
    const by=yy+rh*.62;
    text(r,c1,by+2,n,'hand',{'font-size':28,style:`fill:var(--${col})`});
    text(r,c2,by,m,'mono',{'font-size':opt.ms||23});
    text(r,c3,by,own,'hand',{'font-size':opt.fs||22});
    text(r,c4,by,bd,'hand',{'font-size':opt.fs||22,style:'fill:var(--amber)'});
  });
  return g;
};
DA.revealRows=function(id,n,step=600,start=300){for(let i=0;i<n;i++) after(start+i*step,()=>cls(`${id}-${i}`,'on',true))};
DA.setTicker=function(labels,opt={}){
  const x0=opt.x||990,y=opt.y||232,w=opt.w||152,gap=opt.gap||12;
  pills=labels.map((s,i)=>{
    const g=el('g',{class:'pill'},ticker);
    el('rect',{x:x0+i*(w+gap),y,width:w,height:36,rx:18},g);
    text(g,x0+i*(w+gap)+w/2,y+25,s,'hand',{'text-anchor':'middle','font-size':opt.size||18});
    return g;
  });
};
DA.setBadges=function(pts){
  badges=pts.map(([x,y],i)=>{
    const g=el('g',{class:'badge'},badgeG);
    el('circle',{cx:x,cy:y,r:16},g);
    text(g,x,y+6,String(i+1),'mono',{'text-anchor':'middle','font-size':17,'font-weight':700});
    return g;
  });
};
DA.step=function(i){pills.forEach((p,k)=>{p.classList.toggle('on',k===i);p.classList.toggle('done',k<i)});badges.forEach((b,k)=>b.classList.toggle('on',k===i))};

/* ---------- particles ---------- */
let parts=[],paused=false;
const COL={call:'blue',fact:'amber',proj:'mint',dep:'dim',cfg:'cfg',evt:'violet'};
function spawn(eid,o={}){
  const e=typeof eid==='string'?E[eid]:eid; if(!e) return;
  const color=o.color||COL[e.type];
  const g=el('g',{},L.particles);
  const dots=el('g',{filter:'url(#glow)'},g);
  const n=o.tail??5,size=o.size||5.5;
  const cs=[];for(let i=0;i<=n;i++) cs.push(el('circle',{r:Math.max(1,size*(1-i/(n+1.5))),style:`fill:var(--${color})`,opacity:i?0.55*(1-i/(n+1)):1},dots));
  let lab=null;
  if(o.label){
    lab=el('g',{class:'pkt'},g);
    const r=el('rect',{rx:6,style:`stroke:var(--${color})`},lab);
    const t=text(lab,0,0,o.label,'',{style:`fill:var(--${color})`});
    const w=t.getComputedTextLength();r.setAttribute('x',-6);r.setAttribute('y',-15);r.setAttribute('width',w+12);r.setAttribute('height',21);
    lab._dx=o.ldx??12;lab._dy=o.ldy??-12;
  }
  const p={e,g,cs,lab,t0:performance.now()+(o.delay||0),dur:o.dur||1800,loop:!!o.loop,gap:o.gap??.35,rev:!!o.rev,ease:o.ease||'lin',onDone:o.onDone,dead:false};
  g.style.opacity=0;parts.push(p);return p;
}
function clearParts(){parts.forEach(p=>p.g.remove());parts=[]}
const ez={lin:t=>t,io:t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2};
const FULL=[0,0,1920,1080];
const SHOT=new URLSearchParams(location.search).get('shot')==='1';
let cam=FULL.slice(),camAnim=null;
function camTo(r,ms=1100){if(ms<=0){cam=r.slice();camAnim=null;world.setAttribute('viewBox',cam.join(' '));return}camAnim={from:cam.slice(),to:r.slice(),t0:performance.now(),ms}}
function frameLoop(now){
  if(paused){requestAnimationFrame(frameLoop);return}
  if(camAnim){const t=Math.min(1,(now-camAnim.t0)/camAnim.ms),e=ez.io(t);cam=camAnim.from.map((v,i)=>v+(camAnim.to[i]-v)*e);world.setAttribute('viewBox',cam.map(v=>v.toFixed(2)).join(' '));if(t>=1)camAnim=null}
  for(const p of parts){
    if(p.dead) continue;
    let t=(now-p.t0)/p.dur;
    if(t<0){p.g.style.opacity=0;continue}
    if(t>1){
      if(p.loop){p.t0+=p.dur*(1+p.gap);t=(now-p.t0)/p.dur;if(t<0){p.g.style.opacity=0;continue}}
      else{p.dead=true;p.g.remove();p.onDone&&p.onDone();continue}
    }
    p.g.style.opacity=1;
    let head=null;
    p.cs.forEach((c,i)=>{
      let tt=Math.max(0,ez[p.ease](t)-i*0.018);
      if(p.rev) tt=1-tt;
      const pt=p.e.p.getPointAtLength(p.e.len*tt);
      if(!i) head=pt;
      c.setAttribute('cx',pt.x);c.setAttribute('cy',pt.y);
    });
    if(p.lab&&head) p.lab.setAttribute('transform',`translate(${(head.x+p.lab._dx).toFixed(1)},${(head.y+p.lab._dy).toFixed(1)})`);
  }
  parts=parts.filter(p=>!p.dead);
  requestAnimationFrame(frameLoop);
}
function flow(ids,o={}){ids.forEach(id=>{const k=o.count||2,d=o.dur||2200,gp=o.gap??.2;for(let i=0;i<k;i++) spawn(id,{loop:true,dur:d,gap:gp,delay:i*d*(1+gp)/k+(o.delay||0),size:o.size||5,tail:o.tail??5,color:o.color,label:(o.labels&&i===0)?o.labels[id]:null})})}
/* 依次走一串边：chain([['e1',{label,pre,post}],['e2',{rev:true}]],done) */
function chain(list,done){
  const step=i=>{if(i>=list.length){done&&done();return}const [id,o={}]=list[i];o.pre&&o.pre();spawn(id,{ease:'io',size:7,dur:900,...o,onDone:()=>{o.post&&o.post();step(i+1)}})};
  step(0);
}

/* ---------- timers & helpers ---------- */
let timers=[];
function after(ms,fn){timers.push(setTimeout(fn,ms))}
function every(ms,fn){fn();timers.push(setInterval(fn,ms))}
function clearTimers(){timers.forEach(t=>{clearTimeout(t);clearInterval(t)});timers=[]}
const $=id=>document.getElementById(id);
const cls=(id,c,on)=>{const e=typeof id==='string'?$(id):id;if(e)e.classList.toggle(c,on)};
function flash(id,ms=700){cls(id,'flash',true);after(ms,()=>cls(id,'flash',false))}
function bar(id,w,ms,x){const b=$(id);if(!b)return;if(x!=null)b.setAttribute('x',x);if(ms<=0){b.style.transition='none';b.setAttribute('width',w);return}b.getBoundingClientRect();b.style.transition=`width ${ms}ms linear`;b.setAttribute('width',w)}

/* ---------- tape (append-only log) ---------- */
let tape=null,tcfg=null,tapeSeq=0,tapeCells=[];
DA.setTape=function(cfg){tcfg={x:650,y:692,w:58,gap:8,max:17,h:52,...cfg};tape=el('g',{class:'dimmable','data-k':cfg.keys||'',id:'tape'},L.nodes)};
function tapePos(i,dy=0){return `translate(${tcfg.x+i*(tcfg.w+tcfg.gap)}px,${tcfg.y+dy}px)`}
function tapeReset(){if(!tape)return;tape.innerHTML='';tapeCells=[];tapeSeq=0}
function tapeAppend(kind,color,animate=true){
  if(!tape)return;tapeSeq++;
  const g=el('g',{class:'cell'},tape);
  el('rect',{x:0,y:0,width:tcfg.w,height:tcfg.h,rx:8,style:`fill:var(--${color});fill-opacity:.16;stroke:var(--${color});stroke-width:1.6`},g);
  text(g,tcfg.w/2,tcfg.h*.38,'#'+tapeSeq,'mono',{'text-anchor':'middle','font-size':12,style:'fill:var(--ink2)'});
  text(g,tcfg.w/2,tcfg.h*.77,kind,'mono',{'text-anchor':'middle','font-size':13});
  tapeCells.push(g);
  if(tapeCells.length>tcfg.max){const old=tapeCells.shift();old.style.opacity=0;setTimeout(()=>old.remove(),500)}
  tapeCells.forEach((c,i)=>{if(c!==g)c.style.transform=tapePos(i)});
  const last=tapeCells.length-1;
  if(!animate){g.style.transform=tapePos(last);return g}
  g.style.transition='none';g.style.opacity=0;g.style.transform=tapePos(last,-22);
  g.getBoundingClientRect();g.style.transition='';
  requestAnimationFrame(()=>{g.style.opacity=1;g.style.transform=tapePos(last)});
  return g;
}
function tapeSeed(list,n){for(let i=0;i<n;i++){const k=list[i%list.length];tapeAppend(k[0],k[1],false)}}

/* ---------- scene engine ---------- */
function drawIn(groups){
  groups.forEach((keys,gi)=>{
    document.querySelectorAll('#world .dimmable').forEach(d=>{
      const k=(d.dataset.k||'').split(' ');
      if(!keys.some(x=>k.includes(x))) return;
      d.querySelectorAll('.draw').forEach(p=>{
        const len=p.getTotalLength();p.style.transition='none';p.style.strokeDasharray=len;p.style.strokeDashoffset=len;
        p.getBoundingClientRect();
        after(120+gi*600,()=>{p.style.transition='stroke-dashoffset 1.3s ease';p.style.strokeDashoffset=0});
      });
      d.querySelectorAll('text').forEach(t=>{t.style.transition='none';t.style.opacity=0;after(500+gi*600,()=>{t.style.transition='opacity .8s';t.style.opacity=1})});
    });
  });
  after(groups.length*600+1700,undraw);
}
function undraw(){document.querySelectorAll('.draw').forEach(p=>{p.style.transition='none';p.style.strokeDasharray='';p.style.strokeDashoffset=''});document.querySelectorAll('#world .dimmable text').forEach(t=>{t.style.transition='';t.style.opacity=''})}
function resetStates(){
  document.querySelectorAll('.node,.frame').forEach(n=>n.classList.remove('failed','off','flash','mount','state-gone','lit'));
  document.querySelectorAll('.chip').forEach(c=>{if(!c.classList.contains('keep'))c.classList.remove('on','gone','ok','warn')});
  document.querySelectorAll('.edge').forEach(e=>e.classList.remove('warn'));
  document.querySelectorAll('.row,.fade').forEach(r=>{if(!r.classList.contains('keep'))r.classList.remove('on')});
  pills.forEach(p=>p.classList.remove('on','done'));
  badges.forEach(b=>b.classList.remove('on'));
  onReset.forEach(f=>f());
}
DA.onReset=f=>onReset.push(f);
let S=[],cur=-1,auto=null,ALL=[];
function keysOf(e){return (e.dataset.k||'').split(' ').filter(Boolean)}
function go(i,replay=false){
  i=Math.max(0,Math.min(S.length-1,i));
  if(i===cur&&!replay) return;
  clearTimers();clearParts();resetStates();undraw();
  cur=i;const s=S[i];
  history.replaceState(null,'',`?s=${i+1}`);
  eyebrow.textContent=`${brand?brand+' · ':''}${String(i+1).padStart(2,'0')} / ${S.length} · ${s.k}`;
  DA.onScene&&DA.onScene(i,s);
  setTitle(s.t);
  counter.textContent=`${String(i+1).padStart(2,'0')} / ${S.length}   ← →`;
  const focus=s.focus||ALL,half=s.half||[];
  document.querySelectorAll('#world .dimmable').forEach(d=>{
    const k=keysOf(d);
    const f=k.some(x=>focus.includes(x)),h=!f&&k.some(x=>half.includes(x));
    d.classList.toggle('dim',!f&&!h);d.classList.toggle('half',h);
  });
  (s.lit||[]).forEach(id=>{const e=$('f-'+id)||$('n-'+id);if(e)e.classList.add('lit')});
  for(const id in E){const on=(s.edges||[]).includes(id);E[id].p.classList.toggle('on',on);if(E[id].lab)E[id].lab.classList.toggle('on',on)}
  for(const id in N) N[id].classList.toggle('on',(s.notes||[]).includes(id));
  for(const id in I) I[id].classList.toggle('on',(s.insets||[]).includes(id));
  ticker.classList.toggle('on',!!s.ticker);
  badgeG.classList.toggle('on',!!s.badges);
  legend.classList.toggle('legend-pulse',!!s.legend);
  if(!s.keepTape) tapeReset();
  camTo(s.cam||FULL,SHOT?0:900);
  s.enter&&s.enter();
}
function fit(){const st=document.getElementById('stage');const sc=Math.min(innerWidth/1920,innerHeight/1080);st.style.transform=`translate(${(innerWidth-1920*sc)/2}px,${(innerHeight-1080*sc)/2}px) scale(${sc})`}
DA.start=function(scenes,all){
  S=scenes;ALL=all;
  addEventListener('resize',fit);fit();
  addEventListener('keydown',e=>{
    if(['ArrowRight',' ','PageDown','Enter'].includes(e.key)){e.preventDefault();go(cur+1)}
    else if(['ArrowLeft','PageUp','Backspace'].includes(e.key)){e.preventDefault();go(cur-1)}
    else if(e.key==='Home') go(0); else if(e.key==='End') go(S.length-1);
    else if(e.key==='r'||e.key==='R') go(cur,true);
    else if(e.key==='h'||e.key==='H') info.classList.toggle('hide');
    else if(e.key==='l'||e.key==='L'){document.body.classList.toggle('light');document.getElementById('stage').classList.toggle('light');vig.style.display=document.body.classList.contains('light')?'none':''}
    else if(e.key==='a'||e.key==='A'){if(auto){clearInterval(auto);auto=null}else auto=setInterval(()=>go(cur+1>=S.length?0:cur+1),14000)}
    else DA.onKey&&DA.onKey(e);
  });
  addEventListener('click',()=>go(cur+1));
  window.__go=i=>{paused=false;document.getAnimations().forEach(a=>a.play());go(i,true)};window.__S=S;
  window.__freeze=()=>{clearTimers();paused=true;document.getAnimations().forEach(a=>a.pause())};
  requestAnimationFrame(frameLoop);
  (document.fonts?document.fonts.ready:Promise.resolve()).then(()=>{
    for(const id in E) E[id].lab&&E[id].lab._fit();
    for(const id in N) N[id]._fit();
    outerTabs.forEach(t=>t._fit());
    const q=new URLSearchParams(location.search);const s0=+(q.get('s')||1)-1;
    if(DA.beforeFirst&&DA.beforeFirst()===false) return;
    go(isNaN(s0)?0:s0);
  });
};
DA.go=go;
Object.assign(DA,{el,text,roughD,hash,spawn,flow,chain,clearParts,camTo,FULL,after,every,clearTimers,$,cls,flash,bar,tapeAppend,tapeReset,tapeSeed,drawIn,E,N,I,nodes,frames,H,L});
})();
