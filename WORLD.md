# Opening scene, seating, screens and figure proportions — 8 September 2026

**Note for Astra (and anyone else in this repo at the same time.)** Four jobs,
kept to numbers and small local additions so they land beside in-flight work.
Nothing was restructured. `npm test` is 62 passing.

## Files touched

| File | Change |
| --- | --- |
| `dist/src/surface.js` | `groundY` is a crater profile; one dead tree; lens shader blurs and darkens; ground shading and texture scale widened; feed camera near plane. |
| `dist/src/opening.js` | Beats retimed to 86 s and cut against the theme; the wipe; `MUSIC_CUE`; `ALLISON_REST`; bodies lie along the slope normal. |
| `dist/src/audio.js` | `holdMusic` / `startMusicAt` / `releaseMusic` / `stopMusic`. Nothing else in the mix changed. |
| `dist/src/main.js` | `syncMusicGate()`, one call in `openingChanged` and `begin`, one on the book pickup. |
| `dist/src/kit.js` | `chair()` at real dining-chair dimensions. |
| `dist/src/top-floor.js` | Every chair faces the screen; screens in the holding cell and the sheriff's station. |
| `dist/src/world.js` | Screen collection reads `extraScreens`; outdoor fog matched to the feed. |
| `dist/src/resident-model.js` | Proportions. Bone *lengths* untouched. |
| `dist/src/population.js` | NPC walking pace. |

**Not touched:** `physics.js`, `rooms.js`, `passages.js`, `bazaar.js`,
`underground.js`, `void-access.js`, `generator-hall.js`, `characters.js`,
`rendering.js`, `materials.js`, `data.js`, `locomotion.js`, `style.css`,
`index.html`, or any asset.

## 1. Seats, and where the screens are

Chairs were 0.515 m to the seat and 1.19 m to the top of the back — a good 6 cm
taller than a real dining chair — while the sitting pose put the hips at 0.449,
*below* the seat surface. Everyone was sunk into the furniture and looked
child-sized beside it. The chair is now 0.45 / 0.95 and the pose lands the hips
at 0.525, so a resident rests on the seat with both feet on the floor.
`poseResident` sets that as an absolute height, not a fraction of the sitter's
height, so a tall person and a short one both sit at chair height.

Half the cafeteria was seated with its back to the view. Every chair now faces
`+z`, toward the wall screen.

Wool only ever describes two wall-screens: the **cafeteria** and the **holding
cell**, and the second is a plot point — the condemned is given the same view
they are about to be sent into. The cell had no screen at all; it now has one on
the wall facing the bunk. A smaller **duty monitor** in the sheriff's station is
a placement rather than a claim, and the comment there says so.

`world.js` collects `[outsideScreen, ...extraScreens]` from every room, so any
room you add can join the feed by listing a mesh in `extraScreens`.

## 2. The opening scene

Six things, all the same kind of wrong — the shot did not read from inside.

**The wipe never touched the lens.** The hand was solved to a point 2 cm in
front of the sensor camera, inside its 8 cm near plane, so at the moment of
contact the cloth was clipped out of the panorama entirely. The stroke now
crosses the glass and, at mid-sweep, reaches up over the housing and presses
the rag flat. That lens is a 24° slot: a rag a hand's width from it fills the
whole picture, so **the cafeteria screen blanks for about a third of a second
on every pass**. The reach is at the limit of a 1.78 m man's arm on purpose —
the lens sits half a metre above his shoulder. The rag grew from 15 cm to
28 × 40 cm, which is what it takes to cover a lens.

**The dirty lens was not dirty.** It tinted about 15% and left the picture pin
sharp, so the clean had nothing to open up. The pass now scatters (six taps on
a widening ring), absorbs (darker, greyer) and soils in two grains.

**You could see past the hill, because there was no hill.** A 6.4 m rim on a
flat plain that fell away again behind it. `groundY` is now a crater: flat for
30 m, then climbing on every bearing and never coming back down. Checked
numerically — no radius past the crest has a higher elevation from the sensor
than the crest itself, so **nothing beyond the hill is visible from anywhere in
the bowl**. The near shoulder is the rise Holston walks up and he breaks the
skyline at the top of it.

