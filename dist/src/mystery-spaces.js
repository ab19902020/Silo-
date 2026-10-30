import * as THREE from '../vendor/three.module.js';
import {Kit,addSign,fixture,table} from './kit.js';
import {roomPoint} from './characters.js';

export const GEORGE_TERMINAL_POINT=roomPoint(68,0,5.40,3.30).add(new THREE.Vector3(0,1.115,0));
// George Wilkins' machine, and the bay the drive goes into.
//
// The whole chapter is "find the machine this drive belongs to", so the player
// has to be able to see, without being told, that there is a socket here and
// that it is empty. What was here did not do that: a plain black block and a
// 30 mm tube ending in mid-air, and — measured against the table it is meant
// to be standing on — the tower, the keyboard, the block and the paper were
// all floating 60 to 90 mm above the top, with the keyboard and half the block
// hanging off the front edge entirely.
//
// The dining table in this apartment is `table(k,5.7,3.4,1.3,.8)`, whose top
// `kit.js` beds at .79 with a .09 rise: the surface is at .835 and the top
// spans x 5.05..6.35, z 3.0..3.8. Everything below is placed on that surface
// and inside that rectangle.
const TOP=.835;                                   // the table's own top
// The bay's own numbers, so a test can stand a body in front of the slot and
// check the game offers it rather than trusting a comment.
export const DRIVE_BAY=Object.freeze({
  x:6.13, z:3.48,          // centre on the table
  face:3.36,               // the front of the enclosure, where the mouth is
  mouth:{w:.148, h:.079, y0:.866, y1:.945},
});

