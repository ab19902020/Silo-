import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import { SiloWorld } from '../dist/src/world.js';
import { SILO, TAU, levelY, landingAngle, stairStepY, STAIR_SWEEP } from '../dist/src/data.js';
import { INTERIOR_LIGHT } from '../dist/src/atmosphere.js';
import { topPoint } from '../dist/src/surface.js';
import { SideMissionWorld } from '../dist/src/side-mission-world.js';
import { SideMissions } from '../dist/src/side-missions.js';

globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

// Local incident-light proxy using the shipped PointLight attenuation. This
// measures temporal continuity, not final PBR pixels or device frame rate.
function illumination(world,p){
  let result=world.ambient.intensity;
  for(const l of world.localLights){
    if(!l.visible)continue;
    const distance=l.position.distanceTo(p),cut=Math.max(0,1-(distance/l.distance)**4)**2;
    result+=l.intensity*cut/Math.max(distance**l.decay,.01);
  }
  return result;
}
function settle(w,p){for(let i=0;i<90;i++){w.buildAhead(8);w.update(1/60,p);}}

test('running up and down three flights never resets the light pool or jumps exposure at a floor boundary',()=>{
  const w=new SiloWorld(new T.Scene()),p=new T.Vector3();
  const at=t=>{const level=52-Math.floor(t),u=t%1,a=landingAngle(level)+u*STAIR_SWEEP;p.set(Math.cos(a)*5.6,levelY(level)+stairStepY(u*(SILO.stairSteps-1)),Math.sin(a)*5.6);};
  at(0);w.setLevel(52);settle(w,p);
  let previous=illumination(w,p),maxJump=0,crossings=0;
  const last=new Map();
  for(let i=0;i<1200;i++){
    at(i<600?i/600*2.999:(1199-i)/600*2.999);
    const before=w.activeLevel;w.buildAhead(4);w.update(1/60,p);
    const value=illumination(w,p);maxJump=Math.max(maxJump,Math.abs(value-previous)/previous);previous=value;
    if(before!==w.activeLevel)crossings++;
    assert.equal(w.localLights.filter(l=>l.visible).length,8,'light-count shader variant changed');
    assert.ok(w.localLights.filter(l=>l.intensity>1).length>=3,'stair flight lost its practical lighting');
    assert.equal(w.sun.intensity,0);assert.equal(w.sun.visible,false);
    for(const l of w.localLights){
      const prior=last.get(l);
      if(prior?.intensity>.5&&l.intensity>.5)assert.ok(l.position.equals(prior.position),'a lit source moved');
      last.set(l,{position:l.position.clone(),intensity:l.intensity});
    }
  }
  assert.equal(crossings,6);assert.ok(maxJump<.04,`a walking frame changed incident lighting by ${maxJump*100}%`);
});

test('entering a wing blends between fittings without duplicate room fill or player-bearing switches',()=>{
  const w=new SiloWorld(new T.Scene()),p=new T.Vector3(20,levelY(50),0);w.setLevel(50);settle(w,p);
  let previous=illumination(w,p),maxJump=0;
  for(let i=0;i<900;i++){
    const radius=20+24*(1-Math.cos(i/900*TAU))/2;
    p.set(radius,levelY(50),0);w.update(1/60,p);
    const value=illumination(w,p);maxJump=Math.max(maxJump,Math.abs(value-previous)/previous);previous=value;
    assert.ok(w.localLights.every(l=>l.visible&&l.color.getHex()===INTERIOR_LIGHT));
    assert.ok(!w.lampCandidates(p).some(c=>/^c50:/.test(c.key)),'duplicate generic wing sources returned');
  }
  assert.ok(maxJump<.035,`doorway brightness popped by ${maxJump*100}%`);
  const candidate=w.lampCandidates(p)[0];assert.ok(w.lampCandidates(p).includes(candidate),'static fixtures are being rebuilt every frame');
});

test('top-floor wings and stairs have real sources as well as the cafeteria',()=>{
  const w=new SiloWorld(new T.Scene());w.setLevel(1);
  const a=TAU/6,p=new T.Vector3(Math.cos(a)*33,levelY(1),Math.sin(a)*33);
  assert.ok(w.lampCandidates(p).some(c=>c.key.startsWith('r1:1:')),'cafeteria early return hides other top-floor wings');
  p.set(5.6,levelY(1),0);assert.ok(w.lampCandidates(p).some(c=>c.key.startsWith('stair1:')));
  const room=w.loaded.get(1).rooms[1];room.updateWorldMatrix(true,false);
  const expected=new T.Vector3(...room.userData.lightPoints[0].position).applyMatrix4(room.matrixWorld);
  p.copy(expected);assert.ok(w.lampCandidates(p).find(c=>c.key==='r1:1:0').position.distanceTo(expected)<1e-8);
});

test('fast travel starts with destination lighting and only the real exterior enables sunlight',()=>{
  const w=new SiloWorld(new T.Scene());w.setLevel(26);settle(w,new T.Vector3(53.6,levelY(26),0));
  w.setLevel(100);const p=new T.Vector3(53.6,levelY(100),0);w.update(1/60,p);
  assert.ok(w.localLights.filter(l=>l.intensity>10).length>=3,'travel destination faded up from black');
  assert.ok(w.localLights.filter(l=>l.intensity>0).every(l=>Math.abs(l.position.y-p.y)<10),'old-floor sources survived travel');
  w.setLevel(144,'tunnel');w.update(1/60,new T.Vector3(0,6,0));assert.equal(w.sun.intensity,0);assert.ok(w.localLights.every(l=>!l.visible));assert.equal(w.keyLight.intensity,0);
  w.setLevel(1);w.update(1/60,topPoint(26,14,108));assert.equal(w.outside,true);assert.ok(w.sun.intensity>0);
  w.update(1/60,topPoint(0,0,17));assert.equal(w.outside,false);assert.equal(w.sun.intensity,0);assert.ok(w.localLights.some(l=>l.intensity>10));
});

test('department haze is continuous across the numbered floor boundary',()=>{
  const w=new SiloWorld(new T.Scene());
  for(const level of [50,101]){
    w.setLevel(level);const y=levelY(level)+5,p=new T.Vector3(5.6,y-.001,0);w.update(1/60,p);const density=w.scene.fog.density;
    p.y=y+.001;w.update(1/60,p);assert.ok(Math.abs(w.scene.fog.density-density)<1e-7,'floor counter changed the entire haze');
  }
});

test('repairing the optional work lamp uses the interior pool without adding a shader light',()=>{
  const w=new SiloWorld(new T.Scene()),missions=new SideMissions('explore'),props=new SideMissionWorld();w.setLevel(140);missions.stages.lamp=6;props.update(w,missions);
  const stand=w.loaded.get(140).missionStands.find(s=>s.spec.kind==='panel'),p=stand.position.clone();
  assert.equal(stand.root.userData.light.visible,false);settle(w,p);
  assert.ok(w.localLights.some(l=>l.userData.key===`work:${stand.spec.id}`&&l.intensity>1),'repaired lamp casts no light');
  assert.equal(w.localLights.filter(l=>l.visible).length,8);
});
