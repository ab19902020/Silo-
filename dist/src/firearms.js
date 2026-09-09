import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { WEAPONS, shotInterval, aimPose, hipPose, createLoadout, isUsable } from './weapons.js';

const descends = (node, ancestor) => {
  for (let n = node; n; n = n.parent) if (n === ancestor) return true;
  return false;
};
const GUN_URL = name => new URL(`../assets/lost-signal/guns/weapon_${name}_v1.glb`, import.meta.url).href;

// Holding and firing a weapon.
//
// The catalogue, the recoil profiles and the poses come from Lost Signal; this
// is the part that puts one in the player's hands in the silo — loading the
// mesh on demand, tracking what is in the magazine, throwing the camera around
// when it goes off, and working out what the round hit.
//
// Models load the first time a weapon is picked up, not at start-up. Twenty-six
// weapons is fourteen megabytes, and a player who never goes near the sheriff's
// station should never pay for it.
export class Firearms {
  constructor(scene, audio) {
    this.scene = scene; this.audio = audio;
    this.loader = new GLTFLoader(); this.models = new Map(); this.pending = new Map();
    this.loadout = createLoadout();
    this.key = null; this.spec = null; this.model = null;
    this.holder = new THREE.Group(); this.holder.name = 'held-weapon'; scene.add(this.holder);
    this.flash = new THREE.PointLight(0xffd8a0, 0, 14, 2.2); this.flash.visible = false; this.holder.add(this.flash);
    this.nextShot = 0; this.reloadUntil = 0; this.aiming = false;
    this.recoil = { pitch: 0, yaw: 0, pitchRate: 0, yawRate: 0, roll: 0, punch: 0 };
    this.raycaster = new THREE.Raycaster(); this.raycaster.far = 120;
    this.targets = []; this.onHit = null;
  }

  get held() { return this.spec; }
  get ammo() { return this.key ? this.loadout.for(this.key) : null; }
  get reloading() { return this.reloadUntil > 0; }

  // The line the HUD prints. Blades carry no ammunition, so they say so rather
  // than showing an empty magazine.
  status() {
    if (!this.spec) return null;
    if (this.spec.kind === 'melee') return { name: this.spec.name, text: '—' };
    const ammo = this.ammo;
    return { name: this.spec.name, text: `${ammo.magazine} / ${ammo.reserve}`, empty: ammo.magazine === 0, reloading: this.reloading };
  }

  async model_(name) {
    if (this.models.has(name)) return this.models.get(name);
    if (this.pending.has(name)) return this.pending.get(name);
    const job = this.loader.loadAsync(GUN_URL(name)).then(gltf => {
      const original = gltf.scene, marker = original.getObjectByName('LS_ORIENT_YUP'), pivot = new THREE.Group();
      // The same orientation convention the rest of the imported props use.
      if (marker) marker.removeFromParent(); else original.rotation.x = Math.PI / 2;
      pivot.add(original); pivot.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(pivot), centre = bounds.getCenter(new THREE.Vector3());
      original.position.sub(centre);
      pivot.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
      // Lay the long axis of the weapon down the firing line, whichever way the
      // mesh happens to have been modelled.
      const size = bounds.getSize(new THREE.Vector3());
      if (size.x > size.z) pivot.rotation.y = Math.PI / 2;
      this.models.set(name, pivot); this.pending.delete(name);
      return pivot;
    }).catch(() => { this.pending.delete(name); return null; });
    this.pending.set(name, job);
    return job;
  }

  async equip(key) {
    if (!isUsable(key)) return false;
    this.key = key; this.spec = WEAPONS[key];
    this.loadout.for(key);
    this.nextShot = 0; this.reloadUntil = 0;
    this.audio?.loadGuns?.();
    const source = await this.model_(this.spec.model);
    if (this.key !== key) return true;                      // swapped again while loading
    if (this.model) { this.holder.remove(this.model); this.model = null; }
    if (source) {
      this.model = source.clone(true);
      const view = this.spec.view || { scale: .15, offset: [0, 0, 0], flip: false };
      this.model.scale.setScalar(view.scale);
      this.model.position.set(...(view.offset || [0, 0, 0]));
      if (view.flip) this.model.rotation.y += Math.PI;
      this.holder.add(this.model);
    }
    this.syncRacks();
    return true;
  }