export function addGeorgeDesk(room,m){
  const k=new Kit(m),bx=DRIVE_BAY.x,bz=DRIVE_BAY.z,face=DRIVE_BAY.face;
  // --- the machine ---------------------------------------------------------
  k.bevel('darkMetal',5.40,TOP+.25,3.55,.58,.50,.42);          // 5.11..5.69, .835..1.335, 3.34..3.76
  k.box('screen',5.40,TOP+.28,3.334,.46,.32,.012);
  k.box('darkMetal',5.40,TOP+.475,3.55,.60,.05,.44);           // the cap, so the shell reads as a box
  // Keyboard, on the table rather than out over the chair, with keys on it.
  k.bevel('metal',5.40,TOP+.022,3.14,.44,.044,.16);
  for(let row=0;row<4;row++)for(let col=0;col<11;col++)
    k.box('darkMetal',5.215+col*.037,TOP+.047,3.085+row*.031,.028,.008,.022);

  // --- the bay -------------------------------------------------------------
  // A desktop cartridge enclosure: plinth, two cheeks, a roof and a dark
  // inside, with a brass rim round a 148 × 79 mm mouth that faces the player.
  // Sized to the drive it takes — the supplied model is 90 × 146 × 52 mm — and
  // then a little over, because a slot you cannot find is the whole complaint.
  k.box('darkMetal',bx,.8505,bz,.20,.031,.24);                 // plinth  .835..866
  for(const dx of [-.087,.087])k.box('darkMetal',bx+dx,.9055,bz,.026,.079,.24);
  k.box('darkMetal',bx,.9575,bz,.20,.025,.24);                 // roof    .945..970
  k.box('darkMetal',bx,.9055,3.591,.174,.079,.018);            // back
  k.box('black',bx,.9055,3.49,.172,.075,.21);                  // the dark inside
  for(const dx of [-.055,.055])k.box('brass',bx+dx,.8705,bz,.009,.006,.22);  // guide rails
  // A rim, so the opening reads as a port rather than a shadow.
  for(const y of [.950,.861])k.box('brass',bx,y,face-.003,.21,.010,.008);
  for(const dx of [-.0875,.0875])k.box('brass',bx+dx,.9055,face-.003,.010,.098,.008);
  // The placard stands on the back of the bay, above the roof, where it is not
  // in front of the slot.
  k.box('darkMetal',bx,1.008,3.565,.20,.076,.013);
  addSign(room,'EXTERNAL\nSTORE 18',[bx,1.008,3.5575],.19,.066,Math.PI,
    {background:'#1a231d',color:'#a9c0aa',font:'bold 62px monospace',border:false});
  // Wired into the back of the machine, and the lead runs along the table
  // rather than through the air over it.
  k.box('black',bx,.888,3.612,.05,.034,.026);
  k.beam('black',[bx,.888,3.624],[6.02,.848,3.72],.009);
  k.beam('black',[6.02,.848,3.72],[5.70,.848,3.76],.009);
  k.beam('black',[5.70,.848,3.76],[5.55,.90,3.755],.009);

  // --- the note ------------------------------------------------------------
  // Tucked half under the bay rather than at the far end of the table. Three
  // prompts do not fit on a table 1.3 m across: standing in front of a note
  // 330 mm from the computer, the game offered the computer every time,
  // because at that range the cone that decides what you are looking at is
  // 56 degrees wide and the two are 28 apart. The note belongs to the bay it
  // is about, so it shares the bay's prompt and sits where that reads.
  k.box('paper',6.11,TOP+.006,3.245,.17,.012,.20);             // 6.03..6.20, 3.15..3.35

  // --- what changes when the drive goes in ---------------------------------
  // Two states, both built once, one visible. Nothing here is rebuilt at
  // runtime, and the screen stops saying MISSING when it stops being missing.
  const empty=new THREE.Group(),seated=new THREE.Group();
  const ek=new Kit(m);ek.box('redLamp',6.192,.8505,face-.006,.028,.016,.006);
  empty.add(ek.group());
  addSign(empty,'EXTERNAL STORAGE\nMISSING',[5.40,TOP+.28,3.326],.44,.30,Math.PI,
    {background:'#071712',color:'#a4c5aa',font:'bold 44px monospace',border:false});
  const sk=new Kit(m);
  sk.box('indicator',6.192,.8505,face-.006,.028,.016,.006);
  sk.bevel('metal',bx,.9055,3.475,.144,.071,.21);              // the drive, in the bay
  sk.box('darkMetal',bx,.9055,face+.012,.144,.071,.012);       // its face, proud of the mouth
  sk.box('brass',bx,.886,face+.003,.06,.012,.007);             // the pull
  seated.add(sk.group());
  addSign(seated,'STORE 18\nMOUNTED',[5.40,TOP+.28,3.326],.44,.30,Math.PI,
    {background:'#071712',color:'#a4c5aa',font:'bold 44px monospace',border:false});
  seated.visible=false;
  room.add(empty);room.add(seated);

  room.add(k.group());

  room.userData.interactions.push(
    {position:[5.40,TOP+.28,3.30],label:'Use George’s computer',action:'george-terminal'},
    {position:[bx,.94,face-.06],label:'Look at the drive bay and the note under it',action:'drive-bay'});

  // The host owns whether the drive is in; the room only draws it.
  const desk={set(inserted){empty.visible=!inserted;seated.visible=!!inserted;}};
  room.userData.georgeDesk=desk;
  return desk;
}

