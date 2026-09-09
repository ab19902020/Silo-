import * as THREE from '../vendor/three.module.js';
import { SiloWorld } from './world.js';
import { CharacterBody } from './physics.js';
import { LEVELS, LANDMARKS, SPECIALS, SOURCES, SILO, TAU, TYPE_NAMES, levelY, roomType, roomsForLevel, zoneFor } from './data.js';
import { SiloAudio } from './audio.js';
import { Rendering, makeEnvironment } from './rendering.js';
import { topLocal, topPoint, groundY } from './surface.js';
import { CharacterCast, PLAYABLE_CHARACTERS } from './characters.js';
import { LadderClimb } from './climbing.js';
import { Population } from './population.js';
import { CafeteriaOpening, CAFETERIA_START } from './opening.js';
import { conversationFor, ALGORITHM } from './conversations.js';
import { RESIDENT_CAST } from './resident-data.js';
import { Story, COLLECTABLES, RELICS } from './story.js';
import { StoryProps, Drone } from './relics.js';

const $=id=>document.getElementById(id),canvas=$('world'),welcome=$('welcome'),directory=$('directory'),settings=$('settings'),about=$('about'),characters=$('characters'),relic=$('relic'),conversation=$('conversation'),satchel=$('satchel');
const dialogs=[welcome,directory,settings,about,characters,relic,conversation,satchel],coarse=matchMedia('(pointer:coarse)').matches;
let ready=false,started=false,renderer,world,outsideTarget,interaction=null,traveling=false,showAll=true,lastHUD=0,lastScreen=null,toastTimer,rendering,cleanWasRunning=false,cast,population,opening,crowdSoundTime=0;
let hudOpen=false,touchUntil=0,chapterUntil=0,lastOpeningState=null;
let story=null,props=null,drone=null,wasOutside=false,lastChapter=null;
let yaw=Math.PI/2,pitch=0,lookSensitivity=1,running=false,torchOn=false,quality='balanced';
const body=new CharacterBody({radius:.3,standHeight:1.78,stepHeight:.3}),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.08,2300),audio=new SiloAudio();
const keys=new Set(),stick={x:0,y:0},desired=new THREE.Vector3(),direction=new THREE.Vector3(),clock=new THREE.Clock();
camera.rotation.order='YXZ';
const torch=new THREE.SpotLight(0xffe7b4,65,40,.5,.7,1.6);torch.visible=false;scene.add(torch,torch.target);
const saved=(()=>{try{return JSON.parse(localStorage.getItem('silo18-settings')||'{}');}catch{return {};}})();
const openingComplete=(()=>{try{return localStorage.getItem('silo18-opening-complete')==='1';}catch{return false;}})();
const savedStory=(()=>{try{return JSON.parse(localStorage.getItem('silo18-story')||'null');}catch{return null;}})();
function saveStory(){try{localStorage.setItem('silo18-story',JSON.stringify(story.save()));}catch{}}
const paused=()=>dialogs.some(d=>d.open)||!started||traveling;
function notify(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4600);}
function revealControls(){touchUntil=performance.now()+3500;}
function toggleControls(){hudOpen=!hudOpen;document.body.classList.toggle('hud-open',hudOpen);$('controlsButton').setAttribute('aria-expanded',String(hudOpen));revealControls();}
function updateInterface(time){
  if(hudOpen&&(body.horizontalSpeed>.12||opening?.focus&&time*1000>touchUntil)){hudOpen=false;document.body.classList.remove('hud-open');$('controlsButton').setAttribute('aria-expanded','false');}
  document.body.classList.toggle('playing',started&&!paused());document.body.classList.toggle('touch-awake',time*1000<touchUntil||body.horizontalSpeed>.12);
  $('chapterHud').hidden=paused()||opening?.watching||time*1000>chapterUntil;
  $('controlsButton').hidden=!started||paused();
  document.body.classList.toggle('screen-focused',!!opening?.focus);
}
function startConversation(person){
  const text=person===ALGORITHM?person:conversationFor(person,{cleaned:opening.directoryReady,playerName:cast.active.definition.name});$('speakerName').textContent=text.name;$('speakerRole').textContent=text.role;$('dialogueLine').textContent=text.greeting;$('dialogueChoices').replaceChildren();
  for(const topic of text.topics){const b=document.createElement('button');b.textContent=topic.label;b.addEventListener('click',()=>{$('dialogueLine').textContent=topic.reply;for(const other of $('dialogueChoices').children)other.setAttribute('aria-pressed',String(other===b));});$('dialogueChoices').append(b);}
  audio.click();openDialog(conversation);
}
function syncPause(){document.body.classList.toggle('paused',paused());$('hud').classList.toggle('hidden',welcome.open);keys.clear();stick.x=stick.y=0;$('joystick').firstElementChild.style.transform='';if(paused()&&document.pointerLockElement)document.exitPointerLock();}
function openDialog(d){hudOpen=false;document.body.classList.remove('hud-open');$('controlsButton').setAttribute('aria-expanded','false');for(const x of dialogs)if(x.open)x.close();d.showModal();syncPause();}
function closeDialog(d){d.close();if(!started&&d!==welcome)welcome.showModal();syncPause();if(started)canvas.focus();}
function saveSettings(){try{localStorage.setItem('silo18-settings',JSON.stringify({brightness:$('brightness').value,sensitivity:$('sensitivity').value,quality,timeOfDay:$('timeOfDay').value,sound:$('sound').checked,music:$('music').value,reduceMotion:$('reduceMotion').checked,character:cast?.selected||saved.character||'juliette',thirdPerson:cast?.thirdPerson??saved.thirdPerson??true}));}catch{}}
function updateSettings(){
  if(renderer)renderer.toneMappingExposure=Number($('brightness').value)/100;
  $('brightnessValue').textContent=`${$('brightness').value}%`;$('sensitivityValue').textContent=`${$('sensitivity').value}%`;lookSensitivity=Number($('sensitivity').value)/100;
  $('musicValue').textContent=`${$('music').value}%`;audio.setEnabled($('sound').checked);audio.setMusicVolume(Number($('music').value)/100);quality=$('quality').value;if(world)world.surface.setTimeOfDay($('timeOfDay').value);
  if(renderer){renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='high'?2:quality==='low'?1:1.5));renderer.setSize(innerWidth,innerHeight,false);renderer.shadowMap.enabled=quality!=='low';if(world){world.quality=quality;world.keyLight.castShadow=quality!=='low';world.underground.waterSurface.setQuality(quality);world.surface.setQuality(quality);}if(rendering){rendering.enabled=true;rendering.setQuality(quality);rendering.resize();}}
  saveSettings();
}
function syncCharacterUI(){
  if(!cast)return;const active=cast.active.definition;$('characterStatus').textContent=`Playing as ${active.name}`;$('viewButton').textContent=cast.thirdPerson?'View: third person':'View: first person';
  for(const b of $('characterList').children){const chosen=b.dataset.character===cast.selected;b.setAttribute('aria-pressed',String(chosen));b.querySelector('.selection-label').textContent=chosen?'SELECTED':'PLAY AS THIS CHARACTER';}
}
function chooseCharacter(id){if(!cast?.select(id))return;const height=cast.active.definition.height;body.standHeight=height;body.height=height;cast.active.heading=yaw+Math.PI;if(population)population.rebalance=0;syncCharacterUI();saveSettings();closeDialog(characters);notify(`Playing as ${cast.active.definition.name}`);}
function toggleView(){if(!cast)return;cast.thirdPerson=!cast.thirdPerson;syncCharacterUI();saveSettings();}
function renderCharacters(){
  $('characterList').replaceChildren();for(const c of PLAYABLE_CHARACTERS){const b=document.createElement('button');b.className='character-card'+(c.generated?' resident-card':'');b.dataset.character=c.id;b.setAttribute('aria-pressed','false');if(!c.generated){const im=document.createElement('img');im.src=`./assets/characters/${c.id}.jpg`;im.alt=c.name;b.append(im);}const copy=document.createElement('span');copy.className='character-copy';const name=document.createElement('strong');name.textContent=c.name;const role=document.createElement('small');role.textContent=c.role;const place=document.createElement('small');place.textContent=`Level ${String(c.level).padStart(3,'0')} · ${c.place}`;const label=document.createElement('span');label.className='selection-label';copy.append(name,role,place,label);b.append(copy);b.addEventListener('click',()=>chooseCharacter(c.id));$('characterList').append(b);}syncCharacterUI();
}
// The soundtrack belongs to the story. Nothing plays while you are looking for
// the book: the cafeteria is quiet, the way the room is quiet in the show. The
// opening piece — the cleaning speech, turning into the score — starts on the
// frame the book is picked up, and the scene is cut against it. When it ends,
// ten and a half minutes later, the looping bed takes over for good. Anyone who
// skips, or has already seen the opening, just gets the bed from the top.
function syncMusicGate(){
  if(!opening)return;
  if(opening.state==='find-book'){audio.holdMusic();audio.stopMusic?.();audio.stopOpeningTheme?.();}
  else audio.releaseMusic?.();
}
// The objective panel belongs to the story once the opening has handed over.
function showObjective(title,text,linger=7000){
  $('chapterTitle').textContent=title;$('chapterObjective').textContent=text;
  chapterUntil=performance.now()+linger;$('chapterHud').hidden=false;
}
function syncStoryHud(force=false){
  if(!story)return;
  $('satchelButton').hidden=!story.story||story.held.size===0;
  document.body.classList.toggle('armed',!!(story.armed&&drone?.active));
  $('fireButton').hidden=!(story.armed&&drone?.active&&coarse);
  $('crosshair').hidden=!(story.armed&&drone?.active);
  if(!story.story)return;
  if(force||lastChapter!==story.chapter){
    lastChapter=story.chapter;
    showObjective(story.chapterInfo.title,story.objective,force?7000:9000);
    saveStory();
  }
}
function renderSatchel(){
  const held=COLLECTABLES.filter(c=>story.has(c.id));
  $('satchelCount').textContent=held.length?`${held.length} OF ${COLLECTABLES.length} · ${RELICS.filter(r=>story.has(r.id)).length} RELICS`:'NOTHING YET';
  const list=$('satchelList');list.replaceChildren();
  for(const item of COLLECTABLES){
    const has=story.has(item.id),row=document.createElement('div');row.className='satchel-item';
    const tick=document.createElement('span');tick.className='tick';tick.textContent=has?'✓':'·';
    const copy=document.createElement('div');
    const h=document.createElement('h3');h.textContent=has?item.name:'—';
    const p=document.createElement('p');p.textContent=has?item.blurb:'Not found yet.';
    copy.append(h,p);
    if(has){const src=document.createElement('p');src.className='src';src.textContent=item.source;copy.append(src);}
    row.append(tick,copy);list.append(row);
  }
}
function takeRelic(id){
  const item=story.take(id);
  if(!item)return;
  audio.click();saveStory();
  showObjective(item.name,item.blurb,9000);
  notify(story.story?story.objective:`${item.name} — in your satchel.`);
  if(id==='suit')notify('The suit is on. The airlock will let you through now.');
  if(id==='shotgun')notify('Loaded. Whatever comes over the crest, do not let it get close.');
  syncStoryHud(true);
}
function openingChanged(state){
  syncMusicGate();
  // Picking the book up used to snap the camera into the screen. You are in a
  // room full of people watching a cleaning; you stay in it, free to look
  // around and walk, and Focus on screen is there if you want the whole wall.
  const watching=state==='watch',reading=state==='read-book';chapterUntil=performance.now()+(state==='find-book'?6500:reading?5000:0);if(watching&&lastOpeningState!=='watch'){hudOpen=false;document.body.classList.remove('hud-open');}lastOpeningState=state;
  $('chapterHud').hidden=state==='explore';$('chapterTitle').textContent=state==='find-book'?'A book on the table':watching?'Holston’s cleaning':'The room falls quiet';
  $('chapterObjective').textContent=state==='find-book'?'The directory book is on the table in front of you.':watching?'Holston is outside. Watch from the room, or focus on the screen.':'Your directory is ready.';
  $('focusScreenButton').hidden=!watching;$('skipOpening').hidden=!watching;$('openBookButton').hidden=!reading;
  $('focusScreenButton').textContent=opening?.focus?'Back to cafeteria':'Focus on screen';
  document.body.classList.toggle('screen-focused',!!opening?.focus);
  if(reading||state==='explore')try{localStorage.setItem('silo18-opening-complete','1');}catch{}
}
function requestDirectory(){
  if(story?.story&&opening?.directoryReady)story.beginSearch();
  if(!opening?.directoryReady){notify(opening?.watching?'Holston is outside. The book opens after the cleaning.':'Find the book on the cafeteria table first.');return;}
  opening.openBook();renderDirectory();openDialog(directory);
}
function replayOpening(){
  if(!ready)return;for(const d of dialogs)if(d.open)d.close();world.setLevel(1);const p=topPoint(...CAFETERIA_START);body.teleport(p.x,p.y,p.z);yaw=-Math.PI/2;pitch=-.06;running=false;opening.reset();population.load(1);started=true;audio.start();syncPause();canvas.focus();
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
  if(opening&&!opening.directoryReady)opening.finish();if(opening)opening.focus=false;
  traveling=true;audio.start();audio.travel();for(const d of dialogs)if(d.open)d.close();syncPause();$('fade').classList.add('show');
  await new Promise(r=>setTimeout(r,240));
  world.setLevel(dest.level,dest.special||null);body.teleport(dest.position.x,dest.position.y,dest.position.z);yaw=dest.yaw;pitch=0;started=true;audio.start();
  await new Promise(r=>requestAnimationFrame(r));
  $('fade').classList.remove('show');traveling=false;syncPause();updateHUD();
  const name=SPECIALS.find(s=>s.id===id)?.name||(typeof id==='string'&&id.startsWith('room:')?`${LEVELS[dest.level-1].name} · Wing ${String.fromCharCode(65+Number(id.split(':')[2]))}`:LEVELS[dest.level-1].name);notify(name);canvas.focus();
}
// Stepping out of the airlock. Without a suit you are stopped at the lip; with
// one, something launches from over the crest and comes to look at you.
function stepOutside(eye){
  const outside=world.outside;
  if(outside&&!wasOutside){
    const verdict=story.steppedOutside();
    if(verdict?.stop){
      notify(verdict.message);
      const back=world.destination('airlock');body.teleport(back.position.x,back.position.y,back.position.z);
      wasOutside=false;return;
    }
    if(verdict?.drone){
      const from=topPoint(60,groundY(60,40)+16,40);
      drone.launch(from);audio.travel?.();
      syncStoryHud(true);
      notify(story.armed?'Something has come over the crest. Put it down.':'Something has come over the crest, and you have nothing to answer it with.');
    }
  }
  if(!outside&&drone.active&&story.chapter==='drone'){drone.reset();story.killedByDrone();syncStoryHud(true);}
  wasOutside=outside;
}
function droneKill(){
  drone.reset();story.killedByDrone();saveStory();
  const back=world.destination('airlock');
  world.setLevel(back.level);body.teleport(back.position.x,back.position.y,back.position.z);yaw=back.yaw;
  syncStoryHud(true);
  notify('It fired. You woke on the airlock floor with the taste of blood in your mouth — go back out armed.');
}
function fire(){
  if(!story?.armed||!drone?.active||paused())return;
  audio.click();
  const eye=body.position.clone();eye.y+=body.eyeHeight;camera.getWorldDirection(direction);
  const floor=world.colliders.floorAt(drone.group.position.x,drone.group.position.z,.4,drone.group.position.y)||body.position.y;
  if(drone.shoot(eye,direction.clone(),floor))notify('Hit. It is coming down.');
  else notify('You are firing at the sky. Let it come closer.');
}
function begin(mode){
  if(!ready)return;
  if(mode){
    story=new Story(mode);world.story=story;lastChapter=null;drone?.reset();
    if(mode==='story'&&opening.state!=='find-book')opening.reset();
    if(mode==='explore'&&opening.state==='find-book')opening.finish();
    saveStory();
  }
  started=true;welcome.close();syncPause();audio.start();syncMusicGate();canvas.focus();openingChanged(opening.state);syncStoryHud(true);
  notify(story.story&&opening.state==='find-book'?'There’s a book on the table ahead. Approach it and press Use / E.'
    :coarse?'Left stick to walk. Drag on the right to look.':'WASD to move. Drag to look, or click to capture the mouse.');
}
function updateHUD(){
  if(!world)return;
  const n=world.activeLevel,data=LEVELS[n-1],r=Math.hypot(body.position.x,body.position.z),wing=Math.round(Math.atan2(body.position.z,body.position.x)/TAU*6+6)%6;
  let name=r<SILO.stairRadius+.6?'The central staircase':r<SILO.deckOuter?'The gallery':TYPE_NAMES[roomType(n,wing)].toLowerCase();name=name[0].toUpperCase()+name.slice(1);
  if(n===1&&!world.special){const p=topLocal(body.position);if(p.z>=108)name='Surface · exterior camera';else if(p.z>=64)name='Cleaning ramp';else if(p.z>=54)name='Cleaning airlock';else if(p.z>=44&&p.x>14)name='Holding 3 & preparation';else if(p.x>18&&p.z>24)name='Sheriff’s station';else if(wing===0&&r>SILO.deckOuter)name='Cafeteria · outside screen';}
  if(n!==1&&!world.special&&r>=52)name='Service gallery · connecting wings';
  if(world.special)name=SPECIALS.find(x=>x.id===world.special)?.name||name;
  if(world.special==='excavator'||world.special==='tunnel'){
    const p=world.underground.tunnel.worldToLocal(body.position.clone());
    name=p.z>0&&p.z<36&&Math.abs(p.x)<2.6?'The hidden tunnel':'The excavator & void';
    if(body.climbing)name='Ladder to the water';
  }
  $('zone').textContent=world.outside?'THE SURFACE':world.special?'LOWER ACCESS':data.zone;$('levelLabel').textContent=world.outside?'OUTSIDE':world.special?'BELOW MECHANICAL':`LEVEL ${String(n).padStart(3,'0')}`;$('locationName').textContent=name;
  $('depthLabel').textContent=`${Math.max(0,Math.round(levelY(1)-body.position.y)).toLocaleString()} m below the upper landing`;$('depthMarker').style.top=`${(n-1)/143*94}%`;
  $('modeLabel').textContent=`${cast?.active?.definition.short||'ON FOOT'}${body.climbing?' · CLIMBING':running?' · RUNNING':''}`;audio.setLocation(world.outside?'surface':world.special||roomType(n,wing));
}
const inspectionText={
  generator:'Six removable panels protect the turbine. The rear panel is held open for inspection; the rotor, gantry and crane can be seen around the housing.',
  water:'Filter vessels, treatment lines and pump controls keep water circulating through the silo. This department is associated with Level 55.',
  'it-servers':'The server room is behind this door and only IT opens it. Level 19 is the department’s floor in the published material; the room plan beyond that is inferred.',
  'head-of-it':'The Head of IT works apart from the floor, down the corridor from it. The desk, the shelved records and the motto are reconstructed.',
  'vault-radio':'A panel in the vault’s server steps that does not sit quite flush with the rest. Behind it is a radio set, and it is not tuned to anything inside this silo.',
  surveillance:'The concealed observation room watches the residences. Its exact floor plan is reconstructed.',
  workshop:'Salvaged electronics, analogue test equipment and spare parts. Almost everything here has to be repaired and used again.',
  airlock:'Cycle the inner door, enter the chamber, then cycle the outer door. The other door closes before the selected door opens. The ramp leads up to the surface.',
  chute:'The refuse chute carries discarded material down for recovery. It is not a passenger route.',
  mines:'An inferred mining working with ore carts, timber supports and a rock drill. A complete filmed mine plan was not available in the sources.',
  tunnel:'A sealed lower passage beneath the silo. This build does not invent an open route into another silo.',
  breach:'A routine bulkhead notice, screwed to newer blockwork than the wall around it. Whoever filled this opening in did not want it found, and whoever came after had already broken back through.',
  camp:'George and Juliette’s secluded hideout beside the excavation: a bed, a table and salvaged relics. The ladder outside the open side descends to the water. The room’s exact dimensions and position remain reconstructed from the available references.',
  relics:'Tins, bottles, books and wound cable carried down from the levels above and kept where a sweep would not find them. Possession of relics from before is an offence under the Pact.',
};
function use(){
  if(opening?.state==='read-book'&&!interaction&&!paused()){requestDirectory();return;}
  if(!interaction||paused()||body.climbing)return;
  if(interaction.action==='opening-book'){audio.click();audio.playOpeningTheme();opening.takeBook();return;}
  if(interaction.resident){startConversation(interaction.resident);return;}
  if(interaction.action==='algorithm'){startConversation(ALGORITHM);return;}
  if(interaction.ladder){
    const ladder=world.underground.ladders.find(l=>l.id===interaction.ladder);
    if(ladder&&LadderClimb.begin(body,ladder,interaction.up)){yaw=ladder.heading+Math.PI;pitch=0;notify(interaction.up?'Climbing back to the camp.':'Climbing down to the water.');}
    else notify('Move closer to the ladder.');
    return;
  }
  if(interaction.action==='hard-drive'){audio.click();if(story?.story&&!story.has('harddrive'))takeRelic('harddrive');else openDialog(relic);return;}
  if(interaction.action?.startsWith('relic:')){takeRelic(interaction.action.slice(6));return;}
  if(interaction.sealed){audio.click();notify(interaction.sealed.reason);return;}
  if(interaction.action==='clean-camera'){audio.click();world.surface.beginCleaning();notify('Cleaning the camera lens. The cafeteria feed clears as you wipe.');return;}
  if(interaction.action?.startsWith('airlock-')){audio.airlock();world.cycleAirlock(interaction.action.slice(8));return;}
  if(interaction.action==='breach'){
    world.openBreach();audio.door(true);
    notify('A broken opening was hidden behind the sign. Walk through it.');
    return;
  }
  if(interaction.door){interaction.door.open=!interaction.door.open;audio.door(interaction.door.open);}
  else if(interaction.destination!==undefined){audio.click();travel(interaction.destination);}
  else{audio.click();notify(inspectionText[interaction.action]||interaction.label);}
}
function toggleTorch(){torchOn=!torchOn;audio.torch(torchOn);torch.visible=torchOn;$('torchButton').classList.toggle('active',torchOn);$('torchButton').setAttribute('aria-pressed',String(torchOn));}

