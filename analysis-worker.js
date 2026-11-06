'use strict';
/* Visual Synth: library-driven music analysis, no legacy hit or tempo estimation. */

const clamp=x=>Math.max(0,Math.min(1,x));
function pct(a,p=.97){const b=Array.from(a).filter(Number.isFinite).sort((x,y)=>x-y);return b.length?b[Math.min(b.length-1),Math.floor(p*(b.length-1))]:1}
function normalize(a,p=.975,gamma=.8){const scale=Math.max(1e-9,pct(a,p));return Float32Array.from(a,x=>clamp(Math.pow(Math.max(0,x)/scale,gamma)))}
function average(a,r){const b=new Float32Array(a.length);let sum=0,l=0,h=0;for(let i=0;i<a.length;i++){const stop=Math.min(a.length,i+r+1),start=Math.max(0,i-r);while(h<stop)sum+=a[h++];while(l<start)sum-=a[l++];b[i]=sum/Math.max(1,h-l)}return b}
function vecToArray(e,v){if(!v)return [];const arr=Array.from(e.vectorToArray(v));if(typeof v.delete==='function')v.delete();return arr}
function envelope(events,n,dt,decay=.12){const a=new Float32Array(n);let j=0;for(let i=0;i<n;i++){const t=i*dt;while(j<events.length&&events[j].t<=t)j++;if(j){const ev=events[j-1];a[i]=ev.strength*Math.exp(-(t-ev.t)/decay)}}return a}
function sourcePhase(beats,n,dt){const phase=new Float32Array(n),pulse=new Float32Array(n);if(!beats.length)return {phase,pulse};let j=0;for(let i=0;i<n;i++){const t=i*dt;while(j+1<beats.length&&beats[j+1]<=t)j++;const prev=beats[j],next=beats[j+1]??prev+((beats[j]-beats[j-1])||.5),span=Math.max(.02,next-prev);phase[i]=t<beats[0]?0:clamp((t-prev)/span);pulse[i]=t<beats[0]?0:Math.exp(-(t-prev)/.10)}return {phase,pulse}}

/* Two bona fide fundamental-frequency tracking algorithms replace the discarded
   strongest-spectrum-bin approximation. The two streams are frequency-isolated
   first, because a mixed recording contains several independent notes. These
   are still estimates of prominent lines, not isolated instrument stems. */
function halfRate(input){
 const n=Math.floor(input.length/2),out=new Float32Array(n);
 // Symmetric eight-tap low-pass before reducing the sample rate from 44.1 to 22.05 kHz.
 const taps=[1,4,7,10,10,7,4,1];
 for(let i=0;i<n;i++){let v=0;const c=i*2;for(let j=0;j<8;j++)v+=(input[Math.max(0,Math.min(input.length-1,c+j-3))]||0)*taps[j];out[i]=v/44}
 return out;
}
function filterBand(input,sr,lo,hi){
 // Cascaded Butterworth high-/low-pass stages separate overlapping note ranges.
 function biquad(src,cutoff,highpass){
  const w=2*Math.PI*cutoff/sr,c=Math.cos(w),sn=Math.sin(w),q=.70710678,a=1+sn/(2*q);
  const b0=(highpass?(1+c):(1-c))/(2*a),b1=(highpass?-(1+c):(1-c))/a,b2=b0;
  const a1=-2*c/a,a2=(1-sn/(2*q))/a;
  const out=new Float32Array(src.length);let x1=0,x2=0,y1=0,y2=0;
  for(let i=0;i<src.length;i++){const x=src[i],y=b0*x+b1*x1+b2*x2-a1*y1-a2*y2;out[i]=y;x2=x1;x1=x;y2=y1;y1=y}
  return out;
 }
 let result=input;
 if(lo){result=biquad(result,lo,true);result=biquad(result,lo,true)}
 if(hi){result=biquad(result,hi,false);result=biquad(result,hi,false)}
 return result;
}
function pitchCurve(series,confidence,n,dt,hopSeconds,minHz,maxHz,energy,minConfidence){
 const out=new Float32Array(n),hz=new Float32Array(n);
 const logRange=Math.log2(maxHz/minHz);
 for(let i=0;i<n;i++){
  const frame=Math.min(series.length-1,Math.max(0,Math.round((i*dt)/hopSeconds)));
  const p=series[frame]||0,c=confidence?.[frame]??1;
  // Unvoiced frames must remain SILENT; don't hold a previous invented note.
  if(p<minHz||p>maxHz||!Number.isFinite(p)||c<minConfidence||energy[i]<.025)continue;
  const scaled=.12+.88*clamp(Math.log2(p/minHz)/logRange);
  out[i]=scaled*Math.min(1,energy[i]*5);hz[i]=p;
 }
 const move=new Float32Array(n);
 for(let i=1;i<n;i++){
  // Adjacent voiced estimates are required: prevent note on/off from becoming
  // an artificial multi-octave pitch jump.
  if(hz[i]>0&&hz[i-1]>0){
   const interval=Math.abs(Math.log2(hz[i]/hz[i-1]));
   move[i]=Math.min(1,interval*2.0)*Math.min(1,energy[i]*5);
  }
 }
 return {contour:out,movement:normalize(average(move,2),.975,.78),voiced:hz.reduce((a,x)=>a+(x>0),0)};
}
/* Five performable musical parts:
   Essentia RhythmExtractor -> beat
   Essentia probabilistic YIN -> bass
   Essentia MultiPitchMelodia -> simultaneous pitched candidates
   Time-continuity assignment -> THREE provisional melodic voices.
   Melodia outputs pitch candidates, NOT instrument identity or separated stems. */
