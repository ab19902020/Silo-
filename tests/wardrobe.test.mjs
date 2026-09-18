import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { createResident } from '../dist/src/resident-model.js';
import { RESIDENT_CAST } from '../dist/src/resident-data.js';

globalThis.document??={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

const OUTFITS=['work','uniform','shirt','knit','cardigan','vest','coat','medical','robe'];
const wearing=outfit=>({id:`fit-${outfit}`,name:outfit,height:1.78,
  appearance:{outfit,skin:0xb08a6e,hair:0x3a2f26,coat:0x6b7468}});

function meshOf(actor){let mesh;actor.model.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});return mesh;}

// The widest the figure gets at a series of heights, measured in the bind pose
// and as a fraction of standing height. This is the silhouette — the thing you
// read from across a room, before any colour or detail resolves.
//
// Only cloth hanging on the torso and the skirt bones is measured. The arms are
// the same arms whatever anybody is wearing, and at waist height a hanging
// forearm is wider than the waist behind it, so leaving them in measures the
// arms rather than the clothes.
const TORSO=/^(Hips|Spine|Chest|Coat[LR])$/;
function silhouette(actor,heights){
  const mesh=meshOf(actor),position=mesh.geometry.attributes.position;
  const index=mesh.geometry.attributes.skinIndex,weight=mesh.geometry.attributes.skinWeight;
  const names=mesh.skeleton.bones.map(b=>b.name);
  const top=actor.definition.height,out=heights.map(()=>0),band=top*.022;
  const p=new THREE.Vector3();
  for(let i=0;i<position.count;i++){
    const dominant=weight.getX(i)>=weight.getY(i)?index.getX(i):index.getY(i);
    if(!TORSO.test(names[dominant]))continue;
    p.fromBufferAttribute(position,i);
    for(let h=0;h<heights.length;h++){
      const y=heights[h]*top;
      if(Math.abs(p.y-y)<band)out[h]=Math.max(out[h],Math.hypot(p.x,p.z)/top);
    }
  }
  return out;
}

// Before the wardrobe existed, every resident in the silo was one lathe — a
// tube of constant radius squashed in z — and the outfits differed only by a
// few flat cards stuck on the chest. From three metres away the whole cast was
// wearing the same thing, which is the complaint this file exists to hold shut.
test('the wardrobe spans real shapes, not one tube in nine colours',()=>{
  const heights=[.16,.28,.40,.46,.52,.58,.66,.74,.80];
  const shapes=new Map(OUTFITS.map(outfit=>[outfit,silhouette(createResident(wearing(outfit)),heights)]));
  for(const [outfit,shape] of shapes)
    assert.ok(shape.every(Number.isFinite)&&shape[6]>.05,`${outfit} has no body at chest height`);
  const apart=(a,b)=>Math.max(...a.map((v,k)=>Math.abs(v-b[k])));
  const long=['robe','coat','medical'],short=['work','uniform','shirt','knit','cardigan','vest'];
  // The three long garments are a different thing entirely from anything cut to
  // the hip, and they should measure like it.
  for(const a of long)for(const b of short)
    assert.ok(apart(shapes.get(a),shapes.get(b))>.05,
      `${a} does not read as a longer garment than ${b}`);
  // The hip-length ones are honestly closer to each other — a jumper, a shirt, a
  // tunic and a waistcoat really do share an outline, and what separates them in
  // play is the hem, the collar, the closure and the cloth. Still, no two of them
  // may come out as the same cut.
  for(let i=0;i<short.length;i++)for(let j=i+1;j<short.length;j++)
    assert.ok(apart(shapes.get(short[i]),shapes.get(short[j]))>.0015,
      `${short[i]} and ${short[j]} are cut identically`);
  const classes=[];
  for(const shape of shapes.values())
    if(!classes.some(other=>apart(shape,other)<=.004))classes.push(shape);
  assert.ok(classes.length>=7,`the nine outfits collapse into ${classes.length} distinct shapes`);
});

// A coat, a cardigan, a lab coat and a robe hang open, so the garment stands
// further off the body at the sides of the front than it does down the middle
// of it — which a closed tube with a painted stripe down the front cannot do.
// The waistcoat is open too but fitted so close that depth cannot show it; what
// shows that one is the shirt, and the test below measures it.
function frontOfChest(outfit){
  const actor=createResident(wearing(outfit)),mesh=meshOf(actor);
  const position=mesh.geometry.attributes.position,colour=mesh.geometry.attributes.color;
  const index=mesh.geometry.attributes.skinIndex,weight=mesh.geometry.attributes.skinWeight;
  const names=mesh.skeleton.bones.map(b=>b.name),top=actor.definition.height,p=new THREE.Vector3();
  const best={middle:{z:0,i:-1},flank:{z:0,i:-1}};
  for(let i=0;i<position.count;i++){
    const dominant=weight.getX(i)>=weight.getY(i)?index.getX(i):index.getY(i);
    if(!TORSO.test(names[dominant]))continue;
    p.fromBufferAttribute(position,i);
    if(Math.abs(p.y-top*.68)>top*.020||p.z<=0)continue;
    const across=Math.abs(p.x);
    const slot=across<top*.012?best.middle:(across>top*.020&&across<top*.052?best.flank:null);
    if(slot&&p.z>slot.z){slot.z=p.z;slot.i=i;}
  }
  const shade=i=>new THREE.Color(colour.getX(i),colour.getY(i),colour.getZ(i));
  return {step:(best.flank.z-best.middle.z)/top,middle:shade(best.middle.i),flank:shade(best.flank.i)};
}

