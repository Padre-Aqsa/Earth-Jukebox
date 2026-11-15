const $=id=>document.getElementById(id),COLS=32,cv=$('cv'),g=cv.getContext('2d',{willReadFrequently:true});
let USER={},sel=null,sampleMode=false,tourSample=null,series=[],cmp=null,audioOn=true,melT=null,W=640,H=360,ds=DATASETS[0],frame=0,col=0,timer=null,playing=false,explore=false,cols=[],scan=[],stats=[],cur={x:.5,y:.5},imgs={},voiceOn=true,ready=false,token=0;
['pointerdown','keydown'].forEach(ev=>addEventListener(ev,()=>ready=true,{once:true}));
const NF=()=>ds.images?ds.images.length:12;
const scanWidth=()=>W;

const analysisRegions=()=>window.__analysisFrames&&window.__analysisFrames.getRegions?window.__analysisFrames.getRegions():[{x:0,y:0,w:100,h:100}];

const UNIT={lights:'night-light brightness index',ocean:'estimated mean sea-surface temperature from the NASA color ramp',flash:'image-detected yellow lightning pixels'};
const HEAR={lights:{up:'more and louder notes over time',down:'fewer, quieter notes over time',flat:'a steady pulse'},
  ocean:{up:'higher pitches later in the series',down:'lower pitches later in the series',flat:'a steady, even pad'},
  flash:{up:'a denser drum rhythm over time',down:'a sparser drum rhythm over time',flat:'a steady drum rhythm'}};
const BINS=[['red','Red','#ff3b30'],['orange','Orange','#ff9a3c'],['yellow','Yellow','#ffd400'],['green','Green','#3ddc84'],['blue','Blue','#3b6bff'],['purple','Purple','#a35cff'],['white','White or gray','#d8dde6']];
const score=c=>Analysis.colVal(ds.mode,c),metric=cs=>Analysis.frame[ds.mode](cs),
fmt=v=>ds.mode==='flash'?Math.round(v).toLocaleString('en-US')+' yellow pixels':ds.mode==='ocean'?v.toFixed(1)+' °C':v.toFixed(2);
const pc=x=>Math.round(x*100),side=c=>c<COLS/3?'left':c<COLS*2/3?'center':'right';
const lab=i=>{const l=ds.label(i);return l.startsWith('video second ')?l.slice(13)+'s':l.replace('change map','change');};
const speech=()=>voiceOn&&ready&&'speechSynthesis' in window;
let lastSayT=0;
// Always an English voice: pick an en-* voice when the browser lists one, and tag every utterance en-US.
const enVoice=()=>{try{const v=speechSynthesis.getVoices();return v.find(x=>/^en[-_]US/i.test(x.lang))||v.find(x=>/^en/i.test(x.lang))||null;}catch(e){return null;}};
const utter=t=>{const u=new SpeechSynthesisUtterance(t);u.lang='en-US';const v=enVoice();if(v)u.voice=v;return u;};
function say(t){lastSayT=performance.now();if(speech()){speechSynthesis.cancel();const u=utter(t);u.rate=.95;window._u=u;speechSynthesis.speak(u);}
  else{$('announcer').textContent='';setTimeout(()=>$('announcer').textContent=t,50);}}
function narrate(t,cb){lastSayT=performance.now();const my=++token;let fired=false;const done=()=>{if(my===token&&!fired){fired=true;cb();}};
  if(speech()){speechSynthesis.cancel();const u=utter(t);u.onend=done;u.onerror=done;window._u=u;speechSynthesis.speak(u);setTimeout(done,20000);}
  else{$('announcer').textContent='';setTimeout(()=>$('announcer').textContent=t,50);setTimeout(done,Math.min(9000,1800+t.length*40));}}
function renderLegend(d){d=d||ds;$('legend').innerHTML='<strong>Color legend:</strong> '+(d.legend||[]).map(([c,t])=>`<span class="chip"><i style="background:${c}"></i>${t}</span>`).join('');}
const pairedLights=()=>false; // every reference frame is one full flat map
function imageRect(im){return{x:0,y:0,w:W,h:H};}
function sizeFor(){
  const list=ds.images&&ds.images.length?ds.images:(imgs[ds.id]||[]);
  let sw=640,sh=360;
  if(ds.live&&ds.live.sw){sw=ds.live.sw;sh=ds.live.sh;}
  else if(list.length){const im=list[0];sw=im.naturalWidth||im.videoWidth||im.width;sh=im.naturalHeight||im.height;}
  const k=Math.min(1,1600/Math.max(1,sw));
  W=Math.max(1,Math.round(sw*k));H=Math.max(1,Math.round(sh*k));
  if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
}
function drawFrame(f){
  sizeFor();
  const im=imgs[ds.id]&&imgs[ds.id][f];
  g.fillStyle='#000';g.fillRect(0,0,W,H);
  if(ds.images&&im){
    const iw=im.naturalWidth||im.videoWidth||im.width,ih=im.naturalHeight||im.height;
    g.drawImage(im,0,0,iw,ih,0,0,W,H);
  }else ds.draw(g,f/Math.max(1,NF()-1),f);
  return Analysis.readRegions(ds.mode,g,W,H,COLS,analysisRegions());
}
function spectrum(){
  const w=scanWidth(),d=g.getImageData(0,0,w,H).data,regions=analysisRegions().map(r=>({x0:r.x*w/100,y0:r.y*H/100,x1:(r.x+r.w)*w/100,y1:(r.y+r.h)*H/100}));
  const c=Array(7).fill(0);let lit=0,tot=0;
  for(let y=0;y<H;y+=2)for(let x=0;x<w;x+=2){
    if(!regions.some(r=>x>=r.x0&&x<r.x1&&y>=r.y0&&y<r.y1))continue;
    tot++;const i=(y*w+x)*4,r=d[i],gg=d[i+1],b=d[i+2],mx=Math.max(r,gg,b),mn=Math.min(r,gg,b);
    if(!Analysis.isData[ds.mode](r,gg,b))continue;lit++;
    if(mx===mn||((mx-mn)/mx<.22)){c[6]++;continue;}
    let h=(mx===r?((gg-b)/(mx-mn)+6)%6:mx===gg?(b-r)/(mx-mn)+2:(r-gg)/(mx-mn)+4)*60;
    c[h<15||h>=335?0:h<42?1:h<70?2:h<170?3:h<265?4:5]++;
  }
  return{lit:lit/Math.max(1,tot),share:c.map(x=>lit?x/lit:0)};
}
// Explanation of one frame and how it differs from the previous one
function note(i){
  const cs=scan[i],m=metric(cs),s=stats[i],n=NF();
  if(ds.mode==='ocean'){
    const bands=Analysis.detail(ds.mode,cs,s,false);
    let t=`${ds.label(i)}: estimated mean sea-surface temperature is ${m.toFixed(1)} °C across the detected colored-water pixels. ${bands}.`;
    if(n>1&&i>0){const prev=metric(scan[i-1]),delta=m-prev;t+=` Compared with ${ds.label(i-1)}, the image-derived mean temperature ${delta>=0?'increased':'decreased'} by ${Math.abs(delta).toFixed(2)} °C.`;}
    t+=' The analysis follows the ocean color field and current-flow visualization; it does not assign temperatures to countries.';
    return t;
  }
  if(ds.mode==='flash'){
    const dots=Math.round(m),upper=s.lit?pc(cs.reduce((a,c)=>a+c.up,0)/Math.max(1,cs.reduce((a,c)=>a+c.n,0))):0;
    let t=`${ds.label(i)}: ${dots.toLocaleString('en-US')} yellow lightning pixels detected in this frame. About ${upper}% of detected yellow pixels are in the upper half of the map.`;
    if(n>1&&i>0){const prev=metric(scan[i-1]),d=m-prev;t+=` Compared with ${ds.label(i-1)}, the detected cluster count ${d>=0?'increased':'decreased'} by ${Math.abs(Math.round(d)).toLocaleString('en-US')}.`;}
    t+=' Counts are image-based cluster estimates, not the original quality-controlled LIS event records.';
    return t;
  }
  const top=BINS.map((b,k)=>[s.share[k],b[1]]).sort((a,b)=>b[0]-a[0])[0];
  let t=`${ds.label(i)}: ${pc(s.lit)} percent of the image contains detected night-light pixels. Dominant color: ${top[1].toLowerCase()}, ${pc(top[0])} percent of detected pixels.`;
  if(n<2)return t;
  if(i===0)return t+' This is the first frame, the starting point.';
  if(ds.seriesN&&i>=ds.seriesN)return t+' This is the change map: purple shows more light than in the earlier period, orange shows less.';
  const p=metric(scan[i-1]),sp=stats[i-1],dl=(s.lit-sp.lit)*100,dm=p?(m-p)/p*100:0,pk=a=>{const v=a.map(score);return v.indexOf(Math.max(...v));},a=pk(scan[i-1]),b=pk(scan[i]);
  t+=` Compared with ${ds.label(i-1)}: lit area ${dl>=0?'increased':'decreased'} by ${Math.abs(dl).toFixed(1)} percentage points, and average light index ${dm>=0?'increased':'decreased'} by ${Math.abs(Math.round(dm))} percent`;
  t+=Math.abs(a-b)>2?`, with the strongest brightness shifting from the ${side(a)} to the ${side(b)}.`:`, with the strongest brightness remaining on the ${side(b)}.`;
  return t;
}
function renderFrame(){cols=drawFrame(frame);if(ds.live&&scan[frame])cols=scan[frame];drawProf(-1);
  $('marker').style.left=(col/(COLS-1)*(pairedLights()?99.45:97))+'%';
  $('framedesc').textContent=ds.describe(frame,ds.label(frame));$('framenote').textContent=scan.length===NF()?note(frame):'';
  $('frame').max=NF()-1;$('frame').value=frame;$('marker').style.left=(col/(COLS-1)*(pairedLights()?99.45:97))+'%';cv.parentElement.classList.remove('lights-pair');
  const s=stats[frame];if(s){$('statcolor').textContent=BINS.map((b,k)=>[s.share[k],b[1]]).sort((x,y)=>y[0]-x[0]).slice(0,3).filter(x=>x[0]>.01).map(x=>`${x[1]} ${pc(x[0])}%`).join(', ')||'none';
    $('statlit').textContent=pc(s.lit)+'% of pixels lit';}
  if(scan.length===NF()&&NF()>1&&$('hznow')){const hz=pitchOf(frame),v=metric(scan[frame]);$('hznow').textContent=hz?(ds.mode==='flash'?`Current pitch ${hz} Hz follows the average height of the ${fmt(v)} in ${ds.label(frame)} · higher on the map = higher pitch`:`Current pitch ${hz} Hz corresponds to ${fmt(v)} (${ds.label(frame)}) · higher value = higher pitch`):`${ds.label(frame)}: no data points, silent`;}
  [...$('tbody').children].forEach((r,i)=>r.classList.toggle('cur',i===frame));
  if(scan.length===NF()&&NF()>=1){const v=metric(scan[frame]),pv=frame&&frame<NS()?metric(scan[frame-1]):null,hz=pitchOf(frame),dm=pv?(v-pv)/pv*100:0;
    $('mTime').textContent=ds.label(frame);$('mVal').textContent=fmt(v);$('mUnit').textContent=UNIT[ds.mode];
    $('mDelta').textContent=pv===null?(frame?'n/a':'Start'):pv?(dm>=0?'+':'')+Math.round(dm)+'%':'—';$('mPitch').textContent=hz?hz+' Hz':'silent';drawCurve();}
  if(typeof GeoUI!=='undefined'){GeoUI.update().catch(e=>{const s=document.getElementById('geosum');if(s)s.textContent='Country analysis error: '+(e&&e.message?e.message:String(e));});GeoUI.drawOverlay();}}
