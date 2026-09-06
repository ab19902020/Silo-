import * as THREE from '../vendor/three.module.js';

// Lost Signal physics.
//
// The world rule keeps every *visible* object in Blender, so collision volumes
// are derived from the bounds of those Blender meshes instead of being hand
// authored as magic rectangles. Colliders are axis-aligned boxes tested against
// a vertical capsule (a circle in XZ plus a height span), which gives us wall
// sliding, walk-under clearance for ceiling pipes, and step-up onto low props.

const EPSILON = 1e-4;
const TAU = Math.PI * 2;
// How finely a sparse object is split, and how full its bounding box has to be
// before splitting is not worth the extra collider tests.
const OBJECT_CELL = 0.75;
const OBJECT_GRID = 4;
const OBJECT_FILL = 0.8;
const OBJECT_TRIANGLE_BUDGET = 20000;
const normaliseAngle = (a) => ((a % TAU) + TAU) % TAU;
const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _point = new THREE.Vector3();

export class ColliderSet {
  constructor(bounds = null) {
    this.boxes = [];
    // Rings: the silo is a body of revolution, and its two circular walls and
    // its walkways are not boxes. Approximating them with one axis-aligned box
    // per bay put metres of invisible collision into the walkway — an
    // axis-aligned box round a slab that is wide along the ring and thin
    // through it is far larger than the slab. A ring is exact, and one test.
    this.rings = [];
    // Short curved barriers such as individual silo doors. Keeping these in
    // polar space avoids the oversized invisible corners produced by an AABB
    // around a thin door that is rotated forty-five degrees.
    this.arcs = [];
    this.orientedBoxes = [];
    this.columns = [];
    this.bounds = bounds;
  }

  /**
   * A band of revolution about the Y axis: solid between two radii, over a
   * height span, except inside the angular gaps.
   *
   * `gaps` are [centre, halfWidth] pairs in radians — a doorway, or the
   * opening a stair landing needs in the gallery railing. A capsule passes
   * through a gap only if the whole of it fits, so a gap narrower than the
   * player is still a wall.
   */
  addRing({ innerRadius, outerRadius, minY, maxY, gaps = [], climbable = false }) {
    const ring = {
      r0: Math.min(innerRadius, outerRadius),
      r1: Math.max(innerRadius, outerRadius),
      minY, maxY, climbable,
      gaps: gaps.map(([centre, half]) => [normaliseAngle(centre), Math.abs(half)]),
    };
    this.rings.push(ring);
    return ring;
  }

  /** A solid angular section of a ring, used for doors that can be enabled. */
  addArc({ innerRadius, outerRadius, minY, maxY, centre, halfWidth,
    climbable = false, enabled = true }) {
    const arc = {
      r0: Math.min(innerRadius, outerRadius),
      r1: Math.max(innerRadius, outerRadius),
      minY, maxY, climbable, enabled,
      centre: normaliseAngle(centre),
      halfWidth: Math.abs(halfWidth),
    };
    this.arcs.push(arc);
    return arc;
  }

  /** A thin wall in arbitrary orientation, without an oversized world AABB. */
  // `soft` marks a collider that is a person rather than a piece of the world.
  // A person stops somebody walking into them and does not stop a car, because
  // a car does not get stopped by people - it runs them over, and there is a
  // whole system for that. Without the distinction a body lying in front of a
  // bumper is a wall, and the vehicle that put it there cannot move again.
  addOrientedBox({ cx, cz, halfX, halfZ, rotationY = 0, minY, maxY,
    climbable = false, enabled = true, soft = false }) {
    const collider = {
      cx, cz, halfX: Math.abs(halfX), halfZ: Math.abs(halfZ),
      cos: Math.cos(rotationY), sin: Math.sin(rotationY),
      minY, maxY, climbable, enabled, soft,
    };
    this.orientedBoxes.push(collider);
    return collider;
  }

