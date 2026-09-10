import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SiloAudio } from '../dist/src/audio.js';

const manifest=JSON.parse(fs.readFileSync('dist/assets/audio/manifest.json','utf8'));
const themePath=`dist/assets/audio/${manifest.soundtrack.file}`;
const openingPath=`dist/assets/audio/${manifest.opening.file}`;

// A recording Web Audio stand-in. Every node reports what it was asked to do,
// so the module can be exercised without a browser: the real mix levels are
// verified by rendering through Chromium, which these checks cannot do.
function stubContext(){
  const log=[];
  const param=(name,value=0)=>({value,setValueAtTime:v=>{param.value=v;log.push([name,'set',v]);},
    linearRampToValueAtTime:v=>log.push([name,'linear',v]),
    exponentialRampToValueAtTime:v=>{assert.notEqual(v,0,`${name}: exponential ramp to zero is invalid`);log.push([name,'exp',v]);},
    setTargetAtTime:v=>log.push([name,'target',v]),cancelScheduledValues:()=>{}});
  const created={};
  const nodes=[];
  const node=kind=>{created[kind]=(created[kind]||0)+1;
    const n={kind,connect:t=>t,disconnect(){},start(t){this.started=true;this.startedAt=t;},stop(){}};
    for(const p of ['gain','frequency','Q','pan','detune','playbackRate','threshold','knee','ratio','attack','release'])n[p]=param(`${kind}.${p}`);
    nodes.push(n);return n;};
  return {log,created,nodes,state:'running',currentTime:0,sampleRate:44100,destination:node('destination'),
    createGain:()=>node('gain'),createOscillator:()=>node('oscillator'),createBiquadFilter:()=>node('filter'),
    createBufferSource:()=>node('source'),createStereoPanner:()=>node('panner'),createConvolver:()=>node('convolver'),
    createDynamicsCompressor:()=>node('compressor'),
    createBuffer:(channels,length,rate)=>{
      const data=Array.from({length:channels},()=>new Float32Array(length));
      return {numberOfChannels:channels,length,sampleRate:rate,duration:length/rate,getChannelData:i=>data[i||0]};
    },
    decodeAudioData:()=>new Promise(()=>{}),resume:()=>Promise.resolve()};
}
function silo(){
  const context=stubContext(),previous=globalThis.AudioContext;
  globalThis.AudioContext=function(){return context;};
  const audio=new SiloAudio();audio.start();clearTimeout(audio.eventTimer);
  globalThis.AudioContext=previous;
  return {audio,context};
}

test('both music files ship, are web weight and match their manifest',()=>{
  const source=fs.readFileSync('dist/src/audio.js','utf8');
  for(const entry of [manifest.soundtrack,manifest.opening]){
    const file=fs.readFileSync(`dist/assets/audio/${entry.file}`);
    assert.equal(file.length,entry.bytes,`${entry.file} is ${file.length} bytes, manifest says ${entry.bytes}`);
    assert.ok(file.length<10*1024*1024,`${entry.file} is ${(file.length/1048576).toFixed(1)} MiB; keep it under 10`);
    assert.equal(file.subarray(0,3).toString('latin1'),'ID3');
    assert.match(source,new RegExp(entry.file));
  }
  // The bed takes over from the opening piece part way through a session. If
  // they are not mastered to the same level that hand-over is an audible step.
  const level=e=>Number(e.integratedLoudness.replace(' LUFS',''));
  assert.ok(Math.abs(level(manifest.soundtrack)-level(manifest.opening))<1,
    `the two tracks are ${Math.abs(level(manifest.soundtrack)-level(manifest.opening)).toFixed(1)} LU apart`);
});

