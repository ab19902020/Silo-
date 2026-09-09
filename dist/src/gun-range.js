import * as THREE from '../vendor/three.module.js';
import { Kit, addSign, fixture, shelf } from './kit.js';
import { WEAPONS, USABLE_WEAPON_KEYS } from './weapons.js';

// The sheriff's range, behind the station on Level 1.
//
// Twenty-two metres of room south of the office, entered through a doorway cut
// in the station's own back wall. The lanes run away from that door, so nobody
// is ever firing towards it: you come in behind the firing line and everything
// downrange is pointed at the backstop.
//
// A silo that hangs people for going outside keeps its firearms somewhere, and
// the deputies have to qualify on them somewhere too. The room is a placement,
// not a claim — nothing in the source material describes it.
export const RANGE = Object.freeze({
  x: 26, z: 13, width: 16, depth: 22,      // x 18..34, z 2..24
  door: 24,                                 // the wall it shares with the station
  line: 20.5,                               // where the shooter stands
  targets: 7.5,                             // where the targets hang
  backstop: 3.2,
  height: 4.7,
});

// Which rack each weapon sits in, and in what order. Long guns on the west
// wall, handguns and blades on the east, because a rifle on a pegboard at
// waist height is a rifle you cannot see the whole of.
const LONG = ['rifle', 'shotgun', 'sniper', 'smg'];