  addColumn({cx,cz,radius,minY,maxY}){
    const column={cx,cz,radius,minY,maxY};this.columns.push(column);return column;
  }

  static _local(obb, x, z) {
    const dx = x - obb.cx;
    const dz = z - obb.cz;
    return {
      x: dx * obb.cos - dz * obb.sin,
      z: dx * obb.sin + dz * obb.cos,
    };
  }

  static _overlapsOriented(obb, x, z, radius) {
    const local = ColliderSet._local(obb, x, z);
    const closestX = Math.max(-obb.halfX, Math.min(local.x, obb.halfX));
    const closestZ = Math.max(-obb.halfZ, Math.min(local.z, obb.halfZ));
    return (local.x - closestX) ** 2 + (local.z - closestZ) ** 2 <= radius * radius + EPSILON;
  }

  static _inArc(arc, angle, margin) {
    let d = normaliseAngle(angle) - arc.centre;
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d) <= arc.halfWidth + margin;
  }

  // Is this angle far enough inside one of the ring's gaps for a capsule of
  // `margin` radians to pass?
  static _inGap(ring, angle, margin) {
    for (const [centre, half] of ring.gaps) {
      if (half <= margin) continue;
      let d = normaliseAngle(angle) - centre;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) <= half - margin) return true;
    }
    return false;
  }

  // Register the world-space bounds of a placed Blender object.
  //
  // One box around the whole object is only honest when the object fills it. A
  // rotated shelf, an L-shaped console or a bench with a gap under it fills
  // perhaps half of its own bounding box, and the rest is a wall the player
  // can feel but not see. Where that happens the object is split over a coarse
  // grid and each occupied cell gets a collider shrunk onto what is actually
  // in it, so the shape you walk into is the shape you can see.
  addObject(root, options = {}) {
    root.updateWorldMatrix(true, true);
    _box.setFromObject(root);
    if (!isFinite(_box.min.x) || _box.isEmpty()) return null;
    // Remember what the collider came from, so an audit can say which line of
    // world building put a wall somewhere rather than only where it hurts.
    const settings = { source: root.name || root.type, ...options };
    const whole = _box.clone();

    // Most props in this game are a single merged Blender mesh, so splitting
    // by mesh would find nothing to split. Read the triangles instead: they are
    // what the player can see, and they are what the collider should follow.
    const parts = [];
    root.traverse((part) => {
      if (!part.isMesh && !part.isSkinnedMesh) return;
      if (part.userData.hitProxy || part.userData.ballisticProxy) return;
      if (part.visible === false) return;
      const geometry = part.geometry;
      const position = geometry?.attributes?.position;
      if (!position) return;
      const index = geometry.index;
      const count = index ? index.count : position.count;
      const triangles = Math.floor(count / 3);
      if (!triangles) return;
      // A detailed scan does not need every triangle to describe its footprint.
      const stride = Math.max(1, Math.ceil(triangles / OBJECT_TRIANGLE_BUDGET));
      part.updateWorldMatrix(true, false);
      const matrix = part.matrixWorld;
      for (let triangle = 0; triangle < triangles; triangle += stride) {
        const bounds = new THREE.Box3();
        for (let corner = 0; corner < 3; corner++) {
          const vertex = index ? index.getX(triangle * 3 + corner) : triangle * 3 + corner;
          _point.fromBufferAttribute(position, vertex).applyMatrix4(matrix);
          bounds.expandByPoint(_point);
        }
        parts.push(bounds);
      }
    });
    if (parts.length < 2) return this.addBox(whole, settings);

    const width = whole.max.x - whole.min.x;
    const depth = whole.max.z - whole.min.z;
    const columns = THREE.MathUtils.clamp(Math.round(width / OBJECT_CELL), 1, OBJECT_GRID);
    const rows = THREE.MathUtils.clamp(Math.round(depth / OBJECT_CELL), 1, OBJECT_GRID);
    if (columns * rows < 2) return this.addBox(whole, settings);

    const cells = [];
    let filled = 0;
    let split = 0;
    for (let column = 0; column < columns; column++) {
      for (let row = 0; row < rows; row++) {
        const x0 = whole.min.x + (width * column) / columns;
        const x1 = whole.min.x + (width * (column + 1)) / columns;
        const z0 = whole.min.z + (depth * row) / rows;
        const z1 = whole.min.z + (depth * (row + 1)) / rows;
        let cell = null;
        for (const bounds of parts) {
          if (bounds.max.x <= x0 || bounds.min.x >= x1) continue;
          if (bounds.max.z <= z0 || bounds.min.z >= z1) continue;
          // Clip the part to the cell, so a long shelf does not drag its whole
          // length into every cell it passes through.
          const clipped = new THREE.Box3(
            new THREE.Vector3(Math.max(bounds.min.x, x0), bounds.min.y, Math.max(bounds.min.z, z0)),
            new THREE.Vector3(Math.min(bounds.max.x, x1), bounds.max.y, Math.min(bounds.max.z, z1)));
          cell = cell ? cell.union(clipped) : clipped;
        }
        if (cell) {
          filled++;
          split += (cell.max.x - cell.min.x) * (cell.max.y - cell.min.y) * (cell.max.z - cell.min.z);
        }
        cells.push(cell);
      }
    }
    // Compare volumes, not footprints. A console fills its own footprint and
    // still leaves most of its bounding box empty, because the box is as tall
    // as its highest screen everywhere - which is the wall you walk into on
    // the way past the desk.
    const volume = width * (whole.max.y - whole.min.y) * depth;
    if (!filled || split >= volume * OBJECT_FILL) return this.addBox(whole, settings);

    const added = [];
    for (const cell of cells) {
      if (!cell) continue;
      const collider = this.addBox(cell, settings);
      if (collider) added.push(collider);
    }
    return added.length ? added[0] : this.addBox(whole, settings);
  }

  addBox(box, options = {}) {
    const { shrink = 0, climbable = false, source = null } = options;
    if (shrink) {
      box.min.x += shrink; box.max.x -= shrink;
      box.min.z += shrink; box.max.z -= shrink;
      if (box.min.x >= box.max.x || box.min.z >= box.max.z) return null;
    }
    box.getSize(_size);
    if (_size.x < 0.02 || _size.z < 0.02) return null;
    const collider = { box, climbable, source, enabled: options.enabled ?? true };
    this.boxes.push(collider);
    return collider;
  }

  // Height of the highest climbable surface under the given circle, or 0.
  floorAt(x, z, radius, maxHeight) {
    let floor = 0;
    for (const { box, climbable, enabled = true } of this.boxes) {
      if (!enabled) continue;
      if (!climbable) continue;
      if (box.max.y > maxHeight || box.max.y <= floor) continue;
      if (x < box.min.x - radius || x > box.max.x + radius) continue;
      if (z < box.min.z - radius || z > box.max.z + radius) continue;
      floor = box.max.y;
    }
    for (const ring of this.rings) {
      if (!ring.climbable) continue;
      if (ring.maxY > maxHeight || ring.maxY <= floor) continue;
      const d = Math.hypot(x, z);
      if (d < ring.r0 - radius || d > ring.r1 + radius) continue;
      if (ColliderSet._inGap(ring, Math.atan2(z, x), radius / Math.max(d, 0.01))) continue;
      floor = ring.maxY;
    }
    for (const arc of this.arcs) {
      if (!arc.enabled || !arc.climbable) continue;
      if (arc.maxY > maxHeight || arc.maxY <= floor) continue;
      const d = Math.hypot(x, z);
      if (d < arc.r0 - radius || d > arc.r1 + radius) continue;
      if (!ColliderSet._inArc(arc, Math.atan2(z, x), radius / Math.max(d, 0.01))) continue;
      floor = arc.maxY;
    }
    for (const obb of this.orientedBoxes) {
      if (!obb.enabled || !obb.climbable) continue;
      if (obb.maxY > maxHeight || obb.maxY <= floor) continue;
      if (!ColliderSet._overlapsOriented(obb, x, z, radius)) continue;
      floor = obb.maxY;
    }
    return floor;
  }

  // Push a capsule out of every box it overlaps. Resolving along the shallowest
  // axis is what makes the player slide along a wall instead of sticking to it.
  resolve(position, radius, feetY, headY, stepHeight = 0) {
    let corrected = false;
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      for(const column of this.columns){
        if(column.maxY<=feetY+EPSILON||column.minY>=headY-EPSILON)continue;
        const dx=position.x-column.cx,dz=position.z-column.cz,d=Math.hypot(dx,dz),limit=radius+column.radius;
        if(d>=limit)continue;
        const a=d>EPSILON?Math.atan2(dz,dx):0;
        position.x=column.cx+Math.cos(a)*limit;position.z=column.cz+Math.sin(a)*limit;moved=corrected=true;
      }
      for (const { box, climbable, enabled = true } of this.boxes) {
        if (!enabled) continue;
        if (box.max.y <= feetY + EPSILON || box.min.y >= headY - EPSILON) continue;
        if (climbable && box.max.y <= feetY + stepHeight + EPSILON) continue;

        const closestX = Math.max(box.min.x, Math.min(position.x, box.max.x));
        const closestZ = Math.max(box.min.z, Math.min(position.z, box.max.z));
        const dx = position.x - closestX;
        const dz = position.z - closestZ;
        const distSq = dx * dx + dz * dz;
        if (distSq >= radius * radius) continue;

        if (distSq > EPSILON) {
          // Outside the box footprint: push straight out along the contact normal.
          const dist = Math.sqrt(distSq);
          const push = radius - dist;
          position.x += (dx / dist) * push;
          position.z += (dz / dist) * push;
        } else {
          // Centre is inside the footprint: escape via the nearest face.
          const left = position.x - box.min.x;
          const right = box.max.x - position.x;
          const back = position.z - box.min.z;
          const front = box.max.z - position.z;
          const min = Math.min(left, right, back, front);
          if (min === left) position.x = box.min.x - radius;
          else if (min === right) position.x = box.max.x + radius;
          else if (min === back) position.z = box.min.z - radius;
          else position.z = box.max.z + radius;
        }
        moved = true;
        corrected = true;
      }
      for (const ring of this.rings) {
        if (ring.maxY <= feetY + EPSILON || ring.minY >= headY - EPSILON) continue;
        if (ring.climbable && ring.maxY <= feetY + stepHeight + EPSILON) continue;
        const d = Math.hypot(position.x, position.z);
        if (d < ring.r0 - radius || d > ring.r1 + radius) continue;
        const angle = Math.atan2(position.z, position.x);
        if (ColliderSet._inGap(ring, angle, radius / Math.max(d, 0.01))) continue;
        // Out through the nearer face of the band.
        const target = (d - ring.r0 < ring.r1 - d) ? ring.r0 - radius : ring.r1 + radius;
        if (target <= 0) continue;
        position.x = Math.cos(angle) * target;
        position.z = Math.sin(angle) * target;
        moved = true;
        corrected = true;
      }
      for (const arc of this.arcs) {
        if (!arc.enabled) continue;
        if (arc.maxY <= feetY + EPSILON || arc.minY >= headY - EPSILON) continue;
        if (arc.climbable && arc.maxY <= feetY + stepHeight + EPSILON) continue;
        const d = Math.hypot(position.x, position.z);
        if (d < arc.r0 - radius || d > arc.r1 + radius) continue;
        const angle = Math.atan2(position.z, position.x);
        if (!ColliderSet._inArc(arc, angle, radius / Math.max(d, 0.01))) continue;
        const target = (d - arc.r0 < arc.r1 - d) ? arc.r0 - radius : arc.r1 + radius;
        if (target <= 0) continue;
        position.x = Math.cos(angle) * target;
        position.z = Math.sin(angle) * target;
        moved = true;
        corrected = true;
      }
      for (const obb of this.orientedBoxes) {
        if (!obb.enabled) continue;
        if (obb.maxY <= feetY + EPSILON || obb.minY >= headY - EPSILON) continue;
        if (obb.climbable && obb.maxY <= feetY + stepHeight + EPSILON) continue;
        const local = ColliderSet._local(obb, position.x, position.z);
        const closestX = Math.max(-obb.halfX, Math.min(local.x, obb.halfX));
        const closestZ = Math.max(-obb.halfZ, Math.min(local.z, obb.halfZ));
        const dx = local.x - closestX;
        const dz = local.z - closestZ;
        const distSq = dx * dx + dz * dz;
        if (distSq >= radius * radius) continue;

        let nextX = local.x;
        let nextZ = local.z;
        if (distSq > EPSILON) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist;
          nextX += (dx / dist) * push;
          nextZ += (dz / dist) * push;
        } else {
          const left = local.x + obb.halfX;
          const right = obb.halfX - local.x;
          const back = local.z + obb.halfZ;
          const front = obb.halfZ - local.z;
          const min = Math.min(left, right, back, front);
          if (min === left) nextX = -obb.halfX - radius;
          else if (min === right) nextX = obb.halfX + radius;
          else if (min === back) nextZ = -obb.halfZ - radius;
          else nextZ = obb.halfZ + radius;
        }
        position.x = obb.cx + nextX * obb.cos + nextZ * obb.sin;
        position.z = obb.cz - nextX * obb.sin + nextZ * obb.cos;
        moved = true;
        corrected = true;
      }
      if (!moved) break;
    }

    if (this.bounds) {
      const b = this.bounds;
      const x = THREE.MathUtils.clamp(position.x, b.minX + radius, b.maxX - radius);
      const z = THREE.MathUtils.clamp(position.z, b.minZ + radius, b.maxZ - radius);
      if (x !== position.x || z !== position.z) corrected = true;
      position.x = x;
      position.z = z;
    }
    return corrected;
  }

  // Cheap point query kept for AI and for the legacy blocked() signature.
  contains(x, z, radius = 0, feetY = 0.1, headY = 1.8, ignoreSoft = false) {
    for(const c of this.columns)if(c.maxY>feetY&&c.minY<headY&&Math.hypot(x-c.cx,z-c.cz)<radius+c.radius)return true;
    if (this.bounds) {
      const b = this.bounds;
      if (x < b.minX + radius || x > b.maxX - radius) return true;
      if (z < b.minZ + radius || z > b.maxZ - radius) return true;
    }
    for (const { box, enabled = true } of this.boxes) {
      if (!enabled) continue;
      if (box.max.y <= feetY || box.min.y >= headY) continue;
      if (x > box.min.x - radius && x < box.max.x + radius &&
          z > box.min.z - radius && z < box.max.z + radius) return true;
    }
    for (const ring of this.rings) {
      if (ring.climbable) continue;
      if (ring.maxY <= feetY || ring.minY >= headY) continue;
      const d = Math.hypot(x, z);
      if (d < ring.r0 - radius || d > ring.r1 + radius) continue;
      if (ColliderSet._inGap(ring, Math.atan2(z, x), radius / Math.max(d, 0.01))) continue;
      return true;
    }
    for (const arc of this.arcs) {
      if (!arc.enabled || arc.climbable) continue;
      if (arc.maxY <= feetY || arc.minY >= headY) continue;
      const d = Math.hypot(x, z);
      if (d < arc.r0 - radius || d > arc.r1 + radius) continue;
      if (!ColliderSet._inArc(arc, Math.atan2(z, x), radius / Math.max(d, 0.01))) continue;
      return true;
    }
    for (const obb of this.orientedBoxes) {
      if (!obb.enabled || obb.climbable) continue;
      if (ignoreSoft && obb.soft) continue;
      if (obb.maxY <= feetY || obb.minY >= headY) continue;
      if (ColliderSet._overlapsOriented(obb, x, z, radius)) return true;
    }
    return false;
  }
}