function readPitchRows(vec){
 if(!vec || typeof vec.size!=='function' || typeof vec.get!=='function')
  throw Error('MultiPitchMelodia returned an unexpected pitch-vector structure.');
 const rows=[];
 try{
  const count=vec.size();
  for(let i=0;i<count;i++){
   const row=vec.get(i),pitches=[];
   try{
    if(row && typeof row.size==='function'){
     for(let j=0;j<row.size();j++){
      const f=Number(row.get(j));if(f>=145&&f<=3500&&Number.isFinite(f))pitches.push(f);
     }
    }
   }finally{row?.delete?.()}
   // Suppress duplicate estimates of the same note (within 30 cents).
   pitches.sort((a,b)=>a-b);
   rows.push(pitches.filter((v,k)=>k===0||1200*Math.log2(v/pitches[k-1])>30));
  }
 }finally{vec.delete?.()}
 return rows;
}
function assignMelodyVoices(rows,frameDt){
 const defaults=[285,630,1300],states=defaults.map(f=>({pitch:f,last:-100}));
 const output=Array.from({length:3},()=>new Float32Array(rows.length));
 for(let i=0;i<rows.length;i++){
  const frequencies=rows[i]||[],used=new Set();
  // Preserve continuity when pitches overlap. A frame can only belong to one voice.
  const choices=[];
  for(let k=0;k<3;k++)for(let q=0;q<frequencies.length;q++){
   const last=states[k],dt=(i-last.last)*frameDt;
   const recent=dt<.36;
   const reference=recent?last.pitch:defaults[k];
   const cents=Math.abs(1200*Math.log2(frequencies[q]/reference));
   choices.push({k,q,cost:cents+(recent?0:125),recent});
  }
  choices.sort((a,b)=>a.cost-b.cost);
  const assigned=new Set();
  for(const pick of choices){
   if(assigned.has(pick.k)||used.has(pick.q))continue;
   // Reject implausible note leaps inside a phrase but allow new phrases to start.
   if(pick.recent&&pick.cost>690)continue;
   if(!pick.recent&&pick.cost>1900)continue;
   output[pick.k][i]=frequencies[pick.q];
   states[pick.k].pitch=frequencies[pick.q];states[pick.k].last=i;
   assigned.add(pick.k);used.add(pick.q);
  }
 }
 return output;
}
function noteSegments(pitchArray,dt,minDuration=.085){
 const notes=[];let start=-1,prev=0,sum=0,count=0;
 const push=end=>{if(start<0)return;const duration=(end-start)*dt;
  if(duration>=minDuration&&count){const hz=sum/count;notes.push({t0:start*dt,t1:end*dt,hz,midi:Math.round(69+12*Math.log2(hz/440))})}
  start=-1;sum=0;count=0;prev=0;
 };
 for(let i=0;i<=pitchArray.length;i++){
  const p=pitchArray[i]||0;
  if(!p){push(i);continue}
  if(start<0){start=i;sum=p;count=1;prev=p;continue}
  if(Math.abs(12*Math.log2(p/prev))>.85){push(i);start=i;sum=p;count=1;prev=p;continue}
  sum+=p;count++;prev=p;
 }
 return notes;
}
function notesToSignal(pitches,n,dt,frameDt,min,max,energy){
 const out=new Float32Array(n),hz=new Float32Array(n);
 const span=Math.log2(max/min);
 for(let i=0;i<n;i++){
  const j=Math.max(0,Math.min(pitches.length-1,Math.round(i*dt/frameDt)));
  const p=pitches[j]||0;
  if(p<min||p>max||energy[i]<.024)continue;
  hz[i]=p;out[i]=(.16+.84*clamp(Math.log2(p/min)/span))*Math.min(1,energy[i]*5);
 }
 return {out,hz};
}
function activityFromNotes(notes,n,dt){
 const out=new Float32Array(n);
 for(const note of notes){
  const a=Math.max(0,Math.floor(note.t0/dt)),b=Math.min(n,Math.ceil(note.t1/dt));
  for(let i=a;i<b;i++)out[i]=1;
 }
 return out;
}
async function extractMusicalVoices(e,s,n,dt,bassEnergy,upperEnergy){
 if(typeof e.PitchYinProbabilistic!=='function')throw Error('Essentia YIN pitch tracking is not available in this build.');
 if(typeof e.MultiPitchMelodia!=='function')throw Error('Essentia MultiPitchMelodia is not available in this build.');
 const sr=22050,hop=512,frameDt=hop/sr;
 const reduced=halfRate(s);
 const bassSignal=filterBand(reduced,sr,38,290);
 postMessage({type:'progress',value:90,detail:'Following bass notes with Essentia YIN…'});
 let bassP,bassC;
 const bassVec=e.arrayToVector(bassSignal);
 try{
  let r;
  try { r=e.PitchYinProbabilistic(bassVec,2048,hop,.01,'zero',false,sr); }
  catch(err){throw Error('Bass YIN pitch tracker: '+(err?.message||err))}
  bassP=vecToArray(e,r.pitch);bassC=vecToArray(e,r.voicedProbabilities);
 }finally{bassVec.delete?.()}
 if(bassP.length<2)throw Error('Bass pitch tracker produced no frames.');
 const bassHz=new Float32Array(bassP.length);
 for(let i=0;i<bassP.length;i++)if(bassP[i]>=40&&bassP[i]<=380&&(bassC[i]??0)>=.47)bassHz[i]=bassP[i];
 const upperSignal=filterBand(reduced,sr,160,3600);
 const frameCount=Math.ceil((s.length/44100)/frameDt)+2;
 const allRows=new Array(frameCount);
 const duration=s.length/44100, chunkLength=24;
 for(let coreStart=0;coreStart<duration;coreStart+=chunkLength){
  const from=Math.max(0,coreStart-.55),to=Math.min(duration,coreStart+chunkLength+.55);
  const chunk=upperSignal.subarray(Math.floor(from*sr),Math.min(upperSignal.length,Math.ceil(to*sr)));
  const v=e.arrayToVector(chunk);
  let rows;
  try{
   let r;
   try { r=e.MultiPitchMelodia(v,10,3,2048,false,.8,hop,1,40,3500,95,165,20,.9,.9,27.5625,55,sr,100); }
   catch(err){throw Error('Melody MultiPitchMelodia at '+coreStart.toFixed(1)+'s: '+(err?.message||err))}
   rows=readPitchRows(r.pitch);
  }finally{v.delete?.()}
  for(let i=0;i<rows.length;i++){
   const time=from+i*frameDt;
   if(time<coreStart || time>=Math.min(duration,coreStart+chunkLength))continue;
   const ix=Math.round(time/frameDt);
   if(ix>=0&&ix<allRows.length)allRows[ix]=rows[i];
  }
  postMessage({type:'progress',value:92+Math.round(Math.min(1,(coreStart+chunkLength)/duration)*7),
    detail:'Following simultaneous melodies: '+Math.round(Math.min(duration,coreStart+chunkLength))+' / '+Math.round(duration)+' seconds…'});
 }
 const voiceHz=assignMelodyVoices(allRows,frameDt);
 // Unlike band-energy curves, these signals are silent during unvoiced notes.
 const result={signals:{},notes:{},diagnostics:{method:'Essentia YIN + multi-pitch MELODIA; register/continuity-based assignment'}};
 const bassTrack=notesToSignal(bassHz,n,dt,frameDt,40,380,bassEnergy);
 result.signals.bass=bassTrack.out;
 result.notes.bass=noteSegments(bassHz,frameDt);
 for(let k=0;k<3;k++){
  const id='melody'+String.fromCharCode(65+k);
  const line=notesToSignal(voiceHz[k],n,dt,frameDt,155,3500,upperEnergy);
  result.signals[id]=line.out;
  result.notes[id]=noteSegments(voiceHz[k],frameDt);
 }
 // When trackers find no stable notes, the lane stays empty rather than faking activity.
 return result;
}
function arrangementAnalysis(signals,loudness,n,dt){
 const activity=new Float32Array(n), voices=['bass','melodyA','melodyB','melodyC'];
 for(let i=0;i<n;i++){
  let count=0;for(const id of voices)if(signals[id][i]>.035)count++;
  activity[i]=clamp(count*.18+(loudness[i]||0)*.28);
 }
 const smooth=average(activity,Math.max(1,Math.round(.7/dt)));
 const markers=[];const look=Math.max(1,Math.round(2.0/dt));let lastTime=-10;
 for(let i=look;i+look<n;i+=Math.max(1,Math.round(.25/dt))){
  const before=smooth[i-look],after=smooth[i+look];const delta=after-before;
  if(i*dt-lastTime<3.5)continue;
  if(delta>.20 && after>.32){markers.push({t:i*dt,type:'BUILD'});lastTime=i*dt}
  else if(delta<-.20&&before>.37){markers.push({t:i*dt,type:'BREAK'});lastTime=i*dt}
 }
 return {curve:smooth,markers};
}
async function init(libraries){
  if(!libraries?.wasm || !libraries?.core || !libraries?.meyda)throw Error("Analysis libraries were not supplied to the worker.");
  postMessage({type:'progress',value:2,detail:'Loading Essentia’s worker-compatible WASM…'});
  // IMPORTANT: essentia-wasm.web.js is built for a DOM page and accesses `document`.
  // Workers have no document. The Essentia project explicitly demonstrates
  // essentia-wasm.umd.js (synchronous WASM) inside importScripts-based Workers.
  // Essentia 0.1.3's UMD postlude writes `exports.EssentiaWASM = Module`.
  // In a classic browser worker, `exports` is NOT provided automatically.
  self.exports = {};
  try { importScripts(libraries.wasm); }
  catch(err) { throw Error('Cannot load Essentia worker WASM: '+(err?.message||err)); }
  const wasm=self.exports.EssentiaWASM || ((typeof Module!=='undefined')?Module:null);
  delete self.exports;
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
 const attack=envelope(events,n,dt,.115),onsets=envelope(events.map(ev=>({...ev,strength:1})),n,dt,.055);
 const density=new Float32Array(n);let a=0,b=0;
 for(let i=0;i<n;i++){const t=i*dt;while(b<events.length&&events[b].t<t+.2)b++;while(a<b&&events[a].t<t-.2)a++;density[i]=(b-a)/.4}
 const activity=normalize(average(density,3),.98,.75);
 const intensity=new Float32Array(n);for(let i=0;i<n;i++)intensity[i]=clamp(.62*loudness[i]+.27*activity[i]+.11*brightness[i]);
 // Music-derived pitch lines: real fundamental-frequency estimators, not FFT peaks.
 // Bass and upper tracks remain independent, and unvoiced segments stay at zero.
 const pitchBassEnergy=new Float32Array(n),pitchUpperEnergy=new Float32Array(n);
 for(let i=0;i<n;i++){pitchBassEnergy[i]=clamp(bass[i]*.85+mid[i]*.2);pitchUpperEnergy[i]=Math.max(mid[i],high[i]);}
 const voices=await extractMusicalVoices(e,s,n,dt,pitchBassEnergy,pitchUpperEnergy);
 const {phase, pulse}=sourcePhase(beats,n,dt);
 const beatSignal=Float32Array.from(pulse,(x,i)=>loudness[i]<.015?0:x*Math.min(1,loudness[i]*6));
 const signals={beat:beatSignal,...voices.signals};
 const arrangement=arrangementAnalysis(signals,loudness,n,dt);
 postMessage({type:'done',dt,t0:0,signals,notes:voices.notes,arrangement,events,lowEvents:[],beats,bpm,beatConfidence,
   engine:'Essentia RhythmExtractor + YIN + MultiPitchMelodia; Meyda loudness for arrangement',
   pitchDiagnostics:voices.diagnostics,count:n},[...Object.values(signals).map(x=>x.buffer),arrangement.curve.buffer]);
}
onmessage=async ev=>{if(ev.data.type!=='analyse')return;try{await analyse(ev.data.samples,ev.data.sampleRate,ev.data.libraries)}catch(err){postMessage({type:'error',message:String(err?.message||err),stack:String(err?.stack||'')})}};