test('the loose garments that hang open stand off the body down the front',()=>{
  for(const open of ['coat','cardigan','medical','robe']){
    const {step}=frontOfChest(open);
    assert.ok(step>.012,`${open} is supposed to hang open and measures ${(step*1000).toFixed(1)} mm of gap per metre`);
  }
  for(const closed of ['work','uniform','shirt','knit']){
    const {step}=frontOfChest(closed);
    assert.ok(step<.004,`${closed} is a closed garment but stands ${(step*1000).toFixed(1)} mm per metre off its own front`);
  }
});

// And through every one of those openings there is a different garment, which
// is the whole reason a shirt is built under them. A waistcoat sits too close to
// the body for the gap above to register, so this is the measurement that holds
// it: the centre of the chest is a different cloth from the sides of it.
test('an open garment shows the shirt underneath rather than more of itself',()=>{
  for(const open of ['coat','cardigan','medical','robe','vest']){
    const {middle,flank}=frontOfChest(open);
    const apart=Math.abs(middle.r-flank.r)+Math.abs(middle.g-flank.g)+Math.abs(middle.b-flank.b);
    assert.ok(apart>.08,`${open} shows the same cloth down the middle as at the sides (${middle.getHexString()} against ${flank.getHexString()})`);
  }
  for(const closed of ['work','uniform','knit']){
    const {middle,flank}=frontOfChest(closed);
    const apart=Math.abs(middle.r-flank.r)+Math.abs(middle.g-flank.g)+Math.abs(middle.b-flank.b);
    assert.ok(apart<.08,`${closed} is one closed garment but its centre front is a different cloth from its sides`);
  }
});

// The long garments are long. A robe reaches the shin, a coat the thigh, and a
// shirt stops at the waist — so each of them has cloth standing off the leg at a
// height where the next one does not.
test('hem lengths are what the garment names say they are',()=>{
  const at=(outfit,height)=>silhouette(createResident(wearing(outfit)),[height])[0];
  const robe=at('robe',.22),coat=at('coat',.22),shirt=at('shirt',.22);
  assert.ok(robe>shirt+.02,`the mayor's robe (${robe.toFixed(3)}) does not reach past a pair of trousers (${shirt.toFixed(3)})`);
  assert.ok(robe>coat,`the robe should be longer than a coat`);
  const coatThigh=at('coat',.36),shirtThigh=at('shirt',.36);
  assert.ok(coatThigh>shirtThigh+.015,`a long coat has no skirt at thigh height`);
});

// A lathe cannot be wider than it is deep, cannot nip in at the waist and cannot
// put the seat behind the spine. That is why every resident read as a box with a
// head on it, and the waist is the measurement that proves it is gone.
test('the body has a waist between its chest and its hips',()=>{
  for(const outfit of ['shirt','uniform','vest']){
    const [hip,waist,chest]=silhouette(createResident(wearing(outfit)),[.52,.61,.71]);
    assert.ok(waist<chest-.006,`${outfit}: the waist (${waist.toFixed(3)}) is not narrower than the chest (${chest.toFixed(3)})`);
    assert.ok(waist<hip-.004,`${outfit}: the waist (${waist.toFixed(3)}) is not narrower than the hips (${hip.toFixed(3)})`);
  }
});

// A hand at rest hangs edge-on: the palm faces the thigh, so the blade of it is
// deep front-to-back and thin across. Built the other way round it is a paddle
// presented flat to the camera with four straight pegs on it, and it sits right
// on the edge of the silhouette where you cannot miss it.
test('the hands hang edge-on, with the palm towards the thigh',()=>{
  const actor=createResident(wearing('shirt')),mesh=meshOf(actor),position=mesh.geometry.attributes.position;
  const height=actor.definition.height,p=new THREE.Vector3();
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,count=0;
  for(let i=0;i<position.count;i++){
    p.fromBufferAttribute(position,i);
    // The right hand only, and below the cuff, so no sleeve is measured.
    if(p.x>0||p.y>height*.480||p.y<height*.395||Math.abs(p.x)<height*.080)continue;
    minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);count++;
  }
  assert.ok(count>40,`found only ${count} hand vertices to measure`);
  const across=maxX-minX,through=maxZ-minZ;
  assert.ok(through>across*1.45,
    `the hand is ${(across*100).toFixed(1)} cm across and ${(through*100).toFixed(1)} cm front to back; a relaxed hand is the other way round`);
});

// An unknown joint name used to fall through `indexOf` as -1, which becomes
// 65535 in an unsigned skin index and sends the renderer looking for a bone that
// is not there. It took out every resident on the level rather than the one
// garment that named the joint wrongly.
test('every garment is bound to a joint that exists',()=>{
  for(const definition of RESIDENT_CAST)for(const suit of [false,true]){
    if(suit&&definition.story!=='cleaner')continue;
    const mesh=meshOf(createResident(definition,{suit}));
    const bones=mesh.skeleton.bones.length,index=mesh.geometry.attributes.skinIndex.array;
    for(let i=0;i<index.length;i++)
      assert.ok(index[i]<bones,`${definition.id}${suit?' (suit)':''}: vertex ${i>>2} is bound to bone ${index[i]} of ${bones}`);
  }
});