const NS=()=>ds.seriesN||NF(),chg=()=>!!ds.seriesN&&frame>=ds.seriesN;
function scanAll(){scan=[];stats=[];for(let f=0;f<NF();f++){scan.push(drawFrame(f));stats.push(spectrum());}
  ds.cal=Analysis.cal(ds.mode,scan,NS());
  const t=renderScan();renderHz();renderFrame();return t;}
function renderScan(){
  if(scan.length===1)return renderOne();
  const m=scan.slice(0,NS()).map(metric),n=m.length,mx=Math.max(...m),pk=m.indexOf(mx),ch=m[0]?(m[n-1]-m[0])/Math.abs(m[0])*100:0,k=ch>10?'up':ch<-10?'down':'flat';
  const xm=(n-1)/2,ym=m.reduce((x,y)=>x+y,0)/n,sl=m.reduce((x,v,i)=>x+(i-xm)*(v-ym),0)/(m.reduce((x,v,i)=>x+(i-xm)**2,0)||1);
  let text='';
  if(ds.mode==='ocean'){
    const first=m[0],last=m[n-1],delta=last-first,all=scan.slice(0,NS()).flat(),water=all.reduce((a,c)=>a+c.n,0);
    const cold=water?all.reduce((a,c)=>a+c.cold,0)/water*100:0,mild=water?all.reduce((a,c)=>a+c.mild,0)/water*100:0,warm=water?all.reduce((a,c)=>a+c.wm,0)/water*100:0;
    text=`Across ${n} frames, the image-derived mean sea-surface temperature ${delta>0?'increased':delta<0?'decreased':'remained nearly stable'} from ${first.toFixed(1)} °C to ${last.toFixed(1)} °C (change ${delta>=0?'+':''}${delta.toFixed(2)} °C). Across the analyzed frames, approximately ${cold.toFixed(1)}% of colored-water pixels fall below 10 °C, ${mild.toFixed(1)}% fall between 10 and 20 °C, and ${warm.toFixed(1)}% are at least 25 °C. These are estimates read from the NASA color ramp in the rendered images; the white flow marks and land are excluded. The analysis describes ocean temperature patterns and does not produce country-level results.`;
    $('melStats').textContent=`Mean ${ym.toFixed(1)} °C · trend ${sl>=0?'+':''}${sl.toFixed(3)} °C per frame`;
  }else if(ds.mode==='flash'){
    const first=m[0],last=m[n-1],delta=last-first,tot=m.reduce((a,b)=>a+b,0);
    text=`Across ${n} frames, the image-based estimate is ${Math.round(tot).toLocaleString('en-US')} detected yellow lightning pixels in total. The pixel count per frame ${delta>0?'increased':delta<0?'decreased':'remained nearly stable'} from ${Math.round(first).toLocaleString('en-US')} to ${Math.round(last).toLocaleString('en-US')} (${delta>=0?'+':''}${Math.round(delta).toLocaleString('en-US')}). The map supports regional and country-level location summaries when the frame is a flat world map. This is an image-pixel density measure, not a count of individual LIS events; exact event totals require the quality-controlled LIS records.`;
    $('melStats').textContent=`Mean ${Math.round(ym).toLocaleString('en-US')} yellow pixels/frame · trend ${sl>=0?'+':''}${sl.toFixed(2)} per frame`;
  }else{
    const reg=[0,0,0];scan.slice(0,NS()).forEach(cs=>cs.forEach((c,i)=>reg[Math.min(2,i*3/COLS|0)]+=score(c)));
    const sd=['left','center','right'][reg.indexOf(Math.max(...reg))],verb={up:'rises',down:'falls',flat:'stays stable'}[k],
      dom=BINS.map((b,j)=>[stats.slice(0,n).reduce((a,x)=>a+x.share[j],0)/n,b[1]]).sort((a,b)=>b[0]-a[0])[0];
    text=`Across ${n} frames, ${UNIT[ds.mode]} ${verb}${k==='flat'?'':' by '+Math.abs(Math.round(ch))+'%'} (${ds.label(0)} to ${ds.label(n-1)}). The detected night-light area goes from ${pc(stats[0].lit)}% to ${pc(stats[n-1].lit)}% of the image. The dominant color is ${dom[1].toLowerCase()}. The peak is at ${ds.label(pk)}, and the strongest brightness is on the ${sd} side of the map. You will hear ${HEAR[ds.mode][k]}.`;
    $('melStats').textContent=`Mean ${fmt(ym)} · trend ${sl>=0?'+':''}${(sl*100).toFixed(2)} points per frame`;
  }
  $('conclusion').textContent=text;
  series=m;cmp=null;buildCompare();$('axL').textContent=ds.label(0);$('axR').textContent=ds.label(n-1);
  renderTable(scan.map(metric));
  return text;
}
function renderOne(){
  const cs=scan[0],cov=cs.filter(c=>c.n>0).length,s=stats[0],v=metric(cs);
  let text='';
  if(ds.mode==='ocean')text=`This image: estimated mean sea-surface temperature is ${v.toFixed(1)} °C across ${cov} of ${COLS} horizontal columns containing colored-water data. ${Analysis.detail(ds.mode,cs,s,false)}. The reading is based on the NASA temperature color ramp; no country-level temperature is inferred.`;
  else if(ds.mode==='flash')text=`This image: ${Math.round(v).toLocaleString('en-US')} yellow lightning pixels are detected across ${cov} of ${COLS} horizontal columns. The result is an image-based estimate; exact LIS event counts require the original event records.`;
  else{text=`This image: detected night-light index is ${fmt(v)}, and ${pc(s.lit)}% of the image contains night-light pixels. ${cov} of ${COLS} columns carry signal.`;}
  $('conclusion').textContent=text;series=[];cmp=null;drawCurve();curveNote(ds.live?'The graph appears after the second full pass of the yellow line.':'One picture gives one result. Upload several pictures or a video to see a graph over time.');$('tbody').innerHTML='';return text;
}
function curveNote(t){const c=$('curve'),x=c.getContext('2d'),f=getComputedStyle(document.body);x.fillStyle=f.color;x.font='700 24px '+f.fontFamily;x.textAlign='center';let l='',y=70;t.split(' ').forEach(w=>{if((l+w).length>34){x.fillText(l.trim(),c.width/2,y);l='';y+=34;}l+=w+' ';});x.fillText(l.trim(),c.width/2,y);}
function setFrame(i,a=true){frame=(i+NF())%NF();col=0;renderFrame();if(a)say(`Frame ${frame+1} of ${NF()}. `+(scan.length===NF()?note(frame):''));}
function renderViews(grp){const v=DATASETS.filter(d=>d.group===grp&&d.id!=='probe'&&d.view&&d.analysisView!==false),el=$('views');el.innerHTML='';el.hidden=v.length<2||ds.id==='probe'||!!ds.up;
  if(!el.hidden){const l=document.createElement('span');l.textContent='Video: ';el.appendChild(l);
    v.forEach(d=>{const b=document.createElement('button');b.textContent=d.view;b.setAttribute('role','radio');b.setAttribute('aria-checked',d.id===ds.id);b.className=d.id===ds.id?'on':'';b.onclick=()=>pick(d.id);el.appendChild(b);});}}
