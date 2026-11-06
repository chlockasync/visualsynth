'use strict';
// Visual Synth FEATURE LAB v0.1.041
// Conventional DSP only: STFT, median-filter HPSS, positive spectral flux,
// octave-folded chroma, centroid, and lagged spectral/tonal novelty.
// These are independent musical features, NOT instrument separation.
const SR=16000,N=1024,HOP=256,BINS=N/2+1,EPS=1e-10;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
function progress(percent,stage){postMessage({type:'progress',percent,stage})}
function fft(re,im,inverse=false){
 const n=re.length;
 for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]]}}
 for(let len=2;len<=n;len<<=1){const theta=(inverse?2:-2)*Math.PI/len,cos=Math.cos(theta),sin=Math.sin(theta);
  for(let i=0;i<n;i++){if(i%len)continue;let wr=1,wi=0;for(let j=0;j<len/2;j++){
   const p=i+j,q=p+len/2,tr=wr*re[q]-wi*im[q],ti=wr*im[q]+wi*re[q];re[q]=re[p]-tr;im[q]=im[p]-ti;re[p]+=tr;im[p]+=ti;
   const nw=wr*cos-wi*sin;wi=wr*sin+wi*cos;wr=nw;
  }}
 }
 if(inverse)for(let i=0;i<n;i++){re[i]/=n;im[i]/=n}
}
const window=Float64Array.from({length:N},(_,j)=>.5-.5*Math.cos(2*Math.PI*j/(N-1)));
let cache=null;
function quantile(arr,q){const vals=Array.from(arr).filter(Number.isFinite).sort((a,b)=>a-b);return vals[Math.floor((vals.length-1)*q)]||0}
function smooth1(data,r=2){const out=new Float32Array(data.length);let sum=0,left=0,right=0;for(let i=0;i<data.length;i++){const hi=Math.min(data.length-1,i+r),lo=Math.max(0,i-r);while(right<=hi)sum+=data[right++];while(left<lo)sum-=data[left++];out[i]=sum/Math.max(1,right-left)}return out}
function normalize(arr,q=.96){const mx=Math.max(1e-10,quantile(arr,q));return Float32Array.from(arr,v=>clamp(v/mx))}
function med(a,count){for(let i=1;i<count;i++){const val=a[i];let j=i-1;while(j>=0&&a[j]>val){a[j+1]=a[j];j--}a[j+1]=val}return a[count>>1]}
function runAnalysis(input){
 const frames=Math.max(1,Math.floor((input.length-N)/HOP)+1),times=new Float32Array(frames),mag=new Float32Array(frames*BINS),hmask=new Float32Array(frames*BINS);
 const re=new Float64Array(N),im=new Float64Array(N);
 progress(3,'Computing full-band spectrogram');
 for(let t=0;t<frames;t++){
  const pos=t*HOP;for(let j=0;j<N;j++){re[j]=input[pos+j]*window[j];im[j]=0}fft(re,im);
  for(let k=0;k<BINS;k++)mag[t*BINS+k]=Math.hypot(re[k],im[k]);
  times[t]=(pos+N/2)/SR;
  if(t%250===0)progress(3+17*t/frames,'Computing full-band spectrogram');
 }
 // Median filters are the classical Fitzgerald harmonic-percussive separation
 // method: median along time enhances sustained frequencies; median along
 // frequency enhances transients. Soft masks sum to 1 per time-frequency bin.
 progress(23,'Separating harmonic and percussive activity');
 const temp=new Float32Array(25),rt=7,rf=9;
 for(let t=0;t<frames;t++){
  for(let k=0;k<BINS;k++){
   let n=0;for(let dt=-rt;dt<=rt;dt++)temp[n++]=mag[clamp(t+dt,0,frames-1)*BINS+k];
   const hm=med(temp,n);
   n=0;for(let df=-rf;df<=rf;df++)temp[n++]=mag[t*BINS+clamp(k+df,0,BINS-1)];
   const pm=med(temp,n),h2=hm*hm,p2=pm*pm;
   hmask[t*BINS+k]=h2/(h2+p2+EPS);
  }
  if(t%190===0)progress(23+47*t/frames,'Separating harmonic and percussive activity');
 }
 progress(72,'Extracting musical control signals');
 const lowE=new Float32Array(frames),midE=new Float32Array(frames),highE=new Float32Array(frames);
 const lowF=new Float32Array(frames),midF=new Float32Array(frames),highF=new Float32Array(frames),harmE=new Float32Array(frames),percE=new Float32Array(frames);
 const centroid=new Float32Array(frames),flux=new Float32Array(frames),chroma=new Float32Array(frames*12),tonal=new Float32Array(frames),activity=new Float32Array(frames),novelty=new Float32Array(frames);
 const bandOf=new Uint8Array(BINS),noteClass=new Int8Array(BINS),frequencies=new Float32Array(BINS);
 for(let k=0;k<BINS;k++){
  const f=k*SR/N;frequencies[k]=f;bandOf[k]=f<240?0:f<1600?1:2;
  noteClass[k]=f>=65&&f<=4300?((Math.round(69+12*Math.log2(f/440))%12+12)%12):-1;
 }
 for(let t=0;t<frames;t++){
  let ls=0,ms=0,hs=0,lf=0,mf=0,hf=0,he=0,pe=0,specSum=0,weighted=0,df=0;
  for(let k=3;k<BINS;k++){
   const pos=t*BINS+k,v=mag[pos],p=t>0?mag[pos-BINS]:0,b=bandOf[k],positive=Math.max(0,Math.sqrt(v)-Math.sqrt(p)),power=v*v;
   if(b===0){ls+=power;lf+=positive}else if(b===1){ms+=power;mf+=positive}else{hs+=power;hf+=positive}
   const h=hmask[pos],s=1-h;he+=power*h*h;pe+=power*s*s;
   weighted+=frequencies[k]*v;specSum+=v;df+=positive;
   const c=noteClass[k];if(c>=0)chroma[t*12+c]+=power*h*h/Math.sqrt(Math.max(1,frequencies[k]/110));
  }
  lowE[t]=Math.sqrt(ls);midE[t]=Math.sqrt(ms);highE[t]=Math.sqrt(hs);
  lowF[t]=lf;midF[t]=mf;highF[t]=hf;harmE[t]=Math.sqrt(he);percE[t]=Math.sqrt(pe);
  centroid[t]=specSum?weighted/specSum:0;flux[t]=df;
  let csum=0;for(let c=0;c<12;c++)csum+=chroma[t*12+c];for(let c=0;c<12;c++)chroma[t*12+c]=Math.sqrt(chroma[t*12+c]/(csum+EPS));
 }
 const lowOn=normalize(smooth1(lowF,1)),midOn=normalize(smooth1(midF,1)),highOn=normalize(smooth1(highF,1));
 const lowAct=normalize(smooth1(lowE,3)),midAct=normalize(smooth1(midE,3)),highAct=normalize(smooth1(highE,3));
 const harmonic=normalize(smooth1(harmE,3)),percussive=normalize(smooth1(percE,3));
 const brightness=smooth1(Float32Array.from(centroid,v=>clamp(v/5500)),3);
 const texture=normalize(smooth1(flux,2));
 for(let t=0;t<frames;t++){
  // A short delayed chroma comparison tracks tonal movement without falsely
  // assigning pitch classes to particular instruments.
  let change=0,lag=9;
  if(t>=lag){for(let c=0;c<12;c++)change+=Math.abs(chroma[t*12+c]-chroma[(t-lag)*12+c]);}
  tonal[t]=change/12;
  activity[t]=.24*lowAct[t]+.22*midAct[t]+.18*highAct[t]+.20*percussive[t]+.16*harmonic[t];
 }
 const tonalChange=normalize(smooth1(tonal,4));
 const arrangement=smooth1(activity,40);
 for(let t=0;t<frames;t++){
  const lag=55;if(t>=lag)novelty[t]=Math.abs(arrangement[t]-arrangement[t-lag])*.6+Math.abs(brightness[t]-brightness[t-lag])*.25+Math.abs(tonalChange[t]-tonalChange[t-lag])*.15;
 }
 const change=normalize(smooth1(novelty,12));
 const lanes={lowOn,midOn,highOn,lowAct,midAct,highAct,harmonic,percussive,tonalChange,brightness,texture,arrangement,change};
 const attacks={};
 for(const [name,values] of [['low',lowOn],['mid',midOn],['high',highOn]]){
  const events=[],baseline=smooth1(values,13),floor=quantile(values,.56);
  for(let t=3;t<frames-3;t++){
   const v=values[t];if(v<Math.max(.18,baseline[t]*1.45,floor*1.22))continue;
   if(v<values[t-1]||v<values[t+1])continue;
   if(events.length&&t-events.at(-1).frame<6){if(v>events.at(-1).strength)events[events.length-1]={t:times[t],strength:v,frame:t};continue}
   events.push({t:times[t],strength:v,frame:t});
  }attacks[name]=events;
 }
 // For the display, octave-folded chroma is shown across 12 columns over time;
 // this is tonal energy distribution, NOT melody transcription.
 const chromaU8=new Uint8Array(frames*12);
 for(let t=0;t<frames;t++){const base=t*12;let mx=0;for(let c=0;c<12;c++)mx=Math.max(mx,chroma[base+c]);for(let c=0;c<12;c++)chromaU8[base+c]=Math.round(255*Math.sqrt(chroma[base+c]/(mx+EPS)));}
 const result={type:'done',frames,times,lanes,attacks,chroma:chromaU8,sampleRate:SR,hop:HOP,windowSize:N};
 cache={input,frames,mag,hmask};
 progress(100,'Analysis complete');
 postMessage(result,[times.buffer,chromaU8.buffer,...Object.values(lanes).map(x=>x.buffer)]);
}
function resynth(mode){
 if(!cache)throw Error('Analyse music before auditioning a component.');
 const {input,frames,hmask}=cache,re=new Float64Array(N),im=new Float64Array(N),out=new Float64Array(input.length),norm=new Float64Array(input.length);
 const bandGain=(f,lo,hi)=>{
  const rlo=Math.max(24,lo*.12),rhi=Math.max(60,hi*.09);
  const on=lo<=0?1:clamp((f-(lo-rlo))/(2*rlo));const off=hi>=SR/2?1:clamp(((hi+rhi)-f)/(2*rhi));
  return Math.sin(on*Math.PI/2)**2*Math.sin(off*Math.PI/2)**2;
 };
 for(let t=0;t<frames;t++){
  const base=t*HOP;
  for(let j=0;j<N;j++){re[j]=input[base+j]*window[j];im[j]=0}
  fft(re,im);
  for(let k=0;k<BINS;k++){
   const freq=k*SR/N,mask=mode==='harmonic'?hmask[t*BINS+k]:mode==='percussive'?1-hmask[t*BINS+k]:mode==='low'?bandGain(freq,0,240):mode==='mid'?bandGain(freq,240,1600):mode==='high'?bandGain(freq,1600,8000):0;
   re[k]*=mask;im[k]*=mask;
   if(k>0&&k<N/2){re[N-k]*=mask;im[N-k]*=mask;}
  }
  fft(re,im,true);
  for(let j=0;j<N&&base+j<input.length;j++){out[base+j]+=re[j]*window[j];norm[base+j]+=window[j]*window[j];}
  if(t%350===0)progress(Math.round(100*t/frames),'Reconstructing '+mode+' audio');
 }
 const samples=new Float32Array(input.length);let peak=0;
 for(let i=0;i<input.length;i++){const v=norm[i]>.002?out[i]/norm[i]:0;samples[i]=v;peak=Math.max(peak,Math.abs(v));}
 // No solo boosts: comparison uses original relative signal levels.
 const clipped=peak>1;postMessage({type:'audio',mode,sampleRate:SR,samples,peak,clipped},[samples.buffer]);
}
onmessage=({data})=>{
 try{
  if(data.type==='analyse'){
   cache=null;const samples=new Float32Array(data.samples);
   if(data.sampleRate!==SR)throw Error('Expected 16 kHz audio.');
   if(samples.length<2*SR)throw Error('At least two seconds of audio required.');
   runAnalysis(samples);
  }else if(data.type==='audition')resynth(data.mode);
 }catch(err){postMessage({type:'error',message:String(err?.stack||err)});}
};
