// Sonification rules: each dataset has its OWN sound, driven by ITS OWN parameter (see analysis.js). Pure functions.
const Sonify=(()=>{
  // E = audio engine, mode = dataset mode, k = calibration, c = one column reading, chg = frame is the change map
  function play(E,mode,k,c,pan,chg){
    const hz=Analysis.hzCol(mode,c,k);
    if(mode==='lights'){                 // brightness -> pitch + loudness, dark = silence, soft triangle pulses
      if(chg){                           // change map: purple (more light) = high bell, orange (less light) = low tone
        if(c.pu>.004)E.tone(880*(1+c.pu*8),{dur:.5,vol:.18,pan,type:'sine',attack:.01});
        if(c.or>.004)E.tone(110*(1+c.or*8),{dur:.8,vol:.18,pan,type:'sine',attack:.12});
        return;}
      if(hz)E.tone(hz,{dur:.35,vol:.05+.3*Math.min(1,c.v/(k.col||1)),pan,type:'triangle'});
    }else if(mode==='ocean'){            // temperature (hue) -> pitch: cold = low, warm = high; long sine pad, spread = detune
      if(hz){E.tone(hz,{dur:1.3,vol:.12,pan,type:'sine',attack:.3});E.tone(hz+(c.sd||0)*1.5,{dur:1.3,vol:.06,pan,type:'sine',attack:.3});}
    }else if(hz){                        // lightning: dot count -> number of drum hits, height on the map -> pitch
      const hits=Math.min(4,1+Math.floor(Math.log2(1+c.n)/2));
      for(let i=0;i<hits;i++)setTimeout(()=>{E.noise({dur:.15,vol:.25,pan,freq:hz*2});E.tone(hz,{dur:.2,vol:.1,pan,type:'square'});},i*55);
    }
  }
  return{play};
})();