function pick(id,quiet){stop();ds=DATASETS.find(d=>d.id===id);frame=0;col=0;const grp=ds.group||ds.id;
  document.querySelectorAll('#gallery button').forEach(b=>{const on=b.dataset.id===grp;b.setAttribute('aria-checked',on);b.classList.toggle('on',on);});
  renderViews(grp);$('dsdesc').textContent=ds.title+'. '+ds.blurb;renderLegend();$('dsinfo').textContent=ds.info||'';$('dssrc').textContent='Source: '+(SRC[ds.group||ds.id]||'');
  const sc=scanAll();if(!quiet)say('Selected '+ds.title+'. '+(ds.guide||'')+' Scan result: '+sc+' Press Play to listen.');}
function startTimer(){clearInterval(timer);timer=setInterval(step,(ds.live&&ds.live.run?100:200)/parseFloat($('speed').value));}
function step(){if(ds.live&&ds.live.run)return liveStep();const nc=cols[col];Sonify.play(AudioEngine,ds.mode,ds.cal,nc,col/(COLS-1)*2-1,chg());hearing(nc);$('marker').style.left=(col/(COLS-1)*(pairedLights()?99.45:97))+'%';cv.parentElement.classList.remove('lights-pair');drawProf(col);col++;
  if(col>=COLS){col=0;clearInterval(timer);timer=null;frame=(frame+1)%NF();framesDone++;renderFrame();narrating=true;narrate(note(frame),()=>{narrating=false;if(playing)startTimer();});}}
function play(){AudioEngine.init();if(playing)return pause();if(ds.live&&!ds.live.run){liveStart();return;}playing=true;if(ds.live&&ds.live.run)ds.live.v.play().catch(()=>{});startTimer();$('play').textContent='Pause';say('Playing. Higher notes mean '+(ds.high||'higher values')+'. After each frame I will explain what changed. Press Space to pause.');}
function pause(){if(ds.live&&ds.live.run)ds.live.v.pause();playing=false;narrating=false;token++;clearInterval(timer);timer=null;if(speech())speechSynthesis.cancel();$('play').textContent='Play';say('Paused. Press Play to continue.');}
function stop(){if(ds&&ds.live){ds.live.run=false;ds.live.tk++;try{ds.live.v.pause();}catch(e){}}playing=false;narrating=false;$('hearing').textContent='Hearing: –';token++;clearInterval(timer);timer=null;col=0;$('play').textContent='Play';}
function speak(x,y){const regions=analysisRegions(),inside=regions.some(r=>x*100>=r.x&&x*100<r.x+r.w&&y*100>=r.y&&y*100<r.y+r.h);
  if(!inside){say('Outside the selected analysis frames. Move inside a frame to explore its data.');return;}
  const p=g.getImageData(Math.min(scanWidth()-1,x*scanWidth()|0),Math.min(H-1,y*H|0),1,1).data,c=Analysis.px(ds.mode,p[0],p[1],p[2],y,ds.cal);AudioEngine.init();Sonify.play(AudioEngine,ds.mode,ds.cal,c,x*2-1,chg());
  const what=ds.mode==='lights'?(c.n?'City light, brightness '+Math.round(c.v/(ds.cal.col||5)*100)+' percent':'Dark, no light'):ds.mode==='ocean'?(c.n?'Water about '+c.v.toFixed(0)+' degrees Celsius':'Land or no data'):(c.n?'Lightning flash':'No flash');
  say(`${what}, ${x<.33?'left':x>.66?'right':'center'}, ${y<.33?'top':y>.66?'bottom':'middle'}.`);}
Object.keys(GROUPS).forEach(k=>{const p=DATASETS.find(d=>d.id===k),b=document.createElement('button');b.dataset.id=k;b.setAttribute('role','radio');
  b.innerHTML=`<span class="tag">${p.tag}</span><strong>${GROUPS[k]}</strong>${GBLURB[k]}`;b.onclick=()=>choose(k);$('gallery').appendChild(b);});
$('play').onclick=play;$('stop').onclick=()=>{if(ds.live&&ds.live.run)liveStopBtn();else{stop();say('Stopped');}};$('updel').onclick=removeUpload;
$('prev').onclick=()=>setFrame(frame-1);$('next').onclick=()=>setFrame(frame+1);
$('frame').oninput=e=>setFrame(+e.target.value);$('vol').oninput=e=>AudioEngine.setVolume(audioOn?+e.target.value:0);
$('vol').onchange=()=>say('Volume '+Math.round($('vol').value*100)+' percent.');
$('speed').onchange=()=>{if(ds.live&&ds.live.run)ds.live.v.playbackRate=Math.min(16,parseFloat($('speed').value)||1);if(playing&&timer)startTimer();say('Speed '+$('speed').value+' times.');};$('explore').onclick=toggleExplore;
function toggleExplore(){explore=!explore;if(explore&&playing)pause();$('explore').setAttribute('aria-pressed',explore);
  say(explore?'Explore mode on. Focus the image, use arrow keys, then Enter to hear a spot. Mouse and touch also work.':'Explore mode off.');}
const at=e=>{const r=cv.getBoundingClientRect();speak((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);};
cv.addEventListener('pointermove',e=>{if(explore&&(e.pointerType==='mouse'||e.buttons))at(e);});
cv.addEventListener('pointerdown',e=>{if(explore)at(e);});
cv.addEventListener('keydown',e=>{if(!explore)return;const k={ArrowLeft:[-.05,0],ArrowRight:[.05,0],ArrowUp:[0,-.05],ArrowDown:[0,.05]}[e.key];
  if(k){e.preventDefault();e.stopPropagation();cur.x=Math.min(1,Math.max(0,cur.x+k[0]));cur.y=Math.min(1,Math.max(0,cur.y+k[1]));speak(cur.x,cur.y);}
  else if(e.key==='Enter')speak(cur.x,cur.y);});
function vol(d){const v=$('vol');v.value=Math.min(1,Math.max(0,+v.value+d));AudioEngine.setVolume(+v.value);say('Volume '+Math.round(v.value*100)+' percent');}
document.addEventListener('keydown',e=>{
  if(['INPUT','SELECT','TEXTAREA','DIALOG'].includes(e.target.tagName)||(e.target===cv&&explore&&e.key.startsWith('Arrow')))return;
  if(e.key===' '&&e.target.tagName!=='BUTTON'){e.preventDefault();play();}
  else if(e.key==='ArrowRight')setFrame(frame+1);else if(e.key==='ArrowLeft')setFrame(frame-1);
  else if(e.key==='ArrowUp'){e.preventDefault();vol(.1);}else if(e.key==='ArrowDown'){e.preventDefault();vol(-.1);}
  else if(e.key.toLowerCase()==='e')toggleExplore();else if(e.key==='Escape'){stop();say('Stopped');}
  else if(e.key==='?')$('dlg').showModal();});
$('help').onclick=()=>{$('dlg').showModal();say('Keyboard shortcuts. Space plays or pauses. Left and right arrows change frame. Up and down change volume. E toggles explore mode. Escape stops.');};
$('closedlg').onclick=()=>$('dlg').close();
function flag(id,fn){const b=$(id);b.onclick=()=>{const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on);fn(on);};}
flag('contrast',on=>{document.documentElement.dataset.contrast=on?'1':'';say('High contrast '+(on?'on':'off')+'.');});
flag('bigtext',on=>{document.documentElement.classList.toggle('big',on);say('Larger text '+(on?'on':'off')+'.');});
$('voice').onclick=()=>{voiceOn=!voiceOn;$('voice').setAttribute('aria-pressed',voiceOn);$('voice').textContent='Voice guide: '+(voiceOn?'On':'Off');
  if('speechSynthesis' in window)speechSynthesis.cancel();say('Voice guide '+(voiceOn?'on. I will explain each action you take.':'off. Screen readers will announce changes instead.'));};
