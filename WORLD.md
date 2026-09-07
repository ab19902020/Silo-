# Gallery signage, pylons and the flooded void — what changed

**Note for Astra (and anyone else working on this repo at the same time.)**
A polish pass on three specific complaints. It is deliberately confined to four
files so it can land next to in-flight work. Audio changes are in `AUDIO.md`.

## Files touched

| File | Change |
| --- | --- |
| `dist/src/kit.js` | `sign()` rebuilt: a sign is now a mounted plate, not a bare plane. Exports `SIGN_DEPTH`. |
| `dist/src/world.js` | Pylons regrouped clear of the doorways; three sign placements corrected; arc barriers supported below the silo. |
| `dist/src/underground.js` | Juliette's camp, the caged descent to the waterline, and the lower door. |
| `dist/src/main.js` | Two lines of inspection text for the camp and the relics. |
| `tests/gallery.test.mjs`, `tests/void.test.mjs` | New. 9 tests covering all of it. |

**Not touched:** `physics.js`, `rooms.js`, `passages.js`, `bazaar.js`,
`surface.js`, `top-floor.js`, `generator-hall.js`, `characters.js`,
`rendering.js`, `materials.js`, `data.js`, `style.css`, `index.html`, or any
asset.

## 1. Signs were floating, unlit planes

Every sign in the game came from one `sign()` call that returned a bare
`PlaneGeometry` with an unlit `MeshBasicMaterial`. Three consequences:

- **Floating.** Nothing was behind them. The department plate hung 0.28 m in
  front of the door lintel and the level plate 0.44 m off the wall, because the
  level plate was offset 3.3 m in *x and z* — a straight-line offset across a
  curved wall, which walks the sign off the surface.
- **Disappearing.** A zero-thickness double-sided plane vanishes edge-on and
  z-fights with anything it is coplanar with.
- **Pasted on.** Unlit, so they glowed flat regardless of the gallery lighting.

Now a sign is a `Group`: a `SIGN_DEPTH` (0.05 m) steel plate, the printed face
proud of it, and two mounting bolts on anything wider than 1.2 m. The face is a
`MeshStandardMaterial` with the canvas as both `map` and `emissiveMap`, so it
shades with the room but stays readable on the dark levels.

**If you add a sign, mount it at `SIGN_DEPTH/2` proud of its host surface** and
the plate backs flat onto it. The gallery's outer wall steps back above the
door head — `O-.2` below 3.35 m, `O-.3` above — and `world.js` exports nothing
for this, so use `SIGN_WALL` / `SIGN_WALL_HIGH` there. Getting this wrong is
how the department plate ended up buried inside the wall on the first attempt.

## 2. Pylons stood in the doorways

The 24 gallery pylons were spaced evenly at `(j+.5)*TAU/24`, which put a column
centre 3.2 m from every door centre — its edge 0.5 m clear of the jamb, 1 m out
into the walking line, on all 144 levels. `PYLON_ANGLES` now groups them four to
a wing sector at 12°/24°/36°/48°, same count and same rhythm, nearest edge 4.5 m
from a door centre. The collision list uses the same constant, so the two can
no longer drift apart. All 864 wing-exit walks still pass.

## 3. The void had no way down

There was a ledge, a bridge and an inspection platform, and the only route to
the lower door was a directory teleport. Added, all reachable on foot:

- **A camp** in a bay widened off the inspection platform: salvaged plate walls,
  a scavenged roof, a bed, a shelf of relics, a table, and a curtain hung over a
  cut in the outer plate. Two inspection points.
- **A caged stair** of 24 treads at 0.273 m rise sweeping 100° at radius 8–11,
  from the platform at y=12 down to y=5.45 — a metre above the water at y=5.
  Cage hoops, guard walls both sides, lamps every sixth tread.
- **A bulkhead** in the tower base at the foot of the stair, wheel and bolts,
  which travels to the existing `tunnel`.

### Two things that will bite you here

- **The controller has no ladder mechanic.** `climbable` on a collider means
  "you can stand on this", not "you can climb this". A descent has to be treads
  no taller than the 0.3 m step height, which is why this is a steep caged stair
  and not a rung ladder. A real ladder would need a change in `physics.js`.
- **Box walkways below the silo are forced to `rotationY:0`** by `world.js`, so
  anything that has to follow the curve must be pushed as `kind:'arc'`. Barriers
  can now be arcs too (`{arc:true, r0, r1, y0, y1, a, half}`).
- The inner guard on the stair starts at tread 2. Carried to the top it walls
  the stair off from the platform it is reached from — the first version did
  exactly that and a walking body could not get on.

## Accuracy

The camp, the descent and the lower door are a **reconstruction, not a copy**.
The show establishes the flooded lower levels, improvised living out of sight,
relics kept hidden, and a sealed lower door; no filmed plan of this space was
available, and the layout, dimensions and contents here are inferred. This is
recorded in the in-world inspection text as well.

## Verify

`npm test` — 39 tests, 9 of them new. The void tests walk a real
`CharacterBody` from the platform down every tread to the door, so if the
descent stops being walkable the suite says so.