  holster() {
    if (this.model) this.holder.remove(this.model);
    this.model = null; this.key = null; this.spec = null; this.reloadUntil = 0;
    this.syncRacks();
    return true;
  }

  resupply() { if (this.key) this.loadout.resupply(this.key); }

  // A shot. Returns what it hit, or null when nothing came out of it.
  fire(now, camera) {
    if (!this.spec || this.reloading) return null;
    if (now < this.nextShot) return null;
    if (this.spec.kind === 'melee') { this.nextShot = now + .45; this.kick(); return null; }
    const ammo = this.ammo;
    if (ammo.magazine <= 0) { this.nextShot = now + .35; this.audio?.gunDry?.(); return null; }
    ammo.magazine--;
    this.nextShot = now + shotInterval(this.spec);
    this.audio?.gunshot?.(this.spec);
    this.kick();
    this.flash.intensity = 2.6 + Math.random() * 1.4; this.flash.visible = true; this.flashUntil = now + .035;
    return this.trace(camera);
  }

  // Where the round went. Spread opens up from the hip and closes when aiming,
  // and a shotgun throws a handful of them at once.
  trace(camera) {
    if (!camera || !this.targets.length) return null;
    const spread = (this.aiming ? this.spec.adsSpread : this.spec.spread) ?? .01;
    const pellets = this.spec.pellets || 1;
    const origin = camera.getWorldPosition(new THREE.Vector3());
    const forward = camera.getWorldDirection(new THREE.Vector3());
    const hits = [];
    for (let i = 0; i < pellets; i++) {
      const direction = forward.clone();
      direction.x += (Math.random() * 2 - 1) * spread;
      direction.y += (Math.random() * 2 - 1) * spread;
      direction.z += (Math.random() * 2 - 1) * spread;
      direction.normalize();
      this.raycaster.set(origin, direction);
      this.raycaster.far = this.spec.range || 90;
      const meshes = [];
      for (const target of this.targets) { if (target.plate) meshes.push(target.plate); if (target.paper) meshes.push(target.paper); }
      const struck = this.raycaster.intersectObjects(meshes, true)[0];
      if (struck) hits.push({ hit: struck, target: this.targetFor(struck.object) });
    }
    for (const entry of hits) if (entry.target) this.register(entry.target, entry.hit);
    return hits.length ? hits[0] : null;
  }

  targetFor(object) {
    for (const target of this.targets)
      if (descends(object, target.plate) || descends(object, target.paper)) return target;
    return null;
  }

  // Steel swings and rings; paper takes a hole. Either way the lane scores.
  // The plate is a group of parts, so the test walks up from whatever mesh the
  // ray actually struck rather than checking one level of parent.
  register(target, hit) {
    target.hits++;
    if (target.plate && descends(hit.object, target.plate)) {
      target.rate += 7.5 + Math.random() * 3;
      this.audio?.plateHit?.(target);
    } else if (target.paper) {
      this.punch(target, hit.point);
    }
    this.onHit?.(target, hit);
  }

  // A hole in the paper, left where the round went through it. Holes are
  // children of the sheet, so they move with it and are counted off it.
  punch(target, point) {
    const holes = target.paper.children;
    if (holes.length >= 60) {
      const oldest = holes[0];
      target.paper.remove(oldest);
      oldest.geometry.dispose(); oldest.material.dispose();
    }
    const hole = new THREE.Mesh(
      new THREE.CircleGeometry(Math.max(.012, (this.spec.calibre || .09) * .32), 8),
      new THREE.MeshBasicMaterial({ color: 0x14171a }));
    hole.position.copy(target.paper.worldToLocal(point.clone()));
    hole.position.z += .006;
    hole.userData.ownedGeometry = hole.userData.ownedMaterial = true;
    target.paper.add(hole);
  }

  reload() {
    if (!this.spec || this.spec.kind === 'melee' || this.reloading) return false;
    const ammo = this.ammo;
    if (ammo.reserve <= 0 || ammo.magazine >= this.spec.magazine) return false;
    this.reloadUntil = this.spec.reloadTime || 1.8;
    this.audio?.gunReload?.(this.spec);
    return true;
  }