const MAXW=800;
const shrink=(src,w,h)=>{const k=Math.min(1,MAXW/w),c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));
  const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(src,0,0,c.width,c.height);return c;};
const load=async f=>{ // JPG/PNG/WebP via <img>; TIFF decoded with UTIF (browsers cannot show .tif). Result: a canvas, at most 800 px wide.
  if(/\.tiff?$/i.test(f.name)||f.type==='image/tiff'){try{const buf=await f.arrayBuffer(),ifd=UTIF.decode(buf)[0];UTIF.decodeImage(buf,ifd);
    const c=document.createElement('canvas');c.width=ifd.width;c.height=ifd.height;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(UTIF.toRGBA8(ifd)),ifd.width,ifd.height),0,0);
    return shrink(c,c.width,c.height);}catch(e){return null;}}
  return new Promise(r=>{const u=URL.createObjectURL(f),im=new Image();im.onload=()=>{try{r(shrink(im,im.naturalWidth||im.width,im.naturalHeight||im.height));}catch(e){r(null);}URL.revokeObjectURL(u);};im.onerror=()=>{URL.revokeObjectURL(u);r(null);};im.src=u;});};
// PDF: every page becomes one frame (pdf.js is loaded only when a PDF is chosen; files are in js/vendor). Pages are drawn on black, so white paper is not read as light.
let pdfMod=null;
const pdfLib=async()=>{if(pdfMod)return pdfMod;const m=await import(new URL('js/vendor/pdf.min.mjs',document.baseURI).href);
  m.GlobalWorkerOptions.workerSrc=new URL('js/vendor/pdf.worker.min.mjs',document.baseURI).href;return pdfMod=m;};
async function loadPdf(f,onPage){const lib=await pdfLib(),task=lib.getDocument({data:new Uint8Array(await f.arrayBuffer())}),doc=await task.promise,out=[];
  for(let p=1;p<=doc.numPages;p++){const pg=await doc.getPage(p),v0=pg.getViewport({scale:1}),v=pg.getViewport({scale:MAXW/v0.width}),c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(v.width));c.height=Math.max(1,Math.round(v.height));
    await pg.render({canvasContext:c.getContext('2d'),viewport:v,background:'rgb(0,0,0)'}).promise;pg.cleanup();out.push(c);if(onPage)onPage(p,doc.numPages);}
  try{await task.destroy();}catch(e){}return out;}
function trainDs(d){const k=ds,fs=[];ds=d;for(let f=0;f<NF();f++){drawFrame(f);fs.push(AI.features(cv));}ds=k;AI.set(d.group||d.id,fs,d.id);}
function modelStatus(){const c=AI.counts(),t=Object.keys(GROUPS).map(k=>`${GROUPS[k]}: ${c[k]||0} frames`).join('; ');
  $('aiStatus').textContent=`The AI is pre-trained on ${t}. Self-test accuracy (leave-one-out): ${Math.round(AI.accuracy()*100)}%.`;}
function renderAI(p){const[id,c]=AI.best(p),list=Object.entries(p).sort((x,y)=>y[1]-x[1]).map(([k,v])=>`${GROUPS[k]} ${Math.round(v*100)}%`).join(', ');
  $('aiResult').textContent=`The AI recognizes this image as “${GROUPS[id]}” (${Math.round(c*100)}% confidence). All scores: ${list}.`;return id;}
$('probe').onchange=async e=>{const f=e.target.files[0];if(!f)return;const im=await load(f);if(!im){say('Unreadable image.');return;}
  const id=renderAI(AI.predict(AI.features(im))),base=DATASETS.find(x=>(x.group||x.id)===id),o=DATASETS.findIndex(x=>x.id==='probe');
  if(o>=0)DATASETS.splice(o,1);
  DATASETS.push({...base,id:'probe',view:undefined,title:'Your analyzed image',blurb:'Sound rule from: '+GROUPS[id],images:[im],label:()=>'this image',describe:()=>'Analyzed image, matched to '+GROUPS[id]+'.'});
  imgs.probe=[im];showStage(true);pick('probe');say($('aiResult').textContent+' '+$('conclusion').textContent);};
async function autoload(d){const get=u=>new Promise(r=>{const im=new Image();im.onload=()=>r(im);im.onerror=()=>r(null);im.src=u;}),nn=i=>String(i).padStart(2,'0');
  for(const e of ['webp','jpg','png']){const first=await get(`data/frames/${d.id}/frame_01.${e}`);if(!first)continue;const list=[first];
    for(let i=2;i<=30;i++){const im=await get(`data/frames/${d.id}/frame_${nn(i)}.${e}`);if(!im)break;list.push(im);}
    if(list.length>=2){d.images=list;imgs[d.id]=list;trainDs(d);return true;}}
  return false;}
const GRAD={lights:'#1a1a2e,#f3e9b0',ocean:'#3b6bff,#3ddc84,#ffe14a,#ff3b30',flash:'#333,#ffd400'},
  LOW={lights:'dark = silent',ocean:'cold water',flash:'low on the map'},HIGH={lights:'bright lights',ocean:'warm water',flash:'high on the map'};
const pitchRange=()=>Analysis.range(ds.mode),pitchM=m=>ds.mode==='flash'?null:Analysis.hzVal(ds.mode,m,ds.cal),pitchOf=i=>Analysis.hzFrame(ds.mode,scan[i],ds.cal);
function hearing(c){const hz=Analysis.hzCol(ds.mode,c,ds.cal),what=ds.mode==='lights'?(hz?'light index '+c.v.toFixed(1):'dark, silent'):ds.mode==='ocean'?(c.n?c.v.toFixed(1)+' °C':'land or no data, silent'):(c.n?c.n+' yellow pixels':'no lightning pixels');
  $('hearing').textContent=`Hearing: column ${col+1} of ${COLS} (${side(col)}) · ${what}${hz?' · '+hz+' Hz':''}`;}
function drawProf(upto){const c=$('prof');if(!c||!cols.length)return;const x=c.getContext('2d'),w=800,h=70,bw=w/COLS,vs=cols.map(score),mx=Math.max(...vs,1e-9);c.width=w;c.height=h;
  vs.forEach((v,i)=>{const bh=Math.max(1,v/mx*(h-6));x.fillStyle=i<=upto?'#ffd400':'rgba(255,212,0,.28)';x.fillRect(i*bw+1,h-bh,bw-2,bh);});
  const n=upto+1,so=$('scanout');if(!so)return;
  so.textContent=n>0?`Scan line: columns 1 to ${n} of ${COLS} give ${fmt(metric(cols.slice(0,n)))}${n===COLS?' — this is the value of '+ds.label(frame)+' in the graph and the table.':'.'}`:`Column profile of ${ds.label(frame)}, left to right. The scan line fills it in; the full result is ${fmt(metric(cols))}.`;}
function renderHz(){const[lo,hi]=minmax(series.length?series:[0,1]),mean=series.length?series.reduce((a,b)=>a+b,0)/series.length:0,f=v=>ds.mode==='flash'?Math.round(v)+' hits':fmt(v)+' → '+pitchM(v)+' Hz';
  $('hzlegend').innerHTML=`<div class="hzbar" style="background:linear-gradient(90deg,${GRAD[ds.mode]})"></div><div class="hzlab"><span>Min (${f(lo)})</span><span>Baseline (${f(mean)})</span><span>Max (${f(hi)})</span></div><p id="hznow" class="hznow"></p>`;}
function renderTable(m){$('pitchh').textContent='Acoustic pitch';
  $('tbody').innerHTML=m.map((v,i)=>{const ch=ds.seriesN&&i>=ds.seriesN,dm=!ch&&i&&m[i-1]?(v-m[i-1])/m[i-1]*100:null,top=BINS[stats[i].share.indexOf(Math.max(...stats[i].share))][1];
    return `<tr><th scope="row"><button class="rowbtn" data-i="${i}">${ds.label(i)}</button></th><td>${fmt(v)}</td><td>${dm===null?(ch?'—':'— (start)'):(dm>=0?'+':'')+Math.round(dm)+'%'}</td><td>${Analysis.detail(ds.mode,scan[i],stats[i],ch)} · ${top}</td><td>${pitchOf(i)?pitchOf(i)+' Hz':'silent'}</td></tr>`;}).join('');}
$('tbody').addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('button');if(b)setFrame(+b.dataset.i);});
function scrub(e){if(series.length<2)return;const r=$('curve').getBoundingClientRect(),n=series.length,i=Math.max(0,Math.min(n-1,Math.round(((e.clientX-r.left)/r.width*800-10)/780*(n-1))));
  if(i===frame&&e.type==='pointermove')return;frame=i;col=0;renderFrame();AudioEngine.init();const hz=pitchOf(i);if(hz)AudioEngine.tone(hz,{dur:.3,vol:.22,type:'triangle'});else AudioEngine.noise({dur:.15,vol:.25,freq:900});}
