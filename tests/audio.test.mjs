import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SiloAudio } from '../dist/src/audio.js';

const manifest=JSON.parse(fs.readFileSync('dist/assets/audio/manifest.json','utf8'));
const themePath=`dist/assets/audio/${manifest.soundtrack.file}`;

// A recording Web Audio stand-in. Every node reports what it was asked to do,
// so the module can be exercised without a browser: the real mix levels are
// verified by rendering through Chromium, which these checks cannot do.
function stubContext(){
  const log=[];
  const param=(name,value=0)=>({value,setValueAtTime:v=>{param.value=v;log.push([name,'set',v]);},
    linearRampToValueAtTime:v=>log.push([name,'linear',v]),
    exponentialRampToValueAtTime:v=>{assert.notEqual(v,0,`${name}: exponential ramp to zero is invalid`);log.push([name,'exp',v]);},
    setTargetAtTime:v=>log.push([name,'target',v]),cancelScheduledValues:()=>{}});
  const node=kind=>{const n={kind,connect:t=>t,disconnect(){},start(){this.started=true;},stop(){}};
    for(const p of ['gain','frequency','Q','pan','detune','playbackRate','threshold','knee','ratio','attack','release'])n[p]=param(`${kind}.${p}`);
    return n;};
  return {log,state:'running',currentTime:0,sampleRate:44100,destination:node('destination'),
    createGain:()=>node('gain'),createOscillator:()=>node('oscillator'),createBiquadFilter:()=>node('filter'),
    createBufferSource:()=>node('source'),createStereoPanner:()=>node('panner'),createConvolver:()=>node('convolver'),
    createDynamicsCompressor:()=>node('compressor'),
    createBuffer:(channels,length,rate)=>({numberOfChannels:channels,length,sampleRate:rate,duration:length/rate,
      getChannelData:()=>new Float32Array(length)}),
    decodeAudioData:()=>new Promise(()=>{}),resume:()=>Promise.resolve()};
}
function silo(){
  const context=stubContext(),previous=globalThis.AudioContext;
  globalThis.AudioContext=function(){return context;};
  const audio=new SiloAudio();audio.start();clearTimeout(audio.eventTimer);
  globalThis.AudioContext=previous;
  return {audio,context};
}

test('the soundtrack ships, is web weight and matches its manifest',()=>{
  const file=fs.readFileSync(themePath);
  assert.equal(file.length,manifest.soundtrack.bytes);
  assert.ok(file.length<10*1024*1024,`soundtrack is ${(file.length/1048576).toFixed(1)} MiB; keep it under 10`);
  assert.equal(file.subarray(0,3).toString('latin1'),'ID3');
  assert.match(fs.readFileSync('dist/src/audio.js','utf8'),new RegExp(manifest.soundtrack.file));
});

test('an absent Web Audio implementation is survivable, not fatal',()=>{
  const previous=globalThis.AudioContext,previousWebkit=globalThis.webkitAudioContext;
  globalThis.AudioContext=globalThis.webkitAudioContext=undefined;
  const audio=new SiloAudio();
  for(const call of [()=>audio.start(),()=>audio.setEnabled(false),()=>audio.setEnabled(true),()=>audio.setMusicVolume(.5),
    ()=>audio.setLocation('generator'),()=>audio.step(9,4.3),()=>audio.click(),()=>audio.door(true),()=>audio.airlock(),
    ()=>audio.torch(true),()=>audio.travel(),()=>audio.scrubStart(),()=>audio.scrubStop(),()=>audio.fireEvent()])call();
  globalThis.AudioContext=previous;globalThis.webkitAudioContext=previousWebkit;
});

test('every location and every interaction schedules without throwing',()=>{
  const {audio}=silo();
  for(const place of ['surface','airlock','generator','excavator','mines','tunnel','mechanical','workshop','water','recycling',
    'farm','park','residential','bazaar','cafeteria','medical','it','vault','surveillance','sheriff','judicial',undefined]){
    audio.setLocation(place);
    for(let i=1;i<=4;i++)audio.step(i*1.2,i%2?1.7:4.3);
    audio.fireEvent();
  }
  audio.door(true);audio.door(false);audio.airlock();audio.click();audio.torch(true);audio.torch(false);audio.travel();
  audio.scrubStart();audio.scrubStart();audio.scrubStop();audio.scrubStop();
});

