// Minimal Web Audio engine: no dependencies, starts only after a user gesture.
const AudioEngine=(()=>{
  let ctx,master,vol=0.6;
  function init(){
    if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=vol;master.connect(ctx.destination);}
    if(ctx.state==='suspended')ctx.resume();
  }
  function route(node,pan){
    if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=pan;node.connect(p);p.connect(master);}else node.connect(master);
  }
  function tone(freq,{dur=.3,vol=.2,pan=0,type='sine',attack=.02}={}){
    init();const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.value=freq;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);route(g,pan);o.start(t);o.stop(t+dur+.05);
  }
  function noise({dur=.15,vol=.25,pan=0,freq=900}={}){
    init();const n=Math.floor(ctx.sampleRate*dur),b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
    const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    s.buffer=b;f.type='bandpass';f.frequency.value=freq;g.gain.value=vol;s.connect(f);f.connect(g);route(g,pan);s.start();
  }
  function setVolume(v){vol=v;if(master)master.gain.value=v;}
  return{init,tone,noise,setVolume};
})();
