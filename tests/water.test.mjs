import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { VoidWater } from '../dist/src/water.js';

// A stand-in for the void's water sheet: the class only needs a mesh with a
// material it can clone and a shader hook it can attach to.
function sheet(){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(4,4),new THREE.MeshStandardMaterial());
  return new VoidWater(mesh);
}

test('a ripple is recorded where the foot went in, and the ring buffer wraps',()=>{
  const water=sheet();
  water.uniforms.waterTime.value=3.5;
  water.ripple(12,-4,1.2);
  const [x,z,started,strength]=water.ripples.subarray(0,4);
  assert.equal(x,12);assert.equal(z,-4);
  assert.equal(started,3.5,'the ring must remember when it started or it cannot expand');
  assert.ok(Math.abs(strength-1.2)<1e-6,`strength stored as ${strength}`);
  // Six slots, oldest overwritten: a walking pace outruns any fixed list, and
  // growing one every step would leak for as long as the player is in the water.
  const slots=water.rippleSlots;
  for(let i=0;i<slots+2;i++)water.ripple(i,i,1);
  assert.equal(water.ripples.length,slots*4,'the buffer grew instead of wrapping');
  // Slot 0 was written first, then again by the ripple that wrapped onto it.
  assert.equal(water.ripples[0],slots-1,'the buffer did not wrap onto its oldest slot');
});

test('ripple strength is bounded, so one hard entry cannot flood the surface',()=>{
  const water=sheet();
  water.ripple(0,0,50);
  assert.ok(water.ripples[3]<=2,`strength ${water.ripples[3]} was not clamped`);
  water.ripple(1,1,-3);
  assert.ok(water.ripples[7]>0,'a negative strength must not produce a dead ring');
});

test('the wake follows the player and is switched off when they leave',()=>{
  const water=sheet();
  water.setWade(9,-2,.8);
  assert.deepEqual(water.uniforms.waterWade.value.toArray(),[9,-2,.8]);
  water.setWade(0,0,0);
  assert.equal(water.uniforms.waterWade.value.z,0,'the churn kept running after the player left the water');
  water.setWade(0,0,4);
  assert.equal(water.uniforms.waterWade.value.z,1,'the wake amount must be bounded');
});

test('the shader declares the ripple uniforms it reads',()=>{
  const water=sheet();
  assert.ok(water.uniforms.waterRipples,'no ripple uniform');
  assert.ok(water.uniforms.waterWade,'no wake uniform');
  // The cache key has to change with the shader, or a browser that compiled the
  // old program will keep using it and none of this will appear.
  assert.notEqual(water.material.customProgramCacheKey(),'silo-continuous-reflective-water-v1');
});
