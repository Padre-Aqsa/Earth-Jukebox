// Country and continent panel. READS the current dataset / frames from app.js (ds, imgs, W, H, frame, NF, NS, chg) and never changes the analysis.
const GeoUI=(()=>{
  const $=id=>document.getElementById(id),oc=document.createElement('canvas'),ox=oc.getContext('2d',{willReadFrequently:true}),ov=$('geoov');
  const B={w:-180,e:180,s:-90,n:90},store=new WeakMap(),synth={};
  let rim=false,editMode=false,tk=0,lastRows=null,loadP=null;
  const frameCache=new WeakMap();
  // BORDER FRAMES: each frame is one complete copy of the world's country borders with its own position and size.
  // B is always the bounds of the ACTIVE frame; frs holds every frame. A picture pixel belongs to the newest frame whose
  // rectangle contains it, and is read with that frame's own mapping (so pixels inside a frame are never read with another frame's borders).
  const frs=[{...B}];let act=0,cm={key:'',m:null};
  const syncAct=()=>{frs[act]=Object.assign(frs[act]||{},{w:B.w,e:B.e,s:B.s,n:B.n});};
  const rectOf=b=>{const sl=b.e-b.w,sa=b.n-b.s;return{L:(-180-b.w)/sl,R:(180-b.w)/sl,T:(b.n-90)/sa,Bt:(b.n+90)/sa};};
  const boundsOf=(L,R,T,Bt)=>{const nl=360/(R-L),na=180/(Bt-T),w=-180-L*nl,n=90+T*na;return{w,e:w+nl,n,s:n-na};};
  const fkey=()=>frs.map(b=>[b.w,b.e,b.s,b.n].map(v=>+v.toFixed(4)).join()).join(';');
  function combined(){
    syncAct();const key=[W,H,Geo.count(),Geo.source(),fkey()].join('|');if(cm.key===key)return cm.m;
    if(!Geo.ready())return null;
    const ids=new Uint16Array(W*H);
    frs.forEach(b=>{const m=Geo.mask(W,H,b),R=rectOf(b);if(!m)return;
      const x0=Math.max(0,Math.ceil(R.L*W-.5)),x1=Math.min(W-1,Math.floor(R.R*W-.5)),y0=Math.max(0,Math.ceil(R.T*H-.5)),y1=Math.min(H-1,Math.floor(R.Bt*H-.5));
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)ids[y*W+x]=m.ids[y*W+x];});
    return(cm={key,m:{ids,w:W,h:H}}).m;}
  function holder(f){
    let c=frameCache.get(ds);
    if(!c){c=Object.create(null);frameCache.set(ds,c);}
    return[c,'|frame:'+f];
  }
  // PER-DATASET STATE: every dataset (Night Lights, Sea Surface, Lightning) keeps its own border frames, bounds, overlay/edit switches
  // and table options. Switching dataset swaps the whole set; nothing is shared between them.
  const GS={};let curG=null;
  const gkey=g=>'earthJukeboxCountryStateV5:'+g,grp=()=>(ds&&(ds.group||ds.id))||'default';
  const freshState=()=>({frs:[{w:-180,e:180,s:-90,n:90}],act:0,rim:false,editMode:false,scope:'frame',top:'15'});
  const goodFrs=a=>Array.isArray(a)&&a.length&&a.every(b=>b&&b.e>b.w&&b.n>b.s);
  function loadState(g){let s=null;try{s=JSON.parse(localStorage.getItem(gkey(g))||'null');}catch(_){}
    const f=freshState();if(!s||!goodFrs(s.frs))return f;
    return{frs:s.frs.map(b=>({w:b.w,e:b.e,s:b.s,n:b.n})),act:Math.min(Math.max(0,s.act|0),s.frs.length-1),rim:false,editMode:false,scope:s.scope==='all'?'all':'frame',top:['15','40','9999'].includes(String(s.top))?String(s.top):'15'};}
  function snapshot(){syncAct();return{frs:frs.map(b=>({w:b.w,e:b.e,s:b.s,n:b.n})),act,rim,editMode,scope:$('geoscope').value,top:$('geotop').value};}
  function bind(){const g=grp();if(g===curG)return;
    if(curG){GS[curG]=snapshot();}
    curG=g;const s=GS[g]||(GS[g]=loadState(g));
    frs.length=0;s.frs.forEach(b=>frs.push({...b}));act=s.act;Object.assign(B,frs[act]);rim=s.rim;editMode=s.editMode;cm={key:'',m:null};
    $('geoscope').value=s.scope;$('geotop').value=s.top;['w','e','s','n'].forEach(k=>$('gb'+k).value=B[k]);
    if(typeof syncFrameChips==='function')syncFrameChips();if(typeof syncHandles==='function')syncHandles();}
  const nf=v=>Math.round(v).toLocaleString('en-US'),pct=(a,b)=>b?(a/b*100).toFixed(a/b*100<10?1:0)+'%':'–';
  const flat=()=>!/globe|orbit|-atl|-pac/.test(ds.id);
  const supported=()=>ds.mode==='flash'||ds.mode==='lights';
  const borderActions=$('borderActions');
  function syncBorderControls(){
    bind();
    const available=supported()&&flat();
    if(borderActions)borderActions.hidden=!available;
    if(!available){$('geoeditor').hidden=true;if($('geoHandles'))$('geoHandles').hidden=true;}
    else $('geoeditor').hidden=!editMode;
    $('georim').setAttribute('aria-pressed',String(rim));
    $('geoedit').setAttribute('aria-pressed',String(editMode));
    $('georim').classList.toggle('on',rim);
    $('geoedit').classList.toggle('on',editMode);
  }

  function imageRect(f){return{x:0,y:0,w:W,h:H};}
  const bkey=f=>{const r=imageRect(f);syncAct();return[fkey(),r.w,r.h,r.y].join();};
  function paint(f){
    if(oc.width!==W||oc.height!==H){oc.width=W;oc.height=H;}
    const im=imgs[ds.id]&&imgs[ds.id][f];
    ox.fillStyle='#000';ox.fillRect(0,0,W,H);
    if(ds.images&&im){
      const iw=im.naturalWidth||im.videoWidth||im.width,ih=im.naturalHeight||im.videoHeight||im.height;
      ox.drawImage(im,0,0,iw,ih,0,0,W,H);
    }else ds.draw(ox,f/Math.max(1,NF()-1),f);
    return ox.getImageData(0,0,W,H).data;
  }
  function frameResult(f){
    const[c,x]=holder(f),r=imageRect(f),slot=bkey(f)+'|'+ds.mode+x;
    if(c[slot])return c[slot];
    const pixels=paint(f),m=combined();
    return c[slot]=Geo.analyze(ds.mode,pixels,W,H,m);
  }
  const nFrames=()=>Math.max(1,Math.min(NS(),scan.length||NF()));

  // ---- load the borders (once) ----
  function ensure(){
    if(Geo.ready())return Promise.resolve(true);
    if(!loadP)loadP=Geo.load().then(r=>{
      if(r.ok){$('geostatus').textContent=`Country borders loaded: ${r.n} countries (${r.src}).`;$('geofile').hidden=true;return true;}
      $('geostatus').textContent='The country borders could not be loaded ('+r.error+'). Put countries-110m.json in data/geo/ (see docs/GEO.md), or choose a GeoJSON/TopoJSON file below.';$('geofile').hidden=false;loadP=null;return false;});
    return loadP;}

  // ---- render ----
  function msg(t){$('geomain').hidden=true;$('geomsg').hidden=false;$('geomsg').textContent=t;}
  function drawOverlay(){
    bind();
    if(!(rim||editMode)||!Geo.ready()||!supported()){
      ov.getContext('2d').clearRect(0,0,ov.width,ov.height);return;
    }
    if(ov.width!==W||ov.height!==H){ov.width=W;ov.height=H;}
    const ctx=ov.getContext('2d'),r=imageRect(frame);syncAct();
    ctx.clearRect(0,0,W,H);
    const order=frs.map((b,i)=>i).filter(i=>i!==act).concat(act); // the active frame is drawn last (on top)
    order.forEach(i=>{const tmp=document.createElement('canvas');tmp.width=r.w;tmp.height=r.h;
      Geo.outline(tmp.getContext('2d'),r.w,r.h,frs[i],frs.length>1&&i!==act?'rgba(255,214,0,.9)':undefined);ctx.drawImage(tmp,r.x,r.y);});
    if(frs.length>1){ctx.font='bold 15px sans-serif';frs.forEach((b,i)=>{const q=rectOf(b),x=Math.min(W-18,Math.max(4,q.L*W+6)),y=Math.min(H-6,Math.max(18,q.T*H+16));
      ctx.fillStyle=i===act?'#00e5ff':'#ffd600';ctx.strokeStyle='#000';ctx.lineWidth=3;ctx.strokeText(String(i+1),x,y);ctx.fillText(String(i+1),x,y);});}
    placeHandles();
  }
  // ---- ocean panel (sea-surface temperature): per ocean basin, no countries ----
  function setTitles(ocean){
    const t={s6:ocean?'Ocean basins':'Countries and continents',geoh3a:ocean?'Ocean basins (share of the colored water)':'Continents',geoh3b:ocean?'Temperature by ocean':'Countries'};
    Object.keys(t).forEach(k=>{const el=$(k);if(el){if(k==='s6'){const n=el.querySelector('.n');el.textContent='';if(n)el.appendChild(n);el.appendChild(document.createTextNode(t[k]));}else el.textContent=t[k];}});
    ['geoscope','geotop'].forEach(k=>{const l=$(k)&&$(k).closest('label');if(l)l.hidden=ocean;});if($('geocsv'))$('geocsv').hidden=ocean;}
  const oceanRaster=()=>{ // pixel -> ocean basin (0..4), each pixel with the lon/lat of the newest frame that covers it
    syncAct();const g=new Int8Array(W*H).fill(-1);
    frs.forEach(b=>{const q=rectOf(b),sx=(b.e-b.w)/W,sy=(b.n-b.s)/H,x0=Math.max(0,Math.ceil(q.L*W-.5)),x1=Math.min(W-1,Math.floor(q.R*W-.5)),y0=Math.max(0,Math.ceil(q.T*H-.5)),y1=Math.min(H-1,Math.floor(q.Bt*H-.5));
      for(let y=y0;y<=y1;y++){const lat=b.n-(y+.5)*sy;for(let x=x0;x<=x1;x++)g[y*W+x]=Oceans.at(b.w+(x+.5)*sx,lat);}});
    return g;};
  function oceanResult(f){
    const[c,x]=holder(f),slot='ocean|'+fkey()+'|'+W+'x'+H+x;if(c[slot])return c[slot];
    const px=paint(f),g=oceanRaster(),ok=Analysis.isData.ocean,N=Oceans.NAMES.length,z=()=>new Float64Array(N+1),
      area=z(),n=z(),sum=z(),b1=z(),b2=z(),b3=z(),b4=z(); // index N = outside every frame
    for(let i=0,p=0;i<W*H;i++,p+=4){const k=g[i]<0?N:g[i];area[k]++;const r=px[p],gg=px[p+1],b=px[p+2];if(!ok(r,gg,b))continue;
      const t=Analysis.T(Analysis.Hh(r,gg,b));n[k]++;sum[k]+=t;if(t<10)b1[k]++;else if(t<20)b2[k]++;else if(t<25)b3[k]++;else b4[k]++;}
    return c[slot]={area,n,sum,b1,b2,b3,b4};}
  async function updateOcean(){
    setTitles(true);$('geomsg').hidden=true;$('geomain').hidden=false;$('geostatus').textContent='Ocean basins use fixed approximate boundaries; no country borders are needed.';$('geofile').hidden=true;
    if(!(ds.images&&ds.images.length)&&!scan.length)return;
    const my=++tk,all=false,R=oceanResult(frame);if(my!==tk)return;
    const N=Oceans.NAMES.length,rows=[...Array(N).keys()].map(i=>({name:Oceans.NAMES[i],n:R.n[i],area:R.area[i],mean:R.n[i]?R.sum[i]/R.n[i]:null,
      p:[R.b1[i],R.b2[i],R.b3[i],R.b4[i]].map(v=>R.n[i]?v/R.n[i]*100:0)})).filter(r=>r.n>0).sort((a,b)=>b.n-a.n);
    const tot=rows.reduce((s,r)=>s+r.n,0),outN=R.n[N],grand=tot+outN,f1=v=>v.toFixed(1);
    const top=rows[0],warm=rows.slice().sort((a,b)=>b.mean-a.mean)[0],cold=rows.slice().sort((a,b)=>a.mean-b.mean)[0];
    $('geosum').textContent=grand?`${ds.label(frame)}: ${nf(grand)} colored-water pixels read in total, ${nf(tot)} (${pct(tot,grand)}) inside the map area. `+(rows.length?`Most water: ${top.name} (${pct(top.n,grand)}). Warmest: ${warm.name} (${f1(warm.mean)} °C average). Coldest: ${cold.name} (${f1(cold.mean)} °C average). `:'')
      +(outN?`${nf(outN)} (${pct(outN,grand)}) lie outside every frame.`:''):`${ds.label(frame)}: no sea-surface temperature colors found in this picture. If the picture has data, check the map area below.`;
    const mx=Math.max(1,...rows.map(r=>r.n));
    $('geocont').innerHTML=rows.map(r=>`<div class="gbar"><span class="gl">${r.name}</span><span class="gt"><i style="width:${r.n/mx*100}%"></i></span><span class="gn">${nf(r.n)} <small>${pct(r.n,grand)} · ${f1(r.mean)} °C</small></span></div>`).join('')||'<p class="hint">No ocean has data.</p>';
    $('geobody').innerHTML=`<thead><tr><th>#</th><th>Ocean</th><th>Water pixels</th><th>Share of all</th><th>Mean temperature</th><th>Cold (&lt;10 °C)</th><th>Mild (10–20 °C)</th><th>Warm (20–25 °C)</th><th>Hot (≥25 °C)</th></tr></thead><tbody>`
      +rows.map((r,i)=>`<tr><td>${i+1}</td><th scope="row">${r.name}</th><td>${nf(r.n)}</td><td>${pct(r.n,grand)}</td><td>${f1(r.mean)} °C</td>${r.p.map(v=>`<td>${f1(v)}%</td>`).join('')}</tr>`).join('')
      +(outN?`<tr class="out"><td></td><th scope="row">Outside the map area (every frame)</th><td>${nf(outN)}</td><td>${pct(outN,grand)}</td><td></td><td></td><td></td><td></td><td></td></tr>`:'')+'</tbody>';
    $('geomore').textContent=`${rows.length} oceans with data.`;
    $('geoinfo').textContent='Ocean basins are fixed approximate limits (Southern Ocean south of 60° S, Arctic north of 66.5° N, Atlantic / Indian / Pacific by the Cape Agulhas, Cape Horn, Central American and Malay–Sunda–Torres–Tasmania lines), applied to the map area. Temperatures are read from the colors with the NASA color bar; land, white flow marks and legends are not counted. This is an image-derived estimate, not ECCO2 model output.';}
  async function update(){
    bind();syncBorderControls();
    const sec=$('geosec');if(!sec||sec.hidden)return;
    if(ds.mode==='ocean'&&flat()){await updateOcean();return;}
    setTitles(false);
    if(!supported()){
      msg(ds.mode==='ocean'
        ?'Sea-surface temperature is analyzed over the colored ocean pixels only. Land outlines are geographic context, not temperature measurements, so this dataset does not produce country rankings. Read the ocean basins, temperature bands and current-flow patterns instead.'
        :'Country detection is available only for flat world-map frames without inset zoom panels. Night Lights uses paired world maps (only the left is sampled), and source inset panels can still overlap regions; use its global brightness/change analysis instead.');
      return;
    }
    if(!flat()){msg('This view is a globe, not a flat map. Country detection needs a flat world map (x = longitude, y = latitude). Use the flat-map view or upload a flat map.');return;}
    $('geomsg').hidden=true;$('geomain').hidden=false;
    if(!(await ensure()))return;
    if(!supported()||!flat())return; // the dataset changed while the borders were loading: the next update handles it
    if(!scan.length&&!(ds.images&&ds.images.length)){return;}
    const my=++tk;drawOverlay();
    const all=$('geoscope').value==='all'&&nFrames()>1;let rs,label;
    if(all){const n=nFrames(),list=[],[h0]=holder(0),ak='all|'+n+'|'+Array.from({length:n},(_,i)=>bkey(i)).join(';')+'|'+ds.mode;
      if(h0[ak])rs=h0[ak];
      else{for(let f=0;f<n;f++){if(my!==tk)return;list.push(frameResult(f));
        if(f%4===3){$('geosum').textContent=`Analyzing frame ${f+1} of ${n}…`;await new Promise(r=>setTimeout(r,0));}}
        if(my!==tk)return;rs=h0[ak]=Geo.total(list);}
      label=`all ${n} frames together`;}
    else{rs=frameResult(frame);label=ds.label(frame);}
    lastRows=Geo.rows(rs);render(lastRows,label,all?nFrames():1);}
  function render(R,label,nfr){
    const lights=ds.mode==='lights',chgMap=lights&&chg()&&nfr===1,main=lights?'data':'dots',
      tot=R.countries.reduce((s,c)=>s+c[main],0),out=R.outside[main],grand=tot+out,all=R.countries.filter(c=>c[main]>0).sort((a,b)=>b[main]-a[main]),
      cont=R.continents.filter(c=>c.area>0).sort((a,b)=>b[main]-a[main]),unit=lights?'lit pixels':'lightning clusters (8-connected yellow regions)';
    const top=all[0],ct=cont[0];
    $('geosum').textContent=grand?`${label}: ${nf(grand)} ${unit} analyzed in total. ${nf(tot)} (${pct(tot,grand)}) fall inside ${all.length} countries${out?`, ${nf(out)} (${pct(out,grand)}) are outside every border (mostly ocean)`:''}. `+
      `Most ${unit}: ${top?top.name+' ('+nf(top[main])+')':'none'}. Strongest continent: ${ct&&ct[main]>0?ct.name+' ('+nf(ct[main])+', '+pct(ct[main],grand)+')':'none'}.`:`${label}: no ${unit} found in this picture. If the picture has data, check the map area below.`;
    const mx=Math.max(1,...cont.map(c=>c[main]));
    $('geocont').innerHTML=cont.map(c=>`<div class="gbar"><span class="gl">${c.name}</span><span class="gt"><i style="width:${c[main]/mx*100}%"></i></span><span class="gn">${nf(c[main])} <small>${pct(c[main],grand)}</small></span></div>`).join('')||'<p class="hint">No continent has data.</p>';
    const lim=+$('geotop').value,shown=all.slice(0,lim);
    const head=lights?`<tr><th>#</th><th>Country</th><th>Continent</th><th>Lit pixels</th><th>Share of all</th><th>Lit area</th><th>Light index</th>${chgMap?'<th>Purple (more light)</th><th>Orange (less light)</th>':''}<th>Area (px)</th></tr>`
      :`<tr><th>#</th><th>Country</th><th>Continent</th><th>Connected yellow regions</th><th>Share of all</th><th>Yellow pixels</th><th>Area (px)</th></tr>`;
    const row=(c,i)=>lights?`<tr><td>${i}</td><th scope="row">${c.name}</th><td>${c.cont}</td><td>${nf(c.data)}</td><td>${pct(c.data,grand)}</td><td>${pct(c.data,c.area)}</td><td>${c.index.toFixed(2)}</td>${chgMap?`<td>${nf(c.pu)}</td><td>${nf(c.or)}</td>`:''}<td>${nf(c.area)}</td></tr>`
      :`<tr><td>${i}</td><th scope="row">${c.name}</th><td>${c.cont}</td><td>${nf(c.dots)}</td><td>${pct(c.dots,grand)}</td><td>${nf(c.data)}</td><td>${nf(c.area)}</td></tr>`;
    const o=R.outside,orow=lights?`<tr class="out"><td></td><th scope="row">${o.name}</th><td></td><td>${nf(o.data)}</td><td>${pct(o.data,grand)}</td><td>${pct(o.data,o.area)}</td><td>${o.index.toFixed(2)}</td>${chgMap?`<td>${nf(o.pu)}</td><td>${nf(o.or)}</td>`:''}<td>${nf(o.area)}</td></tr>`
      :`<tr class="out"><td></td><th scope="row">${o.name}</th><td></td><td>${nf(o.dots)}</td><td>${pct(o.dots,grand)}</td><td>${nf(o.data)}</td><td>${nf(o.area)}</td></tr>`;
    $('geobody').innerHTML=head?`<thead>${head}</thead><tbody>${shown.map((c,i)=>row(c,i+1)).join('')}${orow}</tbody>`:'';
    $('geomore').textContent=all.length>shown.length?`Showing ${shown.length} of ${all.length} countries with data. Choose “All countries” to see the rest.`:`${all.length} countries with data.`;
    const small=R.countries.length;$('geoinfo').textContent=`Borders: ${Geo.count()} countries, ${small} of them visible in this map area at this resolution (very small countries can be smaller than one pixel and then get no count). Country assignment is an image-overlay estimate: it depends on the flat map projection and alignment, and is not a substitute for georeferenced NASA records. `+(nfr>1?`“All frames together” adds the counts of ${nfr} frames; the light index is the average over those frames.`:'');}

  // ---- CSV (every frame x every country with data) ----
  async function csv(){
    if(!(await ensure())||!supported()||!flat())return;const n=nFrames(),lights=ds.mode==='lights',lines=[lights?'frame,country,continent,lit_pixels,lit_area_percent,light_index,area_px':'frame,country,continent,connected_yellow_regions_8_neighbour,yellow_pixels,area_px'];
    const q=s=>'"'+String(s).replace(/"/g,'""')+'"';
    for(let f=0;f<n;f++){const R=Geo.rows(frameResult(f));if(f%4===3){$('geoinfo').textContent=`Preparing the table… frame ${f+1} of ${n}`;await new Promise(r=>setTimeout(r,0));}
      R.countries.concat([{...R.outside,cont:'(outside)'}]).forEach(c=>{if(!(lights?c.data:c.dots||c.data))return;
        lines.push((lights?[q(ds.label(f)),q(c.name),q(c.cont),c.data,c.area?(c.data/c.area*100).toFixed(2):0,c.index.toFixed(3),c.area]:[q(ds.label(f)),q(c.name),q(c.cont),c.dots,c.data,c.area]).join(','));});}
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv'}));a.download=`earth-jukebox-${ds.id}-countries.csv`;a.click();
    $('geoinfo').textContent=`Table downloaded: ${n} frames.`;}

  // ---- controls ----
  // The overlay (country borders) is the rectangle that shows lon -180..180 and lat 90..-90 on screen, as fractions of the picture.
  // A handle moves that rectangle's edge WITH the pointer (right = to the right, down = down); corners keep the aspect ratio and
  // keep the opposite corner fixed. The bounds B (what the picture covers) are recomputed from the new rectangle.
  function dragOverlayEdge(b,edge,dxf,dyf){
    const sl=b.e-b.w,sa=b.n-b.s;let L=(-180-b.w)/sl,R=(180-b.w)/sl,T=(b.n-90)/sa,Bt=(b.n+90)/sa;
    if(edge.length===2){const wf=R-L,hf=Bt-T,sx=edge.includes('e')?1:-1,sy=edge.includes('s')?1:-1,
        f=Math.max(.02,1+(dxf*sx/wf+dyf*sy/hf)/2),nw=wf*f,nh=hf*f;
      if(sx>0)R=L+nw;else L=R-nw;if(sy>0)Bt=T+nh;else T=Bt-nh;}
    else{if(edge==='w')L+=dxf;if(edge==='e')R+=dxf;if(edge==='n')T+=dyf;if(edge==='s')Bt+=dyf;}
    if(R-L<.02||Bt-T<.02)return null;
    const nl=360/(R-L),na=180/(Bt-T),w=-180-L*nl,n=90+T*na;
    if(nl<.5||na<.5)return null;
    return{w,e:w+nl,n,s:n-na};}
  const persist=()=>{try{localStorage.setItem(gkey(curG||grp()),JSON.stringify(snapshot()));}catch(_){}};
  const setB=(w,e,s,n)=>{B.w=w;B.e=e;B.s=s;B.n=n;syncAct();['w','e','s','n'].forEach(k=>$('gb'+k).value=B[k]);persist();drawOverlay();};
  const shiftB=(dx,dy)=>{const x=(B.e-B.w)*dx,y=(B.n-B.s)*dy;setB(B.w+x,B.e+x,B.s+y,B.n+y);update();};
  const scaleB=f=>{const cx=(B.w+B.e)/2,cy=(B.s+B.n)/2,hw=(B.e-B.w)*f/2,hh=(B.n-B.s)*f/2;setB(cx-hw,cx+hw,cy-hh,cy+hh);update();};

  ['w','e','s','n'].forEach(k=>$('gb'+k).onchange=()=>{const v=parseFloat($('gb'+k).value);if(isFinite(v))B[k]=v;
    if(B.e<=B.w||B.n<=B.s){setB(-180,180,-90,90);}update();});
  $('gbworld').onclick=()=>{setB(-180,180,-90,90);update();};
  $('gbaspect').onclick=()=>{const span=Math.min(180,H*360/W);setB(-180,180,-span/2,span/2);update();};
  $('geoscope').onchange=()=>{persist();update();};$('geotop').onchange=()=>{persist();update();};$('geocsv').onclick=csv;
  $('georim').onclick=()=>{rim=!rim;syncBorderControls();
    ensure().then(ok=>{if(ok){drawOverlay();say(rim?'Country borders displayed.':'Country borders hidden.');}});};
  $('geoedit').onclick=()=>{editMode=!editMode;syncBorderControls();syncHandles();
    ensure().then(ok=>{if(ok){drawOverlay();say(editMode?'Border editing enabled. Drag the map overlay or its edge/corner handles.':'Border editing disabled.');}});};
  $('geoleft').onclick=()=>shiftB(.01,0);$('georight').onclick=()=>shiftB(-.01,0);
  $('geoup').onclick=()=>shiftB(0,-.01);$('geodown').onclick=()=>shiftB(0,.01);
  $('geosmaller').onclick=()=>scaleB(1.03);$('geolarger').onclick=()=>scaleB(.97);
  $('georeset').onclick=()=>{frs.length=1;act=0;setB(-180,180,-90,90);syncFrameChips();update();};
  // ---- frames ----
  function syncFrameChips(){
    const box=$('geoframes');if(!box)return;
    box.innerHTML=frs.map((b,i)=>`<button type="button" class="border-toggle frame-chip${i===act?' on':''}" data-i="${i}" aria-pressed="${i===act}">Border frame ${i+1}</button>`).join('');
    box.querySelectorAll('button').forEach(btn=>btn.onclick=()=>selectFrame(+btn.dataset.i));
    if($('geodelframe'))$('geodelframe').disabled=frs.length<2;
  }
  function selectFrame(i){syncAct();act=Math.max(0,Math.min(frs.length-1,i));Object.assign(B,frs[act]);['w','e','s','n'].forEach(k=>$('gb'+k).value=B[k]);persist();syncFrameChips();drawOverlay();update();
    say('Border frame '+(act+1)+' of '+frs.length+' selected.');}
  // a new frame = a complete set of country borders, half the width of the active one, placed on the right half of the picture, to be dragged and resized
  function addFrame(){
    syncAct();const q=rectOf(B),r=imageRect(frame),aspect=(q.R-q.L)*r.w/((q.Bt-q.T)*r.h),w=.5,h=w*r.w/aspect/r.h,T=Math.max(0,Math.min(1-h,.5-h/2));
    frs.push(boundsOf(1-w,1,T,T+h));act=frs.length-1;Object.assign(B,frs[act]);['w','e','s','n'].forEach(k=>$('gb'+k).value=B[k]);persist();syncFrameChips();
    ensure().then(()=>{drawOverlay();update();say('Border frame '+frs.length+' added: one complete set of country borders. Drag its middle to move it, drag a handle to resize it.');});}
  function delFrame(){if(frs.length<2)return;frs.splice(act,1);act=Math.min(act,frs.length-1);Object.assign(B,frs[act]);['w','e','s','n'].forEach(k=>$('gb'+k).value=B[k]);persist();syncFrameChips();drawOverlay();update();say('Border frame removed. '+frs.length+' left.');}
  if($('geoaddframe'))$('geoaddframe').onclick=addFrame;if($('geodelframe'))$('geodelframe').onclick=delFrame;
  function placeHandles(){
    if(!handles)return;const q=rectOf(B),c=v=>Math.max(0,Math.min(1,v)),L=c(q.L),R=c(q.R),T=c(q.T),Bt=c(q.Bt),mx=(L+R)/2,my=(T+Bt)/2,
      pos={nw:[L,T],n:[mx,T],ne:[R,T],e:[R,my],se:[R,Bt],s:[mx,Bt],sw:[L,Bt],w:[L,my]};
    handles.querySelectorAll('button[data-edge]').forEach(b=>{const p=pos[b.dataset.edge];b.style.left=p[0]*100+'%';b.style.top=p[1]*100+'%';});}
  $('geopick').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
    try{const r=await Geo.loadFile(f);$('geostatus').textContent=`Country borders loaded: ${r.n} countries (${r.src}).`;$('geofile').hidden=true;update();}
    catch(err){$('geostatus').textContent='This file is not a usable country map ('+(err&&err.message||err)+').';}};
  // Directly drag the country-border overlay while its editor is open; wheel zooms it.
  let borderDrag=null;
  cv.addEventListener('pointerdown',e=>{
    if(!editMode||!Geo.ready()||!supported()||!flat()||e.button!==0)return;
    const r=cv.getBoundingClientRect();
    const fx=(e.clientX-r.left)/r.width,fy=(e.clientY-r.top)/r.height;syncAct();
    for(let i=frs.length-1;i>=0;i--){const q=rectOf(frs[i]);if(fx>=q.L&&fx<=q.R&&fy>=q.T&&fy<=q.Bt){if(i!==act){act=i;Object.assign(B,frs[act]);persist();syncFrameChips();}break;}}
    borderDrag={x:e.clientX,y:e.clientY,w:r.width,h:r.height};
    cv.setPointerCapture?.(e.pointerId);e.preventDefault();
  });
  cv.addEventListener('pointermove',e=>{
    if(!borderDrag)return;
    const dx=(e.clientX-borderDrag.x)/borderDrag.w*(B.e-B.w);
    const dy=(e.clientY-borderDrag.y)/borderDrag.h*(B.n-B.s);
    borderDrag.x=e.clientX;borderDrag.y=e.clientY;
    shiftB(-dx/(B.e-B.w),dy/(B.n-B.s));
  });
  const stopBorderDrag=()=>{borderDrag=null;};
  cv.addEventListener('pointerup',stopBorderDrag);cv.addEventListener('pointercancel',stopBorderDrag);
  const handles=$('geoHandles');
  let edgeDrag=null;
  function syncHandles(){if(handles){handles.hidden=!editMode;placeHandles();}}
  if(handles){
    handles.querySelectorAll('button[data-edge]').forEach(btn=>{
      btn.addEventListener('pointerdown',e=>{
        if(!editMode)return;
        e.preventDefault();e.stopPropagation();
        const rect=cv.getBoundingClientRect();
        edgeDrag={edge:btn.dataset.edge,x:e.clientX,y:e.clientY,w:rect.width,h:rect.height,pointerId:e.pointerId};
        btn.setPointerCapture?.(e.pointerId);
      });
      btn.addEventListener('pointermove',e=>{
        if(!edgeDrag||e.pointerId!==undefined&&e.pointerId!==edgeDrag.pointerId)return;
        const dxf=(e.clientX-edgeDrag.x)/edgeDrag.w,dyf=(e.clientY-edgeDrag.y)/edgeDrag.h;
        edgeDrag.x=e.clientX;edgeDrag.y=e.clientY;
        const nb=dragOverlayEdge(B,edgeDrag.edge,dxf,dyf);
        if(nb)setB(nb.w,nb.e,nb.s,nb.n);
      });
      const stop=()=>{edgeDrag=null;};
      btn.addEventListener('pointerup',stop);btn.addEventListener('pointercancel',stop);
    });
  }
  cv.addEventListener('wheel',e=>{
    if(!editMode)return;
    e.preventDefault();scaleB(e.deltaY<0?.97:1.03);
  },{passive:false});
  // country name under the mouse
  cv.addEventListener('pointermove',e=>{if(!Geo.ready()||$('geosec').hidden||!supported()||!flat())return;const r=cv.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*W,py=(e.clientY-r.top)/r.height*H,fr=imageRect(frame);
    if(px<fr.x||py<fr.y||px>=fr.x+fr.w||py>=fr.y+fr.h)return;
    const x=Math.floor(px-fr.x),y=Math.floor(py-fr.y),m=combined(),c=Geo.countryAt(m,x,y);cv.title=c?`${c.name} (${c.cont})`:'';});
  syncFrameChips();syncBorderControls();
  return{update,B,frameResult,csv,ensure,drawOverlay,shiftB,scaleB,syncBorderControls,frames:()=>frs,addFrame,combined};
})();
