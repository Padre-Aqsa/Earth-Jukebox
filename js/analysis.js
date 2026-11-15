// Per-dataset image analysis. Each dataset reads ITS OWN colour/brightness parameter, only from pixels that carry data
// (not from the black background or the grey land), so every frame gives its own numbers.
//  lights : brightness of city lights (light index); change map: purple = more light, orange = less light
//  ocean  : hue -> sea surface temperature in °C, using the NASA colour bar (calibrated on the bar: blue 0, green 10-16, yellow ~24, red 32)
//  flash  : yellow dots = lightning events (count per column, height on the map)
const Analysis=(()=>{
  const cl=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),
    L=(r,g,b)=>(.2126*r+.7152*g+.0722*b)/255,
    S=(r,g,b)=>{const m=Math.max(r,g,b);return m?(m-Math.min(r,g,b))/m:0},
    Hh=(r,g,b)=>{const m=Math.max(r,g,b),d=m-Math.min(r,g,b);if(!d)return 0;return(m===r?((g-b)/d+6)%6:m===g?(b-r)/d+2:(r-g)/d+4)*60},
    // Temperature from hue, calibrated on the NASA/ECCO2 colour bar itself ("Sea Surface Temp (°C)", 0 to 32 °C, linear). The bar was sampled
    // every 2 °C from 14 frames; hue (degrees) at each temperature is below. Piecewise-linear between the measured points.
    HX=[2,16,33,46,55,63,80,98,119,132,142,151,165,179,200,212,221],
    HY=[32,30,28,26,24,22,20,18,16,14,12,10,8,6,4,2,0],
    T=h=>{if(h>=340||h<=HX[0])return 32;if(h>=HX[16])return 0;for(let i=1;i<17;i++)if(h<=HX[i])return HY[i-1]+(HY[i]-HY[i-1])*(h-HX[i-1])/(HX[i]-HX[i-1]);return 0},
    F=(x,lo,hi,a,b)=>a*Math.pow(b/a,cl((x-lo)/((hi-lo)||1))); // log-frequency mapping value -> Hz
  const isData={
    lights:(r,g,b)=>L(r,g,b)>.28||(S(r,g,b)>.25&&L(r,g,b)>.16),
    // ECCO2 frames: only saturated pixels on the NASA blue→green→yellow→red
    // temperature ramp are water data. Grey land, black background and white
    // flow-vector marks are deliberately excluded.
    ocean:(r,g,b)=>{const h=Hh(r,g,b);return S(r,g,b)>.35&&Math.max(r,g,b)>56&&(h<=245||h>=340);},
    // Lightning dots on NASA frames are often DIM yellow (measured on the NASA reference: R about 105, G about 95, B about 20, hue 48-58°), so the rule is
    // colour-based, not brightness-based: clearly saturated yellow (hue 38-70°) that is bright enough to be seen. Grey land, grey lines and
    // white text have almost no saturation and are never read.
    flash:(r,g,b)=>{const m=Math.max(r,g,b);if(m<70||!(r>=g*.8&&g>b*1.6))return false;const h=Hh(r,g,b);return S(r,g,b)>.45&&h>38&&h<70}};
  // Read one frame from the canvas as `cols` vertical strips (the scan line moves over them left to right).
  function readCol(mode,g,w,h,cols,c){
    const cw=Math.floor(w/cols),ok=isData[mode];
    {
      const d=g.getImageData(c*cw,0,cw,h).data,tot=d.length/4;let n=0,sv=0,sy=0,s2=0,pu=0,or=0,up=0,wm=0,cold=0,mild=0;
      for(let i=0;i<d.length;i+=4){const r=d[i],gg=d[i+1],b=d[i+2];if(!ok(r,gg,b))continue;n++;
        const hh=Hh(r,gg,b),row=Math.floor(i/4/cw)/h;
        if(mode==='lights'){sv+=L(r,gg,b);if(hh>250&&hh<325)pu++;else if(hh>8&&hh<38&&S(r,gg,b)>.4)or++;}
        else if(mode==='ocean'){const t=T(hh);sv+=t;s2+=t*t;if(t<10)cold++;else if(t<=20)mild++;else if(t>=25)wm++;}
        else{sy+=row;if(row<.5)up++;}}
      return (mode==='lights'?{n,tot,v:sv/tot*100,pu:pu/tot,or:or/tot}
        :mode==='ocean'?{n,tot,v:n?sv/n:0,sd:n?Math.sqrt(Math.max(0,s2/n-(sv/n)**2)):0,wm,cold,mild}
        :{n,tot,v:n,y:n?sy/n:.5,up});}
  }
  function read(mode,g,w,h,cols){const out=[];for(let c=0;c<cols;c++)out.push(readCol(mode,g,w,h,cols,c));return out;}

  // Analyze only pixels inside the UNION of user-defined rectangles.
  // Overlapping rectangles are counted once. `regions` are normalized 0..100 bounds.
  function readRegions(mode,g,w,h,cols,regions,onlyCol){
    const rs=(regions&&regions.length?regions:[{x:0,y:0,w:100,h:100}]).map(r=>({
      x0:Math.max(0,Math.floor(r.x*w/100)),y0:Math.max(0,Math.floor(r.y*h/100)),
      x1:Math.min(w,Math.ceil((r.x+r.w)*w/100)),y1:Math.min(h,Math.ceil((r.y+r.h)*h/100))
    }));
    const d=g.getImageData(0,0,w,h).data, out=[], ok=isData[mode],cw=w/cols;
    for(let c=(Number.isInteger(onlyCol)?onlyCol:0);c<(Number.isInteger(onlyCol)?onlyCol+1:cols);c++){
      const xa=Math.floor(c*cw),xb=Math.min(w,Math.ceil((c+1)*cw));
      let n=0,tot=0,sv=0,sy=0,s2=0,pu=0,or=0,up=0,wm=0,cold=0,mild=0;
      for(let y=0;y<h;y++){
        for(let x=xa;x<xb;x++){
          // Union membership: overlapping frames must never double-count a pixel.
          let inside=false;
          for(const r of rs){if(x>=r.x0&&x<r.x1&&y>=r.y0&&y<r.y1){inside=true;break;}}
          if(!inside)continue;
          tot++;
          const i=(y*w+x)*4,rr=d[i],gg=d[i+1],b=d[i+2];
          if(!ok(rr,gg,b))continue;
          n++;const hh=Hh(rr,gg,b),row=y/h;
          if(mode==='lights'){sv+=L(rr,gg,b);if(hh>250&&hh<325)pu++;else if(hh>8&&hh<38&&S(rr,gg,b)>.4)or++;}
          else if(mode==='ocean'){const t=T(hh);sv+=t;s2+=t*t;if(t<10)cold++;else if(t<=20)mild++;else if(t>=25)wm++;}
          else{sy+=row;if(row<.5)up++;}
        }
      }
      out.push(mode==='lights'?{n,tot,v:tot?sv/tot*100:0,pu:tot?pu/tot:0,or:tot?or/tot:0}
        :mode==='ocean'?{n,tot,v:n?sv/n:0,sd:n?Math.sqrt(Math.max(0,s2/n-(sv/n)**2)):0,wm,cold,mild}
        :{n,tot,v:n?sy/n:0,y:n?sy/n:.5,up});
    }
    return Number.isInteger(onlyCol)?out[0]:out;
  }

  const sum=(cs,k)=>cs.reduce((a,c)=>a+c[k],0);
  // Frame value = aggregate of the column readings, so the scan line, the graph and the table always agree.
  const frame={lights:cs=>sum(cs,'v')/cs.length,
    ocean:cs=>{const n=sum(cs,'n');return n?cs.reduce((a,c)=>a+c.v*c.n,0)/n:0},
    flash:cs=>sum(cs,'n')};
  const colVal=(mode,c)=>mode==='flash'?c.n:c.v;
  const fy=cs=>{const n=sum(cs,'n');return n?cs.reduce((a,c)=>a+c.y*c.n,0)/n:null}; // mean height of lightning dots
  function cal(mode,scan,N){
    const fs=scan.slice(0,N).map(cs=>mode==='flash'?fy(cs):frame[mode](cs)).filter(v=>v!=null),
      lo=Math.min(...fs),hi=Math.max(...fs),pad=(hi-lo)*.1||1e-9,v=scan.flat().map(c=>c.v).sort((a,b)=>a-b);
    return{lo:lo-pad,hi:hi+pad,col:mode==='lights'?(v[Math.floor(v.length*.95)]||1):1};}
  // Pitch per column (absolute rule of the dataset) and per frame (position inside this series).
  const hzCol=(mode,c,k)=>mode==='lights'?(c.v<.05?null:Math.round(F(c.v,0,k.col,196,988)))
    :mode==='ocean'?(c.n?Math.round(F(c.v,0,32,110,880)):null):(c.n?Math.round(F(1-c.y,0,1,220,1318)):null);
  const hzVal=(mode,v,k)=>Math.round(mode==='lights'?F(v,k.lo,k.hi,196,988):F(v,k.lo,k.hi,110,880));
  const hzFrame=(mode,cs,k)=>{if(mode==='flash'){const y=fy(cs);return y==null?null:Math.round(F(y,k.lo,k.hi,1318,220));}
    return hzVal(mode,frame[mode](cs),k);};
  const range=mode=>mode==='lights'?[196,988]:mode==='ocean'?[110,880]:[220,1318];
  // One pixel (explore mode) as a column-like reading.
  function px(mode,r,g,b,y,k){if(!isData[mode](r,g,b))return{n:0,tot:1,v:0,sd:0,y,pu:0,or:0};
    const hh=Hh(r,g,b);return mode==='lights'?{n:1,tot:1,v:L(r,g,b)*(k.col||5),pu:0,or:0}
      :mode==='ocean'?{n:1,tot:1,v:T(hh),sd:0,wm:0}:{n:1,tot:1,v:1,y,up:0};}
  const pc=x=>Math.round(x*100);
  function detail(mode,cs,s,change){
    if(mode==='lights')return change?`Change map: purple ${(sum(cs,'pu')/cs.length*100).toFixed(1)}% · orange ${(sum(cs,'or')/cs.length*100).toFixed(1)}% of pixels`:`${pc(s.lit)}% lit`;
    if(mode==='ocean'){const n=sum(cs,'n');return n?`Water bands: cold (<10 °C) ${pc(sum(cs,'cold')/n)}% · mild (10–20 °C) ${pc(sum(cs,'mild')/n)}% · warm (≥25 °C) ${pc(sum(cs,'wm')/n)}%`:'No ocean-temperature pixels detected';}
    const n=sum(cs,'n');return `${n.toLocaleString('en-US')} yellow pixels · ${n?pc(sum(cs,'up')/n):0}% in upper half`;}
  return{T,isData,read,readCol,readRegions,frame,colVal,fy,cal,hzCol,hzVal,hzFrame,range,px,detail,L,S,Hh};
})();