  // The catalogue's kick, applied as an impulse the camera has to ride out.
  kick() {
    const k = this.spec.kick; if (!k) return;
    const brace = this.aiming ? k.braced : 1;
    this.recoil.pitchRate += k.rise * brace * 60;
    this.recoil.yawRate += (k.swing * (Math.random() * 2 - 1) + k.bias) * brace * 60;
    this.recoil.roll += k.shove * .012 * (Math.random() * 2 - 1);
    this.recoil.punch = Math.min(1, this.recoil.punch + k.punch * .22);
  }

  // Returns the look the recoil is asking for this frame, which main.js adds to
  // the player's own aim. Nothing here moves the camera directly: the player
  // has to be able to pull back down against it.
  update(dt, now) {
    if (this.reloadUntil > 0) {
      this.reloadUntil -= dt;
      if (this.reloadUntil <= 0) {
        this.reloadUntil = 0;
        const ammo = this.ammo;
        if (ammo) {
          const wanted = Math.min(this.spec.magazine - ammo.magazine, ammo.reserve);
          ammo.magazine += wanted; ammo.reserve -= wanted;
        }
      }
    }
    if (this.flash.visible && now > this.flashUntil) { this.flash.visible = false; this.flash.intensity = 0; }
    const k = this.spec?.kick;
    const recover = k ? k.recover : 8, settle = k ? k.settle : .75;
    const r = this.recoil;
    const pitch = r.pitchRate * dt, yaw = r.yawRate * dt;
    r.pitch += pitch; r.yaw += yaw;
    r.pitchRate *= Math.pow(settle, dt * 60 / 8);
    r.yawRate *= Math.pow(settle, dt * 60 / 8);
    // The muzzle comes back down towards where it started, but not all the way:
    // `climb` is the share of the rise the shooter is left holding.
    const climb = k ? k.climb : .1, pull = Math.min(1, recover * dt);
    r.pitch -= r.pitch * pull * (1 - climb);
    r.yaw -= r.yaw * pull * (1 - climb);
    r.roll -= r.roll * Math.min(1, dt * 6);
    r.punch = Math.max(0, r.punch - dt * 3.2);
    return { pitch, yaw, roll: r.roll };
  }

  // The held model rides the camera, pushed out when aiming and dropped to the
  // hip when not, with the punch of the last shot still in it.
  place(camera) {
    if (!this.model || !camera) return;
    const pose = this.aiming ? aimPose(this.spec) : hipPose(this.spec);
    this.holder.position.copy(camera.position);
    this.holder.quaternion.copy(camera.quaternion);
    this.model.position.set(
      pose[0] + (this.spec.view?.offset?.[0] || 0),
      pose[1] + (this.spec.view?.offset?.[1] || 0),
      pose[2] + (this.spec.view?.offset?.[2] || 0) + this.recoil.punch * .06);
    this.flash.position.set(pose[0], pose[1] + .02, pose[2] - .55);
  }

  // Put the collection on the wall. The rack slots are empty holders named
  // `rack:<key>`; this fills each one with the weapon that belongs in it and
  // takes it away again when the weapon is carried off, so a gap on the rack
  // means somebody is holding it. Called when the player first reaches the
  // range, not at start-up.
  async dressRacks(root) {
    if (!root || this.dressed === root) return;
    this.dressed = root;
    const slots = [];
    root.traverse(node => { if (node.name?.startsWith('rack:')) slots.push(node); });
    for (const slot of slots) {
      const key = slot.name.slice(5), spec = WEAPONS[key];
      if (!spec?.model) continue;
      const source = await this.model_(spec.model);
      if (!source || slot.userData.dressed) continue;
      const display = source.clone(true);
      // Racked weapons lie along the wall, muzzle up for a long gun.
      const tall = spec.family !== 'pistol' && spec.family !== 'revolver' && spec.family !== 'blade';
      display.scale.setScalar((spec.view?.scale || .15) * (tall ? 5.2 : 4.4));
      display.rotation.set(tall ? Math.PI / 2 : 0, 0, 0);
      slot.add(display);
      slot.userData.dressed = display;
    }
    this.syncRacks();
  }

  // The rack shows what is still on it.
  syncRacks() {
    if (!this.dressed) return;
    this.dressed.traverse(node => {
      if (!node.name?.startsWith('rack:')) return;
      const taken = node.name.slice(5) === this.key;
      for (const child of node.children) child.visible = !taken;
    });
  }

  dispose() {
    this.holster();
    this.scene.remove(this.holder);
  }
}