test('the opening piece is held back, owns the music while it runs, and hands over to the bed',()=>{
  const {audio}=silo();
  audio.holdMusic();
  assert.equal(audio.musicHeld,true);
  // While the cafeteria is silent, nothing may start the bed by accident.
  audio.playMusic({numberOfChannels:1,length:44100,sampleRate:44100,duration:1,getChannelData:()=>new Float32Array(44100).fill(.5)});
  assert.equal(audio.musicPlaying,false,'the bed started while the music was held');
  // With the opening piece running, releasing the gate must not stack the bed
  // on top of it; only the piece ending may do that.
  audio.openingPlaying=true;
  audio.releaseMusic();
  assert.equal(audio.musicHeld,true,'the bed started underneath the opening piece');
  audio.openingPlaying=false;
  audio.releaseMusic();
  assert.equal(audio.musicHeld,false);
  audio.stopOpeningTheme();
  assert.equal(audio.openingPlaying,false);
  audio.setStoryPaused(true);audio.setStoryPaused(false);
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

test('rig contact events trigger one footstep each, including after character selection',()=>{
  const {audio}=silo();let fired=0;
  for(const [distance,contact] of [[0,0],[.1,1],[.2,1],[.3,1],[.4,2],[.5,2],[.6,0],[.7,0],[.8,1],[.9,1]]){
    const before=audio.foot;audio.step(distance,1.45,contact);if(audio.foot!==before)fired++;
  }
  assert.equal(fired,3,'only new planted contacts should schedule sound; a reset must stay silent');
  const before=audio.foot;audio.step(9,0,9);assert.equal(audio.foot,before,'standing still must stay silent');
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

test('every impact is modelled into a usable sample bank',()=>{
  const {audio}=silo();
  const names=['concrete','grating','metal','rock','grit','soil','soft','wet','latch','thunk','clunk',
               'clank','click','switch','paper','cloth','glass','plastic','timber'];
  for(const name of names){
    const {takes,trim}=audio.bank[name];
    assert.ok(Array.isArray(takes)&&takes.length===6,`${name} needs six takes; one retriggered sample is the machine-gun footstep`);
    // Every take peaks at 1, so the trim is what makes a level mean loudness
    // rather than peak height. It is clamped so a peaky material cannot drive
    // the limiter on a single hit.
    assert.ok(trim>=.4&&trim<=2.2,`${name} trim ${trim} is outside the clamp`);
    const peaks=[];
    for(const take of takes){
      const data=take.getChannelData(0);
      assert.ok(data.length>32,`${name} rendered ${data.length} samples`);
      let peak=0,head=0,tail=0;
      for(let i=0;i<data.length;i++){
        assert.ok(Number.isFinite(data[i]),`${name} produced a non-finite sample: an unstable resonator`);
        const magnitude=Math.abs(data[i]);if(magnitude>peak)peak=magnitude;
        if(i<data.length*.1)head+=data[i]*data[i];
        if(i>data.length*.9)tail+=data[i]*data[i];
      }
      assert.ok(Math.abs(peak-1)<1e-6,`${name} is not normalised (peak ${peak.toFixed(4)})`);
      assert.ok(tail<head*.05,`${name} does not decay: ${(tail/head).toFixed(3)} of its energy is still there at the end`);
      peaks.push(data.reduce((a,v)=>a+v*v,0));
    }
    assert.equal(new Set(peaks.map(p=>p.toFixed(6))).size,6,`${name}: the six takes are identical, so they will sound identical`);
  }
});

test('floors are told apart by how long they ring, not just how loud they are',()=>{
  const {audio}=silo();
  // Energy still sounding between 100 and 250 ms, against the energy of the
  // strike itself. Windows are absolute, and a sample that has already ended
  // scores zero there — which is the physical answer, not an artefact: a
  // covered floor really has stopped by then.
  const sustain=name=>{
    const data=audio.bank[name].takes[0].getChannelData(0),rate=44100;
    const band=(from,to)=>{let sum=0;for(let i=Math.round(rate*from);i<Math.round(rate*to)&&i<data.length;i++)sum+=data[i]*data[i];return sum;};
    return band(.1,.25)/Math.max(1e-12,band(0,.025));
  };
  const grating=sustain('grating'),concrete=sustain('concrete'),soft=sustain('soft'),grit=sustain('grit');
  assert.ok(grating>concrete*2,`grating sustains ${grating.toExponential(2)}, concrete ${concrete.toExponential(2)} — steel must ring longer`);
  assert.ok(concrete>soft,`concrete ${concrete.toExponential(2)} must outlast a covered floor ${soft.toExponential(2)}`);
  assert.ok(grit>soft,`loose grit ${grit.toExponential(2)} should still be crunching past a covered floor ${soft.toExponential(2)}`);
});

test('a walking step lands heel then toe, the toe duller; a run lands flat',()=>{
  const {audio,context}=silo();
  audio.setLocation('cafeteria');
  // Impacts are the buffer sources that were given a playback rate; the scuff
  // is a filtered noise burst and is excluded by looking only at the two
  // earliest, which are the two contacts.
  const contacts=()=>context.nodes.filter(n=>n.kind==='source'&&n.started&&n.startedAt>0)
    .map(n=>({at:n.startedAt,rate:n.playbackRate.value})).sort((a,b)=>a.at-b.at);
  context.nodes.length=0;
  audio.step(4,1.45,null);
  const walk=contacts();
  assert.ok(walk.length>=2,'a walk should place a heel and a toe');
  const gap=walk[1].at-walk[0].at;
  assert.ok(gap>=.08&&gap<=.15,`the forefoot followed the heel by ${(gap*1000).toFixed(0)} ms; a walk rolls over about a tenth of a second`);
  assert.ok(walk[1].rate<walk[0].rate,
    `the second contact was pitched up (${walk[1].rate.toFixed(2)} against ${walk[0].rate.toFixed(2)}); a sole flattening is duller than the heel that struck, and pitching it up is what made this sound like tap shoes`);

  audio.lastStep=0;context.nodes.length=0;
  audio.step(4,3.8,null);
  const run=contacts();
  assert.ok(run.length>=2,'a run still places both contacts');
  const flat=run[1].at-run[0].at;
  assert.ok(flat<=.04,`a run landed ${(flat*1000).toFixed(0)} ms apart; it should land flat`);
});

test('the whole silo walks on one floor, and only the exceptions differ',()=>{
  const {audio}=silo();
  // Walking the silo end to end used to change footstep character at every
  // door: metal through Mechanical, carpet through the residences, grass on the
  // farm, steel grating on the stairway between all of them. It read as several
  // different games rather than one building.
  const inside=['cafeteria','bazaar','residential','medical','it','vault','surveillance',
                'farm','park','water','recycling','workshop','mechanical','generator','airlock'];
  for(const place of inside){
    audio.setLocation(place);
    assert.equal(audio.material(),'concrete',`${place} does not walk on the same floor as the cafeteria`);
  }
  // The places that are genuinely not silo floor keep their own.
  for(const [place,surface] of [['mines','rock'],['excavator','rock'],['tunnel','rock'],['surface','grit']]){
    audio.setLocation(place);
    assert.equal(audio.material(),surface,`${place} should still be ${surface}`);
  }
});

test('standing in the water is the only thing that overrides the room floor',()=>{
  const {audio}=silo();
  audio.setLocation('cafeteria');
  assert.equal(audio.material(),'concrete');
  audio.setSurface('wet');
  assert.equal(audio.material(),'wet','wading has to override the room, or you get concrete underwater');
  audio.setLocation('mechanical');
  assert.equal(audio.material(),'wet','the override must survive a change of level');
  audio.setSurface(null);
  assert.equal(audio.material(),'concrete');
  audio.setSurface('nonsense');
  assert.equal(audio.material(),'concrete','an unknown surface falls back rather than going silent');
});
test('picking something up is the object, not one interface click',()=>{
  const {audio,context}=silo();
  const before=context.created.source||0;
  audio.pickup('book');
  assert.ok((context.created.source||0)-before>=3,
    'a pickup is the hand finding it, the object answering, and the sleeve behind both');
  // Every collectable names a material, or it falls back to a generic relic.
  audio.pickup('nothing-like-this');
  audio.drop('glass');
});

test('every walking surface has recordings behind it, and they are real files',()=>{
  const manifest=JSON.parse(fs.readFileSync('dist/assets/audio/footsteps/manifest.json','utf8'));
  const source=fs.readFileSync('dist/src/audio.js','utf8');
  const floors=source.match(/const FLOORS=\[([^\]]+)\]/)[1].split(',').map(s=>s.replace(/['"\s]/g,''));
  for(const floor of floors){
    const entry=manifest.materials[floor];
    assert.ok(entry,`${floor} is a walking surface with no recording behind it`);
    assert.ok(entry.takes.length>=2,`${floor} has ${entry.takes.length} recording(s); one retriggered is the machine-gun footstep`);
    for(const take of entry.takes){
      const file=`dist/assets/audio/footsteps/${take.file}`;
      assert.ok(fs.existsSync(file),`${take.file} is in the manifest but not on disk`);
      assert.equal(fs.statSync(file).size,take.bytes,`${take.file} is not the size the manifest records`);
      // A step that runs longer than the walking cadence stacks on the next one.
      assert.ok(take.seconds<=.8,`${take.file} runs ${take.seconds}s; that is longer than a step`);
      assert.equal(fs.readFileSync(file).subarray(0,4).toString('latin1'),'RIFF');
    }
    // Every floor needs a level for the recording, not just for the fallback.
    assert.match(source,new RegExp(`${floor}\\s*:\\s*\\{level:[\\d.]+,sample:`),`${floor} has no sample level`);
  }
  // The recordings are CC BY-SA 3.0. Shipping them without the licence and the
  // record of what was changed is the one thing that is not allowed.
  for(const file of ['LICENSE.txt','README.txt'])
    assert.ok(fs.existsSync(`dist/assets/audio/footsteps/${file}`),`footsteps/${file} is missing`);
  assert.match(fs.readFileSync('dist/assets/audio/footsteps/README.txt','utf8'),/CC BY-SA 3\.0/);
  assert.ok(manifest.source?.url&&manifest.changes,'the manifest must record where they came from and what was changed');
});

test('the raw contact never overwhelms the floor it lands on',()=>{
  // `direct` is how much of the bare contact patch is heard on top of the modal
  // bank in the synthesised fallback. Left unbounded, a fitting pass pushed it
  // to 2.9 on ten materials because raising the click was a cheaper way to hit
  // a band target than balancing the modes, and every one of those played as a
  // click with the floor buried underneath it.
  const source=fs.readFileSync('dist/src/audio.js','utf8');
  for(const match of source.matchAll(/(\w+)\s*:\s*\{duration:[^}]*?direct:([\d.]+)/gs)){
    const value=Number(match[2]);
    assert.ok(value<=.3,`${match[1]} has direct:${value}; above about .3 it is a click, not a surface`);
  }
});