for(const d of dialogs){d.addEventListener('cancel',e=>{e.preventDefault();if(d===welcome&&ready){if(started){d.close();syncPause();}else begin(story?.mode||'story');}else closeDialog(d);});d.querySelector('[data-close]')?.addEventListener('click',()=>closeDialog(d));}
$('controlsButton').addEventListener('click',toggleControls);$('leaveConversation').addEventListener('click',()=>closeDialog(conversation));
addEventListener('pointerdown',revealControls,{passive:true});
$('enterButton').addEventListener('click',()=>begin('story'));
$('exploreButton').addEventListener('click',()=>begin('explore'));
$('satchelButton').addEventListener('click',()=>{renderSatchel();openDialog(satchel);});$('home').addEventListener('click',()=>{if(started){$('enterButton').textContent='Resume exploration';}openDialog(welcome);});
$('directoryButton').addEventListener('click',requestDirectory);
$('welcomeDirectory').addEventListener('click',()=>{if(!ready)return;opening.finish();opening.openBook();renderDirectory();openDialog(directory);});
$('replayOpening').addEventListener('click',replayOpening);
$('focusScreenButton').addEventListener('click',()=>{opening.focus=!opening.focus;$('focusScreenButton').textContent=opening.focus?'Back to cafeteria':'Focus on screen';document.body.classList.toggle('screen-focused',opening.focus);keys.clear();stick.x=stick.y=0;});
$('skipOpening').addEventListener('click',()=>opening.finish());$('openBookButton').addEventListener('click',requestDirectory);
$('characterButton').addEventListener('click',()=>{renderCharacters();openDialog(characters);});$('viewButton').addEventListener('click',toggleView);
$('settingsButton').addEventListener('click',()=>openDialog(settings));$('aboutButton').addEventListener('click',()=>openDialog(about));
for(const button of document.querySelectorAll('[data-travel]'))button.addEventListener('click',()=>travel(button.dataset.travel));
$('landmarksTab').addEventListener('click',()=>setDirectoryMode(false));$('allLevelsTab').addEventListener('click',()=>setDirectoryMode(true));$('search').addEventListener('input',renderDirectory);
$('fireButton').addEventListener('click',fire);
$('interaction').addEventListener('click',use);$('touchUse').addEventListener('click',use);$('jumpButton').addEventListener('click',()=>{jumpQueued=true;});$('runButton').addEventListener('click',()=>{running=!running;$('runButton').classList.toggle('active',running);});$('torchButton').addEventListener('click',toggleTorch);
$('fullscreen').addEventListener('click',async()=>{
  try{
    if(document.fullscreenElement){await document.exitFullscreen();return;}
    if(!document.documentElement.requestFullscreen){notify('Use your browser’s fullscreen option on this device.');return;}
    // Leave the panel before going fullscreen. A modal dialog and the
    // fullscreen element share the top layer, and the root can end up drawn
    // over the panel: still open, so the game stays paused and every touch
    // control stays hidden, with the close button no longer visible.
    if(settings.open)closeDialog(settings);
    await document.documentElement.requestFullscreen();
  }catch{notify('Fullscreen is not available in this browser.');}
});
// Entering or leaving fullscreen resizes the viewport and can strand a stale
// pause state or a captured pointer, which reads as the touch controls dying.
for(const event of ['fullscreenchange','webkitfullscreenchange'])addEventListener(event,()=>{
  lookPointer=lookStart=null;movePointer=null;stick.x=stick.y=0;
  $('joystick').firstElementChild.style.transform='';
  resize();syncPause();
  $('fullscreen').textContent=document.fullscreenElement?'Leave fullscreen':'Enter fullscreen';
});
$('resetPosition').addEventListener('click',()=>travel(world.special||world.activeLevel));
for(const id of ['brightness','sensitivity','quality','timeOfDay','sound','music','reduceMotion']){if(saved[id]!==undefined){if(typeof saved[id]==='boolean')$(id).checked=saved[id];else $(id).value=saved[id];}$(id).addEventListener('input',updateSettings);}
if(saved.reduceMotion===undefined)$('reduceMotion').checked=matchMedia('(prefers-reduced-motion:reduce)').matches;
for(const source of SOURCES){const a=document.createElement('a');a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=source.title;const small=document.createElement('small');small.textContent=source.note;$('sources').append(a,small);}

