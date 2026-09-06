import * as THREE from '../vendor/three.module.js';
import { SiloWorld } from './world.js';
import { CharacterBody } from './physics.js';
import { LEVELS, LANDMARKS, SPECIALS, SOURCES, SILO, TAU, TYPE_NAMES, levelY, roomType, roomsForLevel, zoneFor } from './data.js';
import { SiloAudio } from './audio.js';
import { Rendering, makeEnvironment } from './rendering.js';
import { topLocal } from './surface.js';

const $=id=>document.getElementById(id),canvas=$('world'),welcome=$('welcome'),directory=$('directory'),settings=$('settings'),about=$('about');
const dialogs=[welcome,directory,settings,about],coarse=matchMedia('(pointer:coarse)').matches;
let ready=false,started=false,renderer,world,outsideTarget,interaction=null,traveling=false,showAll=true,lastHUD=0,lastScreen=null,toastTimer,rendering,cleanWasRunning=false;
let yaw=Math.PI/2,pitch=0,lookSensitivity=1,running=false,torchOn=false,quality='balanced';
const body=new CharacterBody({radius:.3,standHeight:1.78,stepHeight:.3}),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.08,2300),audio=new SiloAudio();
const keys=new Set(),stick={x:0,y:0},desired=new THREE.Vector3(),direction=new THREE.Vector3(),clock=new THREE.Clock();
camera.rotation.order='YXZ';
const torch=new THREE.SpotLight(0xffe7b4,65,40,.5,.7,1.6);torch.visible=false;scene.add(torch,torch.target);
const saved=(()=>{try{return JSON.parse(localStorage.getItem('silo18-settings')||'{}');}catch{return {};}})();
const paused=()=>dialogs.some(d=>d.open)||!started||traveling;
function notify(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4600);}
function syncPause(){document.body.classList.toggle('paused',paused());$('hud').classList.toggle('hidden',welcome.open);keys.clear();stick.x=stick.y=0;$('joystick').firstElementChild.style.transform='';if(paused()&&document.pointerLockElement)document.exitPointerLock();}
function openDialog(d){for(const x of dialogs)if(x.open)x.close();d.showModal();syncPause();}
function closeDialog(d){d.close();if(!started&&d!==welcome)welcome.showModal();syncPause();}
function saveSettings(){try{localStorage.setItem('silo18-settings',JSON.stringify({brightness:$('brightness').value,sensitivity:$('sensitivity').value,quality,sound:$('sound').checked,reduceMotion:$('reduceMotion').checked}));}catch{}}
function updateSettings(){
  if(renderer)renderer.toneMappingExposure=Number($('brightness').value)/100;
  $('brightnessValue').textContent=`${$('brightness').value}%`;$('sensitivityValue').textContent=`${$('sensitivity').value}%`;lookSensitivity=Number($('sensitivity').value)/100;
  audio.setEnabled($('sound').checked);quality=$('quality').value;
  if(renderer){renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='high'?2:quality==='low'?1:1.5));renderer.setSize(innerWidth,innerHeight,false);renderer.shadowMap.enabled=quality!=='low';if(world){world.quality=quality;world.keyLight.castShadow=quality!=='low';}if(rendering){rendering.enabled=quality!=='low';rendering.resize();rendering.material.uniforms.strength.value=quality==='high'?.38:.24;}}
  saveSettings();
}
function renderDirectory(){
  const query=$('search').value.trim().toLowerCase(),items=showAll?LEVELS:LANDMARKS;const target=$('locationList');target.replaceChildren();
  const selected=items.filter(i=>`${i.level} ${i.name} ${i.type} ${i.zone||''} ${roomsForLevel(i.level).map(r=>r.name).join(' ')}`.toLowerCase().includes(query));
  let lastZone='';
  const addItem=(item,special=false)=>{
    const zone=special?'BENEATH & BEYOND':item.level<50?'UP TOP · 001–049':item.level<=100?'THE MIDS · 050–100':'DOWN DEEP · 101–144';
    if(lastZone!==zone){const div=document.createElement('div');div.className='zone-divider';div.textContent=zone;target.append(div);lastZone=zone;}
    const button=document.createElement('button');button.className='location-item';
    const n=document.createElement('span');n.className='location-number';n.textContent=special?'↓':String(item.level).padStart(3,'0');
    const copy=document.createElement('span');copy.className='location-copy';const title=document.createElement('strong');title.textContent=item.name;const sub=document.createElement('small');sub.textContent=special?item.description:`6 enterable wings · ${item.placement}`;
    copy.append(title,sub);const arrow=document.createElement('span');arrow.textContent='↗';button.append(n,copy,arrow);button.addEventListener('click',()=>travel(special?item.id:item.level));target.append(button);
    if(!special){const rooms=document.createElement('div');rooms.className='room-links';for(const room of roomsForLevel(item.level)){const b=document.createElement('button');b.textContent=`${String.fromCharCode(65+room.wing)} · ${room.name.toLowerCase()}`;b.addEventListener('click',()=>travel(room.id));rooms.append(b);}target.append(rooms);}
  };
  selected.forEach(i=>addItem(i));
  for(const i of SPECIALS.filter(i=>!query||`${i.name} ${i.type}`.toLowerCase().includes(query)))addItem(i,true);
  if(!target.children.length){const p=document.createElement('p');p.className='help';p.textContent='No matching locations. Try a level number or department.';target.append(p);}
}
function setDirectoryMode(all){showAll=all;for(const [id,active]of [['allLevelsTab',all],['landmarksTab',!all]]){$(id).classList.toggle('active',active);$(id).setAttribute('aria-selected',String(active));}renderDirectory();}