['pointerdown','pointermove'].forEach(t=>$('curve').addEventListener(t,e=>{if(t==='pointerdown'||e.buttons)scrub(e);}));
let touring=false,narrating=false,framesDone=0;
const wait=ms=>new Promise(r=>setTimeout(r,ms)),say2=t=>new Promise(r=>narrate(t,r));
function stopTour(){touring=false;stop();token++;if(speech())speechSynthesis.cancel();$('tour').textContent='Judge tour (2 min)';if(tourSample!==null){sampleMode=tourSample;tourSample=null;restoreView();}}
async function tour(){if(touring)return stopTour();touring=true;ready=true;tourSample=sampleMode;sampleMode=true;showStage(true);$('tour').textContent='Stop tour';AudioEngine.init();
  await say2('Welcome to Earth Jukebox. It turns real NASA Earth Information Center frames into sound, so people who cannot see the maps can still hear how our planet changes. This demo uses the built-in NASA sample frames; in the app you upload your own video, J P G or P N G. You will hear three datasets. For each one I explain the sound rule, play two frames, and say what changed.');
  for(const k of Object.keys(GROUPS)){if(!touring)return;pick(k,true);if($('player').scrollIntoView)$('player').scrollIntoView();
    await say2(`${GROUPS[k]}. ${ds.guide} ${$('conclusion').textContent}`);if(!touring)return;
    framesDone=0;playing=true;$('play').textContent='Pause';startTimer();
    while(touring&&(framesDone<2||narrating))await wait(250);
    if(!touring)return;stop();token++;if(speech())speechSynthesis.cancel();}
  await say2('That is the tour. You can open the data table for every number, scrub the curve to hear the pitch change, use explore mode with the arrow keys, test any image with the AI, or turn on high contrast. Thank you for listening.');stopTour();}
$('tour').onclick=tour;
const SRC={lights:'NASA Black Marble night lights, shown in the Earth Information Center',ocean:'MIT/JPL ECCO2 ocean model, NASA Scientific Visualization Studio',lightning:'ISS Lightning Imaging Sensor (LIS), NASA Scientific Visualization Studio'};
const minmax=a=>{const lo=Math.min(...a),hi=Math.max(...a);return[lo,hi===lo?lo+1e-9:hi];};
function drawCurve(){const c=$('curve'),x=c.getContext('2d'),w=800,h=170,n=series.length;c.width=w;c.height=h;x.clearRect(0,0,w,h);if(n<2)return;
  const[lo,hi]=minmax(series),px=i=>10+i*(w-20)/(n-1),py=(v,l=lo,u=hi)=>h-22-(v-l)/(u-l)*(h-52),mean=series.reduce((a,b)=>a+b,0)/n;
  x.setLineDash([4,4]);x.strokeStyle='rgba(128,140,160,.8)';x.lineWidth=1;x.beginPath();x.moveTo(10,py(mean));x.lineTo(w-10,py(mean));x.stroke();x.setLineDash([]);
  x.beginPath();x.moveTo(px(0),h-22);series.forEach((v,i)=>x.lineTo(px(i),py(v)));x.lineTo(px(n-1),h-22);x.closePath();x.fillStyle='rgba(42,160,232,.25)';x.fill();
  x.beginPath();series.forEach((v,i)=>i?x.lineTo(px(i),py(v)):x.moveTo(px(i),py(v)));x.strokeStyle='#2aa0e8';x.lineWidth=3;x.stroke();
  if(cmp){const[l2,h2]=minmax(cmp);x.beginPath();cmp.forEach((v,i)=>i?x.lineTo(px(i),py(v,l2,h2)):x.moveTo(px(i),py(v,l2,h2)));x.strokeStyle='#3ddc84';x.lineWidth=3;x.setLineDash([7,5]);x.stroke();x.setLineDash([]);}
  const f=Math.min(frame,n-1);x.strokeStyle='#ff9a3c';x.lineWidth=2;x.beginPath();x.moveTo(px(f),6);x.lineTo(px(f),h-22);x.stroke();
  x.fillStyle='#ff9a3c';x.beginPath();x.arc(px(f),py(series[f]),7,0,7);x.fill();x.strokeStyle='#fff';x.lineWidth=2;x.stroke();
  c.setAttribute('aria-valuemax',n-1);c.setAttribute('aria-valuenow',f);c.setAttribute('aria-valuetext',`${ds.label(f)}, ${fmt(series[f])}`);}
const SER={},rs=(a,n)=>Array.from({length:n},(_,i)=>a[Math.round(i*(a.length-1)/Math.max(1,n-1))]);
function seriesOf(d){if(SER[d.id])return SER[d.id];const k=ds;ds=d;const val=[];for(let f=0;f<NF();f++)val.push(metric(drawFrame(f)));ds=k;return SER[d.id]={val};}
function corr(a,b){const n=a.length,ma=a.reduce((x,y)=>x+y)/n,mb=b.reduce((x,y)=>x+y)/n;let sa=0,sb=0,sp=0;for(let i=0;i<n;i++){sa+=(a[i]-ma)**2;sb+=(b[i]-mb)**2;sp+=(a[i]-ma)*(b[i]-mb);}return sa&&sb?sp/Math.sqrt(sa*sb):0;}
function buildCompare(){const grp=ds.group||ds.id;$('cmpSel').innerHTML='<option value="">None</option><option value="lit">Lit area of the same frames</option>'+DATASETS.filter(d=>(d.group||d.id)===grp&&d.id!==ds.id&&d.id!=='probe'&&!d.up&&!ds.up).map(d=>`<option value="${d.id}">${d.view||d.title}</option>`).join('');$('cmpOut').textContent='';}
$('cmpSel').onchange=()=>{const v=$('cmpSel').value;if(!v||series.length<2){cmp=null;$('cmpOut').textContent='';drawCurve();return;}
  const n=series.length;let b,name;if(v==='lit'){b=stats.map(s=>s.lit);name='lit area';}else{const d=DATASETS.find(x=>x.id===v);b=rs(seriesOf(d).val,n);name=d.view||d.title;renderFrame();}
  cmp=b;const r=corr(series,b),st=Math.abs(r)>.7?'strong':Math.abs(r)>.4?'moderate':'weak';
  $('cmpOut').textContent=`Blue curve: ${UNIT[ds.mode]}. Green dashed curve: ${name}. Correlation r = ${r.toFixed(2)} (${st} ${r>=0?'positive':'negative'}).`;drawCurve();say($('cmpOut').textContent);};
$('test').onclick=()=>{AudioEngine.init();const[lo,hi]=minmax(series.length?series:[0,1]),mean=series.length?series.reduce((a,b)=>a+b,0)/series.length:0;
  [lo,mean,hi].forEach((v,i)=>setTimeout(()=>{const hz=pitchM(v);if(hz)AudioEngine.tone(hz,{dur:.5,vol:.3,type:'triangle'});else AudioEngine.noise({dur:.15,vol:.3,freq:500+i*600});},i*600));
  say('Test sound: minimum, baseline, then maximum. Higher value means higher pitch.');};
$('audio').onclick=()=>{audioOn=!audioOn;$('audio').setAttribute('aria-pressed',audioOn);$('audio').textContent='Audio '+(audioOn?'On':'Off');AudioEngine.setVolume(audioOn?+$('vol').value:0);say('Audio '+(audioOn?'on':'off')+'.');};
$('how').onclick=()=>{const[lo,hi]=pitchRange(),t=`${ds.guide} Pitch runs from ${lo} Hz for the lowest value to ${hi} Hz for the highest. ${ds.rule||''} Left to right on the image becomes left to right in your headphones. After each frame the voice explains what changed.`;
  $('howtxt').textContent=t;$('howdlg').showModal();say(t);};
$('closehow').onclick=()=>$('howdlg').close();
function melody(){if(melT){clearInterval(melT);melT=null;$('melody').textContent='♪ Play the whole series as a melody';return;}
  if(series.length<2)return;stop();AudioEngine.init();let i=0;$('melody').textContent='■ Stop melody';
  melT=setInterval(()=>{if(i>=series.length){melody();return;}frame=i;col=0;renderFrame();const hz=pitchOf(i);if(hz)AudioEngine.tone(hz,{dur:.4,vol:.25,type:'triangle'});else AudioEngine.noise({dur:.15,vol:.3,freq:900});i++;},380);
  say(`Playing the whole series as a melody, one note per frame, ${series.length} notes.`);}
$('melody').onclick=melody;
function makeWav(){const sr=22050,nd=Math.floor(sr*.4),n=series.length,buf=new Int16Array(n*nd);
  series.forEach((v,i)=>{const hz=pitchOf(i);for(let k=0;k<nd;k++){const env=Math.exp(-4*k/nd)*Math.min(1,k/200),s=hz?Math.sin(2*Math.PI*hz*k/sr):(Math.random()*2-1)*(k<nd*.3?1:0);buf[i*nd+k]=s*env*9000;}});
  const h=new DataView(new ArrayBuffer(44)),w=(o,t)=>[...t].forEach((c,i)=>h.setUint8(o+i,c.charCodeAt(0)));
  w(0,'RIFF');h.setUint32(4,36+buf.length*2,true);w(8,'WAVEfmt ');h.setUint32(16,16,true);h.setUint16(20,1,true);h.setUint16(22,1,true);h.setUint32(24,sr,true);h.setUint32(28,sr*2,true);h.setUint16(32,2,true);h.setUint16(34,16,true);w(36,'data');h.setUint32(40,buf.length*2,true);
  return new Blob([h,buf],{type:'audio/wav'});}
