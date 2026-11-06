'use strict';
// Visual Synth event lab: standard spectral flux and Euclidean NMF.
// This is an experiment, not instrument separation or pitch transcription.
const EPS=1e-8;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
function progress(p,message){postMessage({type:'progress',percent:p,message});}
function fft(re,im){
 const n=re.length;
 for(let i=1,j=0;i<n;i++){
  let bit=n>>1;
  while(j&bit){j^=bit;bit>>=1}j^=bit;
  if(i<j){let v=re[i];re[i]=re[j];re[j]=v;v=im[i];im[i]=im[j];im[j]=v}
 }
 for(let len=2;len<=n;len<<=1){
  const ang=-2*Math.PI/len,cr=Math.cos(ang),ci=Math.sin(ang);
  for(let i=0;i<n;i+=len){let wr=1,wi=0;for(let j=0;j<len/2;j++){
   const k=i+j,l=k+len/2,tr=wr*re[l]-wi*im[l],ti=wr*im[l]+wi*re[l];
   re[l]=re[k]-tr;im[l]=im[k]-ti;re[k]+=tr;im[k]+=ti;
   const nxt=wr*cr-wi*ci;wi=wr*ci+wi*cr;wr=nxt;
  }}
 }
}
function percentile(a,q){const b=Array.from(a).sort((a,b)=>a-b);return b[Math.min(b.length-1,Math.floor(q*(b.length-1)))]||0;}
function createSpectrogram(samples,sr){
 const size=2048,hop=256,bands=96,lo=55,hi=3500;
 const frames=Math.max(1,Math.floor((samples.length-size)/hop)+1);
 const V=new Float32Array(frames*bands),times=new Float32Array(frames);
 const centers=Float32Array.from({length:bands},(_,k)=>lo*Math.pow(hi/lo,(k+.5)/bands));
 const bins=new Uint16Array(size/2+1);
 for(let k=1;k<bins.length;k++)bins[k]=Math.min(bands-1,Math.max(0,Math.floor(Math.log((k*sr/size)/lo)/Math.log(hi/lo)*bands)));
 const re=new Float64Array(size),im=new Float64Array(size),window=Float64Array.from({length:size},(_,j)=>.5-.5*Math.cos(2*Math.PI*j/(size-1)));
 for(let t=0;t<frames;t++){
  for(let j=0;j<size;j++){re[j]=(samples[t*hop+j]||0)*window[j];im[j]=0}
  fft(re,im);
  for(let k=1;k<size/2;k++){
   const frequency=k*sr/size;if(frequency<lo||frequency>hi)continue;
   const b=bins[k],m=Math.hypot(re[k],im[k]);V[t*bands+b]+=m;
  }
  times[t]=(t*hop+size/2)/sr;
  if(t%220===0)progress(5+24*t/frames,'Computing spectrogram');
 }
 const peak=percentile(V,.999),denom=Math.max(peak,1e-5);
 const normalized=new Float32Array(V.length);
 for(let i=0;i<V.length;i++)normalized[i]=Math.sqrt(V[i]/denom);
 return {V:normalized,raw:V,frames,bands,hop,sr,times,centers};
}
function detectEvents(spec){
 const {V,frames,bands,hop,sr,times}=spec;
 const flux=new Float32Array(frames),smooth=new Float32Array(frames),baseline=new Float32Array(frames);
 const fingerprints=[];
 for(let t=1;t<frames;t++){
  let delta=0;const offset=t*bands,prev=(t-1)*bands;
  for(let b=0;b<bands;b++)delta+=Math.max(0,V[offset+b]-V[prev+b]);
  flux[t]=delta;
 }
 for(let t=0;t<frames;t++)smooth[t]=.2*(flux[Math.max(0,t-1)]+flux[Math.min(frames-1,t+1)])+.6*flux[t];
 const radius=15;let left=0,right=0,sum=0;
 for(let t=0;t<frames;t++){
  const hi=Math.min(frames-1,t+radius),lo=Math.max(0,t-radius);
  while(right<=hi)sum+=smooth[right++];while(left<lo)sum-=smooth[left++];
  baseline[t]=sum/Math.max(1,right-left);
 }
 const floor=percentile(smooth,.52),minDistance=5,peaks=[];
 for(let i=2;i<frames-2;i++){
  const s=smooth[i];if(s<Math.max(floor*.32,baseline[i]*1.17) || s<smooth[i-1] || s<smooth[i+1])continue;
  if(s-Math.min(smooth[Math.max(0,i-3)],smooth[Math.min(frames-1,i+3)])<floor*.18)continue;
  if(peaks.length&&i-peaks[peaks.length-1]<minDistance){if(s>smooth[peaks.at(-1)])peaks[peaks.length-1]=i;continue}
  peaks.push(i);
 }
 const events=peaks.map((index,id)=>{
  const vec=new Float32Array(bands);let norm=0;
  const a=Math.max(0,index-4),b=Math.min(frames-1,index+3);
  // Event fingerprint is the positive change of a short-time spectrum.
  for(let k=0;k<bands;k++){
   let prev=0,next=0;for(let j=a;j<index;j++)prev+=V[j*bands+k];for(let j=index;j<=b;j++)next+=V[j*bands+k];
   const delta=Math.max(0,next/(b-index+1)-prev/Math.max(1,index-a));
   vec[k]=delta;norm+=delta*delta;
  }
  norm=Math.sqrt(norm);for(let k=0;k<bands;k++)vec[k]/=norm+EPS;
  fingerprints.push(vec);
  return {id,t:times[index],frame:index,strength:smooth[index],component:-1};
 });
 const strong=percentile(events.map(x=>x.strength),.94)||1;
 for(const e of events)e.strength=clamp(e.strength/strong);
 return {events,fingerprints,flux:smooth,baseline};
}
function nmf(spec,rank=5,iters=55){
 const {V,frames:T,bands:B}=spec,K=Math.max(2,Math.min(7,rank));
 // W: spectral templates (bands * K); H: time activations (K * frames).
 const W=new Float64Array(B*K),H=new Float64Array(K*T);
 let seed=1729;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const candidates=Array.from({length:T},(_,t)=>[t,Array.from(V.subarray(t*B,(t+1)*B)).reduce((s,x)=>s+x*x,0)]).sort((a,b)=>b[1]-a[1]);
 for(let k=0;k<K;k++){
  const selected=candidates[Math.min(candidates.length-1,k*Math.max(1,Math.floor(T/(K*4))))]?.[0]||0;
  for(let b=0;b<B;b++)W[b*K+k]=Math.max(.001,V[selected*B+b])*(.75+.5*rand());
  for(let t=0;t<T;t++)H[k*T+t]=.02+.03*rand();
 }
 // Multiplicative update with Gram-matrix denominators: no large intermediate 3D tensor.
 const numerH=new Float64Array(K*T),gramW=new Float64Array(K*K),numerW=new Float64Array(B*K),gramH=new Float64Array(K*K);
 for(let iteration=0;iteration<iters;iteration++){
  numerH.fill(0);gramW.fill(0);
  for(let b=0;b<B;b++)for(let k=0;k<K;k++){
   const w=W[b*K+k];for(let l=0;l<K;l++)gramW[k*K+l]+=w*W[b*K+l];
  }
  for(let t=0;t<T;t++)for(let b=0;b<B;b++){
   const v=V[t*B+b];if(v<1e-7)continue;
   for(let k=0;k<K;k++)numerH[k*T+t]+=W[b*K+k]*v;
  }
  for(let k=0;k<K;k++)for(let t=0;t<T;t++){
   let d=EPS;for(let l=0;l<K;l++)d+=gramW[k*K+l]*H[l*T+t];
   H[k*T+t]=Math.max(EPS,H[k*T+t]*numerH[k*T+t]/d);
  }
  numerW.fill(0);gramH.fill(0);
  for(let k=0;k<K;k++)for(let l=0;l<K;l++){
   let v=0;for(let t=0;t<T;t++)v+=H[k*T+t]*H[l*T+t];gramH[k*K+l]=v;
  }
  for(let b=0;b<B;b++)for(let t=0;t<T;t++){
   const v=V[t*B+b];if(v<1e-7)continue;
   for(let k=0;k<K;k++)numerW[b*K+k]+=v*H[k*T+t];
  }
  for(let b=0;b<B;b++)for(let k=0;k<K;k++){
   let d=EPS;for(let l=0;l<K;l++)d+=W[b*K+l]*gramH[l*K+k];
   W[b*K+k]=Math.max(EPS,W[b*K+k]*numerW[b*K+k]/d);
  }
  if(iteration%10===0)progress(37+Math.round(55*iteration/iters),'Learning recurring sound patterns ('+(iteration+1)+'/'+iters+')');
 }
 const pattern=new Float32Array(B*K),activation=new Float32Array(T*K);
 for(let k=0;k<K;k++){
  let mx=0;for(let t=0;t<T;t++)mx=Math.max(mx,H[k*T+t]);
  for(let t=0;t<T;t++)activation[t*K+k]=H[k*T+t]/(mx+EPS);
  let pMax=0;for(let b=0;b<B;b++)pMax=Math.max(pMax,W[b*K+k]);
  for(let b=0;b<B;b++)pattern[k*B+b]=W[b*K+k]/(pMax+EPS);
 }
 return {rank:K,pattern,activation,rawW:W,rawH:H};
}
function scoreEvents(events,fingerprints,nmf,frames,bands){
 const K=nmf.rank;
 for(const e of events){
  // Difference between immediately before/after onset, not most active at that moment.
  let best=-1,bestScore=-Infinity,base=e.frame*K;
  for(let k=0;k<K;k++){
   const a=nmf.activation[Math.min(frames-1,e.frame+3)*K+k];
   const b=nmf.activation[Math.max(0,e.frame-4)*K+k];
   const delta=a-b;
   if(delta>bestScore){best=k;bestScore=delta;}
  }
  e.component=bestScore>.028?best:-1;
 }
}
// Diagnostic-only NMF solo preview: soft-mask the original STFT using
// each learned component's relative spectrotemporal contribution.
// The overlap-add inverse FFT keeps the source phase. This is not instrument separation.
let cached=null;
function inverseFft(re,im){
 const n=re.length;
 for(let i=0;i<n;i++)im[i]=-im[i];
 fft(re,im);
 for(let i=0;i<n;i++){re[i]/=n;im[i]=-im[i]/n;}
}
function isolateComponent(k){
 const c=cached;if(!c)throw Error('Analyse a passage before isolating a pattern.');
 const {samples,sampleRate:sr,spec,components}=c;
 const {frames:T,bands:B,hop}=spec,K=components.rank,W=components.rawW,H=components.rawH;
 if(!Number.isInteger(k)||k<0||k>=K)throw Error('Unknown pattern.');
 const size=2048,half=size>>1,low=55,high=3500,logSpan=Math.log(high/low);
 const re=new Float64Array(size),im=new Float64Array(size),win=Float64Array.from({length:size},(_,j)=>.5-.5*Math.cos(2*Math.PI*j/(size-1)));
 const out=new Float64Array(samples.length),norm=new Float64Array(samples.length);
 const masks=new Float64Array(B);
 for(let t=0;t<T;t++){
  const base=t*hop;
  for(let b=0;b<B;b++){
   const idx=b*K+k,chosen=W[idx]*H[k*T+t];
   let sum=1e-9;for(let j=0;j<K;j++)sum+=W[b*K+j]*H[j*T+t];
   masks[b]=Math.max(0,Math.min(1,chosen/sum));
  }
  for(let j=0;j<size;j++){re[j]=(samples[base+j]||0)*win[j];im[j]=0;}
  fft(re,im);
  re[0]=0;im[0]=0;
  for(let j=1;j<=half;j++){
   const freq=j*sr/size;
   let mask=0;
   if(freq>=low&&freq<=high){
    const frac=Math.log(freq/low)/logSpan*B-.5,b=Math.max(0,Math.min(B-1,Math.floor(frac))),next=Math.min(B-1,b+1);
    mask=masks[b]*(1-(frac-b))+masks[next]*(frac-b);
    mask=Math.max(0,Math.min(1,mask));
   }
   re[j]*=mask;im[j]*=mask;
   if(j<half){re[size-j]*=mask;im[size-j]*=mask;}
  }
  inverseFft(re,im);
  for(let j=0;j<size;j++){const pos=base+j;if(pos>=out.length)break;
   out[pos]+=re[j]*win[j];norm[pos]+=win[j]*win[j];
  }
  if(t%240===0)progress(100*t/T,'Reconstructing Pattern '+(k+1)+' preview');
 }
 const pcm=new Float32Array(samples.length);let sum=0,peak=0;
 for(let j=0;j<pcm.length;j++){
  const value=norm[j]>.00001?out[j]/norm[j]:0;
  pcm[j]=value;sum+=value*value;peak=Math.max(peak,Math.abs(value));
 }
 // Lift quiet patterns to an audible comparison level, without clipping.
 const rms=Math.sqrt(sum/Math.max(1,pcm.length)),gain=Math.min(8,.18/Math.max(.00001,rms),.92/Math.max(.00001,peak));
 for(let j=0;j<pcm.length;j++)pcm[j]*=gain;
 return {samples:pcm,sampleRate:sr,gain,rms};
}
onmessage=ev=>{
 const request=ev.data;
 if(request.type==='isolate'){
  try{
   const out=isolateComponent(request.pattern);
   postMessage({type:'isolated',pattern:request.pattern,samples:out.samples,sampleRate:out.sampleRate,gain:out.gain},[out.samples.buffer]);
  }catch(err){postMessage({type:'isolate-error',pattern:request.pattern,message:String(err?.message||err)});}
  return;
 }
 if(request.type!=='analyse')return;
 try{
  const {samples,sampleRate=11025,rank=5}=request;
  const input=new Float32Array(samples);
  cached=null;
  if(input.length<sampleRate*2)throw Error('Select at least two seconds of audio.');
  progress(3,'Preparing audio');
  const spec=createSpectrogram(input,sampleRate);
  progress(32,'Detecting note attacks');
  const onset=detectEvents(spec);
  progress(37,'Learning spectral patterns');
  const components=nmf(spec,rank,55);
  scoreEvents(onset.events,onset.fingerprints,components,spec.frames,spec.bands);
  const signatures=new Float32Array(onset.fingerprints.length*spec.bands);
  onset.fingerprints.forEach((v,i)=>signatures.set(v,i*spec.bands));
  cached={samples:input,sampleRate,spec,components};
  progress(99,'Finalising');
  const payload={type:'done',sampleRate,frames:spec.frames,bands:spec.bands,hop:spec.hop,
   times:spec.times,centers:spec.centers,events:onset.events,flux:onset.flux,baseline:onset.baseline,
   signatures,pattern:components.pattern,activation:components.activation,rank:components.rank,
   spectrogram:Uint8Array.from(spec.V,x=>Math.round(255*clamp(x/1.3)))};
  postMessage(payload,[payload.times.buffer,payload.centers.buffer,payload.flux.buffer,payload.baseline.buffer,
   payload.signatures.buffer,payload.pattern.buffer,payload.activation.buffer,payload.spectrogram.buffer]);
 }catch(err){postMessage({type:'error',message:String(err?.message||err),stack:err?.stack||''})}
};