// Player capsule state and integration. Kept separate from input handling so the
// same controller can drive the player and, later, any AI that needs to respect
// world collision.
export class CharacterBody {
  constructor(options = {}) {
    this.radius = options.radius ?? 0.34;
    this.standHeight = options.standHeight ?? 1.78;
    this.crouchHeight = options.crouchHeight ?? 1.14;
    this.eyeOffset = options.eyeOffset ?? -0.11;
    this.stepHeight = options.stepHeight ?? 0.34;
    this.gravity = options.gravity ?? -18.5;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.height = this.standHeight;
    this.crouching = false;
    this.grounded = true;
    this.groundY = 0;
    this.landingImpact = 0;
    this.distanceWalked = 0;
  }

  get eyeHeight() {
    return this.height + this.eyeOffset;
  }

  // desired is the horizontal velocity the input layer wants this frame.
  step(dt, desired, colliders, options = {}) {
    const { crouch = false, jump = false, jumpSpeed = 4.4 } = options;

    const targetHeight = crouch ? this.crouchHeight : this.standHeight;
    if (targetHeight > this.height) {
      // Only stand back up if there is headroom for it.
      const head = this.position.y + targetHeight;
      const clear = !colliders.contains(this.position.x, this.position.z, this.radius * 0.9,
        this.position.y + this.height, head);
      if (clear) this.height = THREE.MathUtils.damp(this.height, targetHeight, 12, dt);
    } else {
      this.height = THREE.MathUtils.damp(this.height, targetHeight, 14, dt);
    }
    this.crouching = crouch;

    // Ground acceleration is snappier than air control, which is what makes
    // movement feel like a person rather than a floating camera.
    const control = this.grounded ? 13 : 2.6;
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, desired.x, control, dt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, desired.z, control, dt);

