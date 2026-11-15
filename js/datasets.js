// One entry per dataset. Real NASA frames: drop frame_01.webp (jpg/png) ... into data/frames/<id>/ and they load automatically.
function rng(seed){return()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};}
const X=lo=>(lo+180)/360*640,Y=la=>(90-la)/180*360,clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
// Simplified world map (lon,lat polygons) so the sample frames look like Earth, not random dots.
const LAND=(()=>{const p=new Path2D();[
 [[-165,64],[-140,70],[-110,72],[-82,68],[-62,58],[-56,50],[-70,44],[-76,35],[-81,25],[-97,26],[-105,22],[-96,16],[-84,9],[-78,8],[-88,14],[-105,23],[-117,32],[-124,42],[-125,50],[-140,60]],
 [[-78,8],[-60,10],[-50,0],[-35,-6],[-40,-22],[-58,-38],[-66,-48],[-72,-52],[-74,-40],[-71,-18],[-81,-5]],
 [[-10,36],[-9,43],[0,50],[10,55],[28,70],[70,73],[110,77],[170,70],[180,65],[140,52],[130,35],[122,30],[120,22],[108,10],[100,3],[98,8],[93,20],[80,10],[72,20],[58,24],[50,30],[36,36],[28,41],[18,40],[8,44],[-5,36]],
 [[-17,21],[-6,36],[10,37],[32,31],[43,12],[51,12],[40,-15],[33,-27],[20,-35],[12,-17],[9,4],[-8,5],[-17,14]],
 [[114,-22],[130,-12],[142,-11],[153,-27],[146,-39],[135,-35],[115,-34]],
 [[95,5],[98,4],[106,-4],[105,-6],[100,-2],[95,3]],[[109,2],[117,7],[119,1],[116,-4],[110,-3]],[[105,-6],[114,-7],[114,-8.5],[106,-7.5]],
 [[-50,60],[-20,70],[-20,82],[-60,80]]
].forEach(poly=>{poly.forEach(([lo,la],i)=>i?p.lineTo(X(lo),Y(la)):p.moveTo(X(lo),Y(la)));p.closePath();});return p;})();
let CITIES=null;
function cities(g){if(CITIES)return CITIES;const r=rng(7),H=[[78,22],[10,48],[115,32],[-80,38],[-120,36],[138,36],[107,-7],[-46,-23],[5,8],[31,28],[31,49],[-99,19],[100,14],[-3,52]];CITIES=[];
  for(let k=0;k<650;k++){const h=H[k%H.length];let x,y,ok=false;
    for(let a=0;a<25&&!ok;a++){x=X(h[0]+(r()+r()-1)*16);y=Y(h[1]+(r()+r()-1)*10);ok=g.isPointInPath(LAND,x,y);}
    if(ok)CITIES.push({x,y,s:r(),birth:r()<.6?0:r()*.9,death:r()<.85?2:.3+r()*.7});}
  return CITIES;}