**There were four dead trees.** There is one.

**Allison lay 5.5 m from it on open ground.** She is at the foot of the tree
(`ALLISON_REST`); Holston climbs to her, takes the helmet off, goes down, and
drags himself the last four metres to lie beside her. Bodies also lay flat on
the horizontal while the hill runs at one in four, which buried the uphill end
to the shoulder — anything that lies down now settles along the ground's own
normal (`groundNormal` in `opening.js`).

**The soundtrack played from the moment you pressed Begin,** over a room that
is supposed to be quiet. See below.

Beats are now 0–10 emerge, 10–22 clean, 22–26 turn, 26–58 walk, 58–65 helmet,
65–77 crawl, 77–86 rest. `OPENING_DURATION` is 86.

## 3. The music is cued to the scene

`audio.holdMusic()` keeps the theme silent while the state is `find-book`;
`audio.startMusicAt(MUSIC_CUE, 2.5)` starts it on the book pickup. The ten
minute master is five passes of a two minute cycle whose loudest bar is at
0:85 and whose quietest is at 0:80 — measured off the file, not guessed.
`MUSIC_CUE = 17` therefore drops the swell on the moment Holston appears on the
screen, empties the room out under the helmet coming off at t=63, and puts the
peak on t=68, three seconds into the fall. **Change one of those and you have
to change the other.**

If the ten minute decode is still running when the book is picked up, the cue
time is remembered and the wait is added on, so a slow decode delays the music
without sliding it out of step. Skipping the opening, or replaying with the
opening already seen, just starts the bed from the top as before.

## 4. Figure proportions

Measured against a clothed adult on a 1.75–1.85 m frame, almost every section
of the resident mesh was too big, all in the same direction:

| | was | real |
| --- | --- | --- |
| shoulder joints + deltoid | 65 cm across | 48 |
| chest | 44 wide × 28 deep | 37 × 26 |
| skull | 20.4 cm across | 15.5 |
| upper arm | 17 cm | 12 |
| forearm at elbow / wrist | 11.6 / 8.6 | 9.2 / 6.6 |
| calf | 15.8 cm | 12 |
| stance | 21 cm apart | 19 |
| boot | 14.8 cm across | 11 |

A head a third too wide is most of what makes a figure read as a toy. Every
feature is placed off the same half-width, so the whole head block is narrowed
together after it is built (`narrowHead()`) rather than by editing two dozen
constants that then have to be kept consistent by hand — **if you add anything
to the head, add it inside that block or it will not scale with the skull.**

The lathe also carried the coat to y=1.47, over the jaw, so there was no neck;
it now closes below it. The deltoid was a sphere sitting proud of the shoulder
line and is flattened under it. Sitting, everyone held both arms straight out
in front of them; they now rest on the thighs.

**Bone lengths are untouched** — leg length, hip and knee heights and the ankle
are exactly where the gait work left them, so `locomotion.js` is unaffected.

## Things that will bite you

- `groundY` is used for collision *and* for the visible mesh, and the outer
  terrain tiles sample every 16 m. Anything you add to it on a wavelength
  shorter than about 100 m aliases out there. The `ridges` term is deliberately
  200–350 m and fades out past the fog.
- The bowl is centred on (26, 139) in surface-local coordinates, and `entrance`
  flattens everything within 24 m of the hatch at (26, 108). That apron is what
  keeps the ramp exit at y=14; do not remove it.
- The cleaners are on rails — `cleaningSample` sets position directly and the
  test asserts they never leave the terrain and never move more than 8 cm in a
  frame. If you retime a beat, check both.
- `tests/living-silo.test.mjs` now projects the rag through the surface camera
  and asserts the feed is fully covered on some frames and not most of them. If
  you move the sensor, the wipe or the cloth, that is the test that will fail.

## Verify

`npm test` — 62 passing. `npm run validate` for the module graph.

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