    if (jump && this.grounded) {
      this.velocity.y = jumpSpeed;
      this.grounded = false;
    }
    this.velocity.y += this.gravity * dt;

    const before = { x: this.position.x, z: this.position.z };
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // Horizontal travel starts at the supported height. Integrating gravity
    // first sank the feet below the floor by a fraction of a millimetre and
    // made the facade of the level BELOW behave like an invisible wall here.
    const feet = this.position.y;
    const head = this.position.y + this.height;
    colliders.resolve(this.position, this.radius, feet, head, this.stepHeight);

    // Kill the velocity component that a wall just absorbed so we do not keep
    // building speed into geometry.
    const actualX = (this.position.x - before.x) / Math.max(dt, EPSILON);
    const actualZ = (this.position.z - before.z) / Math.max(dt, EPSILON);
    if (Math.abs(actualX) < Math.abs(this.velocity.x)) this.velocity.x = actualX;
    if (Math.abs(actualZ) < Math.abs(this.velocity.z)) this.velocity.z = actualZ;

    this.position.y += this.velocity.y * dt;
    this.groundY = colliders.floorAt(this.position.x, this.position.z, this.radius, this.position.y + this.stepHeight);
    if (this.position.y <= this.groundY + EPSILON) {
      if (!this.grounded && this.velocity.y < -2.2) this.landingImpact = Math.min(1, -this.velocity.y / 9);
      this.position.y = this.groundY;
      this.velocity.y = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }

    this.landingImpact = THREE.MathUtils.damp(this.landingImpact, 0, 7, dt);
    if (this.grounded) {
      this.distanceWalked += Math.hypot(this.position.x - before.x, this.position.z - before.z);
    }
    return this;
  }

  get horizontalSpeed() {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  teleport(x, y, z) {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.grounded = true;
    this.landingImpact = 0;
    return this;
  }
}
