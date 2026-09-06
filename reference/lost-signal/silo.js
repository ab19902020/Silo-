import * as THREE from 'three';
import { dressPerson } from './creatures.js';

// Silo 47 — a habitation silo, not a weapons one.
//
// Seven residential levels and a secure unit on top, stacked around an open
// light well with a spiral stair running down it. Three hundred people live
// here. Nobody in the silo knows why the world above ended.
//
// Every level is one unbroken circular walkway, six and a half metres wide,
// with nothing standing on it — you can walk the whole ring without stepping
// round anything — and its outer wall is nothing but front doors.
//
// The Blender kit is one level ring, one stair flight and one shell, joined
// into single meshes and instanced up the shaft — eight galleries built from
// two hundred separate objects each would be thousands of draw calls. What is
// authored here is collision and light: a joined ring's bounding box would fill
// the whole level including the open well, so decks are per-bay boxes with a
// real hole in the middle, and the stair gets one box per tread.

export const SILO = {
  shellRadius: 30.8,    // the concrete shell, behind the back wall of the homes
  wellRadius: 13.0,     // the open shaft the walkways look down into
  deckOuter: 19.6,      // 6.6 m of clear walkway, all the way round
  levelHeight: 4.0,
  levels: 7,
  segments: 12,         // 11 family homes + one service bay: 77 homes in all
  stairRadius: 5.4,
  stairColumn: 1.2,     // a slim service core, not a drum filling the well
  stairSteps: 36,
  stairTurn: Math.PI * 2,   // a full turn per level, so the landings stack
  landingHalf: 1.8,
  landingInner: 1.38,       // full-depth landing reaches back to the stair core
  apartmentBack: 29.6,  // rear wall of every home: ten metres deep
  // A 1.24 m opening left less than sixty centimetres of usable centre line
  // once the player's capsule margin was applied. These are residential front
  // doors, not submarine hatches.
  doorHalf: 0.84,
};

const TAU = Math.PI * 2;
const TUNNEL_BAY = 6;
const TUNNEL_ENTRY_HALF = 1.45;
const TUNNEL_DOOR_HALF = 0.98;
const TUNNEL_DOOR_DEPTH = 3.72;

// The level GLB is instanced eight times, but an identical pale wall on every
// floor made the silo read as a stack of white boxes. Clone only the handful
// of finish materials and give each storey a restrained wayfinding identity;
// geometry and textures stay shared.
// One wayfinding colour per storey. Under the old single-amber lighting these
// were almost indistinguishable; against cold service light they read, which
// is the point of painting a level in the first place.
const LEVEL_FINISHES = [
  { facade: 0x413b32, accent: 0x8a4a30 },
  { facade: 0x394338, accent: 0x6e7a4c },
  { facade: 0x364049, accent: 0x3f7288 },
  { facade: 0x46372f, accent: 0x96522c },
  { facade: 0x3b3540, accent: 0x6d5480 },
  { facade: 0x33413e, accent: 0x3d8375 },
  { facade: 0x453f30, accent: 0x9a7a3c },
  { facade: 0x3a3230, accent: 0x8a4038 },
];

function styleLevel(root, level) {
  if (!root) return;
  const finish = LEVEL_FINISHES[level % LEVEL_FINISHES.length];
  const clones = new Map();
  const styled = (material) => {
    if (!material) return material;
    if (clones.has(material)) return clones.get(material);
    const name = (material.name || '').toLowerCase();
    if (!name.includes('facade') && !name.includes('tileband') && !name.includes('paint')) {
      return material;
    }
    const copy = material.clone();
    if (name.includes('facade')) copy.color.setHex(finish.facade);
    else if (name.includes('tileband')) copy.color.setHex(finish.accent);
    else copy.color.lerp(new THREE.Color(finish.facade), 0.18);
    copy.roughness = Math.max(copy.roughness ?? 0.7, 0.74);
    clones.set(material, copy);
    return copy;
  };
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.material = Array.isArray(object.material)
      ? object.material.map(styled)
      : styled(object.material);
  });
}

const box = (minX, minY, minZ, maxX, maxY, maxZ) =>
  new THREE.Box3(new THREE.Vector3(minX, minY, minZ), new THREE.Vector3(maxX, maxY, maxZ));