$('dl').onclick=async()=>{if(series.length<2)return;
  if(window.claude&&claude.use){const d=await claude.use('downloads');if(!d){say('Downloads are not available in this view.');return;}
    const rows=['frame,value,change_percent,pitch_hz'].concat(series.map((v,i)=>[ds.label(i),v.toFixed(4),i&&series[i-1]?((v-series[i-1])/series[i-1]*100).toFixed(1):'',pitchOf(i)||''].join(',')));
    try{await d.save({filename:`earth-jukebox-${ds.id}.csv`,data:rows.join('\n')});}catch(e){say('The download was not saved.');}return;}
  const a=document.createElement('a');a.href=URL.createObjectURL(makeWav());a.download=`earth-jukebox-${ds.id}.wav`;a.click();say('Melody downloaded.');};
$('dl').textContent=(window.claude&&claude.use)?'⬇ Download data (.csv)':'⬇ Download melody (.wav)';
const base=k=>DATASETS.find(d=>d.id===k);
function showStage(on){$('player').hidden=!on;$('coilsec').hidden=!on;$('geosec').hidden=!on;if(on&&typeof GeoUI!=='undefined')GeoUI.update();}
function restoreView(){stop();if(sel&&USER[sel]){pick(USER[sel].id,true);showStage(true);}else if(sampleMode&&sel){pick(sel,true);showStage(true);}else showStage(false);}
function choose(k){sel=k;const p=base(k);$('updel').hidden=!USER[k];
  document.querySelectorAll('#gallery button').forEach(b=>{const on=b.dataset.id===k;b.setAttribute('aria-checked',on);b.classList.toggle('on',on);});
  renderLegend(p);$('uptitle').textContent=`${GROUPS[k]}: upload a video, JPG, PNG or PDF (any number of pictures). ${p.rule||''}`;$('upfile').disabled=false;
  if(USER[k]){pick(USER[k].id,true);showStage(true);say(`Selected ${GROUPS[k]}, showing your upload. `+$('conclusion').textContent);}
  else if(sampleMode){pick(k);showStage(true);}
  else{stop();showStage(false);$('upstatus').textContent=`No ${GROUPS[k]} data uploaded yet.`;say(`Selected ${GROUPS[k]}. ${p.guide} Now upload a video, J P G or P N G file with the upload button.`);}}
const isVid=f=>/^video\//.test(f.type)||/\.(mp4|webm|mov|m4v|mkv|ogv)$/i.test(f.name),isPdf=f=>f.type==='application/pdf'||/\.pdf$/i.test(f.name);
const shortList=n=>n.length>6?n.slice(0,3).join(', ')+` … and ${n.length-3} more`:n.join(', ');
const fmtT=t=>{const m=Math.floor(t/60),s=t-m*60;return m+':'+(s<10?'0':'')+s.toFixed(1);};
// Video -> N frames at evenly spaced timestamps (each frame keeps its exact time), shrunk to max 800 px wide.
async function readVideo(f,N,prog){const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';const url=URL.createObjectURL(f);
  await new Promise((res,rej)=>{v.onloadedmetadata=res;v.onerror=()=>rej(new Error('decode'));setTimeout(()=>rej(new Error('timeout')),15000);v.src=url;});
  const dur=v.duration;if(!isFinite(dur)||dur<=0)throw new Error('duration');
  const k=Math.min(1,800/v.videoWidth),w=Math.round(v.videoWidth*k),h=Math.round(v.videoHeight*k),frames=[],times=[];
  for(let i=0;i<N;i++){const t=N===1?0:Math.min(dur-.05,dur*i/(N-1));
    await new Promise((res,rej)=>{if(Math.abs(v.currentTime-t)<.001&&v.readyState>=2){res();return;}v.onseeked=res;v.onerror=()=>rej(new Error('seek'));setTimeout(res,4000);v.currentTime=t;});
    const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(v,0,0,w,h);frames.push(c);times.push(v.currentTime);prog((i+1)/N);}
  URL.revokeObjectURL(url);return{frames,times,dur};}
// ---- Live video analysis: the yellow line reads the PLAYING video directly, column by column. No frame limit.
// One full left-to-right pass = one point of the graph/table/3D coil. Pause = hold the video and the scan, resume continues.
// Stop = end the analysis; the graph keeps exactly the passes completed up to that moment.
async function openVideo(f){const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';const url=URL.createObjectURL(f);
  await new Promise((res,rej)=>{v.onloadedmetadata=res;v.onerror=()=>rej(new Error('decode'));setTimeout(()=>rej(new Error('timeout')),15000);v.src=url;});
  if(!isFinite(v.duration)||v.duration<=0)throw new Error('duration');
  const sw=v.videoWidth,sh=v.videoHeight,k=Math.min(1,1200/sw);
  const L={v,url,dur:v.duration,sx:0,sy:0,sw,sh,paired:false,w:Math.round(sw*k),h:Math.round(sh*k),run:false,tk:0,times:[0],col:0,cur:null,t0:0};
  v.onended=()=>{if(L.run&&ds.live===L)liveEnd(true);};return L;}
async function seekCanvas(L,t){const v=L.v;await new Promise((res,rej)=>{if(Math.abs(v.currentTime-t)<.001&&v.readyState>=2){res();return;}v.onseeked=res;v.onerror=()=>rej(new Error('seek'));setTimeout(res,4000);v.currentTime=t;});
  const c=document.createElement('canvas');c.width=L.w;c.height=L.h;c.getContext('2d').drawImage(v,0,0,L.sw,L.sh,0,0,L.w,L.h);return c;}
const blank=()=>({n:0,tot:1,v:0,sd:0,y:.5,pu:0,or:0,up:0,wm:0}),newCur=()=>Array.from({length:COLS},blank);
function liveStart(){const L=ds.live;L.run=true;L.tk++;ds.images=[];imgs[ds.id]=ds.images;scan=[];stats=[];series=[];L.times=[];L.col=0;L.cur=newCur();ds.cal={lo:0,hi:1,col:4};
  frame=0;col=0;cols=L.cur;playing=true;$('play').textContent='Pause';$('tbody').innerHTML='';drawCurve();$('upprog').hidden=true;
  $('conclusion').textContent='Live analysis started. The conclusion appears after the first full pass of the yellow line.';
  say('Playing. The yellow line analyzes the video live while it plays. Pause holds it. Stop ends it and keeps the result up to that point.');
  const tk=L.tk;L.v.playbackRate=Math.min(16,parseFloat($('speed').value)||1);
  const go=()=>{if(!L.run||tk!==L.tk)return;L.v.play().catch(()=>{});startTimer();};
  if(L.v.currentTime>0.001){L.v.onseeked=go;setTimeout(go,1500);L.v.currentTime=0;}else go();}
function liveStep(){const L=ds.live;if(!L.run||L.v.readyState<2)return;
  if(!L.viewW){L.viewW=800;L.viewH=Math.max(200,Math.round(L.viewW*L.sh/L.sw));}
  W=L.viewW;H=L.viewH;if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
  g.fillStyle='#000';g.fillRect(0,0,W,H);g.drawImage(L.v,L.sx,L.sy,L.sw,L.sh,0,0,W,H);
  if(L.col===0)L.t0=L.v.currentTime;
  const c=Analysis.readRegions(ds.mode,g,scanWidth(),H,COLS,analysisRegions(),L.col);L.cur[L.col]=c;cols=L.cur;col=L.col;
  Sonify.play(AudioEngine,ds.mode,ds.cal,c,L.col/(COLS-1)*2-1,false);hearing(c);$('marker').style.left=(L.col/(COLS-1)*(pairedLights()?99.45:97))+'%';drawProf(L.col);
  L.col++;if(L.col>=COLS)liveSweepDone(L);}
function liveSweepDone(L){const snap=document.createElement('canvas');snap.width=W;snap.height=H;snap.getContext('2d').drawImage(cv,0,0);
  ds.images.push(snap);imgs[ds.id]=ds.images;scan.push(L.cur);stats.push(spectrum());L.times.push(L.t0);ds.cal=Analysis.cal(ds.mode,scan,NS());
  frame=scan.length-1;L.col=0;L.cur=newCur();renderScan();renderFrame();cols=L.cur;
  $('upstatus').textContent=`Live: ${scan.length} full passes analyzed so far (video at ${fmtT(L.v.currentTime)} of ${fmtT(L.dur)}). Pause holds it; Stop ends it and keeps this result.`;}
