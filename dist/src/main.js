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
import { Story, COLLECTABLES, RELICS, CHAPTERS } from './story.js';
import { Firearms } from './firearms.js';
import { WEAPONS } from './weapons.js';
import { updateRangeTargets } from './gun-range.js';
import {RelicInspector} from './relic-inspector.js';
import { GeorgeTerminal } from './george-terminal.js';
import { GEORGE_TERMINAL_POINT } from './mystery-spaces.js';
import { StoryProps, Drone } from './relics.js';
import { SiloClock } from './silo-time.js';
import { shiftBell } from './ambient-events.js';

const $=id=>document.getElementById(id),canvas=$('world'),welcome=$('welcome'),directory=$('directory'),settings=$('settings'),about=$('about'),characters=$('characters'),relic=$('relic'),conversation=$('conversation'),satchel=$('satchel'),terminalDialog=$('georgeTerminal');
const dialogs=[welcome,directory,settings,about,characters,relic,conversation,satchel,terminalDialog],coarse=matchMedia('(pointer:coarse)').matches;
let ready=false,started=false,renderer,world,outsideTarget,interaction=null,traveling=false,showAll=true,lastHUD=0,lastScreen=null,toastTimer,rendering,cleanWasRunning=false,cast,population,opening,crowdSoundTime=0;
let hudOpen=false,touchUntil=0,chapterUntil=0,lastOpeningState=null,talking=null,chapterEnteredAt=0,hintUntil=0;
let terminal=new GeorgeTerminal(),workAction=null;
const inspector=new RelicInspector($('relicCanvas'),$('relicControlsHint'));
const pausingDialogs=dialogs.filter(d=>d!==conversation);
let story=null,props=null,drone=null,wasOutside=false,lastChapter=null;
let yaw=Math.PI/2,pitch=0,lookSensitivity=1,running=false,torchOn=false,quality='balanced';
const body=new CharacterBody({radius:.3,standHeight:1.78,stepHeight:.3}),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.08,2300),audio=new SiloAudio();
const firearms=new Firearms(scene,audio);
const keys=new Set(),stick={x:0,y:0},desired=new THREE.Vector3(),direction=new THREE.Vector3(),clock=new THREE.Clock();
camera.rotation.order='YXZ';
const torch=new THREE.SpotLight(0xffe7b4,65,40,.5,.7,1.6);torch.visible=false;scene.add(torch,torch.target);
const saved=(()=>{try{return JSON.parse(localStorage.getItem('silo18-settings')||'{}');}catch{return {};}})();
const openingComplete=(()=>{try{return localStorage.getItem('silo18-opening-complete')==='1';}catch{return false;}})();
const savedStory=(()=>{try{return JSON.parse(localStorage.getItem('silo18-story')||'null');}catch{return null;}})();
// The silo's own clock. It starts mid-morning — the lamps at full, the place
// awake, and enough light outside for the cleaning — and runs from there.
let siloClock=new SiloClock({hour:8.4});
function saveStory(){if(!story?.story)return;try{localStorage.setItem('silo18-story',JSON.stringify({...story.save(),terminal:terminal.save(),clock:siloClock.save(),checkpoint:{level:world.activeLevel,special:world.special,position:body.position.toArray(),yaw}}));}catch{}}
const paused=()=>pausingDialogs.some(d=>d.open)||(conversation.open&&!talking)||!started||traveling;
function notify(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4600);}
function revealControls(){touchUntil=performance.now()+3500;}
function toggleControls(){hudOpen=!hudOpen;document.body.classList.toggle('hud-open',hudOpen);$('controlsButton').setAttribute('aria-expanded',String(hudOpen));revealControls();}
function updateInterface(time){
  if(hudOpen&&(body.horizontalSpeed>.12||opening?.focus&&time*1000>touchUntil)){hudOpen=false;document.body.classList.remove('hud-open');$('controlsButton').setAttribute('aria-expanded','false');}
  document.body.classList.toggle('playing',started&&!paused());document.body.classList.toggle('touch-awake',time*1000<touchUntil||body.horizontalSpeed>.12);
  const card=$('chapterHud'),wasShown=!card.hidden;
  card.hidden=paused()||opening?.watching||time*1000>chapterUntil;
  if(wasShown&&card.hidden)document.body.style.setProperty('--card-h','0px');
  $('controlsButton').hidden=!started||paused();
  document.body.classList.toggle('screen-focused',!!opening?.focus);
}
function askTopic(button){
  if(!button)return;
  $('dialogueLine').textContent=button.dataset.reply;
  for(const other of $('dialogueChoices').children)other.setAttribute('aria-pressed',String(other===button));
  audio.click();
}
function startConversation(person,actor=null){
  if(person.id==='billings'&&story?.story){billingsConversation();return;}
  const text=person===ALGORITHM?person:conversationFor(person,{cleaned:opening.directoryReady,playerName:cast.active.definition.name});
  $('speakerName').textContent=text.name;$('speakerRole').textContent=text.role;$('dialogueLine').textContent=text.greeting;$('dialogueChoices').replaceChildren();
  text.topics.forEach((topic,i)=>{
    const b=document.createElement('button');b.dataset.reply=topic.reply;b.setAttribute('aria-pressed','false');
    const key=document.createElement('kbd');key.textContent=String(i+1);
    b.append(key,document.createTextNode(topic.label));
    b.addEventListener('click',()=>askTopic(b));$('dialogueChoices').append(b);
  });
  // The panel is shown, not modalled: the silo keeps running behind it, the
  // person turns to face you and the camera settles on them while you talk.
  hudOpen=false;document.body.classList.remove('hud-open');
  for(const d of pausingDialogs)if(d.open)d.close();
  talking={actor,name:text.name};population.talkingTo=actor;
  if(!conversation.open)conversation.show();
  document.body.classList.add('talking');audio.click();syncPause();
}
function endConversation(){
  if(!talking)return;
  talking=null;population.talkingTo=null;conversation.close();
  document.body.classList.remove('talking');syncPause();if(started)canvas.focus();
}
function billingsConversation(){
  $('speakerName').textContent='Officer Paul Billings';$('speakerRole').textContent='SHERIFF’S STATION';
  $('dialogueLine').textContent=story.hasFlag('billings-helped')?'I have put my name against that weapon. Get your suit, and come back with something we can believe.':'There are rules about the things you have been carrying. Tell me why I should hear you out.';
  const choices=$('dialogueChoices');choices.replaceChildren();
  const add=(label,run)=>{const b=document.createElement('button');b.textContent=label;b.onclick=run;choices.append(b);};
  if(story.has('georgia'))add('Place the Atlanta page on his desk',()=>{
    $('dialogueLine').textContent='He unfolds the page carefully. “A city. Roads. People living under an open sky. Where did George find this?”';choices.replaceChildren();
    add('Explain the concealed gas line',()=>{
      if(!story.hasFlag('pipe-capped')){$('dialogueLine').textContent='“Then make certain it cannot be used. I will not leave everyone here defenceless on the strength of a picture.”';return;}
      $('dialogueLine').textContent='You show him the pressure readings and the sealed line. Billings looks from the figures to the book, then toward the locked racks.';choices.replaceChildren();
      add('Ask him for a chance to bring back the truth',()=>{const result=story.speakToBillings();$('dialogueLine').textContent=result.message;choices.replaceChildren();if(result.helped){if(!story.has('shotgun'))takeRelic('shotgun');else takeWeapon('armoryShotgun02');add('Keep the book and leave',()=>closeDialog(conversation));}syncStoryHud(true);});
    });
  });
  else add('Ask what would convince him',()=>{$('dialogueLine').textContent='“Evidence. Something the screen did not give you.” A discarded returns slip on his desk bears Medical’s stamp: 062.';});
  if(story.has('shotgun'))add('Ready the issued shotgun',()=>takeWeapon('armoryShotgun02'));
  openDialog(conversation);
}
function renderTerminal(){
  const v=terminal.view;$('terminalStatus').textContent=v.status;$('terminalPath').textContent=`DEVICE 18 : ${v.breadcrumb.join('/').replace(/^\/\//,'/')}`;
  $('terminalInsert').disabled=v.driveInserted;$('terminalBoot').disabled=false;$('terminalEject').disabled=!v.driveInserted;$('terminalBack').disabled=!terminal.mounted||(!terminal.file&&terminal.path==='/');
  $('terminalSearch').hidden=!v.canSearch;const body=$('terminalRows');body.replaceChildren();
  for(const row of v.rows){const b=document.createElement('button');b.type='button';b.textContent=`${row.kind==='dir'?'DIR':'FILE'}   ${row.name}`;b.onclick=()=>{terminal.open(row.id);if(terminal.view.blueprint)story.terminalDiscovered();renderTerminal();syncStoryHud(true);saveStory();};body.append(b);}
  if(!v.rows.length){const p=document.createElement('p');p.textContent=v.blueprint?'SCHEMATIC RECOVERED':v.body||v.status;body.append(p);}
  const paper=$('terminalBlueprint');paper.hidden=!v.blueprint;
  if(v.blueprint){$('blueprintTitle').textContent=v.blueprint.title;$('blueprintProvenance').textContent=v.blueprint.sourceStatus;$('blueprintRoute').replaceChildren();for(const text of [...v.blueprint.route.map(r=>r.clue),...v.blueprint.tools,...v.blueprint.warnings]){const li=document.createElement('li');li.textContent=text;$('blueprintRoute').append(li);}}
}
function syncPause(){document.body.classList.toggle('paused',paused());$('hud').classList.toggle('hidden',welcome.open);keys.clear();stick.x=stick.y=0;$('joystick').firstElementChild.style.transform='';if(paused()&&document.pointerLockElement)document.exitPointerLock();}
function openDialog(d){if(talking)endConversation();hudOpen=false;document.body.classList.remove('hud-open');$('controlsButton').setAttribute('aria-expanded','false');for(const x of dialogs)if(x.open)x.close();d.showModal();syncPause();}
function closeDialog(d){d.close();if(!started&&d!==welcome)welcome.showModal();syncPause();if(started)canvas.focus();}
function saveSettings(){try{localStorage.setItem('silo18-settings',JSON.stringify({brightness:$('brightness').value,sensitivity:$('sensitivity').value,quality,timeOfDay:$('timeOfDay').value,sound:$('sound').checked,music:$('music').value,reduceMotion:$('reduceMotion').checked,character:cast?.selected||saved.character||'juliette',thirdPerson:cast?.thirdPerson??saved.thirdPerson??true}));}catch{}}
function updateSettings(){
  if(renderer)renderer.toneMappingExposure=Number($('brightness').value)/100;
  $('brightnessValue').textContent=`${$('brightness').value}%`;$('sensitivityValue').textContent=`${$('sensitivity').value}%`;lookSensitivity=Number($('sensitivity').value)/100;
  $('musicValue').textContent=`${$('music').value}%`;audio.setEnabled($('sound').checked);audio.setMusicVolume(Number($('music').value)/100);quality=$('quality').value;if(world)world.surface.setTimeOfDay($('timeOfDay').value);
  if(renderer){renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='high'?2:quality==='low'?1:1.5));renderer.setSize(innerWidth,innerHeight,false);renderer.shadowMap.enabled=quality!=='low';if(world){world.quality=quality;world.keyLight.castShadow=quality!=='low';world.underground.waterSurface.setQuality(quality);world.silo17.waterSurface.setQuality(quality);world.surface.setQuality(quality);}if(rendering){rendering.enabled=true;rendering.setQuality(quality);rendering.resize();}}
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
  syncGuidance();
}
// The destination line, the latest hint, and whether there is another one to
// ask for. Kept in one place so the card never disagrees with itself.
function syncGuidance(){
  const where=story?.destination,hint=story?.shownHints.at(-1);
  const whereLine=$('chapterWhere'),hintLine=$('chapterHint'),button=$('hintButton');
  if(!whereLine||!hintLine||!button)return;
  whereLine.hidden=!where;
  if(where){
    // Standing on the level the story is pointing at is worth saying on the
    // card itself. It is permanent while it is true, which a toast is not, and
    // it stops the player travelling away from the thing they came for.
    const here=started&&world&&!world.special&&!world.outside&&world.activeLevel===where.level;
    whereLine.textContent=here?`${where.place} — you are here`:where.place;
    whereLine.classList.toggle('here',!!here);
  }
  // The hint is prominent while it is news, then it goes. Left on the card it
  // made the card half the height of a phone screen, and the answer is already
  // written down in the journal for as long as the player wants it.
  const fresh=hint&&performance.now()<hintUntil;
  hintLine.hidden=!fresh;
  if(fresh)hintLine.textContent=hint;
  const left=story?.story?story.hintsLeft:0;
  button.hidden=!story?.story||!story.hintsTotal;
  button.textContent=left?'Think about it':'Nothing more to work out';
  button.disabled=!left;
  button.dataset.exhausted=String(!left);
  // The card grew a destination line, a hint and a third button, and on a short
  // screen it covered both the toast and the "press E" prompt — so the player
  // could not read what they were about to interact with. Publish its real
  // height and let those two sit above whatever it happens to be.
  const card=$('chapterHud');
  document.body.style.setProperty('--card-h',(card.hidden?0:card.offsetHeight)+'px');
}
// Being stuck is allowed to ask on the player's behalf. The first nudge comes
// after a minute and a half on the same chapter, and each one after that takes
// longer, so a player who is exploring is not lectured while they do it.
function nudge(now){
  if(!story?.story||!story.hintsLeft)return;
  const waited=(now-chapterEnteredAt)/1000;
  const due=90+story.hintsShown*120;
  if(waited<due)return;
  const hint=story.revealHint();
  if(!hint)return;
  hintUntil=performance.now()+9000;
  showObjective(story.chapterInfo.title,story.objective,9000);
  notify(hint);saveStory();
}
function syncStoryHud(force=false){
  if(!story)return;
  $('satchelButton').hidden=!story.story;
  document.body.classList.toggle('armed',!!firearms.held);
  $('fireButton').hidden=!(firearms.held&&coarse);
  $('crosshair').hidden=!firearms.held;
  if(!story.story)return;
  if(force||lastChapter!==story.chapter){
    if(lastChapter!==story.chapter)chapterEnteredAt=performance.now();
    lastChapter=story.chapter;
    showObjective(story.chapterInfo.title,story.objective,force?7000:9000);
    saveStory();
  }else syncGuidance();
}
// Asked for, rather than waited out. The card comes back up with it so the
// player is looking at the objective and the hint together.
function askForHint(){
  if(!story?.story)return;
  const hint=story.revealHint();
  audio.click();
  if(!hint){notify('Nothing more to work out. What you need is where the objective says.');syncGuidance();return;}
  hintUntil=performance.now()+11000;
  showObjective(story.chapterInfo.title,story.objective,11000);
  notify(hint);saveStory();
}
function renderSatchel(){
  const where=story.destination;
  $('satchelObjective').textContent=where?`${story.objective}  (${where.place})`:story.objective;
  const held=COLLECTABLES.filter(c=>story.has(c.id));
  $('satchelCount').textContent=held.length?`${held.length} ITEMS · ${RELICS.filter(r=>story.has(r.id)).length} RELICS`:'NOTHING YET';
  const list=$('satchelList');list.replaceChildren();
  // The story so far, before the things you are carrying. Without it there is
  // no record of what you worked out — only a bag of objects and one line of
  // objective, which is not what a player means by "where am I up to".
  const progress=document.createElement('div');progress.className='journal-chapters';
  const heading=document.createElement('h3');heading.textContent='The story so far';progress.append(heading);
  for(const chapter of story.story?CHAPTERS:[]){
    if(chapter.id==='free')continue;
    const index=CHAPTERS.findIndex(c=>c.id===chapter.id);
    const state=index<story.chapterIndex?'done':index===story.chapterIndex?'now':'later';
    if(state==='later')continue;                               // no spoilers for what you have not reached
    const row=document.createElement('div');row.className=`journal-chapter ${state}`;
    const mark=document.createElement('span');mark.textContent=state==='done'?'✓':'▸';
    const copy=document.createElement('div');
    const title=document.createElement('strong');title.textContent=chapter.title;
    copy.append(title);
    if(state==='now'){
      const line=document.createElement('p');line.textContent=story.objective;copy.append(line);
      for(const hint of story.shownHints){
        const h=document.createElement('p');h.className='journal-hint';h.textContent=hint;copy.append(h);
      }
    }
    row.append(mark,copy);progress.append(row);
  }
  if(story.story)list.append(progress);
  for(const item of held){
    const has=story.has(item.id),row=document.createElement('div');row.className='satchel-item';
    const tick=document.createElement('span');tick.className='tick';tick.textContent=has?'✓':'·';
    const copy=document.createElement('div');
    const h=document.createElement('h3');h.textContent=has?item.name:'—';
    const p=document.createElement('p');p.textContent=has?item.blurb:'Not found yet.';
    copy.append(h,p);
    if(has){const src=document.createElement('p');src.className='src';src.textContent=item.source;copy.append(src);}
    const inspect=document.createElement('button');inspect.className='secondary';inspect.textContent='Inspect in 3D';inspect.onclick=()=>inspectRelic(item.id);copy.append(inspect);row.append(tick,copy);list.append(row);
  }
}
function inspectRelic(id){
  const item=COLLECTABLES.find(i=>i.id===id);if(!item)return;
  $('relicName').textContent=item.name;$('relicDescription').textContent=item.blurb;$('relicSource').textContent=item.source;
  openDialog(relic);
  const source=id==='harddrive'?cast?.relic:id==='shotgun'?firearms.model:props?.inspectionModel(id);
  try{inspector.show(source);}catch(error){$('relicControlsHint').textContent='3D inspection could not start. Close this view and try again.';}
}
function takeRelic(id){
  const item=story.take(id);
  if(!item)return;
  audio.pickup(item.sound||'relic');saveStory();
  showObjective(item.name,item.blurb,9000);
  notify(story.story?story.objective:`${item.name} — in your satchel.`);
  if(id==='suit')notify('The suit is on. The airlock will let you through now.');
  if(id==='shotgun'){takeWeapon('armoryShotgun02');notify('Billings’ shotgun is loaded. G or FIRE shoots; R reloads.');}
  syncStoryHud(true);if(['pez','watch','georgia','harddrive','crowbar','pipekit'].includes(id))inspectRelic(id);
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
  if(reading||state==='explore'){story?.beginSearch();if(story?.story)syncStoryHud(true);saveStory();}
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
    // The level the current chapter is sending you to is marked in the
    // directory itself, because the directory is the thing you travel with.
    const where=story?.destination;
    const isTarget=!special&&where&&where.level===item.level;
    if(isTarget)button.classList.add('objective');
    const copy=document.createElement('span');copy.className='location-copy';const title=document.createElement('strong');title.textContent=item.name;const sub=document.createElement('small');
    sub.textContent=isTarget?`Your objective is here · ${item.placement}`:special?item.description:`6 enterable wings · ${item.placement}`;
    copy.append(title,sub);const arrow=document.createElement('span');arrow.textContent='↗';button.append(n,copy,arrow);button.addEventListener('click',()=>travel(special?item.id:item.level));target.append(button);
    if(!special){const rooms=document.createElement('div');rooms.className='room-links';for(const room of roomsForLevel(item.level)){const b=document.createElement('button');b.textContent=`${String.fromCharCode(65+room.wing)} · ${room.name.toLowerCase()}`;if(isTarget&&where.wing===room.wing)b.classList.add('objective');b.addEventListener('click',()=>travel(room.id));rooms.append(b);}target.append(rooms);}
  };
  selected.forEach(i=>addItem(i));
  for(const i of SPECIALS.filter(i=>!query||`${i.name} ${i.type}`.toLowerCase().includes(query)))addItem(i,true);
  if(!target.children.length){const p=document.createElement('p');p.className='help';p.textContent='No matching locations. Try a level number or department.';target.append(p);}
}
function setDirectoryMode(all){showAll=all;for(const [id,active]of [['allLevelsTab',all],['landmarksTab',!all]]){$(id).classList.toggle('active',active);$(id).setAttribute('aria-selected',String(active));}renderDirectory();}