const DATASETS=[
 {id:'lights',title:'Change in Night Lights (2012–2023) – EIC',tag:'Night lights · orange → white → purple',
  blurb:'Cities growing brighter over time. Soft rhythmic pulses.',mode:'lights',scale:'minorPent',high:'brighter lights',
  guide:'Use the NASA flat world-map sequence for analysis. The original source frames show one full global map with zoomed regional inset panels (India, Ukraine, Western Europe and the Eastern Mediterranean). The insets are visual context and must not be treated as extra global locations. Each column becomes one note. Brighter mapped lights sound higher and louder; dark areas are silent. Pixel brightness is a visual proxy, not calibrated Black Marble radiance.',
  legend:[['#ff9a3c','Orange: declining, getting dimmer'],['#f5f4eb','White: stable, established city'],['#b88cff','Purple: new expansion']],
  label:i=>String(2012+i),images:null,
  draw(g,t){g.fillStyle='#050914';g.fillRect(0,0,640,360);g.fillStyle='#17222f';g.fill(LAND);g.strokeStyle='#33465c';g.stroke(LAND);
    cities(g).forEach(c=>{if(t<c.birth||t>=c.death)return;const k=c.birth>.1?'184,140,255':c.death<=1?'255,154,60':'245,244,235';
      g.fillStyle=`rgba(${k},${.45+c.s*.5})`;g.beginPath();g.arc(c.x,c.y,1.4+c.s*2.4,0,7);g.fill();});},
  describe:(i,l)=>`Night lights, ${l}. White marks stable cities, purple marks new growth, orange marks areas getting dimmer.`},
 {id:'ocean',title:'Global Sea Surface Currents & Temperature',tag:'Thermal gradient · ocean currents',
  blurb:'Flowing warm and cold water. Slow ambient pads.',mode:'ocean',scale:'majorPent',high:'warmer water',
  guide:'Only the flat-map ocean color field is analyzed. Blue-to-red water colors are converted to estimated sea-surface temperature using the NASA color bar; land, black background and white flow marks are excluded. No country temperature ranking is produced.',
  legend:[['#3b6bff','Blue: cold water'],['#2fd1c5','Teal: mild water'],['#ff5a3c','Red: warm water']],
  label:i=>'month '+(i+1),images:null,
  draw(g,t){for(let y=0;y<360;y+=4)for(let x=0;x<640;x+=4){const la=90-y/2,T=clamp(1-Math.abs(la)/75+.12*Math.sin(x/45+t*6.28+y/30)+.1*t);
      g.fillStyle=`hsl(${240-T*240},85%,50%)`;g.fillRect(x,y,4,4);}
    g.fillStyle='#2b2f2c';g.fill(LAND);g.strokeStyle='#111';g.stroke(LAND);},
  describe:(i,l)=>`Sea surface, ${l}. Red is warm water near the equator, blue is cold water near the poles. Pitch rises toward warm water.`},
 {id:'lightning',title:'Lightning Events from the ISS (2017–2023)',tag:'Percussive · ISS LIS',
  blurb:'Sudden flashes over the tropics. Percussive hits.',mode:'flash',scale:'minorPent',high:'flashes higher on the map',
  guide:'Use the flat world-map view for analysis (not a globe or orbit view). Connected yellow clusters become drum hits; their vertical position sets pitch. Country results are image-overlay estimates, while cluster counts are not verified LIS event totals.',
  legend:[['#ffffff','White dot: one lightning flash'],['#8fb4ff','Blue glow: busy area']],
  label:i=>String(2017+Math.round(i*6/11)),images:null,
  draw(g,t,i){const r=rng(31+i*13);g.fillStyle='#050a14';g.fillRect(0,0,640,360);g.fillStyle='#1a2638';g.fill(LAND);g.strokeStyle='#33465c';g.stroke(LAND);
    const n=12+Math.round(t*40);for(let k=0,m=0;m<n&&k<900;k++){const x=r()*640,y=Y((r()+r()+r()-1.5)*40);
      if(r()>(g.isPointInPath(LAND,x,y)?1:.35))continue;m++;
      g.fillStyle='rgba(143,180,255,.25)';g.beginPath();g.arc(x,y,16,0,7);g.fill();
      g.fillStyle='#ffd400';g.beginPath();g.arc(x,y,2.5+r()*3,0,7);g.fill();}},
  describe:(i,l)=>`Lightning, ${l}. Each white dot is a flash over the tropics and sounds as a drum hit. More flashes means a denser rhythm.`}
];
// Real NASA frames (from the team's document). Metadata paraphrases the NASA SVS descriptions.
const GROUPS={lights:'Change in Night Lights',ocean:'Sea Surface Currents & Temperature',lightning:'Lightning Events from the ISS'};
(()=>{
  const by=Object.fromEntries(DATASETS.map(d=>[d.id,d])),sec=s=>i=>'video second '+i*s;
  const add=(base,o)=>DATASETS.push({...by[base],group:base,images:null,keep:true,...o});
  const OL=[['#3b6bff','Blue: 0 °C (cold)'],['#3ddc84','Green: 10–20 °C'],['#ffe14a','Yellow: about 25 °C'],['#ff3b30','Red: 32 °C (warm)']];
  const LL=[['#ffd400','Yellow dot: a detected lightning event'],['#6b7280','Gray: Earth surface and clouds']];
  Object.assign(by.lights,{group:'lights',keep:true,seriesN:12,rule:'Rule for night lights: the brightness of the lit pixels sets pitch and loudness (dark = silence), soft triangle pulses. In the change map, purple (more light) is a high bell and orange (less light) a low tone.',title:'Change in Night Lights (EIC)',tag:'Night lights · purple = more light',
    legend:[['#f3e9b0','Yellow-white: city lights (annual average)'],['#a35cff','Purple: more light than in the earlier period'],['#ff9a3c','Orange: less light than in the earlier period']],
    label:i=>i<12?String(2012+i):'change map',
    describe:(i,l)=>i<12?`Night lights, annual average for ${l}. Bright spots are cities and settlements.`:'Change map. Purple marks regions with more light, orange marks regions with less light.',
    info:'A global flat map. It starts with annual averages, then fades to a change map: purple is more light, orange is less light. The sequence includes zoomed pop-out panels for India, Ukraine, Western Europe and the Eastern Mediterranean. Data: NASA Black Marble, shown in the Earth Information Center. The left-hand copy of the paired global map is used once for analysis. Zoomed inset panels are visual context and may contribute some duplicated pixels to country estimates; country-level results are therefore image-derived approximations, not calibrated Black Marble radiance.'});
  const oi='Global flat-map visualization of sea-surface current flows colored by sea-surface temperature, from the MIT/JPL ECCO2 ocean model. The full global image is intended to retain its 2:1 aspect ratio. White dots mark model flow-vector locations; paths between them are interpolated. Temperature estimates use the supplied color bar (blue 0 °C, green 10–20 °C, yellow about 25 °C, red 32 °C). The visualization shows surface flow only, although ECCO2 models currents at all depths. The raster color reading is an estimate, not a substitute for the original ECCO2 data.';
  Object.assign(by.ocean,{group:'ocean',keep:true,rule:'Rule for the ocean: the color of each water pixel is converted to a temperature with the NASA color bar (blue 0 °C, green 10 to 20 °C, yellow 25 °C, red 32 °C). Cold water is a low pitch, warm water a high pitch, played as slow sine pads.',title:'Sea Surface Currents & Temperature: Global',tag:'Thermal gradient · ECCO2',legend:OL,label:sec(5),
    describe:(i,l)=>`Global flat map of sea-surface currents, ${l}. Only colored ocean pixels are read as temperature; land outlines provide geographic context. Blue is about 0 °C, green 10–20 °C, yellow about 25 °C and red about 32 °C.`,info:oi});
  add('ocean',{id:'ocean-atl',title:'Sea Surface Currents & Temperature: North Atlantic',blurb:'Zoom on the Gulf Stream and its swirling eddies.',
    describe:(i,l)=>`North Atlantic, ${l}. Warm orange water of the Gulf Stream meets cold blue and green water.`});
  add('ocean',{id:'ocean-pac',title:'Sea Surface Currents & Temperature: Eastern Pacific',blurb:'Globe view of the equatorial Pacific.',
    analysisView:false,describe:(i,l)=>`Eastern Pacific globe view, ${l}. The curved globe presentation is for visual viewing only; flat-map analysis uses the global ECCO2 map.`});
  const li='Global lightning detected by the Lightning Imaging Sensor (LIS) on the ISS, using the final quality-controlled science dataset. Each original event record contains latitude, longitude and detection time. A 10-day roving window is used to show seasonal patterns. One frame was taken every 10 seconds of the video. The website counts visible yellow image pixels for its scan and sound; the optional country analysis separately groups connected yellow regions. Neither image measure should be presented as the exact original LIS event count.';
  Object.assign(by.lightning,{group:'lightning',keep:true,rule:'Rule for lightning: only the yellow dots are read. The number of dots in a column sets how many drum hits you hear, and their height on the map sets the pitch.',title:'Lightning from the ISS: Global map',tag:'Percussive · ISS LIS',legend:LL,label:sec(10),
    blurb:'Flat world map of lightning strikes. Percussive hits.',describe:(i,l)=>`Global flat lightning map, ${l}. Yellow marks show the visible spatial distribution of lightning activity in the 10-day roving window. The main scan measures yellow-pixel density, not individual LIS events.`,info:li+' The website estimates connected yellow image clusters; exact strike counts, locations and times require the original quality-controlled LIS event records.'});
  add('lightning',{id:'lightning-globe',title:'Lightning from the ISS: Globe view',blurb:'Earth as a globe, with the ISS flying over it.',analysisView:false,
    describe:(i,l)=>`Globe view, ${l}. Yellow dots are lightning strikes seen from the ISS.`});
  add('lightning',{id:'lightning-orbit',title:'Lightning from the ISS: Orbit view',blurb:'Wide view of the globe as time passes.',analysisView:false,
    describe:(i,l)=>`Orbit view, ${l}. Yellow dots are lightning strikes, mostly in the tropics.`});
})();
// 3 datasets (cards). Each NASA video/series of a dataset is a "view" inside it.
const GBLURB={lights:'Cities getting brighter or dimmer over time. Soft rhythmic pulses.',ocean:'Flowing warm and cold water. Slow ambient pads.',lightning:'Sudden flashes of lightning seen from space. Percussive hits.'};
Object.entries({ocean:'Global','ocean-atl':'North Atlantic','ocean-pac':'Eastern Pacific',lightning:'Flat map','lightning-globe':'Globe view','lightning-orbit':'Orbit view'}).forEach(([id,v])=>{DATASETS.find(d=>d.id===id).view=v;});