export function buildGunRange(m) {
  const root = new THREE.Group();
  root.name = 'sheriff-gun-range';
  const k = new Kit(m), solids = [], floors = [], interactions = [], targets = [];
  const box = (mat, x, y, z, w, h, d, solid = true) => {
    k.box(mat, x, y, z, w, h, d);
    if (solid) solids.push({ x, z, w, d, y0: y - h / 2, y1: y + h / 2 });
  };
  const { x: cx, z: cz, width, depth, height } = RANGE;

  // --- the room ------------------------------------------------------------
  k.box('floor', cx, -.2, cz, width, .4, depth);
  floors.push({ x: cx, z: cz, w: width, d: depth, y: 0 });
  box('darkConcrete', cx, height + .2, cz, width, .4, depth, false);          // ceiling
  box('pale', cx - width / 2, height / 2, cz, .3, height, depth);             // west
  box('pale', cx + width / 2, height / 2, cz, .3, height, depth);             // east
  box('pale', cx, height / 2, cz - depth / 2, width, height, .3);             // far end, behind the backstop

  // The doorway back into the station. The station's own wall is split around
  // it in top-floor.js; this is the frame and the lintel.
  for (const side of [-1, 1]) box('pale', cx + side * 3.15, height / 2, RANGE.door, 9.7, height, .3);
  box('pale', cx, height - .55, RANGE.door, 2.6, 1.1, .3);
  addSign(root, 'RANGE', [cx, 3.42, RANGE.door - .17], 2.2, .42, Math.PI);

  // --- the backstop --------------------------------------------------------
  // Sloped plate steel over sand, angled to throw everything down into the
  // trap rather than back up the lanes.
  const bs = RANGE.backstop;
  k.bevel('darkMetal', cx, 1.55, bs, width - .8, 3.1, .35, 0);
  for (let i = 0; i < 9; i++) k.beam('rust', [cx - width / 2 + .9 + i * 1.7, .1, bs + .3], [cx - width / 2 + .9 + i * 1.7, 3.05, bs + .12], .045);
  box('soil', cx, .55, bs + .75, width - .8, 1.1, 1.2);
  k.bevel('darkMetal', cx, 1.18, bs + 1.35, width - .8, .12, .5);
  addSign(root, 'NO ENTRY BEYOND THIS LINE', [cx, 3.35, bs + .2], 5.2, .4, 0);

  // --- lanes ---------------------------------------------------------------
  // Four lanes, divided to shoulder height so a shooter cannot drift sideways
  // into the next one, and open above so the range officer can see the line.
  const lanes = [-6, -2, 2, 6].map(dx => cx + dx);
  for (const x of [cx - 8, cx - 4, cx, cx + 4, cx + 8]) {
    if (x <= cx - 8 || x >= cx + 8) continue;
    box('metal', x, .9, RANGE.line - 2.2, .12, 1.8, 5.2);
  }
  for (let i = 0; i < lanes.length; i++) {
    const x = lanes[i];
    // The bench each shooter works off: weapon down, muzzle downrange.
    k.bevel('metal', x, .95, RANGE.line, 3.3, .1, .95);
    for (const dx of [-1.4, 1.4]) k.beam('darkMetal', [x + dx, 0, RANGE.line], [x + dx, .9, RANGE.line], .05);
    k.box('darkMetal', x, .55, RANGE.line + .38, 3.2, .06, .3);
    addSign(root, `LANE ${i + 1}`, [x, 2.55, RANGE.line - .1], 1.15, .3, 0);
    fixture(k, x, height - .2, RANGE.targets + 3, 2.4);
  }

  // --- targets -------------------------------------------------------------
  // Two per lane: a hanging paper silhouette, and a steel plate on a pivot that
  // swings when it is hit and rights itself again. The plate is the one you can
  // hear from the firing line, which is the point of a plate.
  for (let i = 0; i < lanes.length; i++) {
    const x = lanes[i], z = RANGE.targets;
    k.beam('darkMetal', [x - 1.05, 0, z], [x - 1.05, 2.9, z], .045);
    k.beam('darkMetal', [x + 1.05, 0, z], [x + 1.05, 2.9, z], .045);
    k.beam('darkMetal', [x - 1.05, 2.85, z], [x + 1.05, 2.85, z], .04);

    const paper = new THREE.Mesh(new THREE.PlaneGeometry(.62, 1.28), m.paper.clone());
    paper.position.set(x, 1.72, z + .02);
    paper.userData.ownedGeometry = paper.userData.ownedMaterial = true;
    root.add(paper);
    // The silhouette printed on it, so the sheet reads as a target and not a
    // blank sheet of paper hung in a corridor.
    const figure = new THREE.Mesh(new THREE.PlaneGeometry(.42, .96), new THREE.MeshBasicMaterial({ color: 0x2b2f31 }));
    figure.position.set(x, 1.78, z + .035);
    figure.userData.ownedGeometry = figure.userData.ownedMaterial = true;
    root.add(figure);

    const plate = new THREE.Group();
    plate.position.set(x, 1.05, z - .35);
    const pk = new Kit(m);
    pk.cylinder('metal', 0, 0, 0, .21, .035, Math.PI / 2);
    pk.torus('darkMetal', 0, 0, .02, .215, .02, Math.PI / 2);
    plate.add(pk.group());
    root.add(plate);
    k.beam('darkMetal', [x, 0, z - .35], [x, .84, z - .35], .035);

    targets.push({ lane: i + 1, plate, paper, figure, x, z, swing: 0, rate: 0, hits: 0 });
  }

  // --- the racks -----------------------------------------------------------
  // Every weapon in the collection, on the wall, with a plate under it. Taking
  // one is an interaction on the rack slot; the model itself is not loaded
  // until it is picked up.
  const long = USABLE_WEAPON_KEYS.filter(key => LONG.includes(WEAPONS[key].family));
  const side = USABLE_WEAPON_KEYS.filter(key => !LONG.includes(WEAPONS[key].family));
  const rack = (keys, wallX, facing) => {
    const top = RANGE.line - 1.2, bottom = RANGE.targets + 2.4;
    const span = top - bottom, step = span / Math.max(1, keys.length);
    shelf(k, wallX + facing * .38, (top + bottom) / 2, 1.1, 2.6);
    keys.forEach((key, index) => {
      const z = bottom + step * (index + .5), spec = WEAPONS[key];
      const tall = LONG.includes(spec.family);
      const y = tall ? 1.55 : 1.28;
      // A stand-in silhouette so the rack is not empty before anything loads,
      // and so a taken weapon leaves a visible gap.
      const stub = new Kit(m);
      stub.box('darkMetal', 0, 0, 0, tall ? .06 : .05, tall ? .12 : .10, tall ? .95 : .34);
      const holder = stub.group();
      holder.position.set(wallX + facing * .3, y, z);
      holder.name = `rack:${key}`;
      root.add(holder);
      k.beam('brass', [wallX + facing * .22, y - .16, z - .1], [wallX + facing * .22, y - .16, z + .1], .012);
      interactions.push({
        position: [wallX + facing * .95, 1.45, z],
        label: `Take the ${spec.name}`,
        action: `rack:${key}`,
        rackSlot: key,
      });
    });
  };
  rack(long, RANGE.x - RANGE.width / 2, 1);
  rack(side, RANGE.x + RANGE.width / 2, -1);
  addSign(root, 'LONG ARMS', [RANGE.x - RANGE.width / 2 + .2, 3.15, RANGE.targets + 6], 3, .38, Math.PI / 2);
  addSign(root, 'SIDEARMS', [RANGE.x + RANGE.width / 2 - .2, 3.15, RANGE.targets + 6], 3, .38, -Math.PI / 2);

  // --- the ammunition bench ------------------------------------------------
  const ammoZ = RANGE.line + 1.6;
  box('green', cx - 6.2, .55, ammoZ, 2.6, 1.1, .9);
  k.bevel('metal', cx - 6.2, 1.14, ammoZ, 2.7, .09, 1);
  for (const dx of [-.7, 0, .7]) for (const dz of [-.2, .2]) k.cylinder('brass', cx - 6.2 + dx, 1.26, ammoZ + dz, .085, .16);
  addSign(root, 'AMMUNITION', [cx - 6.2, 2.05, ammoZ - .5], 2.2, .34, 0);
  interactions.push({ position: [cx - 6.2, 1.4, ammoZ - .9], label: 'Resupply', action: 'range-resupply' });
  solids.push({ x: cx - 6.2, z: ammoZ, w: 2.6, d: .9, y0: 0, y1: 1.2 });

  // A bench to rack whatever you are carrying back where it came from.
  interactions.push({ position: [cx + 6.2, 1.4, ammoZ - .9], label: 'Rack the weapon', action: 'range-rack' });
  box('green', cx + 6.2, .55, ammoZ, 2.6, 1.1, .9);
  k.bevel('metal', cx + 6.2, 1.14, ammoZ, 2.7, .09, 1);

  // --- light ---------------------------------------------------------------
  for (const z of [RANGE.targets + 1, RANGE.targets + 7, RANGE.line + 1.5])
    for (const x of [cx - 5, cx + 5]) fixture(k, x, height - .18, z, 3.2);

  root.add(k.group());
  root.userData = { solids, floors, interactions, targets };
  return { root, solids, floors, interactions, targets };
}

// Steel swings when it is hit and comes back. Paper does not, so a hit on paper
// only ever adds a hole; the plate is what tells you at fifteen metres that you
// hit something.
export function updateRangeTargets(targets, dt) {
  for (const target of targets) {
    if (!target.rate && !target.swing) continue;
    target.rate += (-target.swing * 46 - target.rate * 5.5) * dt;
    target.swing += target.rate * dt;
    if (Math.abs(target.swing) < .002 && Math.abs(target.rate) < .02) target.swing = target.rate = 0;
    target.plate.rotation.x = target.swing;
  }
}