async function travel(id){
  if(!ready||traveling)return;
  let blocked=story?.travelAllowed(id);if(story?.story&&typeof id==='string'&&id.startsWith('room:')){const [,n,w]=id.split(':').map(Number);const sealed=story.sealed(n,w,roomType(n,w));if(sealed)blocked=sealed.reason;}if(blocked){notify(blocked);return;}
  const dest=world.destination(id);if(!Number.isInteger(dest.level)||dest.level<1||dest.level>144)return;
  if(opening&&!opening.directoryReady)opening.finish();if(opening)opening.focus=false;
  workAction=null;if(talking)endConversation();
  traveling=true;audio.start();audio.travel();for(const d of dialogs)if(d.open)d.close();syncPause();$('fade').classList.add('show');
  await new Promise(r=>setTimeout(r,240));
  world.setLevel(dest.level,dest.special||null);body.teleport(dest.position.x,dest.position.y,dest.position.z);yaw=dest.yaw;pitch=0;started=true;audio.start();
  await new Promise(r=>requestAnimationFrame(r));
  if(story?.story)saveStory();
  $('fade').classList.remove('show');traveling=false;syncPause();updateHUD();
  const name=SPECIALS.find(s=>s.id===id)?.name||(typeof id==='string'&&id.startsWith('room:')?`${LEVELS[dest.level-1].name} · Wing ${String.fromCharCode(65+Number(id.split(':')[2]))}`:LEVELS[dest.level-1].name);notify(name||id);canvas.focus();
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
      world.outside=false;wasOutside=false;return;
    }
    if(verdict?.drone){
      world.surface.setTimeOfDay('day');$('timeOfDay').value='day';if(firearms.key!=='armoryShotgun02')takeWeapon('armoryShotgun02');firearms.resupply();
      const from=topPoint(60,groundY(60,40)+16,40);
      drone.launch(from);audio.travel?.();
      syncStoryHud(true);
      notify(story.armed?'Something has come over the crest. Put it down.':'Something has come over the crest, and you have nothing to answer it with.');
    }
  }
  if(!outside&&drone.active&&story.chapter==='drone'){drone.reset();story.killedByDrone();syncStoryHud(true);saveStory();}
  wasOutside=outside;
}
function droneKill(){
  drone.reset();story.killedByDrone();saveStory();
  const back=world.destination('airlock');
  world.setLevel(back.level);body.teleport(back.position.x,back.position.y,back.position.z);yaw=back.yaw;
  world.outside=false;wasOutside=false;firearms.resupply();syncStoryHud(true);
  notify('It fired. You woke on the airlock floor with the taste of blood in your mouth — go back out armed.');
}
function fire(){
  if(paused())return;
  if(!firearms.held)return;
  const before=firearms.ammo?.magazine||0,hit=firearms.fire(performance.now()/1000,camera);
  if(hit?.target)rangeHits++;
  if(drone?.active&&firearms.held.family==='shotgun'&&(firearms.ammo?.magazine||0)<before){
    const eye=camera.getWorldPosition(new THREE.Vector3());camera.getWorldDirection(direction);
    const floor=world.surface.floorAt(drone.group.position.x,drone.group.position.z,.4,drone.group.position.y);
    const hits=drone.hits,down=drone.shoot(eye,direction,Number.isFinite(floor)?floor:body.position.y);
    notify(down?'The rotors stop. It is falling.':drone.hits>hits?'A rotor sparks. One more clear shot.':'The shot misses. Keep the drone in the crosshair.');
  }
  updateWeaponHud();
  if(firearms.status()?.empty)notify(coarse?'Empty. Tap RELOAD.':'Empty. Press R to reload.');
}
let rangeHits=0,hudTick=-1,wading=false,wadeStep=0;
// Standing in the water at the bottom of the void.
//
// The basin is only 65 cm deep, so this is wading rather than swimming: the
// player walks in off the ladder and the sheet has to answer for it. Entering
// throws a ring and a splash; moving keeps a patch of churn under them and a
// loop under that; each footfall drops its own ring, which is what makes the
// surface look like it is being walked through rather than merely disturbed.
const WATER=Object.freeze({surfaceY:5,bedY:4.35,radius:79});
function updateWading(dt){
  const water=world?.special==='silo17'?world.silo17.waterSurface:world?.underground?.waterSurface;
  if(!water||!started){if(wading)leaveWater();return;}
  const inVoid=['excavator','tunnel','silo17'].includes(world.special),basin=world.special==='silo17'?{surfaceY:.65,bedY:0,radius:18}:WATER;
  let inside=false,speed=0;
  if(inVoid){
    // Test in the sheet's own space, so any transform on the void root is
    // accounted for rather than assumed away.
    const local=water.mesh.worldToLocal(body.position.clone());
    inside=local.y<basin.surfaceY-.04&&local.y>basin.bedY-1.2&&Math.hypot(local.x,local.z)<basin.radius;
    speed=body.horizontalSpeed||0;
    if(inside){
      water.setWade(body.position.x,body.position.z,Math.min(1,speed/2.6));
      if(speed>.35){
        wadeStep-=dt*speed*1.15;
        if(wadeStep<=0){wadeStep=1;water.ripple(body.position.x,body.position.z,.55+Math.random()*.5);}
      }
      audio.setWadeLevel?.(Math.min(1,speed/2.4));
    }
  }
  if(inside&&!wading){
    wading=true;
    audio.waterEnter?.(.7+Math.min(1,speed/2.2)*.7);
    audio.wadeStart?.();
    audio.setSurface('wet');
    water.ripple(body.position.x,body.position.z,1.6);
  }else if(!inside&&wading)leaveWater();
}
function leaveWater(){
  wading=false;
  audio.wadeStop?.();
  audio.setSurface(null);
  world?.underground?.waterSurface?.setWade(0,0,0);world?.silo17?.waterSurface?.setWade(0,0,0);
}
async function takeWeapon(key){
  if(story?.story&&!story.hasFlag('billings-helped')){notify('The armoury is locked. Only Billings can release a weapon.');return;}
  if(story?.story&&key!=='armoryShotgun02'){notify('Billings issued the riot shotgun. The remaining racks stay locked.');return;}
  const spec=WEAPONS[key];if(!spec)return;
  audio.pickup(spec.family==='blade'?'metal':'metal');
  await firearms.equip(key);
  updateWeaponHud();syncStoryHud();
  notify(`${spec.name}. Fire with ${coarse?'the FIRE button':'left mouse or G'}, reload with R.`);
}
// The ammunition line under the crosshair. Hidden entirely when empty-handed,
// because a counter reading nothing is worse than no counter.
function updateWeaponHud(){
  const state=firearms.status(),hud=$('weaponHud');
  if(!hud)return;
  hud.hidden=!state;$('reloadButton').hidden=!(state&&coarse);
  if(!state)return;
  $('weaponName').textContent=state.name;
  $('weaponAmmo').textContent=state.reloading?'RELOADING':state.text;
  hud.classList.toggle('empty',!!state.empty&&!state.reloading);
}
function begin(mode){
  if(!ready)return;
  if(mode){
    story=new Story(mode);terminal=new GeorgeTerminal();siloClock=new SiloClock({hour:8.4});world.story=story;lastChapter=null;drone?.reset();firearms.holster();workAction=null;wasOutside=false;world.resetStoryWorld();world.setLevel(1);const start=topPoint(...CAFETERIA_START);body.teleport(start.x,start.y,start.z);yaw=-Math.PI/2;pitch=-.06;
    if(mode==='story'&&opening.state!=='find-book')opening.reset();
    if(mode==='explore'){opening.finish();world.openBreach();}
    saveStory();
  }
  if(story.armed&&!firearms.held)takeWeapon('armoryShotgun02');
  world.surface.setNetworkVisible(!story.story||story.complete);world.rebuildCollision();
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
  if(world.special==='silo17')name='Silo 17 · flooded galleries';else if(world.special==='pipe-gallery')name='Abandoned pressure gallery';else if(world.special)name=SPECIALS.find(x=>x.id===world.special)?.name||name;
  if(world.special==='excavator'||world.special==='tunnel'){
    const p=world.underground.tunnel.worldToLocal(body.position.clone());
    name=p.z>0&&p.z<36&&Math.abs(p.x)<2.6?'The hidden tunnel':'The excavator & void';
    if(body.climbing)name='Ladder to the water';
  }
  $('zone').textContent=world.special==='silo17'?'ABANDONED':world.outside?'THE SURFACE':world.special?'LOWER ACCESS':data.zone;$('levelLabel').textContent=world.special==='silo17'?'SILO 17':world.outside?'OUTSIDE':world.special?'BELOW MECHANICAL':`LEVEL ${String(n).padStart(3,'0')}`;$('locationName').textContent=name;
  $('depthLabel').textContent=world.special==='silo17'?'Surviving upper galleries':`${Math.max(0,Math.round(levelY(1)-body.position.y)).toLocaleString()} m below the upper landing`;$('depthMarker').style.top=`${(n-1)/143*94}%`;
  $('modeLabel').textContent=`${cast?.active?.definition.short||'ON FOOT'}${body.climbing?' · CLIMBING':running?' · RUNNING':''} · ${siloClock.schedule.clock}`;audio.setLocation(world.outside?'surface':world.special==='silo17'?'tunnel':world.special==='pipe-gallery'?'mines':world.special||roomType(n,wing));
  // The great stairway is open steel and runs through every level, so the floor
  // underfoot there is not the floor of the room the level counter is reporting.
  // Standing in the water is the only thing that overrides the room's own
  // floor. The great stairway used to override it too, with steel grating, but
  // the stairway runs through all 144 levels — so every trip between floors
  // changed the footsteps twice, and it was a large part of why walking the
  // silo sounded like several different games.
  audio.setSurface(wading?'wet':null);
}
const inspectionText={
  'terminal-note':'A note under the unplugged cable: “The directory is not the collection. Ask for the whole library.” Nothing else is written.',
  'silo17-log':'LAST PUMP SHIFT / The lower galleries are lost. We moved the stores above the high-water band. Three landings still have emergency power. Nobody answered 18.',
  'silo17-crate':'Tools are wrapped in oilcloth above ruined ration packets. Someone kept preparing for a repair crew long after the voices stopped.',
  generator:'Six removable panels protect the turbine. The rear panel is held open for inspection; the rotor, gantry and crane can be seen around the housing.',
  water:'Filter vessels, treatment lines and pump controls keep water circulating through the silo. This department is associated with Level 55.',
  'it-servers':'The server room is behind this door and only IT opens it. Level 19 is the department’s floor in the published material; the room plan beyond that is inferred.',
  'head-of-it':'The Head of IT works apart from the floor, down the corridor from it. The desk, the shelved records and the motto are reconstructed.',
  'vault-radio':'A panel in the vault’s server steps that does not sit quite flush with the rest. Behind it is a radio set, and it is not tuned to anything inside this silo.',
  surveillance:'The concealed observation room watches the residences. Its exact floor plan is reconstructed.',
  workshop:'Salvaged electronics, analogue test equipment and spare parts. Almost everything here has to be repaired and used again.',
  airlock:'Cycle the inner door, enter the chamber, then cycle the outer door. The other door closes before the selected door opens. The ramp leads up to the surface.',
  chute:'The refuse chute carries discarded material down for recovery. It is not a passenger route.',
  mines:'The working galleries branch around an abandoned pump chamber and meet again at the deep ore face. Red service bands continue past the drill.',
  tunnel:'A sealed lower passage beneath the silo. This build does not invent an open route into another silo.',
  breach:'A routine bulkhead notice, screwed to newer blockwork than the wall around it. Whoever filled this opening in did not want it found, and whoever came after had already broken back through.',
  camp:'George and Juliette’s secluded hideout beside the excavation: a bed, a table and salvaged relics. The ladder outside the open side descends to the water. The room’s exact dimensions and position remain reconstructed from the available references.',
  relics:'Tins, bottles, books and wound cable carried down from the levels above and kept where a sweep would not find them. Possession of relics from before is an offence under the Pact.',
};
function use(){
  if(talking){endConversation();return;}
  if(opening?.state==='read-book'&&!interaction&&!paused()){requestDirectory();return;}
  if(!interaction||paused()||body.climbing||workAction)return;
  if(interaction.action==='opening-book'){audio.click();audio.playOpeningTheme();opening.takeBook();return;}
  if(interaction.action==='billings'){billingsConversation();return;}
  if(interaction.action==='george-terminal'){story.reachGeorgeHome();renderTerminal();openDialog(terminalDialog);syncStoryHud();return;}
  if(interaction.action==='enter-silo17'){travel('silo17');return;}
  if(interaction.action?.startsWith('pipe-')){const step=interaction.action.slice(5);if(story.story&&(!story.has('crowbar')||!story.has('pipekit'))){notify('Bring the crowbar and Water Filtration’s service kit before opening the line.');return;}workAction={until:performance.now()+2400,step};notify(step==='cover'?'Levering the inspection cover…':step==='isolate'?'Turning the isolation wheel…':step==='collar'?'Seating the split collar…':'Tightening the collar to the witness mark…');return;}
  if(interaction.resident){startConversation(interaction.resident,interaction.actor||null);return;}
  if(interaction.action==='algorithm'){startConversation(ALGORITHM);return;}
  if(interaction.ladder){
    const ladder=world.underground.ladders.find(l=>l.id===interaction.ladder);
    if(ladder&&LadderClimb.begin(body,ladder,interaction.up)){yaw=ladder.heading+Math.PI;pitch=0;notify(interaction.up?'Climbing back to the camp.':'Climbing down to the water.');}
    else notify('Move closer to the ladder.');
    return;
  }
  if(interaction.action==='hard-drive'){if(story?.story&&!story.has('harddrive')&&world.special==='excavator')takeRelic('harddrive');else{if(!story.has('harddrive'))takeRelic('harddrive');else inspectRelic('harddrive');}return;}
  if(interaction.action?.startsWith('relic:')){takeRelic(interaction.action.slice(6));return;}
  if(interaction.action?.startsWith('rack:')){takeWeapon(interaction.action.slice(5));return;}
  if(interaction.action==='range-resupply'){
    if(story.story&&!story.hasFlag('billings-helped')){notify('The ammunition cabinet is locked. Ask Billings.');return;}
    audio.pickup('metal');firearms.resupply();
    notify(firearms.held?`${firearms.held.name} resupplied.`:'Take a weapon off the rack first.');
    return;
  }
  if(interaction.action==='range-rack'){
    if(story.story&&story.armed){notify('Keep Billings’ shotgun with you until you are clear of the drone.');return;}
    if(!firearms.held){audio.click();notify('You are not carrying anything.');return;}
    const name=firearms.held.name;firearms.holster();audio.drop('metal');
    updateWeaponHud();notify(`${name} racked.`);
    return;
  }
  if(interaction.sealed){audio.click();notify(interaction.sealed.reason);return;}
  if(interaction.action==='clean-camera'){audio.click();world.surface.beginCleaning();notify('Cleaning the camera lens. The cafeteria feed clears as you wipe.');return;}
  if(interaction.action?.startsWith('airlock-')){audio.airlock();world.cycleAirlock(interaction.action.slice(8));return;}
  if(interaction.action==='breach'){
    if(story.story){const check=story.inspectVoidDoor();if(!check.open&&!story.pryHideout()){notify(check.message);syncStoryHud(true);return;}}
    world.openBreach();saveStory();audio.door(true);
    notify('A broken opening was hidden behind the sign. Walk through it.');
    return;
  }
  if(interaction.door){interaction.door.open=!interaction.door.open;audio.door(interaction.door.open);}
  else if(interaction.destination!==undefined){audio.click();travel(interaction.destination);}
  else{audio.click();notify(interaction.text||inspectionText[interaction.action]||interaction.label);}
}
function toggleTorch(){torchOn=!torchOn;audio.torch(torchOn);torch.visible=torchOn;$('torchButton').classList.toggle('active',torchOn);$('torchButton').setAttribute('aria-pressed',String(torchOn));}

