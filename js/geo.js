// Country + continent detection for flat world maps (equirectangular: x = longitude, y = latitude).
//  1. load country borders (TopoJSON or GeoJSON): local file first, then CDN, or a file chosen by the user
//  2. rasterize the borders to a pixel -> country table that fits the uploaded image (map bounds can be adjusted)
//  3. count the data pixels of one frame per country and per continent (same "data pixel" rules as analysis.js)
// No server and no API: everything runs in the browser.
const Geo=(()=>{
  const SOURCES=['data/geo/countries-110m.json',
    'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json',
    'https://unpkg.com/world-atlas@2.0.2/countries-110m.json'];
  const CONTS=['Africa','Antarctica','Asia','Europe','North America','Oceania','South America'];
  const FIX={'australia':'Oceania','oceania':'Oceania','seven seas (open ocean)':'Antarctica'};
  let world=null,srcName='',cache={key:'',m:null};

  // ---- parse ----
  function decodeTopo(t){
    const tf=t.transform,sc=tf?tf.scale:[1,1],tr=tf?tf.translate:[0,0];
    const arcs=t.arcs.map(a=>{let x=0,y=0;return a.map(p=>{if(tf){x+=p[0];y+=p[1];return[x*sc[0]+tr[0],y*sc[1]+tr[1]];}return[p[0],p[1]];});});
    const arc=i=>i<0?arcs[~i].slice().reverse():arcs[i];
    const ring=idx=>{let r=[];idx.forEach((i,k)=>{const a=arc(i);r=r.concat(k?a.slice(1):a);});return r;};
    const geom=g=>!g?[]:g.type==='Polygon'?[g.arcs.map(ring)]:g.type==='MultiPolygon'?g.arcs.map(p=>p.map(ring)):g.type==='GeometryCollection'?g.geometries.flatMap(geom):[];
    const o=t.objects.countries||Object.values(t.objects)[0];
    return o.geometries.map(g=>({id:g.id,props:g.properties||{},polys:geom(g)}));}
  function decodeGeoJSON(j){
    const fs=j.type==='FeatureCollection'?j.features:j.type==='Feature'?[j]:[];
    return fs.map(f=>{const g=f.geometry||{},polys=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
      return{id:f.id,props:f.properties||{},polys};});}
  function contOf(r,meta,name){
    const p=r.props,raw=String(p.CONTINENT||p.continent||'').trim();
    if(raw){const k=FIX[raw.toLowerCase()]||CONTS.find(c=>c.toLowerCase()===raw.toLowerCase());if(k)return k;}
    if(meta)return meta[3];
    return (typeof GEO_NAME_CONT!=='undefined'&&GEO_NAME_CONT[name])||'Unknown';}
  function normalize(raw){
    const byA3={};if(typeof GEO_META!=='undefined')Object.values(GEO_META).forEach(m=>byA3[m[1]]=m);
    return raw.filter(r=>r.polys.length).map(r=>{
      const p=r.props,num=r.id!=null&&r.id!==''?String(r.id).padStart(3,'0'):String(p.ISO_N3||p.iso_n3||'').padStart(3,'0');
      const a3=p.ISO_A3||p.iso_a3||p.ADM0_A3||p.adm0_a3||'',meta=(typeof GEO_META!=='undefined'&&GEO_META[num])||byA3[a3]||null;
      const name=p.name||p.NAME||p.ADMIN||p.name_long||(meta&&meta[2])||('Country '+(r.id??'?'));
      return{name,cont:contOf(r,meta,name),a3:(meta&&meta[1])||a3||'',polys:r.polys};});}
  function parse(obj,label){
    const raw=obj&&obj.type==='Topology'?decodeTopo(obj):decodeGeoJSON(obj);
    const w=normalize(raw);if(w.length<20)throw new Error('too few countries');
    world=w;srcName=label;cache={key:'',m:null};return w.length;}

  // ---- load: local file, CDN, or a file chosen by the user ----
  async function load(){
    if(world)return{ok:true,n:world.length,src:srcName};
    let last='';
    for(const u of SOURCES){
      try{const r=await fetch(u);if(!r.ok){last=u+' → '+r.status;continue;}
        const n=parse(await r.json(),u.startsWith('http')?'online (world-atlas)':'data/geo');return{ok:true,n,src:srcName};}
      catch(e){last=u+' → '+(e&&e.message||e);}}
    return{ok:false,error:last};}
  async function loadFile(f){
    const n=parse(JSON.parse(await f.text()),'your file: '+f.name);return{ok:true,n,src:srcName};}

  // ---- raster: pixel -> country index (0 = outside every country) ----
  // Scan-line fill at pixel centres (no anti-aliasing, so no pixel is ever given a wrong country).
  function fillPoly(ids,w,h,rings,id){
    let y0=1e9,y1=-1e9;rings.forEach(r=>{for(let i=1;i<r.length;i+=2){if(r[i]<y0)y0=r[i];if(r[i]>y1)y1=r[i];}});
    const ys=Math.max(0,Math.ceil(y0-.5)),ye=Math.min(h-1,Math.floor(y1-.5));
    for(let y=ys;y<=ye;y++){const yc=y+.5,xs=[];
      rings.forEach(r=>{const n=r.length/2;for(let i=0,j=n-1;i<n;j=i++){const ay=r[j*2+1],by=r[i*2+1];
        if((ay<=yc&&by>yc)||(by<=yc&&ay>yc)){const ax=r[j*2],bx=r[i*2];xs.push(ax+(yc-ay)/(by-ay)*(bx-ax));}}});
      xs.sort((a,b)=>a-b);
      for(let k=0;k+1<xs.length;k+=2){const a=Math.max(0,Math.ceil(xs[k]-.5)),b=Math.min(w-1,Math.floor(xs[k+1]-.5));for(let x=a;x<=b;x++)ids[y*w+x]=id;}}}
  function mask(w,h,b){
    if(!world)return null;const key=[w,h,b.w,b.e,b.s,b.n].join();if(cache.key===key)return cache.m;
    const ids=new Uint16Array(w*h),sx=w/(b.e-b.w),sy=h/(b.n-b.s);
    world.forEach((c,ci)=>c.polys.forEach(poly=>{
      fillPoly(ids,w,h,poly.map(r=>{const a=new Float64Array(r.length*2);r.forEach((p,i)=>{a[i*2]=(p[0]-b.w)*sx;a[i*2+1]=(b.n-p[1])*sy;});return a;}),ci+1);}));
    return(cache={key,m:{ids,w,h}}).m;}

  // ---- analysis of one frame ----
  // px = ImageData.data of the frame (w x h RGBA). mode = 'lights' | 'flash'.
  function analyze(mode,px,w,h,m){
    const N=world.length+1,z=()=>new Float64Array(N),area=z(),data=z(),dots=z(),lum=z(),pu=z(),or=z(),ids=m.ids,ok=Analysis.isData[mode],L=Analysis.L,S=Analysis.S,Hh=Analysis.Hh,mk=mode==='flash'?new Uint8Array(w*h):null;
    for(let i=0,p=0;i<w*h;i++,p+=4){const k=ids[i];area[k]++;const r=px[p],g=px[p+1],b=px[p+2];if(!ok(r,g,b))continue;data[k]++;
      if(mode==='lights'){lum[k]+=L(r,g,b);const hh=Hh(r,g,b);if(hh>250&&hh<325)pu[k]++;else if(hh>8&&hh<38&&S(r,g,b)>.4)or[k]++;}
      else mk[i]=1;}
    if(mk){ // lightning dots = connected yellow spots (8-neighbour); each spot belongs to the country under its centre
      const seen=new Uint8Array(w*h),st=[];
      for(let s=0;s<w*h;s++){if(!mk[s]||seen[s])continue;let sx=0,sy=0,n=0,first=0;st.length=0;st.push(s);seen[s]=1;
        while(st.length){const q=st.pop(),x=q%w,y=(q-x)/w;sx+=x;sy+=y;n++;if(!first&&ids[q])first=ids[q];
          for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const t=yy*w+xx;if(mk[t]&&!seen[t]){seen[t]=1;st.push(t);}}}
        const cx=Math.min(w-1,Math.round(sx/n)),cy=Math.min(h-1,Math.round(sy/n)),c=ids[cy*w+cx]||first;dots[c]++;}}
    return{mode,area,data,dots,lum,pu,or};}
  const add=(a,b)=>{if(!a)return{...b,frames:1,area:b.area.slice(),data:b.data.slice(),dots:b.dots.slice(),lum:b.lum.slice(),pu:b.pu.slice(),or:b.or.slice()};
    ['area','data','dots','lum','pu','or'].forEach(k=>{for(let i=0;i<a[k].length;i++)a[k][i]+=b[k][i];});a.frames++;return a;};
  // Sum of several frames (for the "all frames" view). Area is summed too, so ratios stay correct.
  const total=rs=>rs.reduce((a,r)=>add(a,r),null);
  // Rows for the tables. area = pixels of that country in the image; data = data pixels; dots = lightning spots;
  // index = light index of the country (same formula as the main analysis: sum of luminance of lit pixels / pixels x 100).
  function rows(r){
    const mk=(name,cont,i,list)=>{const A=list.reduce((s,k)=>s+r.area[k],0),D=list.reduce((s,k)=>s+r.data[k],0),T=list.reduce((s,k)=>s+r.dots[k],0),Lm=list.reduce((s,k)=>s+r.lum[k],0),P=list.reduce((s,k)=>s+r.pu[k],0),O=list.reduce((s,k)=>s+r.or[k],0);
      return{name,cont,i,area:A,data:D,dots:T,index:A?Lm/A*100:0,lit:A?D/A:0,pu:P,or:O};};
    const out=world.map((c,ci)=>mk(c.name,c.cont,ci+1,[ci+1])),cs=CONTS.concat(world.some(c=>c.cont==='Unknown')?['Unknown']:[]).map(c=>mk(c,c,-1,world.map((x,ci)=>x.cont===c?ci+1:-1).filter(k=>k>0)));
    return{countries:out.filter(c=>c.area>0),continents:cs.filter(c=>c.area>0),outside:mk('Outside all countries (ocean, no border)','',0,[0]),frames:r.frames||1};}

  // ---- overlay: draw the borders over a canvas (to check that the map fits) ----
  function outline(ctx,w,h,b,color){
    if(!world)return;const sx=w/(b.e-b.w),sy=h/(b.n-b.s);ctx.clearRect(0,0,w,h);ctx.strokeStyle=color||'rgba(0,255,255,.85)';ctx.lineWidth=1;ctx.beginPath();
    world.forEach(c=>c.polys.forEach(poly=>poly.forEach(r=>r.forEach((p,i)=>{const x=(p[0]-b.w)*sx,y=(b.n-p[1])*sy;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}))));ctx.stroke();}
  return{load,loadFile,parse,mask,analyze,total,rows,outline,CONTS,ready:()=>!!world,source:()=>srcName,count:()=>world?world.length:0,
    countryAt:(m,x,y)=>{const k=m&&m.ids[y*m.w+x];return k?world[k-1]:null;},_set:w=>{world=w;cache={key:'',m:null};}};
})();