addEventListener('keydown',e=>{
  if(e.target.matches('input,select,textarea')||e.target.closest('dialog')||e.code==='Space'&&e.target.matches('button'))return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
  if(e.repeat){keys.add(e.code);return;}
  if(e.code==='KeyM'){if(directory.open)closeDialog(directory);else requestDirectory();return;}
  if(e.code==='KeyC'){if(characters.open)closeDialog(characters);else{renderCharacters();openDialog(characters);}return;}
  if(paused())return;
  if(e.code==='KeyH'){toggleControls();return;}
  if(opening.focus&&e.code==='Space'){e.preventDefault();toggleControls();return;}
  revealControls();
  if(e.code==='KeyV'){toggleView();return;}
  keys.add(e.code);if(e.code==='KeyE')use();if(e.code==='KeyF')toggleTorch();if(e.code==='Space')jumpQueued=true;if(e.code==='KeyG')fire();if(e.code==='KeyB'&&story?.story&&story.held.size){renderSatchel();openDialog(satchel);}
  if(e.code==='Escape')openDialog(welcome);
});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();stick.x=stick.y=0;});
document.addEventListener('visibilitychange',()=>{keys.clear();stick.x=stick.y=0;if(document.hidden&&audio.context)audio.context.suspend().catch(()=>{});else if(started&&!paused())audio.start();});

