// 3D coil of the analysis result (read-only: it only READS scan/ds from app.js, the analysis is not changed).
// Each frame = one ring of 32 points (the 32 scan-line readings). Ring height = time, point distance from the axis = value, colour = value.
// Drag to turn, click a ring to select that frame, arrow keys turn it when focused. Plain canvas: no libraries, works offline.
const Coil=(()=>{
  const cv=document.getElementById('coil'),x=cv.getContext('2d'),W=800,H=440,D=ds=>ds;
  let yaw=.6,pitch=.5,auto=true,drag=null,centers=[];
  const reset=()=>{yaw=.6;pitch=.5;};
  const R=()=>scan.slice(0,NS()),val=c=>Analysis.colVal(ds.mode,c);
  const top=()=>ds.mode==='ocean'?32:Math.max(1e-9,...R().flat().map(val));
  const t01=v=>{const t=Math.min(1,Math.max(0,v)/top());return ds.mode==='ocean'?t:Math.sqrt(t);}; // sqrt: most readings are small, keep them visible
  const ringCol=(v,a)=>ds.mode==='ocean'?`hsla(${240-t01(v)*240},85%,55%,${a})`:ds.mode==='lights'?`hsla(48,95%,${42+t01(v)*45}%,${a})`:`hsla(52,100%,${48+t01(v)*40}%,${a})`;
  function P(i,j,n,r){const th=2*Math.PI*j/COLS,X=r*Math.cos(th),Z=r*Math.sin(th),Y=(i-(n-1)/2)*Math.min(26,230/Math.max(1,n-1)),
    X1=X*Math.cos(yaw)+Z*Math.sin(yaw),Z1=-X*Math.sin(yaw)+Z*Math.cos(yaw),Y2=Y*Math.cos(pitch)-Z1*Math.sin(pitch),Z2=Y*Math.sin(pitch)+Z1*Math.cos(pitch),s=600/(600+Z2+80);
    return[W/2+X1*s,H/2+Y2*s,s];}
  function draw(){x.clearRect(0,0,W,H);const rs=R(),n=rs.length;if(!n||!rs[0][0]){requestAnimationFrame(draw);return;}
    if(auto&&!drag)yaw+=.004;centers=[];
    rs.forEach((cs,i)=>{const sel=i===frame,pts=cs.map((c,j)=>P(i,j,n,55+t01(val(c))*95));
      for(let j=0;j<COLS;j++){const a=pts[j],b=pts[(j+1)%COLS];x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);
        x.strokeStyle=ringCol(val(cs[j]),sel?1:.8);x.lineWidth=(sel?3.4:2)*a[2];x.stroke();}
      const c0=P(i,0,n,0);centers.push(c0[1]);
      if(sel||i===0||i===n-1){x.fillStyle=sel?'#fff':'#9aa7b8';x.font='700 15px '+getComputedStyle(document.body).fontFamily;x.fillText(ds.label(i).replace('video second ',''),12,c0[1]+4);}
      if(sel&&playing){const p=pts[Math.min(col,COLS-1)];x.fillStyle='#fff';x.beginPath();x.arc(p[0],p[1],6*p[2],0,7);x.fill();}});
    requestAnimationFrame(draw);}
  function sync(){const rs=R();if(!rs.length||!scan[frame])return;const v=fmt(metric(scan[Math.min(frame,rs.length-1)]));
    cv.setAttribute('aria-label',`3D coil: ${rs.length} frames, one ring per frame, each ring has ${COLS} readings. Selected ${ds.label(frame)}, value ${v}. Drag or use arrow keys to turn, click a ring to select a frame.`);}
  cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,m:0};});
  cv.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.m+=Math.abs(dx)+Math.abs(dy);drag.x=e.clientX;drag.y=e.clientY;yaw+=dx*.01;pitch=Math.max(-1.3,Math.min(1.3,pitch+dy*.01));});
  cv.addEventListener('pointerup',e=>{const moved=drag&&drag.m>6;drag=null;if(moved)return;const r=cv.getBoundingClientRect(),py=(e.clientY-r.top)/r.height*H;
    let b=-1,bd=1e9;centers.forEach((c,i)=>{const d=Math.abs(c-py);if(d<bd){bd=d;b=i;}});if(b>=0&&bd<30){setFrame(b);}});
  cv.addEventListener('keydown',e=>{const k={ArrowLeft:[-.1,0],ArrowRight:[.1,0],ArrowUp:[0,-.1],ArrowDown:[0,.1]}[e.key];if(!k)return;e.preventDefault();e.stopPropagation();auto=false;yaw+=k[0];pitch=Math.max(-1.3,Math.min(1.3,pitch+k[1]));});
  document.getElementById('coilauto').onclick=e=>{auto=!auto;e.target.setAttribute('aria-pressed',auto);};
  document.getElementById('coilreset').onclick=()=>{reset();};
  // Playback buttons under the coil: they just press the main buttons (same behaviour), and mirror the Play/Pause label.
  [['coilprev','prev'],['coilplay','play'],['coilstop','stop'],['coilnext','next']].forEach(([a,b])=>{document.getElementById(a).onclick=()=>document.getElementById(b).click();});
  const mainPlay=document.getElementById('play'),coilPlay=document.getElementById('coilplay'),mirror=()=>{coilPlay.textContent=mainPlay.textContent;};
  new MutationObserver(mirror).observe(mainPlay,{childList:true,characterData:true,subtree:true});mirror();
  const _rf=renderFrame;renderFrame=function(){_rf();sync();};
  requestAnimationFrame(draw);sync();
  return{sync};
})();