async function travel(id){
  if(!ready||traveling)return;
  const dest=world.destination(id);if(!Number.isInteger(dest.level)||dest.level<1||dest.level>144)return;
  traveling=true;for(const d of dialogs)if(d.open)d.close();syncPause();$('fade').classList.add('show');
  await new Promise(r=>setTimeout(r,240));
  world.setLevel(dest.level,dest.special||null);body.teleport(dest.position.x,dest.position.y,dest.position.z);yaw=dest.yaw;pitch=0;started=true;audio.start();
  await new Promise(r=>requestAnimationFrame(r));
  $('fade').classList.remove('show');traveling=false;syncPause();updateHUD();
  const name=SPECIALS.find(s=>s.id===id)?.name||(typeof id==='string'&&id.startsWith('room:')?`${LEVELS[dest.level-1].name} · Wing ${String.fromCharCode(65+Number(id.split(':')[2]))}`:LEVELS[dest.level-1].name);notify(name);canvas.focus();
}
function begin(){if(!ready)return;started=true;welcome.close();syncPause();audio.start();canvas.focus();notify(coarse?'Left stick to walk. Drag on the right to look.':'WASD to move. Drag to look, or click to capture the mouse.');}
function updateHUD(){
  if(!world)return;
  const n=world.activeLevel,data=LEVELS[n-1],r=Math.hypot(body.position.x,body.position.z),wing=Math.round(Math.atan2(body.position.z,body.position.x)/TAU*6+6)%6;
  let name=r<SILO.stairRadius+.6?'The central staircase':r<SILO.deckOuter?'The gallery':TYPE_NAMES[roomType(n,wing)].toLowerCase();name=name[0].toUpperCase()+name.slice(1);
  if(n===1&&!world.special){const p=topLocal(body.position);if(p.z>=108)name='Surface · exterior camera';else if(p.z>=64)name='Cleaning ramp';else if(p.z>=54)name='Cleaning airlock';else if(p.z>=44&&p.x>14)name='Holding 3 & preparation';else if(p.x>18&&p.z>24)name='Sheriff’s station';else if(wing===0&&r>SILO.deckOuter)name='Cafeteria · outside screen';}
  if(n!==1&&!world.special&&r>=52)name='Service gallery · connecting wings';
  if(world.special)name=SPECIALS.find(x=>x.id===world.special)?.name||name;
  $('zone').textContent=world.outside?'THE SURFACE':world.special?'LOWER ACCESS':data.zone;$('levelLabel').textContent=world.outside?'OUTSIDE':world.special?'BELOW MECHANICAL':`LEVEL ${String(n).padStart(3,'0')}`;$('locationName').textContent=name;
  $('depthLabel').textContent=`${Math.max(0,Math.round(levelY(1)-body.position.y)).toLocaleString()} m below the upper landing`;$('depthMarker').style.top=`${(n-1)/143*94}%`;
  $('modeLabel').textContent=running?'RUNNING':'ON FOOT';audio.setLocation(world.outside?'surface':world.special||roomType(n,wing));
}
const inspectionText={
  generator:'Six removable panels protect the turbine. The rear panel is held open for inspection; the rotor, gantry and crane can be seen around the housing.',
  water:'Filter vessels, treatment lines and pump controls keep water circulating through the silo. This department is associated with Level 55.',
  vault:'The Head of IT’s restricted space. The computer and vault interiors are a reconstruction of the television setting.',
  surveillance:'The concealed observation room watches the residences. Its exact floor plan is reconstructed.',
  workshop:'Salvaged electronics, analogue test equipment and spare parts. Almost everything here has to be repaired and used again.',
  airlock:'Cycle the inner door, enter the chamber, then cycle the outer door. The other door closes before the selected door opens. The ramp leads up to the surface.',
  chute:'The refuse chute carries discarded material down for recovery. It is not a passenger route.',
  mines:'An inferred mining working with ore carts, timber supports and a rock drill. A complete filmed mine plan was not available in the sources.',
  tunnel:'A sealed lower passage beneath the silo. This build does not invent an open route into another silo.',
};
function use(){if(!interaction||paused())return;audio.click();if(interaction.action==='clean-camera'){world.surface.beginCleaning();notify('Cleaning the camera lens. The cafeteria feed clears as you wipe.');return;}if(interaction.action?.startsWith('airlock-')){world.cycleAirlock(interaction.action.slice(8));return;}if(interaction.door){interaction.door.open=!interaction.door.open;}else if(interaction.destination!==undefined){travel(interaction.destination);}else notify(inspectionText[interaction.action]||interaction.label);}
function toggleTorch(){torchOn=!torchOn;torch.visible=torchOn;$('torchButton').classList.toggle('active',torchOn);$('torchButton').setAttribute('aria-pressed',String(torchOn));}