// This route is a declared reconstruction reached from the mine workings.
// All coordinates are local to its independent underground scene.
export function buildPressureGallery(m){
  const root=new THREE.Group(),k=new Kit(m),walkways=[],solids=[],interactions=[];
  root.name='pressure-gallery';
  const floor=(x,z,w,d)=>{k.box('darkConcrete',x,47.8,z,w,.4,d);walkways.push({kind:'box',x,z,w,d,y:48});};
  floor(0,-12,4.8,28);floor(0,7,13,12);
  for(const x of [-2.5,2.5]){k.box('rock',x,50,-12,.3,4.6,28);solids.push({x,z:-12,w:.3,d:28,y0:48,y1:53});}
  for(const x of [-6.6,6.6]){k.box('rock',x,50,7,.3,4.6,12);solids.push({x,z:7,w:.3,d:12,y0:48,y1:53});}
  for(const [x,z,w] of [[0,13,13],[0,-26,5],[-4.5,1,4],[4.5,1,4]]){k.box('rock',x,50,z,w,4.6,.3);solids.push({x,z,w,d:.3,y0:48,y1:53});}
  k.box('rock',0,52.5,-12,5,.4,28);k.box('darkConcrete',0,52.5,7,13,.4,12);
  for(let z=-23;z<12;z+=5){fixture(k,0,51.8,z,1);k.cylinder('rust',1.95,50.5,z,.13,5.1,Math.PI/2);k.box('red',1.78,50.5,z,.03,.3,.5);}
  k.cylinder('rust',0,49.4,10,.19,10,0,0,Math.PI/2);
  for(const x of [-4,-1.5,1.5,4]){k.torus('metal',x,49.4,10,.24,.045,0,Math.PI/2);}
  k.cylinder('metal',-4,49.8,10,.06,.6);k.torus('red',-4,50.1,10,.26,.05,Math.PI/2);
  // The telltale, on the wall board beside the coupling. It is the only thing
  // in the gallery that tells you the work took, so it reads from across the
  // room: the needle sits over on the charged side and swings to zero as the
  // line is isolated and the collar goes on.
  k.box('white',3,49.8,9.76,.5,.65,.12);
  k.box('darkMetal',3,49.86,9.694,.38,.38,.014);
  k.torus('brass',3,49.86,9.684,.185,.012,0);
  for(let i=0;i<=6;i++){const a=Math.PI*1.25-i*Math.PI*.25;
    k.box('white',3+Math.cos(a)*.15,49.86+Math.sin(a)*.15,9.682,.012,.04,.005,0,0,Math.PI/2-a);}
  k.box('red',3+Math.cos(Math.PI*.75)*.15,49.86+Math.sin(Math.PI*.75)*.15,9.680,.02,.06,.005,0,0,-Math.PI/4);
  const needle=new THREE.Group(),nk=new Kit(m);
  nk.box('red',0,.08,0,.014,.185,.005);nk.cylinder('brass',0,0,0,.022,.014,Math.PI/2);
  needle.add(nk.group());needle.position.set(3,49.86,9.676);root.add(needle);
  const cover=new THREE.Group(),ck=new Kit(m);
  ck.bevel('darkMetal',0,49.4,9.65,3.4,1.2,.1);
  // Fasteners, so the cover reads as something you lever off rather than a
  // black rectangle painted on the wall.
  for(const x of [-1.5,-.75,0,.75,1.5])for(const y of [48.92,49.88])ck.cylinder('brass',x,y,9.59,.035,.03,Math.PI/2);
  ck.box('rust',-1.66,49.4,9.59,.05,1.1,.02);ck.box('rust',1.66,49.4,9.59,.05,1.1,.02);
  cover.add(ck.group());root.add(cover);
  const collar=new THREE.Group(),cl=new Kit(m);cl.torus('brass',0,49.4,10,.28,.085,0,Math.PI/2);cl.box('metal',0,49.75,10,.22,.16,.65);collar.add(cl.group());collar.visible=false;root.add(collar);
  addSign(root,'18 / SERVICE\nISOLATE BEFORE OPENING',[0,51.1,12.78],4,.8,Math.PI,{background:'#442e24',color:'#d7c7a0'});
  root.add(k.group());
  for(const z of [-22,-9,6]){const light=new THREE.PointLight(z===6?0xe49b56:0xb2c7c7,65,22,1.8);light.position.set(0,51.7,z);root.add(light);}
  interactions.push({position:[0,49,-24],label:'Return to the ore workings',destination:'mine-deep-face'},
    {position:[0,49.5,9],label:'Remove the inspection cover',action:'pipe-cover'},
    {position:[-4,50,9],label:'Turn the isolation wheel',action:'pipe-isolate'},
    {position:[0,49.5,9],label:'Seat the sealing collar',action:'pipe-collar'},
    {position:[1.4,49.5,9],label:'Torque the collar',action:'pipe-torque'});
  // Charged, isolated, capped: three needle positions, walked to rather than
  // snapped, so you see it fall while you are still standing at the fitting.
  const CHARGED=Math.PI*.25,ISOLATED=-Math.PI*.08,ZERO=-Math.PI*.25;
  needle.rotation.z=CHARGED;
  return {root,solids,walkways,interactions,cover,collar,needle,
    update(story,dt=0){
      cover.visible=!story.hasFlag('pipe-cover-open');
      collar.visible=story.pipeSteps.includes('collar');
      const want=story.hasFlag('pipe-capped')?ZERO:story.pipeSteps.includes('isolate')?ISOLATED:CHARGED;
      needle.rotation.z+=(want-needle.rotation.z)*Math.min(1,dt*3.5);
      if(!dt)needle.rotation.z=want;
    }};
}