$('relicReset').addEventListener('click',()=>inspector.reset());
$('relicFlip').addEventListener('click',()=>inspector.flip());
relic.addEventListener('close',()=>inspector.hide());
for(const d of dialogs){d.addEventListener('cancel',e=>{e.preventDefault();if(d===welcome&&ready){if(started){d.close();syncPause();}else begin();}else closeDialog(d);});d.querySelector('[data-close]')?.addEventListener('click',()=>closeDialog(d));}
$('terminalInsert').addEventListener('click',()=>{if(!terminal.insertDrive(story.has('harddrive')))notify('The cable needs an external drive.');renderTerminal();saveStory();});
$('terminalBack').addEventListener('click',()=>{terminal.back();renderTerminal();saveStory();});
$('terminalBoot').addEventListener('click',()=>{terminal.boot();renderTerminal();saveStory();});
$('terminalEject').addEventListener('click',()=>{terminal.ejectDrive();renderTerminal();saveStory();});
$('terminalSearch').addEventListener('submit',e=>{e.preventDefault();terminal.search($('terminalQuery').value);renderTerminal();saveStory();});
$('controlsButton').addEventListener('click',toggleControls);$('leaveConversation').addEventListener('click',()=>closeDialog(conversation));
conversation.addEventListener('close',()=>{if(talking)endConversation();});
addEventListener('pointerdown',revealControls,{passive:true});
$('enterButton').addEventListener('click',()=>begin('story'));
$('resumeButton').addEventListener('click',()=>begin());
$('exploreButton').addEventListener('click',()=>begin('explore'));
$('hintButton').addEventListener('click',()=>{askForHint();});
$('journalButton').addEventListener('click',()=>{renderSatchel();openDialog(satchel);});
$('satchelButton').addEventListener('click',()=>{renderSatchel();openDialog(satchel);});$('home').addEventListener('click',()=>{if(started){$('resumeButton').hidden=false;}openDialog(welcome);});
$('directoryButton').addEventListener('click',requestDirectory);
$('welcomeDirectory').addEventListener('click',()=>{if(!ready)return;requestDirectory();});
$('replayOpening').addEventListener('click',replayOpening);
$('focusScreenButton').addEventListener('click',()=>{opening.focus=!opening.focus;$('focusScreenButton').textContent=opening.focus?'Back to cafeteria':'Focus on screen';document.body.classList.toggle('screen-focused',opening.focus);keys.clear();stick.x=stick.y=0;});
$('skipOpening').addEventListener('click',()=>opening.finish());$('openBookButton').addEventListener('click',requestDirectory);
$('characterButton').addEventListener('click',()=>{renderCharacters();openDialog(characters);});$('viewButton').addEventListener('click',toggleView);
$('settingsButton').addEventListener('click',()=>openDialog(settings));$('aboutButton').addEventListener('click',()=>openDialog(about));
for(const button of document.querySelectorAll('[data-travel]'))button.addEventListener('click',()=>travel(button.dataset.travel));
$('landmarksTab').addEventListener('click',()=>setDirectoryMode(false));$('allLevelsTab').addEventListener('click',()=>setDirectoryMode(true));$('search').addEventListener('input',renderDirectory);
$('fireButton').addEventListener('click',fire);$('reloadButton').addEventListener('click',()=>{firearms.reload();updateWeaponHud();});
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
  // The conversation panel is not modal, so it holds focus while the silo runs.
  // Bailing out on any dialog ancestor meant 1-4 and Esc died inside it.
  const inPanel=e.target.closest('dialog');
  if(e.target.matches('input,select,textarea')||inPanel&&inPanel!==conversation||e.code==='Space'&&e.target.matches('button'))return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
  if(e.repeat){keys.add(e.code);return;}
  if(e.code==='KeyM'){if(directory.open)closeDialog(directory);else requestDirectory();return;}
  if(e.code==='KeyC'){if(characters.open)closeDialog(characters);else{renderCharacters();openDialog(characters);}return;}
  if(paused())return;
  if(talking){
    if(/^Digit[1-9]$/.test(e.code)){askTopic($('dialogueChoices').children[Number(e.code.slice(5))-1]);return;}
    if(e.code==='Escape'||e.code==='KeyE'){endConversation();return;}
  }
  if(e.code==='KeyH'){toggleControls();return;}
  if(opening.focus&&e.code==='Space'){e.preventDefault();toggleControls();return;}
  revealControls();
  if(e.code==='KeyV'){toggleView();return;}
  keys.add(e.code);if(e.code==='KeyE')use();if(e.code==='KeyF')toggleTorch();if(e.code==='Space')jumpQueued=true;if(e.code==='KeyG')fire();
  if(e.code==='KeyR'&&firearms.held){if(firearms.reload())updateWeaponHud();}
  if(e.code==='KeyX'&&firearms.held&&!story.story){const name=firearms.held.name;firearms.holster();updateWeaponHud();notify(`${name} slung.`);}if(e.code==='KeyB'&&story){renderSatchel();openDialog(satchel);}
  if(e.code==='KeyT'&&story?.story)askForHint();
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
    if(document.pointerLockElement===canvas){if(firearms.held||(story?.armed&&drone?.active))fire();}
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
  if(tapped(PAD.CROSS))jumpQueued=true;if(tapped(PAD.R2))fire();if(tapped(PAD.L1)&&firearms.held)firearms.reload();
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
    desired.set(-Math.sin(yaw)*forward+Math.cos(yaw)*right,0,-Math.cos(yaw)*forward-Math.sin(yaw)*right);if(desired.length()>1)desired.normalize();desired.multiplyScalar(opening.focus||workAction||talking?0:speed);
    if(workAction&&performance.now()>=workAction.until){const step=workAction.step;workAction=null;const result=step==='cover'?{complete:story.openPipeCover()}:story.capPipe(step);audio.door(true);notify(result.message||(step==='cover'?'Cover released. The isolation wheel is to the left.':story.hasFlag('pipe-capped')?'The telltale holds at zero. The service line is sealed.':'The fitting holds. Check the next point on the schematic.'));syncStoryHud(true);saveStory();}

    // Bound movement substeps prevent thin rail/door tunneling after slow frames.
    // The jump impulse belongs to one substep only, or it is applied N times.
    const count=Math.max(1,Math.ceil(dt/(1/120))),wasAirborne=!body.grounded;
    for(let i=0;i<count;i++)body.step(dt/count,desired,world.colliders,{jump:jumpQueued&&!opening.focus&&!talking&&!workAction&&i===0});
    if(jumpQueued&&body.velocity.y>.5)audio.jump();
    jumpQueued=false;
    if(wasAirborne&&body.grounded&&body.landingImpact>.05)audio.land(body.landingImpact);
    if(body.position.y<2&&!world.special){const p=world.spawn(world.activeLevel);body.teleport(p.x,p.y,p.z);notify('Returned to the nearest safe landing.');}
    const bob=$('reduceMotion').checked?0:Math.sin(body.distanceWalked*8)*.018*Math.min(1,body.horizontalSpeed);
    // The silo's hour, read once and handed to everything that depends on it.
    // It holds still through the cleaning: ninety seconds of Holston crossing
    // the hill should not also be ninety seconds of the sun moving behind him.
    siloClock.running=!opening.watching;
    for(const bell of siloClock.update(dt)){audio.ambient(shiftBell());notify(`Shift change. ${siloClock.schedule.label}, ${siloClock.schedule.clock}.`);}
    const schedule=siloClock.schedule;
    world.schedule=schedule;population.schedule=schedule;
    world.update(dt,body.position);const passage=world.transitionAt(body.position);if(passage)travel(passage);opening.update(dt);population.update(dt,body,opening.watching,cast.selected);population.separatePlayer(body);
    // What the silo sounds like around you: where you are, whether the shaft
    // can carry it to you, and how much of the place is awake to make it.
    {
      const wing=Math.round(Math.atan2(body.position.z,body.position.x)/TAU*6+6)%6,radius=Math.hypot(body.position.x,body.position.z);
      audio.setAmbience({
        place:world.outside?'surface':world.special==='silo17'?'tunnel':world.special==='pipe-gallery'?'mines':world.special||roomType(world.activeLevel,wing),
        inShaft:!world.special&&!world.outside&&radius<SILO.stairRadius+2.6,
        crowd:schedule.crowd,bustle:schedule.bustle,
        silent:opening.watching||!!talking||wading});
      audio.ambientTick(dt);
    }
    // While you are talking the camera settles on whoever you are talking to,
    // so the conversation has a face in it and it is obvious who heard you.
    if(talking?.actor){
      const at=population.actorPosition(talking.actor);
      if(at){
        at.y+=1.52;const to=at.sub(body.position);to.y-=body.eyeHeight;
        const want=Math.atan2(-to.x,-to.z),lift=Math.atan2(to.y,Math.hypot(to.x,to.z));
        yaw+=Math.atan2(Math.sin(want-yaw),Math.cos(want-yaw))*(1-Math.exp(-5*dt));
        pitch+=(lift-pitch)*(1-Math.exp(-5*dt));
      }else endConversation();
    }
    cast.update(dt,body,started);cast.setCamera(camera,body,yaw,pitch,bob);camera.getWorldDirection(direction);const eye=body.position.clone();eye.y+=body.eyeHeight;
    if(talking?.actor){const at=population.actorPosition(talking.actor);if(at&&at.distanceTo(body.position)>5.5)endConversation();}
    props.update(dt,time,story,world.activeLevel,world.special);
    // The supplied hard-drive model is placed by the character cast, so taking
    // it in story mode has to clear it from the bench there.
    if(cast?.relic&&story.story&&story.has('harddrive'))cast.relic.visible=false;
    world.actorInteractions.push(...props.interactions(story,world.activeLevel,world.special));
    // world.storyInteractions belongs to the opening, which rebuilt it above.
    // A second writer here used to overwrite it every frame with a hardcoded
    // Billings prompt, so the directory book could never be picked up and the
    // story could not be started at all; the Billings prompt was a duplicate
    // of the one the population already puts on the man himself, standing a
    // metre off him against the wall of the sheriff's station. Nothing but
    // CafeteriaOpening.update writes this list.
    syncStoryHud();
    stepOutside(eye);
    if(drone.active){
      const event=drone.update(dt,eye);
      if(event==='fired')droneKill();
      else if(event==='landed'){story.droneKilled();world.surface.setNetworkVisible(true);world.rebuildCollision();saveStory();syncStoryHud(true);notify('It is down. Beyond the ridge, more earthen bowls stretch toward the ruined skyline.');}
    }
    // The range's steel plates only exist on the top floor; the weapon keeps
    // working anywhere, but there is nothing to hit outside the room.
    if(world.activeLevel!==1||world.special||world.outside)firearms.targets=[];
    else if(!firearms.targets.length){
      const top=world.loaded.get(1)?.rooms?.[0],found=top?.userData?.rangeTargets;
      if(found){firearms.targets=found;firearms.dressRacks(top);}
    }
    if(firearms.targets.length)updateRangeTargets(firearms.targets,dt);
    if(firearms.held){
      firearms.aiming=keys.has('ShiftLeft')||keys.has('ShiftRight');
      const kick=firearms.update(dt,time);
      // Recoil is added to the player's own aim rather than replacing it, so it
      // can be pulled back down the way a real one has to be.
      yaw+=kick.yaw;pitch=THREE.MathUtils.clamp(pitch+kick.pitch,-1.48,1.48);
      firearms.place(camera);
      if(hudTick!==Math.floor(time*8)){hudTick=Math.floor(time*8);updateWeaponHud();}
    }
    interaction=body.climbing||opening.focus||talking?null:world.nearestInteraction(eye,direction);$('interaction').hidden=!interaction;
    if(interaction){$('interactionLabel').textContent=interaction.label;$('interactionHint').textContent=interaction.hint||'';}
    $('touchUse').style.opacity=interaction||opening.state==='read-book'?'1':'.4';audio.step(body.distanceWalked,body.horizontalSpeed,cast.active?.motion.stepCount);
    crowdSoundTime-=dt;if(crowdSoundTime<=0){crowdSoundTime=opening.watching?4:1.1+Math.random()*1.5;audio.residents?.(population.count,opening.watching);}
  }else if(!started){
    const p=topPoint(...CAFETERIA_START);camera.position.copy(topPoint(0,1.85,10));camera.lookAt(topPoint(0,3.2,39));world.update(dt,p);population.update(dt,body,false,cast.selected);
  }else{if(workAction)workAction.until+=dt*1000;world.update(dt,body.position);cast?.update(0,body,started);}
  audio.setStoryPaused?.(document.hidden||(opening?.watching&&paused()));
  if(relic.open)inspector.render();
  updateInterface(time);
  if(time-lastHUD>.25){
    updateHUD();lastHUD=time;
    // Arriving somewhere correct should say so. Without it there is no way to
    // tell a level you were sent to from a level you wandered into, and the
    // player who is on the right floor goes on looking somewhere else.
    if(started&&story?.story&&!world.special&&!world.outside&&story.arriving(world.activeLevel)){
      // The card carries it. Toasting as well stacked two messages saying the
      // same thing in the same corner of a short screen.
      showObjective(story.chapterInfo.title,story.objective,6000);
      saveStory();
    }else if(started&&story?.story)syncGuidance();
    if(!paused())nudge(performance.now());
  }
  world.surface.renderFeed(renderer,time);
  if(['excavator','tunnel'].includes(world.special)&&!opening?.focus)world.underground.waterSurface.update(renderer,scene,camera,time);
  if(world.special==='silo17')world.silo17.waterSurface.update(renderer,scene,camera,time);
  if(!paused())updateWading(dt);else if(wading)audio.setWadeLevel?.(0);
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
    story=Story.load(savedStory);terminal=GeorgeTerminal.load(savedStory?.terminal);if(savedStory?.clock)siloClock=SiloClock.load(savedStory.clock);world.story=story;props=new StoryProps(scene,world.m);const relicFailures=await props.loadAssets();if(relicFailures)notify('Some relic models could not load. Refresh to retry.');drone=new Drone(scene,world.m);
    if(story.story&&story.chapter!=='cleaning'){opening.finish();const cp=savedStory?.checkpoint;if(cp&&Number.isInteger(cp.level)&&cp.level>=1&&cp.level<=144&&Array.isArray(cp.position)&&cp.position.length===3&&cp.position.every(Number.isFinite)&&[null,'generator','mines','excavator','tunnel','pipe-gallery','silo17'].includes(cp.special)){world.setLevel(cp.level,cp.special);const [x,y,z]=cp.position;const floor=world.colliders.floorAt(x,z,.3,y+1);if(Number.isFinite(floor)&&Math.abs(floor-y)<2)body.teleport(x,floor+.05,z);else{const dest=world.destination(cp.special||cp.level);body.teleport(...dest.position.toArray());}yaw=Number.isFinite(cp.yaw)?cp.yaw:0;}if(story.hasFlag('hideout-open'))world.openBreach();if(story.chapter==='drone'){story.killedByDrone();const back=world.destination('airlock');world.setLevel(1);body.teleport(...back.position.toArray());}world.update(0,body.position);}
    openingChanged(opening.state);syncStoryHud(true);
    outsideTarget=world.surface.initFeed(renderer);renderer.compile(scene,camera);setDirectoryMode(true);
    ready=true;$('resumeButton').hidden=!savedStory;$('enterButton').disabled=false;$('enterButton').textContent='Story · New game';
    if(world.materialFailures)notify('Some surface materials could not load. Refresh to retry.');
    if(world.assetFailures)notify('Some Lost Signal props could not load. The complete architectural reconstruction is still available.');
    frame();
  }catch(error){fatal(error);}
}
// One handle on the running game, for the headless smoke test that drives the
// whole story through in a real browser. Nothing in the game reads it.
window.__silo={begin,fire,use,travel,takeRelic,stepOutside,firearms,takeWeapon,camera,
  look(y,p=0){yaw=y;pitch=p;},
  get story(){return story;},get world(){return world;},get body(){return body;},
  get drone(){return drone;},get opening(){return opening;},get ready(){return ready;},
  get audio(){return audio;},get wading(){return wading;},
  get clock(){return siloClock;},get rendering(){return rendering;}};
boot();