function liveEnd(done){const L=ds.live;L.run=false;L.tk++;L.v.pause();playing=false;narrating=false;token++;clearInterval(timer);timer=null;$('play').textContent='Play';
  const n=scan.length;$('upstatus').textContent=(done?'The video ended. ':'The video stopped early. ')+`The result covers ${n} full passes of the yellow line.`;
  if(n>0){renderFrame();}say((done?'The video analysis is finished. ':'The video stopped early. ')+(n>1?$('conclusion').textContent:''));}
function liveStopBtn(){const L=ds.live,at=L.v.currentTime;stop();const n=scan.length;
  $('upstatus').textContent=`Stopped at ${fmtT(at)} of ${fmtT(L.dur)}. The graph and table show the ${n} full passes completed up to this point (a pass that was still running is not counted). Press Play to analyze again from the start.`;
  if(n>0){frame=n-1;renderFrame();}say(`Stopped at ${fmtT(at)}. The result covers ${n} full passes.`+(n>1?' '+$('conclusion').textContent:''));}
function removeUpload(){const k=sel;if(!k||!USER[k])return;const d=USER[k];
  if(d.live){d.live.run=false;d.live.tk++;try{URL.revokeObjectURL(d.live.url);d.live.v.removeAttribute('src');d.live.v.load();}catch(e){}}
  stop();const o=DATASETS.findIndex(x=>x.id===d.id);if(o>=0)DATASETS.splice(o,1);delete imgs[d.id];delete USER[k];
  ds=base(k);scan=[];stats=[];series=[];$('upprog').hidden=true;$('updel').hidden=true;restoreView();
  $('upstatus').textContent=`Removed the ${GROUPS[k]} upload. You can upload another video or image.`;say(`The ${GROUPS[k]} upload was removed.`);}
async function upload(files){
  if(!sel){say('Choose a dataset first.');return;}
  const k=sel,fs=[...files],vids=fs.filter(isVid),pics=fs.filter(f=>!isVid(f)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})),st=$('upstatus'),pr=$('upprog');
  pr.hidden=false;pr.value=0;stop();let frames,labels,desc,names,kind,live=null,skipped=0;
  try{
    if(vids.length){st.textContent='Opening '+vids[0].name+'…';
      const L=await openVideo(vids[0]);frames=[await seekCanvas(L,0)];live=L;
      names=[vids[0].name];kind='video';labels=i=>fmtT(L.times[i]||0);desc=(i,l)=>`${GROUPS[k]}, your video at ${l} of ${fmtT(L.dur)}.`;}
    else{frames=[];names=[];let bad=0,pdfBad=false;
      for(let i=0;i<pics.length;i++){const f=pics[i],tag=`Reading file ${i+1} of ${pics.length}: ${f.name}`;st.textContent=tag;pr.value=i/pics.length;
        try{if(isPdf(f)){const pg=await loadPdf(f,(p,n)=>{st.textContent=`${tag} (page ${p} of ${n})`;});pg.forEach((c,j)=>{frames.push(c);names.push(pg.length>1?`${f.name} p.${j+1}`:f.name);});}
          else{const c=await load(f);if(c){frames.push(c);names.push(f.name);}else bad++;}}
        catch(e){bad++;if(isPdf(f))pdfBad=true;}
        if(i%4===3)await new Promise(r=>setTimeout(r,0));}
      if(!frames.length)throw new Error(pdfBad?'pdf':'none');skipped=bad;kind='images';labels=frames.length>1?(i=>'image '+(i+1)):(()=>'your image');
      desc=(i,l)=>frames.length>1?`${GROUPS[k]}, ${l} of ${frames.length}: ${names[i]}.`:`${GROUPS[k]}, your image ${names[0]}.`;}
  }catch(e){pr.hidden=true;const m=vids.length?'The browser could not read this video. Use MP4 (H.264) or WebM.':e&&e.message==='pdf'?'The PDF could not be read. PDF reading needs the full project folder (js/vendor) opened through a web server such as Live Server.':'No readable image. Use JPG, PNG, WebP, TIFF or PDF.';st.textContent=m;say(m);return;}
  const b=base(k),o=DATASETS.findIndex(x=>x.id===k+'-up');if(o>=0)DATASETS.splice(o,1);
  const d={...b,id:k+'-up',group:k,up:true,view:undefined,seriesN:undefined,images:frames,live,keep:true,label:labels,describe:desc,
    title:`${GROUPS[k]}: your ${kind==='video'?'video':frames.length>1?'images':'image'}`,blurb:shortList(names),info:`Analysis of your upload (${kind}): ${shortList(names)}. ${b.rule||''}`};
  DATASETS.push(d);USER[k]=d;imgs[d.id]=frames;
  let hint='';try{const[bid,cf]=AI.best(AI.predict(AI.features(frames[0])));if(bid!==k&&cf>=.6)hint=` Note: the AI thinks the first frame looks like "${GROUPS[bid]}" (${Math.round(cf*100)}%). The sound rule of "${GROUPS[k]}" is used because you chose it.`;}catch(e){}
  const liveMsg=live?`Video loaded: ${names[0]} (${fmtT(live.dur)}). Press Play: the yellow line analyzes the video live while it plays, with no frame limit. Pause holds it; Stop ends it and keeps the result up to that point.`:'';
  st.textContent=live?liveMsg:`Analyzed ${frames.length} ${kind==='video'?'frame'+(frames.length>1?'s':'')+' from the video':'image'+(frames.length>1?'s':'')}: ${shortList(names)}. Check that every analyzed frame is a flat world map in the matching NASA reference style; globe, orbit, cropped-region or inset-heavy frames can make geographic and pixel estimates invalid.${skipped?` ${skipped} file${skipped>1?'s were':' was'} unreadable and skipped.`:''}${hint}`;
  pr.hidden=true;showStage(true);pick(d.id,true);
  $('updel').hidden=false;say(live?liveMsg+hint:`Your ${kind==='video'?'video':'upload'} was analyzed. `+$('conclusion').textContent+hint+' Press Play to listen.');if($('player').scrollIntoView)$('player').scrollIntoView();}
$('upfile').onchange=e=>{if(e.target.files.length)upload(e.target.files);e.target.value='';};
$('samples').onchange=e=>{sampleMode=e.target.checked;if(sampleMode)choose(sel||'lights');else restoreView();};
async function embed(d){const L=typeof EMBED!=='undefined'&&EMBED[d.id];if(!L)return;
  const list=await Promise.all(L.map(u=>new Promise(r=>{const im=new Image();im.onload=()=>r(im);im.onerror=()=>r(null);im.src=u;})));
  d.images=list.filter(Boolean);imgs[d.id]=d.images;}
(async()=>{await Promise.all(DATASETS.map(embed));DATASETS.forEach(trainDs);modelStatus();
  const r=await Promise.all(DATASETS.filter(d=>!d.images).map(autoload));if(r.some(Boolean)){modelStatus();if(sampleMode)pick(ds.id,true);}})();