for(const d of dialogs){d.addEventListener('cancel',e=>{e.preventDefault();if(d===welcome&&ready){if(started){d.close();syncPause();}else begin();}else closeDialog(d);});d.querySelector('[data-close]')?.addEventListener('click',()=>closeDialog(d));}
$('enterButton').addEventListener('click',begin);$('home').addEventListener('click',()=>{if(started){$('enterButton').textContent='Resume exploration';}openDialog(welcome);});
for(const id of ['directoryButton','welcomeDirectory'])$(id).addEventListener('click',()=>{renderDirectory();openDialog(directory);});
$('settingsButton').addEventListener('click',()=>openDialog(settings));$('aboutButton').addEventListener('click',()=>openDialog(about));
for(const button of document.querySelectorAll('[data-travel]'))button.addEventListener('click',()=>travel(button.dataset.travel));
$('landmarksTab').addEventListener('click',()=>setDirectoryMode(false));$('allLevelsTab').addEventListener('click',()=>setDirectoryMode(true));$('search').addEventListener('input',renderDirectory);
$('interaction').addEventListener('click',use);$('touchUse').addEventListener('click',use);$('runButton').addEventListener('click',()=>{running=!running;$('runButton').classList.toggle('active',running);});$('torchButton').addEventListener('click',toggleTorch);
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement){await document.exitFullscreen();}else if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen();}else notify('Use your browser’s fullscreen option on this device.');}catch{notify('Fullscreen is not available in this browser.');}});
$('resetPosition').addEventListener('click',()=>travel(world.special||world.activeLevel));
for(const id of ['brightness','sensitivity','quality','sound','reduceMotion']){if(saved[id]!==undefined){if(typeof saved[id]==='boolean')$(id).checked=saved[id];else $(id).value=saved[id];}$(id).addEventListener('input',updateSettings);}
if(saved.reduceMotion===undefined)$('reduceMotion').checked=matchMedia('(prefers-reduced-motion:reduce)').matches;
for(const source of SOURCES){const a=document.createElement('a');a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=source.title;const small=document.createElement('small');small.textContent=source.note;$('sources').append(a,small);}

