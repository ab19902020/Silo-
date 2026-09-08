# Current void and staircase correction — 8 September 2026

The caged stair and tower-base door described in the historical notes below have been replaced. The camp is now on the excavation perimeter; a working rung ladder reaches the water, and the round hidden tunnel connects continuously through the cavern wall to its sealed far door. `climbing.js` and `CharacterBody` now support actual ladder traversal. Below-silo floor and wall colliders also honour their supplied rotation. See [current repair notes](docs/visibility-stairs-void.md).

Gallery signs, doorway-safe pylon placement and audio from the earlier changes remain. Staircase posts, parapet caps and handrails now share complete landing openings.

# Historical update: gallery signage, pylons and the flooded void

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

## Later pass: movement, controls and the way into the void

### The gait was wrong by the numbers

The rig is good — real two-bone IK, foot planting, phase continuity. What made
it look bad was the gait itself, and it was measurable:

| | before | after | real human |
| --- | --- | --- | --- |
| Walk cadence | 145 steps/min | **120** | ~120 |
| Walk step length | 0.60 m | **0.72 m** | ~0.72 m |
| Run cadence | — | **168 steps/min** | ~165 |
| Both feet off the ground, running | **0%** | **17%** | a run has a flight phase |
| Both feet down, walking | — | 23% | ~20–25% |

`STANCE` and `REACH` now live in one place at the top of `locomotion.js`,
because the pose and the phase advance must agree exactly or the feet skate.
Step length is `REACH*height/STANCE`; change one and the cadence moves.

Three things were missing outright:

- **Vertical bob.** The pelvis never rose or fell, so the body glided along on
  moving legs. It now rises over the planted leg and falls through double
  support, twice a stride, and inverts at a run — highest at mid-flight.
- **Foot roll.** The foot was held flat for the entire cycle. It now lands
  heel-first with the toe up, rolls flat, and leaves off the toe, and the ankle
  rises as the heel comes up so the heel does not drive through the floor.
- **Stride shortening on slopes.** People take smaller steps up a staircase.
  This is also what keeps the ankle inside the leg's reach on a tread — without
  it the longer stride puts it 5 cm out and the regression test fails.

Pelvic list, shoulder counter-rotation, a proper elbow that closes as the arm
comes through, and landing absorption driven by `body.landingImpact` are all in
too. **Pelvic rotation is deliberately kept small** (0.04): foot goals in this
rig are placed in model space and do not follow the pelvis, so turning it
further pulls the hips off their own feet.

### Controls

- **Jump.** `physics.js` has supported `{jump:true}` all along and nothing ever
  passed it. Space, ✕ on a pad, or the new touch button. The impulse is applied
  on one substep only, or it fires N times a frame.
- **Gamepad.** DualShock/DualSense/Xbox over the standard mapping: sticks to
  move and look, ✕ jump, □/R1 use, △ torch, R2 run, Options directory, R3 view.
  Buttons act on the press, not while held.
- **Fullscreen no longer kills the touch controls.** The fullscreen button sits
  inside a modal panel, and a modal dialog and the fullscreen element share the
  top layer — the root going fullscreen ends up drawn *over* the panel, which
  stays open. The game therefore stays paused, `.paused` hides every touch
  control, and the close button is no longer visible. The panel is now closed
  before the request, and `fullscreenchange` clears any captured pointer and
  re-syncs.

### The way into the void

Walk the **rear service gallery on 144** and there is a short spur off it that
dead-ends in a **plain wall** — no doorway, no frame, no blocked-up opening, no
hint that anything was ever there. Just a notice reading *DO NOT PASS THIS
POINT · STRUCTURAL LIMIT*. Move the notice and the wall behind it is already
broken through; climb through into the excavator void. The directory shortcut
still works for anyone who would rather skip it, and the Mechanical wing no
longer offers a direct way down.

The first attempt put this **inside** the wing and showed a visible blocked-up
opening with jambs and a lintel. Both were wrong: it belongs off the back
walkway, and the point is that you cannot see it.

`SPUR` and `breach` live in `passages.js` and the level is **rebuilt** when
`breach` changes. That is deliberate: the end wall carries collision, so hiding
the mesh alone would leave an invisible wall across the opening.

### You could walk off the top of the stairwell

Stair treads are only built for `level > 1`, so at the **top landing** the
stairwell on one side of the bridge had no floor at that height and nothing
stopping you walking into it — a 10 m drop, and further once past the modelled
treads. Level 144 had the mirror of it: no level 145 flight arriving on the
other side. Every level in between is fine, because the next flight lands there.

Both landings now carry a parapet and rail across the open side, matching the
bridge's own. Measured with a probe that walks a real `CharacterBody` out from
every standing point in 24 directions: **26 free falls before, 0 after**, and
the same probe still reports 0 on levels 2, 50 and 143. Walking downstairs also
loses height, so the probe scores a fall by downward *speed* — no staircase in
the silo can push you past 6 m/s — not by how far you dropped. There are tests
for both.

The exact wording of the filmed plate was not available in the sources
reviewed, so the sign text is written to match the silo's other stencilled
signage rather than copied. Everything else here follows the established
mechanism: residents found the digging machine and concealed the entrance, and
access is through breaks in Mechanical's walls.

## Verify

`npm test` — 39 tests, 9 of them new. The void tests walk a real
`CharacterBody` from the platform down every tread to the door, so if the
descent stops being walkable the suite says so.