export function buildSilo({ scene, colliders, place, addInteraction, assets }) {
  if (!assets.habShell || !assets.habLevel || !assets.habStair) return null;

  const {
    shellRadius, wellRadius, deckOuter, levelHeight, levels, segments,
    stairRadius, stairColumn, stairSteps, stairTurn, landingHalf, landingInner,
    apartmentBack, doorHalf,
  } = SILO;
  // A tread is deep in the radial direction and narrow along the helix. The
  // collision used to pass those the other way round, which made every tread a
  // five-metre slab lying across the shaft: the stair looked like a stair and
  // could not be climbed like one.
  const treadDepth = (stairRadius - stairColumn) / 2;      // radial half-extent
  const stairMid = stairColumn + treadDepth;
  const goingHalf = (stairTurn / stairSteps) * stairRadius / 2 * 1.06;
  // The landing has straight sides and the stair guard follows a circle. Clip
  // each guard panel to their exact intersection instead of deleting three
  // whole panels at either end and leaving a ragged six-metre opening.
  const stairGuardRadius = stairRadius + 0.16;
  const landingOpeningAngle = Math.asin(landingHalf / stairGuardRadius);

  const shaftHeight = levels * levelHeight;
  // Each ring piece is a flat slab at its own radius, so each needs its own
  // arc width. One width for all of them leaves gaps at the outside.
  const arcHalf = (radius) => (Math.PI * radius / segments) * 1.06;
  const deckMid = (deckOuter + wellRadius) / 2;
  const deckHalf = (deckOuter - wellRadius) / 2;

  // The silo used to be lit, fogged and backed in one warm amber, so every
  // surface returned the same brown and the shaft had no depth to it. It is a
  // utility structure: the service lighting is cold fluorescent and the only
  // warm light in the place is what spills out of people's front doors. That
  // contrast is what gives the galleries their shape.
  scene.background = new THREE.Color(0x0a0d10);
  scene.fog = new THREE.FogExp2(0x141a20, 0.0088);

  place(assets.habShell, scene, [0, 0, 0], [0, 0, 0], 1, { world: 'silo', collide: false });

  // The outer shell, as the circle it is. Built as thirty-six boxes it had the
  // same fault the walkway had — an axis-aligned box round a wide, thin slab is
  // far bigger than the slab — and it reached three metres inside the shell,
  // through the back wall of every home and into the bedrooms.
  colliders.addRing({ innerRadius: shellRadius, outerRadius: shellRadius + 1.4,
    minY: -1, maxY: shaftHeight + levelHeight * 2 });

  const levelY = (index) => index * levelHeight;
  const gallery = [];

  // Bay 0 is where the stair's landing arrives, on every level, because the
  // flight turns a full circle per storey. The railing opens there and only
  // its short returns are solid — an unbroken ring runs across the mouth of
  // the landing and the floor is then unreachable from the stairwell. Every
  // level goes through here, the secure unit at the top included, because it
  // used to have its own copy of this without the opening.
  // The walkway, its railing and the wall of front doors are circles, so they
  // are collided as circles. Built as one axis-aligned box per bay they were
  // metres wider than the geometry — a box around a slab that is wide along
  // the ring and thin through it is far bigger than the slab — and better than
  // a third of every walkway was solid to the player and invisible on screen.
  const doorGapHalf = doorHalf / (deckOuter - 0.30);
  const tunnelGapHalf = TUNNEL_ENTRY_HALF / (deckOuter - 0.30);
  const railGapHalf = landingHalf / wellRadius;

  function buildLevelRings(y, residential = true) {
    // The walkway itself.
    colliders.addRing({ innerRadius: wellRadius, outerRadius: deckOuter,
      minY: y - 0.3, maxY: y + 0.02, climbable: true });
    // The railing over the well, open where the stair's landing arrives.
    colliders.addRing({ innerRadius: wellRadius - 0.1, outerRadius: wellRadius + 0.1,
      minY: y + 0.02, maxY: y + 1.15, gaps: [[0, railGapHalf]] });
    // The masonry has a real opening at every residential door. Each leaf gets
    // its own switchable arc collider below, so opening a door updates the
    // physical world instead of asking a static wall ring to predict state.
    const gaps = residential
      ? Array.from({ length: segments }, (_, bay) => [
          (bay * TAU) / segments,
          bay === TUNNEL_BAY ? tunnelGapHalf : doorGapHalf,
        ])
      : [];
    colliders.addRing({ innerRadius: deckOuter - 0.45, outerRadius: deckOuter - 0.15,
      minY: y, maxY: y + 2.24,
      gaps });
    // ...and solid all the way round above the door heads.
    colliders.addRing({ innerRadius: deckOuter - 0.45, outerRadius: deckOuter - 0.15,
      minY: y + 2.24, maxY: y + levelHeight });
  }

  // The homes behind that wall: their floor, their ceiling and the shell wall
  // at the back of them.
  function buildHomeRings(y) {
    colliders.addRing({ innerRadius: deckOuter, outerRadius: apartmentBack,
      minY: y - 0.3, maxY: y + 0.02, climbable: true });
    colliders.addRing({ innerRadius: deckOuter, outerRadius: apartmentBack,
      minY: y + levelHeight - 0.4, maxY: y + levelHeight });
    colliders.addRing({ innerRadius: apartmentBack - 0.3, outerRadius: apartmentBack + 0.3,
      minY: y, maxY: y + levelHeight });
  }

  // A wall running outward from the axis, added as several short boxes. One
  // box around the whole slab is axis-aligned, so a long slab at an angle
  // becomes a huge square; a run of short ones stays close to the wall.
  function addRadialWall(angle, r0, r1, halfWidth, minY, maxY, opts = {}) {
    const span = r1 - r0;
    const pieces = Math.max(1, Math.ceil(span / 0.9));
    const step = span / pieces;
    for (let i = 0; i < pieces; i++) {
      const mid = r0 + step * (i + 0.5);
      colliders.addOrientedBox({
        cx: Math.cos(angle) * mid, cz: Math.sin(angle) * mid,
        halfX: step / 2, halfZ: halfWidth, rotationY: -angle,
        minY, maxY, ...opts,
      });
    }
  }

  // ...and one running along the ring, split the same way for the same reason.
  function addArcWall(angle, radius, halfWidth, halfDepth, minY, maxY, opts = {}) {
    const pieces = Math.max(1, Math.ceil(halfWidth / 0.45));
    const step = (halfWidth * 2) / pieces;
    for (let i = 0; i < pieces; i++) {
      const offset = -halfWidth + step * (i + 0.5);
      const pieceAngle = angle + offset / radius;
      colliders.addOrientedBox({
        cx: Math.cos(pieceAngle) * radius, cz: Math.sin(pieceAngle) * radius,
        halfX: halfDepth, halfZ: step / 2, rotationY: -pieceAngle,
        minY, maxY, ...opts,
      });
    }
  }

  // One bay on every level is an arched tunnel rather than a home: the silo's
  // landmark, facing the stair's landing across the well. It is the same
  // bearing on every level because the level ring is one mesh — the bay whose
  // facade is left out of it has to be in the same place each time — and a
  // landmark you can rely on is what makes a round building navigable.
  const tunnelBay = () => TUNNEL_BAY;

  const doorwayAngle = (level, bay) => {
    // Deterministic starting states. Half the homes begin open so a new player
    // immediately sees lived-in rooms, while every closed one can be opened.
    return ((level * 5 + bay * 7) % 4) < 2;
  };

  const openBaysFor = (level) => {
    const open = [];
    for (let bay = 0; bay < segments; bay++) {
      if (bay === TUNNEL_BAY) continue;
      if (doorwayAngle(level, bay)) open.push(bay);
    }
    return open;
  };

  for (let level = 0; level < levels; level++) {
    const y = levelY(level);
    const levelRoot = place(assets.habLevel, scene, [0, y, 0], [0, 0, 0], 1,
      { world: 'silo', collide: false });
    styleLevel(levelRoot, level);
    buildLevelRings(y, true);
    buildHomeRings(y);
    gallery.push({ level, y });
  }

  // The spiral stair, one flight per level, each rotated on from the last.
  for (let level = 0; level < levels; level++) {
    const base = levelY(level);
    const spin = level * stairTurn;
    place(assets.habStair, scene, [0, base, 0], [0, -spin, 0], 1, { world: 'silo', collide: false });

    const rise = levelHeight / stairSteps;
    for (let i = 0; i < stairSteps; i++) {
      const angle = spin + (i * stairTurn) / stairSteps;
      const top = base + i * rise + 0.09;
      // Keep collision in the tread's true rotated footprint. A conservative
      // axis-aligned bound is almost two metres wider at diagonal bearings;
      // neighbouring bounds then overlap into an invisible shelf that catches
      // the player part-way down an otherwise continuous flight.
      colliders.addOrientedBox({
        cx: Math.cos(angle) * stairMid,
        cz: Math.sin(angle) * stairMid,
        halfX: treadDepth,
        halfZ: goingHalf,
        rotationY: -angle,
        minY: top - 0.55,
        maxY: top,
        climbable: true,
      });
      // Clip the collision exactly as the Blender balustrade is clipped. The
      // central route stays comfortably open while both edges become solid
      // immediately outside the 3.6 m landing.
      const localAngle = (i * stairTurn) / stairSteps;
      const panelStart = localAngle - stairTurn / stairSteps / 2;
      const panelEnd = localAngle + stairTurn / stairSteps / 2;
      const guardStart = Math.max(panelStart, landingOpeningAngle);
      const guardEnd = Math.min(panelEnd, stairTurn - landingOpeningAngle);
      if (guardEnd > guardStart) {
        const guardAngle = spin + (guardStart + guardEnd) / 2;
        // Resolve the faceted visual rail as the curved barrier it follows.
        // Independent rotated rectangles create tiny corners between panels;
        // a capsule following the helix can catch on one even though the rail
        // looks continuous. Polar arcs keep the same guarded span and let the
        // controller slide smoothly all the way to the landing opening.
        colliders.addArc({
          innerRadius: stairGuardRadius - 0.18,
          outerRadius: stairGuardRadius + 0.18,
          centre: guardAngle,
          halfWidth: (guardEnd - guardStart) / 2,
          minY: top,
          maxY: top + 1.05,
        });
      }
    }
    // The core the helix wraps is solid; the shaft around it stays open.
    colliders.addBox(box(-(stairColumn - 0.15), base, -(stairColumn - 0.15),
      stairColumn - 0.15, base + levelHeight, stairColumn - 0.15), {});
  }

  // --- Homes and service bulkheads -----------------------------------------
  // Every residential leaf is now a real stateful door. The masonry ring has
  // permanent apertures; a short polar collider belongs to each leaf and is
  // disabled only after the same state change that swings the visible mesh.
  const lightSources = [];
  const addLightSource = (color, base, distance, position, active = true) => {
    const source = { id: lightSources.length, color: new THREE.Color(color), base, distance,
      position: position.clone(), active };
    lightSources.push(source);
    return source;
  };
  const apartmentMid = (deckOuter + apartmentBack) / 2;
  const apartmentDepth = (apartmentBack - deckOuter) / 2;
  const homes = [];
  const sofas = [];
  const seats = [];
  const furnitureColliders = [];
  const homeDoors = [];
  const tunnelDoors = [];
  const homeDoorByKey = new Map();
  const tunnelDoorByLevel = new Map();
  const yAxis = new THREE.Vector3(0, 1, 0);
  // One shared, invisible ray target per home turns the authored sofa into a
  // real interaction without splitting the joined apartment GLB into hundreds
  // of draw calls. It remains visible to the raycaster but writes no pixels.
  const sofaHitGeometry = new THREE.BoxGeometry(1.95, 0.92, 0.72);
  const benchHitGeometry = new THREE.BoxGeometry(1.95, 0.58, 0.48);
  const sofaHitMaterial = new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0, depthWrite: false, colorWrite: false,
  });

  const updateDoorLabel = (state) => {
    const interaction = state.root?.userData?.interaction;
    if (!interaction) return;
    interaction.name = `${state.open ? 'CLOSE' : 'OPEN'} ${state.label}`;
  };

  function setHomeDoor(level, bay, open) {
    const state = homeDoorByKey.get(`${level}:${bay}`);
    if (!state) return false;
    state.open = !!open;
    state.collider.enabled = !state.open;
    for (const source of state.lights) source.active = state.open;
    updateDoorLabel(state);
    return true;
  }

  function setTunnelDoor(level, open) {
    const state = tunnelDoorByLevel.get(level);
    if (!state) return false;
    state.open = !!open;
    state.collider.enabled = !state.open;
    for (const source of state.lights) source.active = state.open;
    updateDoorLabel(state);
    return true;
  }

  // The service bay, on every level including the secure one. The level ring
  // leaves this bay's facade out so the arch has an opening to stand in, so a
  // level without a tunnel in it is a level with a five-metre hole in its wall:
  // that is what the top landing had, and why the player arriving from the
  // shelter could see straight through the wall and down the shaft.
  function buildTunnelBay(level, y) {
    {
      const bay = TUNNEL_BAY;
      const angle = (bay * TAU) / segments;
      {
        const rotationY = -angle + Math.PI / 2;
        const baseRadius = deckOuter - 0.30;
        const basePosition = new THREE.Vector3(
          Math.cos(angle) * baseRadius, y, Math.sin(angle) * baseRadius);
        if (assets.habTunnel) {
          place(assets.habTunnel, scene, basePosition.toArray(), [0, rotationY, 0], 1,
            { world: 'silo', collide: false });
        }

        // The door sits at the back of the arched passage. The new tunnel kit
        // continues behind it into a furnished maintenance room, so opening it
        // reveals actual playable space instead of a wall texture.
        const doorRadius = baseRadius + TUNNEL_DOOR_DEPTH;
        const hingeLocal = new THREE.Vector3(-TUNNEL_DOOR_HALF, 0, TUNNEL_DOOR_DEPTH)
          .applyAxisAngle(yAxis, rotationY);
        const hingeWorld = basePosition.clone().add(hingeLocal);
        let doorRoot = null;
        const closedRotation = rotationY;
        if (assets.habBulkheadDoor) {
          doorRoot = place(assets.habBulkheadDoor, scene, hingeWorld.toArray(),
            [0, closedRotation, 0], 1, { world: 'silo', collide: false });
        }
        const doorCollider = colliders.addArc({
          innerRadius: doorRadius - 0.18, outerRadius: doorRadius + 0.18,
          minY: y, maxY: y + 2.32, centre: angle,
          halfWidth: TUNNEL_DOOR_HALF / doorRadius,
        });
        // Solid frame returns either side of the moving leaf.
        const frameHalf = (TUNNEL_ENTRY_HALF - TUNNEL_DOOR_HALF) / 2;
        const frameOffset = TUNNEL_DOOR_HALF + frameHalf;
        for (const side of [-1, 1]) {
          colliders.addArc({
            innerRadius: doorRadius - 0.22, outerRadius: doorRadius + 0.22,
            minY: y, maxY: y + 2.48,
            centre: angle + side * frameOffset / doorRadius,
            halfWidth: frameHalf / doorRadius,
          });
        }
        // Both sides of the service room are physical all the way to the shell.
        for (const side of [-0.5, 0.5]) {
          addRadialWall((bay + side) * TAU / segments,
            deckOuter - 0.1, apartmentBack, 0.16, y, y + levelHeight);
        }

        const state = {
          level, bay, open: false, root: doorRoot, collider: doorCollider,
          closedRotation, lights: [],
          // The top ring is the secure unit, not a numbered residential level.
          label: level === levels
            ? 'SECURE UNIT — SERVICE BULKHEAD'
            : `SERVICE BULKHEAD — LEVEL ${levels - level}`,
        };
        tunnelDoors.push(state);
        tunnelDoorByLevel.set(level, state);
        if (doorRoot) {
          addInteraction(doorRoot, `OPEN ${state.label}`, 'silo', () => {
            setTunnelDoor(level, !state.open);
            window.dispatchEvent(new CustomEvent('lostsignal:bulkhead', {
              detail: { open: state.open, level: levels - level },
            }));
          });
        }
        addLightSource(0xffbd82, 10, 8.5,
          new THREE.Vector3(Math.cos(angle) * (baseRadius + 1.45), y + 2.65,
            Math.sin(angle) * (baseRadius + 1.45)));
        state.lights.push(addLightSource(0xffc991, 8, 9.5,
          new THREE.Vector3(Math.cos(angle) * (doorRadius + 2.15), y + 2.8,
            Math.sin(angle) * (doorRadius + 2.15)), false));
        updateDoorLabel(state);
      }
    }
  }

  // Homes on the residential levels only; the top ring is the secure unit.
  for (let level = 0; level < levels; level++) {
    const y = levelY(level);
    buildTunnelBay(level, y);
    for (let bay = 0; bay < segments; bay++) {
      const angle = (bay * TAU) / segments;
      const initialOpen = doorwayAngle(level, bay);
      if (bay === TUNNEL_BAY) continue;

      // All homes exist, including those whose doors start shut. Frustum
      // culling means only the rooms in view draw, and a player may now open
      // any front door instead of discovering a decorative dead end.
      if (assets.habApartment) {
        const rotationY = -angle + Math.PI / 2;
        const homePosition = new THREE.Vector3(
          Math.cos(angle) * apartmentMid, y, Math.sin(angle) * apartmentMid);
        const home = place(assets.habApartment, scene,
          homePosition.toArray(),
          [0, rotationY, 0], 1, { world: 'silo', collide: false });
        home.userData.home = { level, bay };
        homes.push(home);

        const sofa = new THREE.Mesh(sofaHitGeometry, sofaHitMaterial);
        sofa.name = `SofaInteraction_${level}_${bay}`;
        sofa.position.set(2.60, 0.55, 0.28);
        home.add(sofa);
        const toWorld = (local) => local.applyAxisAngle(yAxis, rotationY).add(homePosition);
        const seat = toWorld(new THREE.Vector3(2.60, 0.02, 0.28));
        const stand = toWorld(new THREE.Vector3(2.60, 0.02, -1.60));
        const unit = `QUARTERS ${String(levels - level).padStart(2, '0')}-${String(bay + 1).padStart(2, '0')}`;
        addInteraction(sofa, `SIT ON SOFA — ${unit}`, 'silo', () => {
          window.dispatchEvent(new CustomEvent('lostsignal:sofa', {
            detail: { seat: seat.clone(), stand: stand.clone(), yaw: rotationY, unit },
          }));
        });
        sofas.push(sofa);
        seats.push(sofa);

        // The dining bench is usable as well. Both targets are deliberately
        // separate from the joined render mesh, keeping every home to one draw
        // call while still giving the furniture more than decorative value.
        const bench = new THREE.Mesh(benchHitGeometry, sofaHitMaterial);
        bench.name = `DiningSeatInteraction_${level}_${bay}`;
        bench.position.set(1.00, 0.36, -2.33);
        home.add(bench);
        const benchSeat = toWorld(new THREE.Vector3(1.00, 0.02, -2.33));
        const benchStand = toWorld(new THREE.Vector3(1.00, 0.02, -3.55));
        addInteraction(bench, `SIT AT DINING TABLE — ${unit}`, 'silo', () => {
          window.dispatchEvent(new CustomEvent('lostsignal:sofa', {
            detail: { seat: benchSeat.clone(), stand: benchStand.clone(), yaw: rotationY,
              unit: `${unit} · DINING TABLE` },
          }));
        });
        seats.push(bench);

        // Major visible furniture is physical. Low objects are climbable only
        // after a jump reaches their top; tall shelving and wardrobes remain
        // full-height blockers. Small decoration inherits the solid surface it
        // sits on, so mugs do not need hundreds of capsule tests per frame.
        const addFurniture = (name, x, z, halfX, halfZ, min, max, climbable = false) => {
          const centreLocal = new THREE.Vector3(x, 0, z).applyAxisAngle(yAxis, rotationY);
          const collider = colliders.addOrientedBox({
            cx: homePosition.x + centreLocal.x,
            cz: homePosition.z + centreLocal.z,
            halfX, halfZ, rotationY,
            minY: y + min, maxY: y + max, climbable,
          });
          collider.name = `${name}_${level}_${bay}`;
          furnitureColliders.push(collider);
        };
        const furniture = [
          ['hall-console', -4.36, -3.88, .50, .58, 0, .84, false],
          ['hall-plant', 4.38, -3.48, .38, .38, 0, 1.28, false],
          ['kitchen-counter', -4.43, -1.55, .46, 1.15, 0, 1.04, true],
          ['kitchen-larder', -2.12, -2.20, .42, .42, 0, 2.10, false],
          ['dining-table', 1.00, -1.45, 1.00, .62, 0, .80, true],
          ['dining-bench-front', 1.00, -2.33, .96, .24, 0, .49, true],
          ['dining-bench-back', 1.00, -.57, .96, .24, 0, .49, true],
          ['sofa', 2.60, .42, 1.06, .62, 0, 1.02, true],
          ['coffee-table', 2.60, -.70, .48, .48, 0, .61, true],
          ['living-pouf-a', .65, .55, .42, .42, 0, .78, true],
          ['living-pouf-b', 4.15, .60, .38, .38, 0, .72, true],
          ['tub-chair', 4.05, -.75, .55, .55, 0, 1.00, true],
          ['bookcase', 4.43, -1.85, .26, .66, 0, 2.60, false],
          ['living-plant', -.55, .48, .34, .34, 0, 1.30, false],
          ['parent-bed', -2.55, 3.15, 1.02, 1.10, 0, .72, true],
          ['bedside-table', -1.18, 2.27, .28, .28, 0, .66, true],
          ['wardrobe', -4.25, 4.52, .50, .40, 0, 2.20, false],
          ['parent-pouf', -4.05, 1.95, .35, .35, 0, .65, true],
          ['bunk-bed', 2.25, 3.20, 1.03, 1.10, 0, 2.35, false],
          ['child-desk', 4.25, 3.70, .38, .59, 0, .80, true],
          ['toy-crate', .55, 4.55, .36, .30, 0, .46, true],
        ];
        for (const spec of furniture) addFurniture(...spec);
      }

      const hinge = -doorHalf + 0.04;
      const dx = Math.cos(angle) * (deckOuter - 0.28) + Math.sin(angle) * hinge;
      const dz = Math.sin(angle) * (deckOuter - 0.28) - Math.cos(angle) * hinge;
      const closedRotation = -angle + Math.PI / 2;
      let doorRoot = null;
      if (assets.habDoor) {
        doorRoot = place(assets.habDoor, scene, [dx, y, dz],
          [0, closedRotation - (initialOpen ? 1.82 : 0), 0], 1,
          { world: 'silo', collide: false });
      }
      const doorRadius = deckOuter - 0.30;
      const doorCollider = colliders.addArc({
        innerRadius: doorRadius - 0.18, outerRadius: doorRadius + 0.18,
        minY: y, maxY: y + 2.22, centre: angle,
        halfWidth: doorHalf / doorRadius, enabled: !initialOpen,
      });
      const state = {
        level, bay, open: initialOpen, root: doorRoot, collider: doorCollider,
        closedRotation, lights: [],
        label: `QUARTERS ${String(levels - level).padStart(2, '0')}-${String(bay + 1).padStart(2, '0')}`,
      };
      homeDoors.push(state);
      homeDoorByKey.set(`${level}:${bay}`, state);
      if (doorRoot) {
        addInteraction(doorRoot, `${initialOpen ? 'CLOSE' : 'OPEN'} ${state.label}`, 'silo', () => {
          setHomeDoor(level, bay, !state.open);
          window.dispatchEvent(new CustomEvent('lostsignal:quarters', {
            detail: { open: state.open, unit: state.label },
          }));
        });
      }
      for (const [depth, base] of [[2.2, 6], [5.0, 8], [8.4, 5]]) {
        state.lights.push(addLightSource(0xffc78f, base, 9.5,
          new THREE.Vector3(Math.cos(angle) * (deckOuter + depth), y + 3.05,
            Math.sin(angle) * (deckOuter + depth)), initialOpen));
      }
      updateDoorLabel(state);

      // The room plan collision exists regardless of the starting door state.
      const homeWidth = 2 * (Math.PI * deckOuter / segments) - 0.3;
      const halfW = homeWidth / 2;
      const halfD = apartmentDepth;
      const centre = apartmentMid;
      const T = 0.10, DW = 0.62, WIDE = 1.80, top = y + levelHeight - 0.5;
      const across = (z, x0, x1) => addArcWall(
        angle + ((x0 + x1) / 2) / centre, centre + z, (x1 - x0) / 2, T, y, top);
      const along = (x, z0, z1) => addRadialWall(
        angle + x / centre, centre + z0, centre + z1, T, y, top);
      const HALL_BACK = -2.75, KITCHEN_X = -1.40, KITCHEN_BACK = -0.35, BED_FRONT = 1.25;
      const kitchenDoor = -3.10, livingGap = 0.0, bedA = -2.50, bedB = 2.50;
      across(HALL_BACK, -halfW, kitchenDoor - DW);
      if (livingGap - WIDE > kitchenDoor + DW + 0.02) {
        across(HALL_BACK, kitchenDoor + DW, livingGap - WIDE);
      }
      across(HALL_BACK, livingGap + WIDE, halfW);
      along(KITCHEN_X, HALL_BACK, KITCHEN_BACK);
      across(BED_FRONT, -halfW, bedA - DW);
      across(BED_FRONT, bedA + DW, bedB - DW);
      across(BED_FRONT, bedB + DW, halfW);
      along(0, BED_FRONT, halfD);

      // The walls between one home and its neighbour.
      const boundary = ((bay + 0.5) * TAU) / segments;
      addRadialWall(boundary, deckOuter, apartmentBack, 0.2, y, y + levelHeight);
    }
  }

  // --- The two ends of the shaft --------------------------------------------
  // Looking up and looking down both used to finish on a blank disc, which is
  // the most obviously unfinished thing in the silo. The head is a coffered
  // slab with a lit oculus in the middle of it; the floor is a stepped drain
  // around a bolted sump. Both give the shaft somewhere to end.
  const crownY = levelY(levels) + levelHeight;
  if (assets.habCrown) {
    place(assets.habCrown, scene, [0, crownY, 0], [0, 0, 0], 1, { world: 'silo', collide: false });
    colliders.addRing({ innerRadius: 0, outerRadius: wellRadius + 1.7,
      minY: crownY - 0.6, maxY: crownY + 1.2 });
    // The oculus reads as the light source, so there is one behind it.
    const oculus = new THREE.PointLight(0xf2e6cc, 58, 24, 1.8);
    oculus.position.set(0, crownY - 0.9, 0);
    scene.add(oculus);
  }
  if (assets.habSump) {
    place(assets.habSump, scene, [0, 0, 0], [0, 0, 0], 1, { world: 'silo', collide: false });
    colliders.addRing({ innerRadius: 0, outerRadius: wellRadius + 0.4,
      minY: -0.4, maxY: 0.02, climbable: true });
    // Two work lamps stand down there; they are what you see from six levels up.
    for (const angle of [1.9, 5.1]) {
      const lamp = new THREE.PointLight(0xdff0ff, 42, 18, 1.8);
      lamp.position.set(Math.cos(angle) * (wellRadius - 3.4), 1.72,
        Math.sin(angle) * (wellRadius - 3.4));
      scene.add(lamp);
    }
  }

  // A bridge from the stair to the gallery on every level: without one the
  // helix ends in mid-air and the galleries are unreachable.
  const landingSpan = (wellRadius + 0.3 - stairRadius) / 2;
  const landingMid = stairRadius + landingSpan;
  const landingOuter = wellRadius + 0.3;
  const landingDeckSpan = (landingOuter - landingInner) / 2;
  const landingDeckMid = landingInner + landingDeckSpan;
  for (let level = 0; level <= levels; level++) {
    const y = levelY(level);
    // At the foot of that level's flight: the bottom tread stands at floor
    // height, so stepping off it puts you straight onto the landing.
    const angle = level * stairTurn;
    const landingAsset = level === levels ? assets.habTopLanding : assets.habLanding;
    if (landingAsset) {
      place(landingAsset, scene,
        [Math.cos(angle) * landingMid, y, Math.sin(angle) * landingMid],
        [0, -angle + Math.PI / 2, 0], 1, { world: 'silo', collide: false });
    }
    // The old landing stopped at the stair's outer radius. On the secure top
    // level there is no next flight beneath that missing inner section, so a
    // player walking straight over the final joint fell into the shaft. This
    // full-depth platform laps under the arrival tread and stays guarded.
    colliders.addOrientedBox({
      cx: Math.cos(angle) * landingDeckMid,
      cz: Math.sin(angle) * landingDeckMid,
      halfX: landingDeckSpan,
      halfZ: landingHalf,
      rotationY: -angle,
      minY: y - 0.3,
      maxY: y + 0.02,
      climbable: true,
    });
    // The authored landing parapets used to be visual only, so the player
    // could walk through either one and fall into the shaft. These oriented
    // boxes follow both radial edges and overlap the gallery returns.
    // Begin the straight parapets where the circular stair balustrade meets
    // them. Extending a parapet back to the service core puts a rail straight
    // across the helical treads: it looks protective from the gallery and
    // becomes an impassable barrier to anyone actually using the stair.
    // Which edge is a stair mouth is therefore decided per side, not per level:
    // sealing both on the head platform, as this used to, walled the player off
    // the one flight they can actually walk down.
    const guardOuter = wellRadius + 0.12;
    for (const side of [-1, 1]) {
      const offset = side * landingHalf;
      // Side -1 is the edge this level's own flight climbs away through; it
      // does not exist on the head platform, so there the rail closes right
      // in to the core. Side +1 is always the mouth of the flight arriving
      // from below and always stays clear of the treads.
      const isStairMouth = side < 0 ? level < levels : true;
      const guardInner = isStairMouth ? stairGuardRadius : landingInner;
      const guardMid = (guardInner + guardOuter) / 2;
      const guardHalf = (guardOuter - guardInner) / 2;
      colliders.addOrientedBox({
        cx: Math.cos(angle) * guardMid + Math.sin(angle) * offset,
        cz: Math.sin(angle) * guardMid - Math.cos(angle) * offset,
        halfX: guardHalf,
        halfZ: 0.19,
        rotationY: -angle,
        minY: y + 0.02,
        maxY: y + 1.18,
      });
    }
    if (level === levels) {
      // Nothing rises through the head platform's inner edge. This cross-piece
      // joins the two long rails and physically prevents a player walking off
      // it into the full-height shaft. It sits inside the treads' inner radius
      // so it never stands in the descending lane.
      const innerRailRadius = landingInner + 0.15;
      colliders.addOrientedBox({
        cx: Math.cos(angle) * innerRailRadius,
        cz: Math.sin(angle) * innerRailRadius,
        halfX: 0.19,
        halfZ: landingHalf + 0.04,
        rotationY: -angle,
        minY: y + 0.02,
        maxY: y + 1.18,
      });
    }
  }

  // --- Fittings -------------------------------------------------------------
  // Hydroponics and mess tables, spread so no two levels read the same.
  const dress = [];
  for (let level = 0; level < levels; level++) {
    const y = levelY(level);
    if (assets.habHydroponics && level % 3 === 1) {
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3 + level * 0.4;
        const radius = deckOuter - 2.6;
        const rack = place(assets.habHydroponics, scene,
          [Math.cos(angle) * radius, y, Math.sin(angle) * radius], [0, -angle + Math.PI / 2, 0], 1,
          { world: 'silo' });
        if (i === 0) {
          addInteraction(rack, `HYDROPONICS — LEVEL ${levels - level}`, 'silo',
            () => window.dispatchEvent(new CustomEvent('lostsignal:hydroponics', { detail: { level: levels - level } })));
        }
        dress.push(rack);
      }
    }
    if (assets.habCommons && level % 3 === 2) {
      for (let i = 0; i < 2; i++) {
        const angle = (i * Math.PI) + level * 0.7;
        const radius = deckOuter - 3.4;
        dress.push(place(assets.habCommons, scene,
          [Math.cos(angle) * radius, y, Math.sin(angle) * radius], [0, -angle, 0], 1,
          { world: 'silo' }));
      }
    }
    if (assets.habDirectory) {
      const angle = level * 0.9 + 0.28;
      const radius = wellRadius + 1.1;
      place(assets.habDirectory, scene,
        [Math.cos(angle) * radius, y, Math.sin(angle) * radius], [0, -angle + Math.PI / 2, 0], 1,
        { world: 'silo', collide: false });
    }
  }

  // --- The secure unit ------------------------------------------------------
  // Top landing, above the residential levels. The CCTV console watches it.
  const topY = levelY(levels);
  const secureLevelRoot = place(assets.habLevel, scene, [0, topY, 0], [0, 0, 0], 1,
    { world: 'silo', collide: false });
  styleLevel(secureLevelRoot, levels);
  // Same rings as any other level, with no open doorways: up here the wall of
  // the secure unit is solid. This level used to carry its own copy of the
  // walkway collision, which is how it ended up without the railing opening
  // the landing needs.
  buildLevelRings(topY, false);
  buildTunnelBay(levels, topY);
  for (let i = 0; i < segments; i++) {
    const angle = (i * Math.PI * 2) / segments;
    // The service bay carries the arch and its bulkhead, not a front door.
    if (i === TUNNEL_BAY) continue;

    // The level ring carries a doorway in every bay. On the residential levels
    // a home stands behind each one; up here there is only the secure unit, so
    // the openings get shut doors rather than being left as holes onto nothing.
    if (assets.habDoor) {
      const hinge = -doorHalf + 0.04;
      place(assets.habDoor, scene,
        [Math.cos(angle) * (deckOuter - 0.28) + Math.sin(angle) * hinge, topY,
         Math.sin(angle) * (deckOuter - 0.28) - Math.cos(angle) * hinge],
        [0, -angle + Math.PI / 2, 0], 1, { world: 'silo', collide: false });
    }
  }

  const secureAngle = Math.PI * 0.25;
  const secureRadius = deckOuter - 0.9;
  const securePosition = new THREE.Vector3(
    Math.cos(secureAngle) * secureRadius, topY, Math.sin(secureAngle) * secureRadius);
  let secureDoor = null;
  if (assets.habSecureDoor) {
    secureDoor = place(assets.habSecureDoor, scene,
      [securePosition.x, topY, securePosition.z], [0, -secureAngle + Math.PI / 2, 0], 1,
      { world: 'silo', collide: false });
    addInteraction(secureDoor, 'SECURE UNIT — ENTRANCE', 'silo',
      () => window.dispatchEvent(new CustomEvent('lostsignal:secureunit')));
  }

  // The way back up to the shelter, on the top landing.
  const shaftAngle = Math.PI * 1.25;
  const shaftPosition = new THREE.Vector3(
    Math.cos(shaftAngle) * (deckOuter - 1.0), topY, Math.sin(shaftAngle) * (deckOuter - 1.0));
  if (assets.accessControl) {
    const panel = place(assets.accessControl, scene,
      [shaftPosition.x, topY + 1.05, shaftPosition.z], [0, -shaftAngle + Math.PI / 2, 0], 0.75,
      { world: 'silo', collide: false });
    addInteraction(panel, 'ACCESS SHAFT — CLIMB TO SHELTER', 'silo',
      () => window.dispatchEvent(new CustomEvent('lostsignal:ascend')));
  }

  const cache = assets.siloCache ? place(assets.siloCache, scene,
    [Math.cos(2.1) * (deckOuter - 2.2), 0, Math.sin(2.1) * (deckOuter - 2.2)], [0, -2.1, 0], 1,
    { world: 'silo' }) : null;
  if (cache) {
    addInteraction(cache, 'SILO STORES', 'silo',
      () => window.dispatchEvent(new CustomEvent('lostsignal:cache')));
  }

  // The galleries have to look occupied. Ten residents walk and talk; these are
  // the rest of the three hundred, joined into one mesh each so a populated
  // silo costs draw calls rather than skeletons.
  const crowd = [];
  const stillBuilds = ['A', 'B', 'C', 'D', 'E', 'F']
    .map((k) => assets[`residentStill${k}`]).filter(Boolean);
  if (stillBuilds.length) {
    for (let level = 0; level < levels; level++) {
      const y = levelY(level);
      const count = 3 + ((level * 5) % 4);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + level * 0.83;
        const radius = wellRadius + 0.55 + ((i + level) % 3) * 0.5;
        const figure = place(stillBuilds[(level * 3 + i) % stillBuilds.length], scene,
          [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
          [0, Math.atan2(-Math.cos(angle), -Math.sin(angle)) + (i % 2 ? 0.4 : -0.3), 0], 1,
          { world: 'silo', collide: false });
        dressPerson(figure, level * 5 + i);
        crowd.push(figure);
      }
    }
  }

  // --- Lighting -------------------------------------------------------------
  // A silo is lit level by level. Strip lights over the doors give each gallery
  // its own band of light, and the well between them stays dim, which is what
  // sells the drop.
  // Warm. The silo used to be lit with a blue sky light and a blue ambient,
  // which turned every wall in it cold grey-blue — the opposite of how the
  // living spaces are meant to read.
  scene.add(new THREE.HemisphereLight(0xa99d89, 0x211b16, 1.08));
  scene.add(new THREE.AmbientLight(0x665c4d, 0.44));

  // A hemisphere light barely touches a vertical wall — its contribution is
  // driven by how much of the surface faces up — so the shaft's tall surfaces,
  // the stair's column above all, fell to black between point lights. Two
  // opposed directionals light every vertical face regardless of distance, at
  // the cost of two lights rather than one per level.
  for (const [dx, dz] of [[1, 0.35], [-1, -0.35]]) {
    const wash = new THREE.DirectionalLight(0xcbb9a0, 0.33);
    wash.position.set(dx * 40, shaftHeight * 0.6, dz * 40);
    wash.target.position.set(0, shaftHeight * 0.35, 0);
    scene.add(wash, wash.target);
  }

  // The previous system created every lamp, sorted them by distance each frame
  // and snapped the fourteenth one off. Walking changed that membership several
  // times a second, so whole walls visibly flashed. These authored positions
  // feed a fixed twelve-light pool instead. A source fades completely before a
  // pool slot moves, and assigned sources receive hysteresis at the boundary.
  for (let level = 0; level <= levels; level++) {
    const y = levelY(level) + levelHeight - 0.5;
    // Six fittings a level rather than four: with four, the walkway between
    // them fell away to nothing and the ring read as four lit patches.
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (i * TAU) / count + level * 0.5;
      addLightSource(0xcfe0ec, 24, 13.5,
        new THREE.Vector3(Math.cos(angle) * (deckOuter - 2.2), y,
          Math.sin(angle) * (deckOuter - 2.2)));
      // A second, tighter fitting over the inner edge of the deck, so the
      // balustrade and the drop beyond it are readable from the walkway.
      addLightSource(0xbdd2e2, 13, 9.0,
        new THREE.Vector3(Math.cos(angle + 0.5) * (wellRadius + 1.6), y,
          Math.sin(angle + 0.5) * (wellRadius + 1.6)));
    }
  }

  const LIGHT_POOL_SIZE = 12;
  const lightPool = Array.from({ length: LIGHT_POOL_SIZE }, () => {
    const light = new THREE.PointLight(0xffd9a2, 0, 14, 2);
    light.visible = true;
    scene.add(light);
    return { light, source: null, target: 0 };
  });
  const rankedSources = [];

  function sourceScore(source, playerPosition, assigned) {
    const dx = source.position.x - playerPosition.x;
    const dz = source.position.z - playerPosition.z;
    const dy = source.position.y - playerPosition.y;
    // Strong floor preference, plus hysteresis so two equally distant lamps do
    // not trade the final pool slot on alternating frames.
    return (dx * dx + dz * dz + dy * dy * 5.5) * (assigned ? 0.72 : 1);
  }

  function sourceIntensity(source, playerPosition) {
    const dx = source.position.x - playerPosition.x;
    const dz = source.position.z - playerPosition.z;
    const dy = (source.position.y - playerPosition.y) * 1.8;
    const distance = Math.hypot(dx, dy, dz);
    return source.base * (1 - THREE.MathUtils.smoothstep(distance, 8, 18));
  }

  function updateLightPool(dt, playerPosition) {
    const assigned = new Set(lightPool.map((slot) => slot.source).filter(Boolean));
    rankedSources.length = 0;
    for (const source of lightSources) {
      if (!source.active) continue;
      source.score = sourceScore(source, playerPosition, assigned.has(source));
      rankedSources.push(source);
    }
    rankedSources.sort((a, b) => a.score - b.score);
    const selected = rankedSources.slice(0, LIGHT_POOL_SIZE);
    const wanted = new Set(selected);

    for (const slot of lightPool) {
      if (slot.source && !wanted.has(slot.source)) slot.target = 0;
      if (slot.source && !wanted.has(slot.source) && slot.light.intensity < 0.035) {
        slot.source = null;
      }
    }

    const already = new Set(lightPool.map((slot) => slot.source).filter(Boolean));
    for (const source of selected) {
      if (already.has(source)) continue;
      const slot = lightPool.find((candidate) => !candidate.source);
      if (!slot) break;
      slot.source = source;
      slot.light.position.copy(source.position);
      slot.light.color.copy(source.color);
      slot.light.distance = source.distance;
      slot.light.decay = 2;
      slot.light.intensity = 0;
      already.add(source);
    }

    for (const slot of lightPool) {
      slot.target = slot.source && wanted.has(slot.source)
        ? sourceIntensity(slot.source, playerPosition) : 0;
      slot.light.intensity = THREE.MathUtils.damp(
        slot.light.intensity, slot.target, slot.target > slot.light.intensity ? 5.0 : 4.0, dt);
    }
  }

  // Culled lights leave the far side of the well black, which reads as a void
  // rather than as a silo. A ring of wide, always-on lights stands in the open
  // shaft between the stair and the galleries. They hang out here rather than
  // on the axis because a light inside the stair column lights everything
  // except the column, which is how the silo's spine came to be a black
  // cylinder. They are never culled, so the visible light count stays constant.
  const fillRadius = stairRadius + 2.4;
  for (let i = 0; i < 4; i++) {
    const angle = (i * TAU) / 4 + 0.35;
    const fill = new THREE.PointLight(0x9fb4c4, 88, 36, 1.8);
    fill.position.set(Math.cos(angle) * fillRadius,
      (shaftHeight / 3) * i + levelHeight * 0.55,
      Math.sin(angle) * fillRadius);
    scene.add(fill);
  }

  // A single hard light at the very top of the well, so looking up reads as a
  // long way from the surface and looking down reads as a long way to fall.

  const crown = new THREE.SpotLight(0xdce6ee, 340, shaftHeight + 12, 0.46, 0.78, 2);
  crown.position.set(0, topY + levelHeight - 0.4, 0);
  crown.target.position.set(0, 0, 0);
  scene.add(crown, crown.target);

  const secureGlow = new THREE.PointLight(0xff6a4a, 8, 5.5, 2);
  secureGlow.position.copy(securePosition).setY(topY + 1.6);
  scene.add(secureGlow);

  // Dust in the well.
  const motes = 420;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(motes * 3);
  const speeds = new Float32Array(motes);
  for (let i = 0; i < motes; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * (deckOuter - 0.5);
    positions[i * 3] = Math.cos(angle) * distance;
    positions[i * 3 + 1] = Math.random() * (shaftHeight + levelHeight);
    positions[i * 3 + 2] = Math.sin(angle) * distance;
    speeds[i] = 0.1 + Math.random() * 0.36;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dust = new THREE.Points(geometry, new THREE.PointsMaterial({
    color: 0xd2dad6, size: 0.03, transparent: true, opacity: 0.26, depthWrite: false,
  }));
  scene.add(dust);

  // The player arrives on the top landing, at the head of the stair.
  const spawn = new THREE.Vector3(
    Math.cos(shaftAngle) * (deckOuter - 2.6), topY + 0.06, Math.sin(shaftAngle) * (deckOuter - 2.6));

  // Where residents can walk: the mid-radius of each gallery.
  const walkable = [];
  for (let level = 0; level < levels; level++) {
    walkable.push({ y: levelY(level) + 0.02, radius: deckMid });
  }

  function update(dt, playerPosition) {
    if (playerPosition) updateLightPool(dt, playerPosition);
    for (const door of homeDoors) {
      if (!door.root) continue;
      door.root.rotation.y = THREE.MathUtils.damp(door.root.rotation.y,
        door.closedRotation - (door.open ? 1.82 : 0), 6.5, dt);
    }
    for (const door of tunnelDoors) {
      if (!door.root) continue;
      door.root.rotation.y = THREE.MathUtils.damp(door.root.rotation.y,
        door.closedRotation - (door.open ? 1.62 : 0), 5.2, dt);
    }

    const array = geometry.attributes.position.array;
    const ceiling = shaftHeight + levelHeight;
    for (let i = 0; i < motes; i++) {
      array[i * 3 + 1] -= speeds[i] * dt;
      if (array[i * 3 + 1] < 0.1) array[i * 3 + 1] = ceiling;
    }
    geometry.attributes.position.needsUpdate = true;
  }

  // Which bays stand open, per level, so a navigation check can visit the
  // rooms behind them rather than re-deriving the rule and drifting from it.
  const openBays = [];
  for (let level = 0; level < levels; level++) openBays.push(openBaysFor(level));
  const homeBays = Array.from({ length: levels }, () =>
    Array.from({ length: segments }, (_, bay) => bay).filter((bay) => bay !== TUNNEL_BAY));
  const lightState = () => ({
    energy: lightPool.reduce((sum, slot) => sum + slot.light.intensity, 0),
    active: lightPool.filter((slot) => slot.light.intensity > 0.05).length,
    maximum: Math.max(0, ...lightPool.map((slot) => slot.light.intensity)),
    assignments: lightPool.filter((slot) => slot.source).length,
    // QA observes slot identity as the player moves. Reassigning a slot while
    // it is still bright is the wall-sized flash seen in the supplied mobile
    // recording, even when total light energy happens to remain similar.
    slots: lightPool.map((slot) => ({
      source: slot.source?.id ?? -1,
      intensity: slot.light.intensity,
    })),
  });

  return { spawn, update, walkable, secureDoor, securePosition, topY, shaftHeight, homes, sofas,
           seats, furnitureColliders,
           openBays, homeBays, homeDoors, tunnelDoors, setHomeDoor, setTunnelDoor, lightState,
           tunnelBay: TUNNEL_BAY, tunnelDoorRadius: deckOuter - 0.30 + TUNNEL_DOOR_DEPTH,
           apartmentMid,
           stairRadius, stairColumn, stairSteps, stairTurn, landingHalf, landingInner,
           wellRadius, deckOuter,
           levelHeight, levels, segments };
}