let lookPointer=null,lookStart=null,lookTravel=0,jumpQueued=false;
canvas.addEventListener('pointerdown',e=>{if(paused())return;if(opening.focus){toggleControls();return;}if(e.pointerType==='touch'&&e.clientX<innerWidth*.32)return;lookPointer=e.pointerId;lookStart={x:e.clientX,y:e.clientY};lookTravel=0;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{
  if(paused())return;
  let dx=0,dy=0;
  if(document.pointerLockElement===canvas){dx=e.movementX;dy=e.movementY;}
  else if(e.pointerId===lookPointer&&lookStart){dx=e.clientX-lookStart.x;dy=e.clientY-lookStart.y;lookStart={x:e.clientX,y:e.clientY};lookTravel+=Math.abs(dx)+Math.abs(dy);}else return;
  yaw-=THREE.MathUtils.clamp(dx,-200,200)*.003*lookSensitivity;pitch-=THREE.MathUtils.clamp(dy,-200,200)*.0025*lookSensitivity;pitch=THREE.MathUtils.clamp(pitch,-1.48,1.48);
});
const finishLook=e=>{
  if(e.pointerId!==lookPointer)return;
  // A click captures the mouse, as it always did — unless you are standing on
  // the hill with a loaded shotgun and something is circling you, in which case
  // a click is a trigger.
  if(e.type==='pointerup'&&e.pointerType==='mouse'&&lookTravel<4&&!paused()){
    if(document.pointerLockElement===canvas){if(story?.armed&&drone?.active)fire();}
    else try{canvas.requestPointerLock()?.catch(()=>{});}catch{}
  }
  lookPointer=null;lookStart=null;
};
canvas.addEventListener('pointerup',finishLook);canvas.addEventListener('pointercancel',finishLook);canvas.addEventListener('lostpointercapture',()=>{lookPointer=null;lookStart=null;});
let movePointer=null;
const joystick=$('joystick');
function moveStick(e){if(movePointer!==e.pointerId)return;const r=joystick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,range=r.width*.36,len=Math.hypot(dx,dy),scale=len>range?range/len:1;stick.x=dx*scale/range;stick.y=dy*scale/range;joystick.firstElementChild.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;}
joystick.addEventListener('pointerdown',e=>{if(paused())return;e.preventDefault();movePointer=e.pointerId;joystick.setPointerCapture(e.pointerId);moveStick(e);});joystick.addEventListener('pointermove',moveStick);
const releaseStick=e=>{if(e.pointerId!==movePointer)return;movePointer=null;stick.x=stick.y=0;joystick.firstElementChild.style.transform='';};for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,releaseStick);

