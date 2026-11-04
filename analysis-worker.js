'use strict';
/* Visual Synth: library-driven music analysis, no legacy hit or tempo estimation. */

const clamp=x=>Math.max(0,Math.min(1,x));
function pct(a,p=.97){const b=Array.from(a).filter(Number.isFinite).sort((x,y)=>x-y);return b.length?b[Math.min(b.length-1),Math.floor(p*(b.length-1))]:1}
function normalize(a,p=.975,gamma=.8){const scale=Math.max(1e-9,pct(a,p));return Float32Array.from(a,x=>clamp(Math.pow(Math.max(0,x)/scale,gamma)))}
function average(a,r){const b=new Float32Array(a.length);let sum=0,l=0,h=0;for(let i=0;i<a.length;i++){const stop=Math.min(a.length,i+r+1),start=Math.max(0,i-r);while(h<stop)sum+=a[h++];while(l<start)sum-=a[l++];b[i]=sum/Math.max(1,h-l)}return b}
function vecToArray(e,v){if(!v)return [];const arr=Array.from(e.vectorToArray(v));if(typeof v.delete==='function')v.delete();return arr}
function envelope(events,n,dt,decay=.12){const a=new Float32Array(n);let j=0;for(let i=0;i<n;i++){const t=i*dt;while(j<events.length&&events[j].t<=t)j++;if(j){const ev=events[j-1];a[i]=ev.strength*Math.exp(-(t-ev.t)/decay)}}return a}
function sourcePhase(beats,n,dt){const phase=new Float32Array(n),pulse=new Float32Array(n);if(!beats.length)return {phase,pulse};let j=0;for(let i=0;i<n;i++){const t=i*dt;while(j+1<beats.length&&beats[j+1]<=t)j++;const prev=beats[j],next=beats[j+1]??prev+((beats[j]-beats[j-1])||.5),span=Math.max(.02,next-prev);phase[i]=t<beats[0]?0:clamp((t-prev)/span);pulse[i]=t<beats[0]?0:Math.exp(-(t-prev)/.10)}return {phase,pulse}}
async function init(libraries){
  if(!libraries?.wasm || !libraries?.core || !libraries?.meyda)throw Error("Analysis libraries were not supplied to the worker.");
  postMessage({type:'progress',value:2,detail:'Loading Essentia’s worker-compatible WASM…'});
  // IMPORTANT: essentia-wasm.web.js is built for a DOM page and accesses `document`.
  // Workers have no document. The Essentia project explicitly demonstrates
  // essentia-wasm.umd.js (synchronous WASM) inside importScripts-based Workers.
  try { importScripts(libraries.wasm); }
  catch(err) { throw Error('Cannot load Essentia worker WASM: '+(err?.message||err)); }
  const wasm=(typeof EssentiaWASM!=='undefined')?EssentiaWASM:((typeof Module!=='undefined')?Module:null);
  if(!wasm)throw Error('Essentia worker WASM loaded but exposed neither EssentiaWASM nor Module.');
  try { importScripts(libraries.core); }
  catch(err) { throw Error('Cannot load Essentia core: '+(err?.message||err)); }
  if(typeof Essentia!=='function') throw Error('Essentia core did not expose an Essentia constructor.');
  postMessage({type:'progress',value:5,detail:'Loading Meyda acoustic-feature library…'});
  // Meyda's web bundle is designed to expose a global to `window`.
  // In a dedicated Worker, self is the appropriate global instead.
  if(typeof window==='undefined') self.window=self;
  try { importScripts(libraries.meyda); }
  catch(err) { throw Error('Cannot load Meyda: '+(err?.message||err)); }
  if(typeof Meyda==='undefined'||typeof Meyda.extract!=='function') throw Error('Meyda loaded, but its extract function is unavailable.');
  let e;
  try { e=new Essentia(wasm); }
  catch(err) { throw Error('Essentia worker WASM initialisation failed: '+(err?.message||err)); }
  return {e,m:Meyda};
}
async function analyse(samples,rate,libraries){
 if(rate!==44100)throw Error('The analysis audio must be 44,100 Hz.');
 const s=new Float32Array(samples),duration=s.length/rate;
 if(duration<2)throw Error('Please load at least 2 seconds of music.');
 const {e,m}=await init(libraries);
 postMessage({type:'progress',value:10,detail:'Finding beats and tempo with Essentia…'});
 let beats=[],bpm=null,beatConfidence=0,onsetTimes=[];
 const v=e.arrayToVector(s);
 try{
  const r=e.RhythmExtractor2013(v);
  beats=vecToArray(e,r.ticks||r.beats).filter(t=>Number.isFinite(t)&&t>=0&&t<duration);
  bpm=Number(r.bpm)||null;beatConfidence=Number(r.confidence)||0;
  if(r.estimates?.delete)r.estimates.delete();if(r.bpmIntervals?.delete)r.bpmIntervals.delete();
  postMessage({type:'progress',value:32,detail:'Finding musical attacks with Essentia…'});
  const o=e.OnsetRate(v);
  onsetTimes=vecToArray(e,o.onsets).filter(t=>Number.isFinite(t)&&t>=0&&t<duration);
 }finally{if(v.delete)v.delete()}
 postMessage({type:'progress',value:43,detail:'Extracting loudness, spectrum and harmony with Meyda…'});
 // All acoustic features come from Meyda, not from the removed custom FFT code.
 m.bufferSize=2048;m.sampleRate=rate;m.windowingFunction='hanning';
 const size=2048,hop=1024,dt=hop/rate,n=Math.floor(Math.max(0,s.length-size)/hop)+1;
 const raw={loudness:new Float32Array(n),bass:new Float32Array(n),mid:new Float32Array(n),high:new Float32Array(n),brightness:new Float32Array(n),texture:new Float32Array(n),harmonic:new Float32Array(n)};
 const frame=new Float32Array(size),prevChroma=new Float32Array(12);let prevFrame=null;
 const hzPerBin=rate/size;
 for(let i=0;i<n;i++){
  const start=i*hop;frame.set(s.subarray(start,start+size));
  const f=m.extract(['rms','loudness','amplitudeSpectrum','spectralCentroid','spectralFlatness','chroma'],frame,prevFrame);
  if(!f)throw Error('Meyda returned no features.');
  raw.loudness[i]=Number.isFinite(f.loudness?.total)?f.loudness.total:f.rms;
  raw.brightness[i]=f.spectralCentroid||0;
  raw.texture[i]=f.spectralFlatness||0;
  let l=0,mi=0,h=0;
  const spec=f.amplitudeSpectrum;
  for(let b=1;b<spec.length;b++){const hz=b*hzPerBin,power=spec[b]*spec[b];if(hz<180)l+=power;else if(hz<2000)mi+=power;else h+=power}
  raw.bass[i]=Math.sqrt(l);raw.mid[i]=Math.sqrt(mi);raw.high[i]=Math.sqrt(h);
  const chroma=f.chroma||[];let total=0,diff=0;
  for(let k=0;k<12;k++){const c=chroma[k]||0;total+=c;diff+=Math.abs(c-prevChroma[k]);prevChroma[k]=c}
  raw.harmonic[i]=total?diff/(total+1e-5):0;
  // Meyda extracts from each frame; frame is copied before subsequent overwrite.
  prevFrame=frame.slice();
  if(i%400===0)postMessage({type:'progress',value:43+Math.round(i/n*48),detail:'Extracting musical features…'});
 }
 const loudness=normalize(raw.loudness,.98,.7),bass=normalize(raw.bass),mid=normalize(raw.mid),high=normalize(raw.high);
 const brightness=normalize(raw.brightness,.98,.75),texture=Float32Array.from(raw.texture,clamp),harmonic=normalize(average(raw.harmonic,2),.98,.65);
 // Onset events come from Essentia. Their strength comes from measured short-time loudness change.
 const events=onsetTimes.map(t=>{const idx=Math.max(0,Math.min(n-1,Math.round(t/dt)));const base=Math.max(0,idx-3);return {t,strength:clamp(.26+1.3*Math.max(0,loudness[idx]-loudness[base])+.18*mid[idx])}});
 const onsets=envelope(events,n,dt,.115),attack=Float32Array.from(onsets);
 const density=new Float32Array(n);let a=0,b=0;
 for(let i=0;i<n;i++){const t=i*dt;while(b<events.length&&events[b].t<t+.2)b++;while(a<b&&events[a].t<t-.2)a++;density[i]=(b-a)/.4}
 const activity=normalize(average(density,3),.98,.75);
 const intensity=new Float32Array(n);for(let i=0;i<n;i++)intensity[i]=clamp(.62*loudness[i]+.27*activity[i]+.11*brightness[i]);
 const {phase, pulse}=sourcePhase(beats,n,dt);
 const signals={loudness,bass,mid,high,brightness,texture,harmonic,activity,intensity,onsets,attack,beat:pulse,phase};
 postMessage({type:'done',dt,t0:0,signals,events,lowEvents:[],beats,bpm,beatConfidence,engine:'Essentia.js + Meyda',count:n},Object.values(signals).map(x=>x.buffer));
}
onmessage=async ev=>{if(ev.data.type!=='analyse')return;try{await analyse(ev.data.samples,ev.data.sampleRate,ev.data.libraries)}catch(err){postMessage({type:'error',message:String(err?.message||err),stack:String(err?.stack||'')})}};