// ===== Editable frame editor: one to five regions per dataset =====
(()=>{
  const layer=document.getElementById('frameLayer');
  if(!layer)return;
  const $f=id=>document.getElementById(id),MAX=5,MIN=4;
  let dataset='lights',boxes=[],selected=0,drag=null;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const initial=()=>[{x:2,y:4,w:96,h:92}];
  const storageKey=k=>'earthJukeboxFramesV2:'+k;
  function currentKey(){return (typeof ds!=='undefined'&&(ds.group||ds.id))||'default';}
  function save(){try{localStorage.setItem(storageKey(dataset),JSON.stringify(boxes));}catch(e){}}
  function readRegions(){return boxes.map(b=>({...b}));}
  function publish(){window.__analysisFrames={getRegions:readRegions};}
  function update(){
    layer.replaceChildren();
    boxes.forEach((b,i)=>{
      const el=document.createElement('div');
      el.className='analysis-frame'+(i===selected?' selected':'');
      el.style.left=b.x+'%';el.style.top=b.y+'%';el.style.width=b.w+'%';el.style.height=b.h+'%';
      el.setAttribute('role','group');el.setAttribute('aria-label','Frame '+(i+1));
      const label=document.createElement('span');label.className='frame-label';label.textContent='Frame '+(i+1);el.append(label);
      const handle=document.createElement('button');handle.type='button';handle.className='resize-handle';handle.title='Drag to resize';handle.setAttribute('aria-label','Resize frame '+(i+1));el.append(handle);
      el.addEventListener('pointerdown',e=>begin(e,i,e.target===handle?'resize':'move'));
      el.addEventListener('click',e=>{e.stopPropagation();selected=i;sync();update();});
      layer.append(el);
    });
    const select=$f('frameSelect');select.replaceChildren();
    boxes.forEach((b,i)=>{const o=document.createElement('option');o.value=i;o.textContent='Frame '+(i+1);select.append(o);});
    select.value=String(selected);
    $f('frameCount').textContent=boxes.length+' / '+MAX;
    $f('addFrame').disabled=boxes.length>=MAX;$f('removeFrame').disabled=boxes.length<=1;
    $f('frameHelp').textContent=`${boxes.length} frame(s) selected. All pixels inside any frame are included; overlaps are counted once.`;
    publish();
  }
  function sync(){$f('frameSelect').value=String(selected);}
  function commit(){save();update();if(typeof renderFrame==='function')renderFrame();}
  function loadForDataset(){
    dataset=currentKey();let v=null;
    try{v=JSON.parse(localStorage.getItem(storageKey(dataset))||'null');}catch(e){}
    boxes=Array.isArray(v)&&v.length?v.slice(0,MAX):initial();
    boxes=boxes.map(b=>({x:clamp(+b.x||0,0,99),y:clamp(+b.y||0,0,99),
      w:clamp(+b.w||20,MIN,100),h:clamp(+b.h||20,MIN,100)}))
      .map(b=>({...b,w:Math.min(b.w,100-b.x),h:Math.min(b.h,100-b.y)}));
    selected=0;update();
  }
  function begin(e,i,mode){
    if(e.button!==undefined&&e.button!==0)return;
    e.preventDefault();e.stopPropagation();selected=i;const r=layer.getBoundingClientRect(),b={...boxes[i]};
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,rect:r,base:b,mode};
    try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_){}
    update();
    const move=ev=>{
      if(!drag||ev.pointerId!==drag.id)return;
      const dx=(ev.clientX-drag.x)/r.width*100,dy=(ev.clientY-drag.y)/r.height*100,q=boxes[i];
      if(mode==='move'){q.x=clamp(b.x+dx,0,100-q.w);q.y=clamp(b.y+dy,0,100-q.h);}
      else{q.w=clamp(b.w+dx,MIN,100-q.x);q.h=clamp(b.h+dy,MIN,100-q.y);}
      update();
    };
    const end=ev=>{if(!drag||ev.pointerId!==drag.id)return;drag=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end);save();if(typeof renderFrame==='function')renderFrame();};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
  }
  function nudge(dx,dy){const b=boxes[selected];b.x=clamp(b.x+dx,0,100-b.w);b.y=clamp(b.y+dy,0,100-b.h);commit();}
  function resize(k){const b=boxes[selected],cx=b.x+b.w/2,cy=b.y+b.h/2;b.w=clamp(b.w*k,MIN,100);b.h=clamp(b.h*k,MIN,100);b.x=clamp(cx-b.w/2,0,100-b.w);b.y=clamp(cy-b.h/2,0,100-b.h);commit();}
  $f('addFrame').addEventListener('click',()=>{
    if(boxes.length>=MAX)return;
    const b=boxes[selected],w=Math.max(22,b.w*.65),h=Math.max(22,b.h*.65);
    boxes.push({x:clamp(b.x+(b.w-w)/2+2,0,100-w),y:clamp(b.y+(b.h-h)/2+2,0,100-h),w,h});
    selected=boxes.length-1;commit();
  });
  $f('removeFrame').addEventListener('click',()=>{if(boxes.length<=1)return;boxes.splice(selected,1);selected=Math.min(selected,boxes.length-1);commit();});
  $f('frameSelect').addEventListener('change',e=>{selected=+e.target.value||0;update();});
  $f('frameLarger').addEventListener('click',()=>resize(1.12));
  $f('frameSmaller').addEventListener('click',()=>resize(.88));
  $f('frameUp').addEventListener('click',()=>nudge(0,-1));
  $f('frameDown').addEventListener('click',()=>nudge(0,1));
  $f('frameLeft').addEventListener('click',()=>nudge(-1,0));
  $f('frameRight').addEventListener('click',()=>nudge(1,0));
  $f('frameReset').addEventListener('click',()=>{boxes=initial();selected=0;commit();});
  const originalPick=window.pick;
  if(typeof originalPick==='function')window.pick=function(id,quiet){originalPick(id,quiet);loadForDataset();if(typeof renderFrame==='function')renderFrame();};
  const originalChoose=window.choose;
  if(typeof originalChoose==='function')window.choose=function(k){originalChoose(k);loadForDataset();if(typeof renderFrame==='function')renderFrame();};
  loadForDataset();
})();


$('creditsbtn').onclick=()=>{$('creditdlg').showModal();say('Credits, licenses and AI disclosure opened. It lists NASA S V S and E I C, Natural Earth, pdf dot j s, U T I F, and how the team used Claude and other AI. Press Escape or Close to return.');};
$('closecredits').onclick=()=>{$('creditdlg').close();say('Credits closed.');};
// ===== Voice for EVERY control =====
// Most buttons already speak their own result. This layer guarantees that no button, switch, list, slider or section header
// stays silent: if nothing was spoken within 350 ms after the action, the control announces itself (name + new state).
// It never repeats a message a control already spoke, and it always follows the Voice guide switch.
(()=>{
  const clean=s=>(s||'').replace(/[\u2190-\u21ff\u23ed\u23ee\u25a0\u25b6\u266a\u2b07\u2139\u2696\u{1F4CA}\u{1F514}\uff0b\u2212+]/gu,' ').replace(/\s+/g,' ').trim();
  const VOICE={
    georeset:()=>'Border alignment reset to the whole world, for this dataset only.',
    gbworld:()=>'Map area set to the whole world.',
    gbaspect:()=>"Map area set to keep the picture's shape, centered on the equator.",
    geoleft:()=>'Borders moved left.',georight:()=>'Borders moved right.',geoup:()=>'Borders moved up.',geodown:()=>'Borders moved down.',
    geosmaller:()=>'Borders shrunk.',geolarger:()=>'Borders enlarged.',
    geocsv:()=>'Preparing the country table. The download starts when it is ready.',
    closedlg:()=>'Keyboard help closed.',closehow:()=>'Sound explanation closed.',
    coilauto:b=>'Auto-rotate '+(b.getAttribute('aria-pressed')==='true'?'on':'off')+'.',
    coilreset:()=>'3D coil view reset.',
    upfile:()=>'Choose a video, or any number of JPG, PNG or PDF files to upload.',
    geopick:()=>'Choose a country map file in GeoJSON or TopoJSON format.',
    probe:()=>'Choose an image to test with the AI.',
    geoscope:b=>'Country table shows '+b.options[b.selectedIndex].text+'.',
    geotop:b=>'Country table shows '+b.options[b.selectedIndex].text+'.',
    cmpSel:b=>b.value?'Comparing with '+b.options[b.selectedIndex].text+'.':'Comparison removed.',
    samples:b=>'Built-in NASA sample frames '+(b.checked?'shown.':'hidden.'),
    georim:b=>'Country borders '+(b.getAttribute('aria-pressed')==='true'?'displayed.':'hidden.'),
    geoedit:b=>'Border editing '+(b.getAttribute('aria-pressed')==='true'?'enabled.':'disabled.')
  };
  const labelOf=el=>{
    if(VOICE[el.id])return VOICE[el.id](el);
    let n=el.getAttribute('aria-label')||'';
    if(!n&&el.labels&&el.labels[0])n=el.labels[0].childNodes[0]&&el.labels[0].childNodes[0].textContent||el.labels[0].textContent;
    if(!n&&el.closest&&el.closest('label'))n=(el.closest('label').childNodes[0]||{}).textContent||'';
    if(!n)n=el.textContent||el.title||el.id;
    n=clean(n);
    if(el.tagName==='SUMMARY'){const d=el.parentElement;return n+(d&&d.open?', expanded.':', collapsed.');}
    if(el.tagName==='SELECT')return n+': '+clean(el.options[el.selectedIndex].text)+'.';
    if(el.type==='range')return n+' '+(el.max==='1'?Math.round(el.value*100)+' percent':el.value)+'.';
    if(el.type==='checkbox')return n+(el.checked?', on.':', off.');
    if(el.getAttribute('aria-pressed')!==null)return n+(el.getAttribute('aria-pressed')==='true'?', on.':', off.');
    return n+'.';};
  const kick=e=>{
    const el=e.target&&e.target.closest&&e.target.closest('button,select,input,summary,[role=radio],[role=button]');
    if(!el||el.disabled)return;
    if(el.id==='voice'||el.tagName==='CANVAS')return;
    if(e.type==='input'&&el.type!=='range')return;
    if(e.type==='click'&&(el.tagName==='SELECT'||el.type==='range'))return;
    if(e.type==='click'&&el.tagName==='INPUT'&&el.type!=='checkbox'&&el.type!=='file')return;
    if(e.type==='change'&&el.type==='file'&&el.id!=='upfile'&&el.id!=='geopick'&&el.id!=='probe')return;
    if(e.type==='change'&&el.type==='file')return; // the upload itself speaks
    if(e.type==='input'&&el.type==='range')return; // sliders speak on release (change)
    const t0=performance.now();
    setTimeout(()=>{if(lastSayT>=t0)return;try{say(labelOf(el));}catch(_){}},350);};
  ['click','change'].forEach(ev=>document.addEventListener(ev,kick,true));
  // The three section headers and the skip link also announce themselves when activated by keyboard or pointer.
  document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a.skip');if(a)say('Skipping to the player.');},true);
})();