addEventListener('keydown',e=>{
  if(e.target.matches('input,select,textarea'))return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
  if(e.repeat){keys.add(e.code);return;}
  if(e.code==='KeyM'){if(directory.open)closeDialog(directory);else{renderDirectory();openDialog(directory);}return;}
  if(paused())return;
  keys.add(e.code);if(e.code==='KeyE')use();if(e.code==='KeyF')toggleTorch();
  if(e.code==='Escape')openDialog(welcome);
});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();stick.x=stick.y=0;});
document.addEventListener('visibilitychange',()=>{keys.clear();stick.x=stick.y=0;if(document.hidden&&audio.context)audio.context.suspend().catch(()=>{});else if(started&&!paused())audio.start();});

let lookPointer=null,lookStart=null,lookTravel=0;
canvas.addEventListener('pointerdown',e=>{if(paused())return;if(e.pointerType==='touch'&&e.clientX<innerWidth*.32)return;lookPointer=e.pointerId;lookStart={x:e.clientX,y:e.clientY};lookTravel=0;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{
  if(paused())return;
  let dx=0,dy=0;
  if(document.pointerLockElement===canvas){dx=e.movementX;dy=e.movementY;}
  else if(e.pointerId===lookPointer&&lookStart){dx=e.clientX-lookStart.x;dy=e.clientY-lookStart.y;lookStart={x:e.clientX,y:e.clientY};lookTravel+=Math.abs(dx)+Math.abs(dy);}else return;
  yaw-=THREE.MathUtils.clamp(dx,-200,200)*.003*lookSensitivity;pitch-=THREE.MathUtils.clamp(dy,-200,200)*.0025*lookSensitivity;pitch=THREE.MathUtils.clamp(pitch,-1.48,1.48);
});
const finishLook=e=>{if(e.pointerId!==lookPointer)return;if(e.type==='pointerup'&&e.pointerType==='mouse'&&lookTravel<4&&!document.pointerLockElement&&!paused()){try{canvas.requestPointerLock()?.catch(()=>{});}catch{}}lookPointer=null;lookStart=null;};
canvas.addEventListener('pointerup',finishLook);canvas.addEventListener('pointercancel',finishLook);canvas.addEventListener('lostpointercapture',()=>{lookPointer=null;lookStart=null;});
let movePointer=null;
const joystick=$('joystick');
function moveStick(e){if(movePointer!==e.pointerId)return;const r=joystick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,range=r.width*.36,len=Math.hypot(dx,dy),scale=len>range?range/len:1;stick.x=dx*scale/range;stick.y=dy*scale/range;joystick.firstElementChild.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;}
joystick.addEventListener('pointerdown',e=>{if(paused())return;e.preventDefault();movePointer=e.pointerId;joystick.setPointerCapture(e.pointerId);moveStick(e);});joystick.addEventListener('pointermove',moveStick);
const releaseStick=e=>{if(e.pointerId!==movePointer)return;movePointer=null;stick.x=stick.y=0;joystick.firstElementChild.style.transform='';};for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,releaseStick);