test('footsteps follow distance walked, not frame rate',()=>{
  const {audio}=silo();
  const count=(steps,speed)=>{let fired=0;const started=audio.lastStep;
    audio.step=new Proxy(audio.step,{});                       // keep the real implementation
    for(const distance of steps){const before=audio.lastStep;SiloAudio.prototype.step.call(audio,distance,speed);if(audio.lastStep!==before)fired++;}
    return {fired,started};};
  // Standing still and crawling never trigger a step.
  assert.equal(count([1,2,3,4].map(n=>n*0),0).fired,0);
  audio.lastStep=0;
  assert.equal(count([.1,.2,.3,.4,.5],.2).fired,0,'speeds below the walk threshold must stay silent');
  audio.lastStep=0;
  // Ten metres of walking is roughly ten strides; running covers more ground per step.
  const walked=count(Array.from({length:200},(_,i)=>i*.05),1.7).fired;
  audio.lastStep=0;
  const ran=count(Array.from({length:200},(_,i)=>i*.05),4.3).fired;
  assert.ok(walked>=12&&walked<=15,`walking 10 m produced ${walked} steps`);
  assert.ok(ran<walked,`running (${ran}) must take longer strides than walking (${walked})`);
});

test('the sound toggle and the music slider only ever move their own bus',()=>{
  const {audio}=silo();
  const music=audio.musicBus.gain,master=audio.master.gain;
  const targets=name=>audio.context.log.filter(([n,kind])=>n===name&&kind==='target').map(([,,v])=>v);
  audio.setEnabled(false);audio.setEnabled(true);
  assert.deepEqual(targets('gain.gain').slice(-2),[0,2.2],'the toggle must mute and restore the master, soundtrack included');
  audio.musicPlaying=true;
  audio.setMusicVolume(0);assert.equal(audio.musicVolume,0);
  audio.setMusicVolume(1);assert.ok(Math.abs(audio.musicVolume-.30)<1e-9);
  audio.setMusicVolume(.65);assert.ok(audio.musicVolume>.1&&audio.musicVolume<.2,`slider midpoint gave ${audio.musicVolume}`);
  audio.setMusicVolume(9);assert.ok(audio.musicVolume<=.30,'the slider must not be able to exceed full scale');
  assert.notEqual(music,master);
});

test('the loop trim removes codec padding and refuses to cut real material',()=>{
  const {audio}=silo();
  const rate=44100;
  const buffer=(length,fill)=>({numberOfChannels:1,length,sampleRate:rate,duration:length/rate,
    getChannelData:()=>{const d=new Float32Array(length);for(let i=0;i<length;i++)d[i]=fill(i);return d;}});
  // A tenth of a second of encoder padding at each end of otherwise full-level audio.
  const pad=Math.round(rate*.1),length=rate*4;
  const trimmed=audio.audibleBounds(buffer(length,i=>i<pad||i>=length-pad?0:Math.sin(i*.05)*.5));
  assert.ok(Math.abs(trimmed.start-.1)<.001,`loop start ${trimmed.start}`);
  assert.ok(Math.abs(trimmed.end-3.9)<.001,`loop end ${trimmed.end}`);
  // A quiet head long enough to be real material, not codec padding, is left
  // alone: trimming it would silently drop the opening from every loop.
  const intro=Math.round(rate*1.2);
  const kept=audio.audibleBounds(buffer(length,i=>i<intro?0:Math.sin(i*.05)*.5));
  assert.equal(kept.start,0);
  assert.equal(kept.end,length/rate);
  // A short fade in and out only ever costs a few milliseconds.
  const faded=audio.audibleBounds(buffer(length,i=>Math.sin(i*.05)*.5*Math.min(1,i/(rate*.05))*Math.min(1,(length-i)/(rate*.05))));
  assert.ok(faded.start<.01,`a 50 ms fade trimmed ${faded.start}s`);
  assert.ok(length/rate-faded.end<.01);
});