// --- gamepad ---------------------------------------------------------------
// Standard mapping, which is what a DualShock 4, a DualSense and an Xbox pad
// all report over USB and Bluetooth in every current browser.
const PAD={CROSS:0,CIRCLE:1,SQUARE:2,TRIANGLE:3,L1:4,R1:5,L2:6,R2:7,SHARE:8,OPTIONS:9,L3:10,R3:11};
const pad={move:{x:0,y:0},look:{x:0,y:0},run:false,connected:false},padHeld=new Set();
// Sticks rest slightly off centre and report noise even untouched.
const deadzone=(v,d=.16)=>{const m=Math.abs(v);return m<d?0:Math.sign(v)*((m-d)/(1-d))**1.6;};
function readPad(){
  let device=null;
  for(const p of navigator.getGamepads?.()||[])if(p?.connected&&p.axes?.length>=2){device=p;break;}
  if(!device){pad.connected=false;pad.move.x=pad.move.y=pad.look.x=pad.look.y=0;pad.run=false;padHeld.clear();return null;}
  if(!pad.connected){pad.connected=true;notify('Controller connected. Left stick moves, right stick looks, ✕ jumps.');}
  pad.move.x=deadzone(device.axes[0]||0);pad.move.y=deadzone(device.axes[1]||0);
  pad.look.x=deadzone(device.axes[2]||0);pad.look.y=deadzone(device.axes[3]||0);
  const down=i=>!!device.buttons?.[i]?.pressed;
  pad.run=down(PAD.R2)||down(PAD.L1)||down(PAD.L3);
  // Edge detection: every mapped button acts on the press, not while held.
  const tapped=i=>{const held=padHeld.has(i),now=down(i);if(now)padHeld.add(i);else padHeld.delete(i);return now&&!held;};
  return {tapped,down};
}
function applyPad(dt){
  const device=readPad();if(!device)return;
  const {tapped}=device;
  if(tapped(PAD.OPTIONS)||tapped(PAD.SHARE)){if(directory.open)closeDialog(directory);else{renderDirectory();openDialog(directory);}return;}
  if(paused()){
    // On the panels the pad still has to be able to get you out again.
    if(tapped(PAD.CIRCLE)){const open=dialogs.find(d=>d.open);if(open)closeDialog(open);}
    if(tapped(PAD.CROSS)&&welcome.open&&ready)begin();
    return;
  }
  if(tapped(PAD.CROSS))jumpQueued=true;
  if(tapped(PAD.SQUARE)||tapped(PAD.R1))use();
  if(tapped(PAD.TRIANGLE))toggleTorch();
  if(tapped(PAD.R3))toggleView();
  if(tapped(PAD.CIRCLE))openDialog(welcome);
  // Right stick look. The squared response above the deadzone gives fine aim
  // near centre and a usable sweep at full deflection.
  yaw-=pad.look.x*2.9*dt*lookSensitivity;
  pitch=THREE.MathUtils.clamp(pitch-pad.look.y*2.2*dt*lookSensitivity,-1.48,1.48);
}

