// In-browser "AI": a k-nearest-neighbour learner, pre-trained at start-up on the labelled frames of each dataset
// (label = dataset group; each scene keeps its own id so datasets never mix). No server, no external API.
const AI=(()=>{
  const off=document.createElement('canvas');off.width=64;off.height=36;
  const o=off.getContext('2d',{willReadFrequently:true}),samples=[];
  function features(src){ // 8 numbers describing colour, contrast and brightness of an image
    o.drawImage(src,0,0,64,36);const d=o.getImageData(0,0,64,36).data,n=d.length/4;
    let R=0,G=0,B=0,dark=0,bright=0,sat=0,s1=0,s2=0;
    for(let i=0;i<d.length;i+=4){const r=d[i]/255,g=d[i+1]/255,b=d[i+2]/255,l=(r+g+b)/3,mx=Math.max(r,g,b),mn=Math.min(r,g,b);
      R+=r;G+=g;B+=b;sat+=mx?(mx-mn)/mx:0;s1+=l;s2+=l*l;if(l<.1)dark++;if(l>.8)bright++;}
    const m=s1/n;return[R/n,G/n,B/n,sat/n,dark/n,bright/n,Math.sqrt(Math.max(0,s2/n-m*m)),m];}
  function norm(){const k=samples[0].f.length,mu=Array(k).fill(0),sd=Array(k).fill(0),N=samples.length;
    samples.forEach(s=>s.f.forEach((v,i)=>mu[i]+=v/N));samples.forEach(s=>s.f.forEach((v,i)=>sd[i]+=(v-mu[i])**2/N));
    return{mu,sd:sd.map(x=>Math.sqrt(x)||1)};}
  function predict(f,skip=-1,K=3){const{mu,sd}=norm(),z=a=>a.map((v,i)=>(v-mu[i])/sd[i]),q=z(f),ds=[];
    samples.forEach((s,j)=>{if(j!==skip)ds.push([Math.hypot(...z(s.f).map((v,i)=>v-q[i])),s.label]);});
    ds.sort((a,b)=>a[0]-b[0]);const w={};ds.slice(0,K).forEach(([d,l])=>w[l]=(w[l]||0)+1/(d+.1));
    const t=Object.values(w).reduce((a,b)=>a+b,0),p={};for(const l in w)p[l]=w[l]/t;return p;}
  const best=p=>Object.entries(p).sort((a,b)=>b[1]-a[1])[0];
  const accuracy=()=>samples.length?samples.filter((s,j)=>best(predict(s.f,j))[0]===s.label).length/samples.length:0;
  function set(label,fs,id=label){for(let i=samples.length-1;i>=0;i--)if(samples[i].id===id)samples.splice(i,1);fs.forEach(f=>samples.push({label,id,f}));}
  const counts=()=>{const c={};samples.forEach(s=>c[s.label]=(c[s.label]||0)+1);return c;};
  return{features,predict,best,accuracy,set,counts};
})();