function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer?.setSize(innerWidth,innerHeight,false);rendering?.resize();}addEventListener('resize',resize);
function fatal(error){console.error(error);for(const d of dialogs)if(d.open)d.close();$('fatal').hidden=false;$('fatalText').textContent=`${error.message||error}. Try refreshing, or use a browser with WebGL 2 enabled.`;}

function frame(){
  requestAnimationFrame(frame);if(!renderer||!world)return;
  const dt=Math.min(clock.getDelta(),.05),time=performance.now()*.001;
  if(!paused()){
    const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-stick.y;
    const right=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+stick.x;
    const speed=(running||keys.has('ShiftLeft')||keys.has('ShiftRight'))?5.8:3.2;
    desired.set(-Math.sin(yaw)*forward+Math.cos(yaw)*right,0,-Math.cos(yaw)*forward-Math.sin(yaw)*right);if(desired.length()>1)desired.normalize();desired.multiplyScalar(speed);
    // Bound movement substeps prevent thin rail/door tunneling after slow frames.
    const count=Math.max(1,Math.ceil(dt/(1/120)));for(let i=0;i<count;i++)body.step(dt/count,desired,world.colliders);
    if(body.position.y<2&&!world.special){const p=world.spawn(world.activeLevel);body.teleport(p.x,p.y,p.z);notify('Returned to the nearest safe landing.');}
    const bob=$('reduceMotion').checked?0:Math.sin(body.distanceWalked*8)*.018*Math.min(1,body.horizontalSpeed);
    camera.position.copy(body.position);camera.position.y+=body.eyeHeight+bob;camera.rotation.set(pitch,yaw,0,'YXZ');
    world.update(dt,body.position);camera.getWorldDirection(direction);interaction=world.nearestInteraction(camera.position,direction);$('interaction').hidden=!interaction;if(interaction)$('interaction').lastElementChild.textContent=interaction.label;
    $('touchUse').style.opacity=interaction?'1':'.4';audio.step(body.distanceWalked,body.horizontalSpeed);
  }else if(!started){
    const top=levelY(1);camera.position.set(21,top+3.4,5);camera.lookAt(-1,top-5,-1);world.update(dt,new THREE.Vector3(21,top,5));
  }else{world.update(dt,body.position);}
  if(time-lastHUD>.25){updateHUD();lastHUD=time;}
  world.surface.renderFeed(renderer,time);
  if(cleanWasRunning&&!world.surface.cleaning)notify('Camera lens clean. The outside view is clear on the cafeteria screens.');cleanWasRunning=world.surface.cleaning;
  if(outsideTarget&&lastScreen!==world.screens[0]){for(const screen of world.screens){screen.material.map=outsideTarget.texture;screen.material.color.setHex(0xffffff);screen.material.needsUpdate=true;}lastScreen=world.screens[0];}
  torch.position.copy(camera.position);camera.getWorldDirection(direction);torch.target.position.copy(camera.position).addScaledVector(direction,15);torch.visible=torchOn&&started;
  rendering.render(scene,camera);
}

async function boot(){
  welcome.showModal();syncPause();
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:!coarse,alpha:false,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.setClearColor(0x111b17);updateSettings();resize();
    world=new SiloWorld(scene);rendering=new Rendering(renderer);makeEnvironment(renderer,scene);updateSettings();
    await world.loadAssets(progress=>{$('enterButton').textContent=`Preparing the silo · ${Math.round(progress*100)}%`;});
    world.setLevel(1);body.teleport(20.6,levelY(1),0);world.update(0,body.position);
    outsideTarget=world.surface.initFeed(renderer);renderer.compile(scene,camera);setDirectoryMode(true);
    ready=true;$('enterButton').disabled=false;$('enterButton').textContent='Enter Silo 18';
    if(world.materialFailures)notify('Some surface materials could not load. Refresh to retry.');
    if(world.assetFailures)notify('Some Lost Signal props could not load. The complete architectural reconstruction is still available.');
    frame();
  }catch(error){fatal(error);}
}
boot();