function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer?.setSize(innerWidth,innerHeight,false);rendering?.resize();}addEventListener('resize',resize);
function fatal(error){console.error(error);for(const d of dialogs)if(d.open)d.close();$('fatal').hidden=false;$('fatalText').textContent=`${error.message||error}. Try refreshing, or use a browser with WebGL 2 enabled.`;}

function frame(){
  requestAnimationFrame(frame);if(!renderer||!world)return;
  const dt=Math.min(clock.getDelta(),.05),time=performance.now()*.001;
  applyPad(dt);
  if(!paused()){
    const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-stick.y-pad.move.y;
    const right=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+stick.x+pad.move.x;
    const speed=(running||pad.run||keys.has('ShiftLeft')||keys.has('ShiftRight'))?3.8:1.45;
    desired.set(-Math.sin(yaw)*forward+Math.cos(yaw)*right,0,-Math.cos(yaw)*forward-Math.sin(yaw)*right);if(desired.length()>1)desired.normalize();desired.multiplyScalar(opening.focus?0:speed);

    // Bound movement substeps prevent thin rail/door tunneling after slow frames.
    // The jump impulse belongs to one substep only, or it is applied N times.
    const count=Math.max(1,Math.ceil(dt/(1/120))),wasAirborne=!body.grounded;
    for(let i=0;i<count;i++)body.step(dt/count,desired,world.colliders,{jump:jumpQueued&&!opening.focus&&i===0});
    if(jumpQueued&&body.velocity.y>.5)audio.jump();
    jumpQueued=false;
    if(wasAirborne&&body.grounded&&body.landingImpact>.05)audio.land(body.landingImpact);
    if(body.position.y<2&&!world.special){const p=world.spawn(world.activeLevel);body.teleport(p.x,p.y,p.z);notify('Returned to the nearest safe landing.');}
    const bob=$('reduceMotion').checked?0:Math.sin(body.distanceWalked*8)*.018*Math.min(1,body.horizontalSpeed);
    world.update(dt,body.position);const passage=world.transitionAt(body.position);if(passage)travel(passage);opening.update(dt);population.update(dt,body,opening.watching,cast.selected);population.separatePlayer(body);cast.update(dt,body,started);cast.setCamera(camera,body,yaw,pitch,bob);camera.getWorldDirection(direction);const eye=body.position.clone();eye.y+=body.eyeHeight;
    props.update(dt,time,story,world.activeLevel,world.special);
    // The supplied hard-drive model is placed by the character cast, so taking
    // it in story mode has to clear it from the bench there.
    if(cast?.relic&&story.story&&story.has('harddrive'))cast.relic.visible=false;
    world.actorInteractions.push(...props.interactions(story,world.activeLevel,world.special));
    stepOutside(eye);
    if(drone.active){
      const event=drone.update(dt,eye);
      if(event==='fired')droneKill();
      else if(event==='landed'){story.droneKilled();saveStory();syncStoryHud(true);notify('It is down. Nothing else is coming.');}
    }
    interaction=body.climbing||opening.focus?null:world.nearestInteraction(eye,direction);$('interaction').hidden=!interaction;if(interaction)$('interaction').lastElementChild.textContent=interaction.label;
    $('touchUse').style.opacity=interaction||opening.state==='read-book'?'1':'.4';audio.step(body.distanceWalked,body.horizontalSpeed,cast.active?.motion.stepCount);
    crowdSoundTime-=dt;if(crowdSoundTime<=0){crowdSoundTime=opening.watching?4:1.1+Math.random()*1.5;audio.residents?.(population.count,opening.watching);}
  }else if(!started){
    const p=topPoint(...CAFETERIA_START);camera.position.copy(topPoint(0,1.85,10));camera.lookAt(topPoint(0,3.2,39));world.update(dt,p);population.update(dt,body,false,cast.selected);
  }else{world.update(dt,body.position);cast?.update(0,body,started);}
  audio.setStoryPaused?.(document.hidden||(opening?.watching&&paused()));
  updateInterface(time);
  if(time-lastHUD>.25){updateHUD();lastHUD=time;}
  world.surface.renderFeed(renderer,time);
  if(world.special&&!opening?.focus)world.underground.waterSurface.update(renderer,scene,camera,time);
  if(cleanWasRunning!==world.surface.cleaning){if(world.surface.cleaning)audio.scrubStart();else{audio.scrubStop();notify('Camera lens clean. The outside view is clear on the cafeteria screens.');}}cleanWasRunning=world.surface.cleaning;
  if(outsideTarget&&lastScreen!==world.screens[0]){for(const screen of world.screens){screen.material.map=outsideTarget.texture;screen.material.color.setHex(0xffffff);screen.material.needsUpdate=true;}lastScreen=world.screens[0];}
  torch.position.copy(camera.position);camera.getWorldDirection(direction);torch.target.position.copy(camera.position).addScaledVector(direction,15);torch.visible=torchOn&&started;
  const far=world.special?260:world.outside?1600:2300,near=world.special?.16:.1;if(camera.far!==far||camera.near!==near){camera.far=far;camera.near=near;camera.updateProjectionMatrix();}
  if(opening?.focus)rendering.renderScreen(outsideTarget.texture,camera.aspect);else rendering.render(scene,camera);
}

