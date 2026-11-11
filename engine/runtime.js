/* ArchTalk · 架构讲图 —— 场景描述运行时。MIT License, (c) 2026 xiaoni zhou / 心晴九天.
   读 window.ARCHTALK_SPEC（格式见 reference/spec.md），自动排版模块和节点、连线、注释、浮层，
   再把每个镜头交给 engine.js 播放。?check=1 时不播放，只做版面自检并把结果写进 #archtalk-report。 */
(function(){
'use strict';
const SPEC=window.ARCHTALK_SPEC;
const {el,text,spawn,after,every,$,cls,flash,bar,camTo,FULL,E,N,I}=DA;
const X0=90,X1=1830,Y0=230,Y1=1010;
const LEGEND={call:'调用',fact:'写入事实',proj:'投影 / 读取',dep:'依赖',cfg:'配置',evt:'事件 / 通知'};
const Q=new URLSearchParams(location.search);
const CHECK=Q.get('check')==='1';
// ?shot=1：截图用，关掉 CSS 过渡（无头浏览器的虚拟时间推不动过渡），状态变化立刻到位
if(Q.get('shot')==='1'){const st=document.createElement('style');st.textContent='*{transition:none!important}';document.head.appendChild(st)}
const issues=[];
const warn=(where,msg)=>issues.push({where,msg});

/* ---------- 文字宽度估算与换行 ---------- */
function charW(c,size){return /[⺀-￯]/.test(c)?size:size*0.58}
function estW(s,size){let w=0;for(const c of String(s))w+=charW(c,size);return w}
function wrap(s,maxW,size){
  const out=[];
  String(s).split('\n').forEach(par=>{
    let line='',w=0;
    for(const c of par){
      const cw=charW(c,size);
      if(w+cw>maxW&&line){out.push(line);line='';w=0}
      line+=c;w+=cw;
    }
    out.push(line);
  });
  return out.join('\n');
}
function fitSize(s,maxW,max,min){let size=max;while(size>min&&estW(s,size)>maxW)size--;return size}

/* ---------- 初始化 ---------- */
const legend=(SPEC.legend||['call','fact','proj']).map(t=>Array.isArray(t)?t:[t,LEGEND[t]||t]);
DA.init({brand:SPEC.eyebrow||'',mark:SPEC.brand||'',legend});

/* ---------- 排版：行 → 模块 → 节点 ---------- */
const box={};          // id → {x,y,w,h,kind,module}
const moduleOf={};     // 节点 id → 所在模块 id
const ALL=[];
const LAY=SPEC.layout||{};
const rows=LAY.rows||[];
const gapY=LAY.gapY!=null?LAY.gapY:26,gapX=LAY.gapX!=null?LAY.gapX:28;
const top=LAY.top||Y0;
const sumH=rows.reduce((a,r)=>a+(r.h||1),0)||1;
const availH=Y1-top-gapY*Math.max(0,rows.length-1);
let cy=top;
rows.forEach(r=>{
  const rh=availH*(r.h||1)/sumH;
  const mods=r.modules||[];
  const sumS=mods.reduce((a,m)=>a+(m.span||1),0)||1;
  const availW=(X1-X0)-gapX*Math.max(0,mods.length-1);
  let cx=X0;
  mods.forEach(m=>{const mw=availW*(m.span||1)/sumS;placeModule(m,cx,cy,mw,rh);cx+=mw+gapX});
  cy+=rh+gapY;
});
function placeModule(m,x,y,w,h){
  ALL.push(m.id);
  const framed=m.frame!==false;
  box[m.id]={x,y,w,h,kind:'module'};
  const outer=framed&&m.style==='outer';
  if(outer) DA.outer(m.id,x,y,w,h,m.label||'',m.id,m.color||'mint');
  else if(framed) DA.frame(m.id,x,y,w,h,m.label||'',m.id);
  const ns=m.nodes||[];
  if(!ns.length) return;
  const pad=framed?20:0,head=outer?10:(framed&&m.label?48:0);
  const ix=x+pad,iy=y+pad+head,iw=w-pad*2,ih=h-pad*2-head;
  const gap=m.gap!=null?m.gap:24;
  const sumW=ns.reduce((a,n)=>a+(n.w||1),0);
  if((m.dir||'row')==='row'){
    const nh=Math.min(ih,m.nodeH||96);
    const ny=iy+(ih-nh)/2;
    const avail=iw-gap*(ns.length-1);
    let nx=ix;
    ns.forEach(n=>{const nw=avail*(n.w||1)/sumW;placeNode(n,m,nx,ny,nw,nh);nx+=nw+gap});
  }else{
    const nh=Math.min((ih-gap*(ns.length-1))/ns.length,m.nodeH||96);
    const total=nh*ns.length+gap*(ns.length-1);
    let ny=iy+(ih-total)/2;
    ns.forEach(n=>{placeNode(n,m,ix,ny,iw,nh);ny+=nh+gap});
  }
}
function placeNode(n,m,x,y,w,h){
  if(n.spacer) return; // 占位：留出空白给注释
  moduleOf[n.id]=m.id;
  box[n.id]={x,y,w,h,kind:'node',module:m.id};
  const big=h>=80,subSize=big?19:16;
  const size=n.size||fitSize(n.label,w-24,big?26:22,13);
  const subFits=!n.sub||h>=58;
  if(!subFits) warn('node '+n.id,`节点只有 ${Math.round(h)}px 高，放不下副标题，已省略；调大这一行的 h 或模块的 nodeH`);
  DA.node(n.id,x,y,w,h,n.label,subFits?(n.sub||''):'',m.id,size);
  if(subFits&&n.sub&&estW(n.sub,subSize)>w-16) warn('node '+n.id,`副标题"${n.sub}"太长，节点里放不下；缩短副标题或加宽节点`);
  if(estW(n.label,size)>w-16) warn('node '+n.id,`标题"${n.label}"太长，字号缩到 ${size} 仍放不下`);
  if(h<44) warn('node '+n.id,`节点只有 ${Math.round(h)}px 高，太挤；减少这一列的节点或调大这一行的 h`);
}

/* ---------- 连线：自动走线 ---------- */
const edgeEnds={};
(SPEC.edges||[]).forEach(e=>{
  const A=box[e.from],B=box[e.to];
  if(!A||!B){warn('edge '+e.id,`连线两端 ${e.from} → ${e.to} 找不到`);return}
  edgeEnds[e.id]=[e.from,e.to];
  let d,lx=0,ly=-12;
  if(e.d){d=e.d}else{
    const ac={x:A.x+A.w/2,y:A.y+A.h/2},bc={x:B.x+B.w/2,y:B.y+B.h/2};
    const dx=bc.x-ac.x,dy=bc.y-ac.y;
    const horiz=e.dir?e.dir==='h':Math.abs(dx)/((A.w+B.w)/2||1)>=Math.abs(dy)/((A.h+B.h)/2||1);
    const bend=e.bend||0;
    if(horiz){
      const s=dx>=0?1:-1;
      const sx=s>0?A.x+A.w:A.x,tx=s>0?B.x:B.x+B.w;
      const sy=ac.y+(e.fromOffset||0),ty=bc.y+(e.toOffset||0);
      const k=Math.max(40,Math.abs(tx-sx)*.45);
      d=`M${sx},${sy} C${sx+s*k},${sy+bend} ${tx-s*k},${ty+bend} ${tx},${ty}`;
    }else{
      const s=dy>=0?1:-1;
      const sy=s>0?A.y+A.h:A.y,ty=s>0?B.y:B.y+B.h;
      // 起点尽量对准终点的横坐标：宽节点（比如一整行的日志）往下连时走直线，不从中间斜拉
      const clamp=(v,b)=>Math.max(b.x+18,Math.min(b.x+b.w-18,v));
      const sx=clamp(bc.x,A)+(e.fromOffset||0),tx=clamp(sx,B)+(e.toOffset||0);
      const k=Math.max(30,Math.abs(ty-sy)*.45);
      d=`M${sx},${sy} C${sx+bend},${sy+s*k} ${tx+bend},${ty-s*k} ${tx},${ty}`;
      lx=e.label?estW(e.label,17)/2+14:0;ly=4;
    }
  }
  DA.edge(e.id,d,e.type||'call',e.label||'',e.labelAt!=null?e.labelAt:.5,e.lx!=null?e.lx:lx,e.ly!=null?e.ly:ly);
});

/* ---------- 注释（挂在节点或模块旁边） ---------- */
function placeNote(id,n){
  const color=n.color||'amber',size=n.size||22;
  let x=n.x,y=n.y,anchor='start';
  if(x==null||y==null){
    const b=box[n.at];
    if(!b){warn('note '+id,`注释挂靠的 ${n.at} 找不到`);return}
    const pos=n.pos||'below';
    if(pos==='below'){x=b.x+4;y=b.y+b.h+30}
    else if(pos==='above'){x=b.x+4;y=b.y-14}
    else if(pos==='right'){x=b.x+b.w+18;y=b.y+b.h/2+8}
    else if(pos==='left'){x=b.x-18;y=b.y+b.h/2+8;anchor='end'}
    else if(pos==='inside'){x=b.x+22;y=b.y+b.h-18}
  }
  const s=n.width?wrap(n.text,n.width,size):n.text;
  DA.note(id,x,y,s,color,size,anchor);
}

/* ---------- 浮层 ---------- */
const PLACES={full:[160,160,1600,850],center:[300,290,1320,500],bottom:[90,600,1740,410],right:[880,250,950,760],left:[90,250,950,760]};
const insetEnter={},insetPlace={};
function reveal(ids,step,start=300){ids.forEach((id,i)=>after(start+i*step,()=>cls(id,'on',true)))}
const BUILD={
  /* 大字论点：lines = [{text, color, size}]；hero:true 时第一行当大标题 */
  text(g,ins,x,y,w,h,id){
    const ids=[];let yy=y+10;
    (ins.lines||[]).forEach((ln,i)=>{
      const L=typeof ln==='string'?{text:ln}:ln;
      const hero=i===0&&ins.hero;
      const size=L.size||(hero?52:28);
      const s=wrap(L.text,w-(hero?72:120),size);
      const m=el('g',{class:'fade',id:`${id}-${i}`},g);
      if(!hero) el('circle',{cx:x+48,cy:yy+size*0.2,r:7,style:`fill:var(--${L.color||'blue'})`},m);
      text(m,x+(hero?36:72),yy+size*0.55,s,'hand',{'font-size':size,style:`fill:var(--${hero?(L.color||'mint'):'ink'})`});
      yy+=s.split('\n').length*size*1.4+(hero?26:18);
      ids.push(`${id}-${i}`);
    });
    if(yy>y+h+20) warn('inset '+id,'文字超出浮层：删几行，或换 place:"full"');
    return ()=>reveal(ids,ins.step||1300,400);
  },
  /* 卡片：items = [{head, text, color}] */
  cards(g,ins,x,y,w,h,id){
    const items=ins.items||[],n=items.length||1;
    const gap=16,foot=ins.footer?60:0,ch=Math.min(150,(h-foot-gap*(n-1)-10)/n);
    const ids=[];
    const hs=Math.min(34,ch*0.32);
    const headW=Math.max(...items.map(it=>estW(it.head||'',hs)),0)+44;
    items.forEach((it,i)=>{
      const cy=y+i*(ch+gap);
      const m=el('g',{class:'fade',id:`${id}-${i}`},g);
      const c=it.color||'blue';
      el('rect',{x:x+36,y:cy,width:w-72,height:ch,rx:14,style:`fill:var(--${c});fill-opacity:.07;stroke:var(--${c})`},m);
      text(m,x+64,cy+ch/2+hs*0.35,it.head||'','hand',{'font-size':hs,style:'fill:var(--amber)'});
      const ts=Math.min(23,ch*0.2);
      const body=wrap(it.text||'',w-72-headW-64,ts);
      const lines=body.split('\n').length;
      text(m,x+64+headW,cy+ch/2-(lines-1)*ts*0.68+ts*0.35,body,'hand',{'font-size':ts});
      if(lines*ts*1.4>ch-8) warn('inset '+id,`第 ${i+1} 张卡片字太多，放不下`);
      ids.push(`${id}-${i}`);
    });
    if(ins.footer){const m=el('g',{class:'fade',id:`${id}-f`},g);text(m,x+36,y+n*(ch+gap)+34,wrap(ins.footer,w-72,23),'hand',{'font-size':23,style:`fill:var(--${ins.footerColor||'coral'})`});ids.push(`${id}-f`)}
    return ()=>reveal(ids,ins.step||1100,400);
  },
  /* 步骤链：steps = [{label, lock}]；lines = 下方说明 */
  steps(g,ins,x,y,w,h,id){
    const steps=ins.steps||[];
    const size=ins.size||17,gap=18,pad=30;
    let cx=x+36,cy=y+4;const ids=[];
    steps.forEach((st,i)=>{
      const S=typeof st==='string'?{label:st}:st;
      const cw=estW(S.label,size)+pad;
      if(cx+cw>x+w-36){cx=x+36;cy+=66}
      DA.chip(g,cx,cy,cw,46,S.label,`${id}-c${i}`,size,S.lock?'lock':'');
      const nx=cx+cw+gap;
      const nextW=i<steps.length-1?estW((typeof steps[i+1]==='string'?steps[i+1]:steps[i+1].label),size)+pad:0;
      if(i<steps.length-1&&nx+nextW<=x+w-36) DA.arrow(g,`M${cx+cw+3},${cy+23} L${nx-3},${cy+23}`);
      ids.push(`${id}-c${i}`);cx=nx;
    });
    let ly=cy+46+50;const lids=[];
    (ins.lines||[]).forEach((ln,i)=>{
      const L=typeof ln==='string'?{text:ln}:ln;
      const sz=L.size||21;
      const s=wrap(L.text,w-72,sz);
      const m=el('g',{class:'fade',id:`${id}-l${i}`},g);
      text(m,x+36,ly,s,'hand',{'font-size':sz,style:`fill:var(--${L.color||'ink'})`});
      ly+=s.split('\n').length*sz*1.4+10;lids.push(`${id}-l${i}`);
    });
    if(ly-24>y+h) warn('inset '+id,'步骤和说明超出浮层：减少说明行或换更大的 place');
    const st=ins.step||Math.min(650,Math.round(3000/Math.max(1,ids.length))); // 步骤多就出得快一点，说明行不至于等太久
    return ()=>{reveal(ids,st,300);reveal(lids,700,300+ids.length*st)};
  },
  /* 表格：columns, rows, widths；三列以上时最后一列标黄 */
  table(g,ins,x,y,w,h,id){
    const cols=ins.columns||[],rowsT=ins.rows||[];
    const widths=ins.widths||cols.map(()=>1),sw=widths.reduce((a,b)=>a+b,0);
    const iw=w-72;const xs=[];let acc=x+36;widths.forEach(v=>{xs.push(acc);acc+=iw*v/sw});
    const fs=ins.size||22;
    cols.forEach((c,i)=>text(g,xs[i],y+8,c,'hand',{'font-size':fs,style:'fill:var(--ink2)'}));
    const rh=Math.min(92,(h-40)/Math.max(1,rowsT.length));const ids=[];
    rowsT.forEach((r,ri)=>{
      const yy=y+28+ri*rh;
      const m=el('g',{class:'row',id:`${id}-${ri}`},g);
      el('line',{x1:x+28,x2:x+w-28,y1:yy,y2:yy,style:'stroke:var(--dim);stroke-opacity:.35'},m);
      r.forEach((cell,ci)=>{
        const cw=iw*widths[ci]/sw-18;
        const s=wrap(cell,cw,fs);
        const n=s.split('\n').length;
        const hl=ci===r.length-1&&r.length>2;
        text(m,xs[ci],yy+rh/2-(n-1)*fs*0.68+fs*0.35,s,ci===0?'mono':'hand',{'font-size':fs,style:hl?'fill:var(--amber)':null});
        if(n*fs*1.38>rh-4) warn('inset '+id,`第 ${ri+1} 行第 ${ci+1} 格字太多`);
      });
      ids.push(`${id}-${ri}`);
    });
    return ()=>reveal(ids,ins.step||650,300);
  },
  /* 并发演示：tasks = [{label, len(0-1), exclusive}]；order:"model"（按发起顺序进历史，默认）或 "finish" */
  race(g,ins,x,y,w,h,id){
    const tasks=ins.tasks||[];
    const labW=Math.max(...tasks.map(t=>estW(t.label,18)),60)+30;
    const slotW=Math.min(340,w*0.27),sx=x+w-36-slotW;
    const bx=x+36+labW,bw=sx-40-bx;
    const foot=ins.footer?50:0;
    const rh=Math.min(54,(h-40-foot)/Math.max(1,tasks.length));
    if(rh<38) warn('inset '+id,`任务行只有 ${Math.round(rh)}px 高，太挤；减少任务数，或换 place:"center"/"full"`);
    text(g,bx,y+4,ins.runLabel||'执行','t-small');
    text(g,sx,y+4,ins.commitLabel||(ins.order==='finish'?'谁先跑完谁先进历史':'按模型发起的顺序进历史'),'t-small');
    tasks.forEach((t,i)=>{
      const yy=y+20+i*rh;
      text(g,x+36,yy+26,t.label,'mono',{'font-size':18,style:`fill:var(--${t.exclusive?'coral':'ink2'})`});
      el('rect',{x:bx,y:yy+8,width:bw,height:24,rx:6,style:'fill:rgba(255,255,255,.035)'},g);
      el('rect',{x:bx,y:yy+8,width:0,height:24,rx:6,class:'bar',id:`${id}-b${i}`,style:`fill:var(--${t.exclusive?'coral':'blue'});opacity:.75`},g);
      const c=el('g',{id:`${id}-s${i}`},g);
      el('rect',{x:sx,y:yy+4,width:slotW,height:32,rx:8,style:'fill:none;stroke:var(--dim);stroke-dasharray:5 6'},c);
      text(c,sx+16,yy+26,`位置 ${i+1}`,'mono',{'font-size':16,style:'fill:var(--dim)'});
    });
    const barrier=el('line',{x1:0,y1:y+20,x2:0,y2:y+20+tasks.length*rh,style:'stroke:var(--coral);stroke-dasharray:6 6;stroke-width:2',opacity:0},g);
    if(ins.footer) text(g,x+36,y+20+tasks.length*rh+40,wrap(ins.footer,w-72,21),'hand',{'font-size':21,style:'fill:var(--amber)'});
    const slot=(i,state)=>{const c=$(`${id}-s${i}`),r=c.querySelector('rect'),t=c.querySelector('text');
      if(state==='e'){r.style.cssText='fill:none;stroke:var(--dim);stroke-dasharray:5 6';t.textContent=`位置 ${i+1}`;t.style.fill='var(--dim)'}
      if(state==='w'){r.style.cssText='fill:none;stroke:var(--ink2);stroke-dasharray:5 6';t.textContent=`${tasks[i].label} 跑完了 · 等前面`;t.style.fill='var(--ink2)'}
      if(state==='c'){r.style.cssText='fill:var(--amber);fill-opacity:.18;stroke:var(--amber);stroke-dasharray:none';t.textContent=`${tasks[i].label} 已进历史`;t.style.fill='var(--amber)'}};
    const T=3600;
    const run=()=>{
      tasks.forEach((t,i)=>{bar(`${id}-b${i}`,0,0,bx);slot(i,'e')});barrier.setAttribute('opacity',0);
      const done={};
      const par=tasks.map((t,i)=>[t,i]).filter(([t])=>!t.exclusive);
      const ex=tasks.map((t,i)=>[t,i]).filter(([t])=>t.exclusive);
      par.forEach(([t,i])=>{const len=t.len||0.5,ms=T*len;after(200,()=>bar(`${id}-b${i}`,bw*len,ms));done[i]=200+ms});
      const parEnd=Math.max(200,...par.map(([,i])=>done[i]));
      const parLen=Math.max(0,...par.map(([t])=>t.len||0.5));
      let start=parEnd+300,offX=bx+bw*parLen+10;
      ex.forEach(([t,i])=>{
        const len=t.len||0.25,ms=T*len,x0=offX;
        after(start-150,()=>{barrier.setAttribute('x1',x0-5);barrier.setAttribute('x2',x0-5);barrier.setAttribute('opacity',1)});
        after(start,()=>bar(`${id}-b${i}`,Math.min(bw*len,bx+bw-x0),ms,x0));
        done[i]=start+ms;start+=ms+250;offX+=bw*len+10;
      });
      if(ins.order==='finish'){
        tasks.forEach((t,i)=>after(done[i]+80,()=>slot(i,'c')));
      }else{
        let last=0;
        tasks.forEach((t,i)=>{
          const ready=Math.max(done[i],last);
          if(ready>done[i]+30) after(done[i]+60,()=>slot(i,'w'));
          after(ready+120,()=>slot(i,'c'));last=ready+200;
        });
      }
      return Math.max(...Object.values(done))+4200; // 结果停留几秒再重播
    };
    return ()=>{const period=run();after(period,function loop(){run();after(period,loop)})};
  },
};
(SPEC.insets||[]).forEach(ins=>{
  const [x,y,w,h]=Array.isArray(ins.box)?ins.box:(PLACES[ins.place||'center']||PLACES.center);
  insetPlace[ins.id]=ins.place||'center';
  const g=DA.inset(ins.id,x,y,w,h,'');
  let ty=y+56;
  if(ins.title){text(g,x+36,y+62,ins.title,'hand',{'font-size':ins.titleSize||32,style:`fill:var(--${ins.titleColor||'ink'})`});ty=y+116}
  const fn=BUILD[ins.type];
  if(!fn){warn('inset '+ins.id,`不认识的浮层类型 ${ins.type}`);return}
  insetEnter[ins.id]=fn(g,ins,x,ty,w,y+h-ty-20,ins.id);
});

/* ---------- 口播字幕（按 C 切换，或 ?caption=1） ---------- */
const cap=document.createElement('div');cap.id='cap';document.getElementById('stage').appendChild(cap);
let capOn=Q.get('caption')==='1';cap.classList.toggle('on',capOn);
DA.onKey=e=>{if(e.key==='c'||e.key==='C'){capOn=!capOn;cap.classList.toggle('on',capOn)}};
DA.onScene=(i,s)=>{cap.textContent=s._say||''};

/* ---------- 镜头 ---------- */
const allEdges=Object.keys(edgeEnds);
function camFor(ids,pad=60){
  const bs=ids.map(id=>box[id]).filter(Boolean);
  if(!bs.length) return FULL;
  let x0=Math.min(...bs.map(b=>b.x))-pad,y0=Math.min(...bs.map(b=>b.y))-pad-40;
  const x1=Math.max(...bs.map(b=>b.x+b.w))+pad,y1=Math.max(...bs.map(b=>b.y+b.h))+pad;
  let w=x1-x0,h=y1-y0;
  if(w/h>16/9){const nh=w*9/16;y0-=(nh-h)/2;h=nh}else{const nw=h*16/9;x0-=(nw-w)/2;w=nw}
  if(w>=1920) return FULL;
  x0=Math.max(0,Math.min(x0,1920-w));y0=Math.max(0,Math.min(y0,1080-h));
  return [x0,y0,w,h];
}
function targetOf(edgeId,rev){const e=edgeEnds[edgeId];return e?(rev?e[0]:e[1]):null}
function traceSteps(tr){if(!tr)return [];return Array.isArray(tr)?tr:(tr.steps||[])}
const S=(SPEC.scenes||[]).map((sc,si)=>{
  const sid='s'+(si+1);
  const noteIds=(sc.notes||[]).map((n,ni)=>{const id=`${sid}-n${ni}`;placeNote(id,n);return id});
  const insets=sc.inset?(Array.isArray(sc.inset)?sc.inset:[sc.inset]):[];
  const overlay=insets.some(i=>['full','center'].includes(insetPlace[i]));
  let show,half;
  if(sc.show==null||sc.show==='all'){show=overlay?[]:ALL.slice();half=overlay?ALL.slice():[]}
  else{show=sc.show.slice();half=[]}
  if(sc.half==='all') half=ALL.slice(); else if(Array.isArray(sc.half)) sc.half.forEach(h=>{if(!half.includes(h))half.push(h)});
  show.forEach(id=>{const m=moduleOf[id];if(m&&!show.includes(m)&&!half.includes(m))half.push(m)});
  const steps=traceSteps(sc.trace);
  let edges;
  if(sc.edges==='all') edges=allEdges.slice();
  else if(sc.edges==='auto'){const set=new Set(show);edges=allEdges.filter(e=>{const [a,b]=edgeEnds[e];return (set.has(a)||set.has(moduleOf[a]))&&(set.has(b)||set.has(moduleOf[b]))})}
  else edges=(sc.edges||[]).slice();
  [...(sc.flow||[]).map(f=>f.edge),...steps.map(t=>t.edge)].forEach(e=>{if(e&&!edges.includes(e))edges.push(e)});
  return {
    k:sc.key||sid,t:sc.title||'',_say:sc.say||'',
    focus:show,half,lit:sc.lit||[],edges,notes:noteIds,insets,
    cam:sc.zoom&&!insets.length?camFor(Array.isArray(sc.zoom)?sc.zoom:[sc.zoom]):null, // 有浮层时不推镜头：推近的内容会被浮层挡住
    legend:!!sc.legendPulse,
    enter(){
      if(sc.draw) DA.drawIn(ALL.map(a=>[a]));
      // 走一圈这类镜头，光点自己带字；连线上的固定标签默认藏起来，免得糊成一片
      if(sc.edgeLabels===false||(steps.length&&sc.edgeLabels!==true)) for(const id in E) E[id].lab&&E[id].lab.classList.remove('on');
      (sc.flow||[]).forEach(f=>{
        const k=f.count||2,d=f.dur||2000,gp=.25;
        for(let i=0;i<k;i++) spawn(f.edge,{loop:true,dur:d,gap:gp,delay:i*d*(1+gp)/k+(f.delay||0),size:5.5,label:i===0?f.label:null,rev:!!f.rev});
      });
      if(steps.length){
        const total=steps.reduce((a,t)=>a+(t.dur||1000),0)+1600;
        const period=sc.trace&&!Array.isArray(sc.trace)&&typeof sc.trace.every==='number'?sc.trace.every:total; // 注意：数组自带 every 方法，不能直接读
        every(Math.max(period,total),()=>{
          DA.chain(steps.map(t=>[t.edge,{label:t.label,rev:!!t.rev,dur:t.dur||1000,post:()=>{const n=targetOf(t.edge,t.rev);if(n&&$('n-'+n))flash('n-'+n,600)}}]));
        });
      }
      (sc.states||[]).forEach(st=>{
        const elId=($('n-'+st.node)?'n-':'f-')+st.node;
        after(st.at||0,()=>cls(elId,st.state,true));
        if(st.until) after(st.until,()=>cls(elId,st.state,false));
      });
      insets.forEach(i=>insetEnter[i]&&insetEnter[i]());
    },
  };
});

/* ---------- 自检（?check=1） ---------- */
function bboxOf(node){try{return node.getBBox()}catch(e){return null}}
function overlap(a,b){return a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height}
function selfCheck(){
  for(const id in DA.nodes){
    const nd=DA.nodes[id];
    nd.g.querySelectorAll('text').forEach(t=>{const b=bboxOf(t);if(b&&b.width>nd.w-6) warn('node '+id,`文字"${t.textContent}"实际宽 ${Math.round(b.width)}px，超出节点宽 ${Math.round(nd.w)}px`)});
  }
  for(const id in N) N[id]._fit&&N[id]._fit();
  S.forEach((s,si)=>{
    const bs=s.notes.map(id=>[id,bboxOf(N[id])]).filter(([,b])=>b&&b.width>0);
    bs.forEach(([id,b])=>{
      if(b.x<0||b.y<140||b.x+b.width>1920||b.y+b.height>1040) warn(`镜头 ${si+1} 注释 ${id}`,'注释跑出画面或压到标题区');
      for(const nid in DA.nodes){const nb=DA.nodes[nid];if(overlap(b,{x:nb.x,y:nb.y,width:nb.w,height:nb.h})) warn(`镜头 ${si+1} 注释 ${id}`,`压住了节点 ${nid}；换个 pos 或给 x/y`)}
    });
    for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++) if(overlap(bs[i][1],bs[j][1])) warn(`镜头 ${si+1}`,`注释 ${bs[i][0]} 和 ${bs[j][0]} 重叠`);
  });
  for(const id in I){
    const g=I[id];const r=g.querySelector('.ibg');
    const R={x:+r.getAttribute('x'),y:+r.getAttribute('y'),w:+r.getAttribute('width'),h:+r.getAttribute('height')};
    g.querySelectorAll('text').forEach(t=>{const b=bboxOf(t);if(b&&(b.x<R.x-2||b.x+b.width>R.x+R.w+2||b.y+b.height>R.y+R.h+2)) warn('inset '+id,`"${t.textContent.slice(0,18)}…" 超出浮层边框`)});
  }
  const pre=document.createElement('pre');pre.id='archtalk-report';
  pre.textContent=JSON.stringify({scenes:S.length,issues});
  document.body.appendChild(pre);
  document.title='ARCHTALK_CHECK_DONE';
}
DA.beforeFirst=()=>{if(CHECK){selfCheck();return false}};
DA.start(S,ALL);
})();