async function boot(){
  welcome.showModal();syncPause();
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:!coarse,alpha:false,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.setClearColor(0x111b17);updateSettings();resize();
    world=new SiloWorld(scene);rendering=new Rendering(renderer);makeEnvironment(renderer,scene);updateSettings();
    await world.loadAssets(progress=>{$('enterButton').textContent=`Preparing the silo · ${Math.round(progress*45)}%`;});
    cast=new CharacterCast(scene,world);await cast.load(progress=>{$('enterButton').textContent=`Preparing characters · ${Math.round(45+progress*55)}%`;});cast.select(saved.character||'juliette');cast.thirdPerson=saved.thirdPerson!==false;body.standHeight=body.height=cast.active.definition.height;cast.active.heading=yaw+Math.PI;renderCharacters();
    world.setLevel(1);const start=topPoint(...CAFETERIA_START);body.teleport(start.x,start.y,start.z);yaw=-Math.PI/2;pitch=-.06;world.update(0,body.position);cast.update(0,body,false);
    population=new Population(scene,world);opening=new CafeteriaOpening(world,{complete:openingComplete,onChange:openingChanged});population.update(0,body,false,cast.selected);
    story=Story.load(savedStory);world.story=story;props=new StoryProps(scene,world.m);drone=new Drone(scene,world.m);
    openingChanged(opening.state);syncStoryHud(true);
    outsideTarget=world.surface.initFeed(renderer);renderer.compile(scene,camera);setDirectoryMode(true);
    ready=true;$('enterButton').disabled=false;$('enterButton').textContent='New game · the story';
    if(world.materialFailures)notify('Some surface materials could not load. Refresh to retry.');
    if(world.assetFailures)notify('Some Lost Signal props could not load. The complete architectural reconstruction is still available.');
    frame();
  }catch(error){fatal(error);}
}
// One handle on the running game, for the headless smoke test that drives the
// whole story through in a real browser. Nothing in the game reads it.
window.__silo={begin,fire,takeRelic,stepOutside,
  get story(){return story;},get world(){return world;},get body(){return body;},
  get drone(){return drone;},get opening(){return opening;},get ready(){return ready;}};
boot();
