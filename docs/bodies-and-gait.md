# The bodies you can see through, and the walk

Two complaints. Bernard and Sims rendered partly transparent, and the walk is
close but not right. They turned out to be unrelated, so they are two fixes.

## 1. Bernard and Sims

### What it actually was

Not the materials. All three supplied bodies are one mesh with one `OPAQUE`
material, no glTF extensions, correct `UNSIGNED_INT` indices with every vertex
referenced, and skin weights that sum to exactly 1.0 with no out-of-range joint
references. Every one of those was checked and ruled out.

The meshes are **not watertight**. `node scripts/mesh-report.mjs` welds by
position with a neighbour-cell search — a plain grid snap leaves any two points
that straddle a cell boundary unmerged and invents holes that are not there —
and counts the edges with only one triangle on them:

| body | triangles | open edges | share of all edges |
|---|---|---|---|
| Juliette | 90,000 | 27,150 | 18.3% |
| Sims | 89,999 | 82,489 | 46.8% |
| Bernard | 90,000 | 95,671 | 52.3% |

That ratio is the whole complaint: Juliette looks fine and the other two do
not. The script ships so a newly uploaded body can be checked before it is
wired in.

Most of it is invisible, and the reason is already in the code. The materials
are forced to `DoubleSide`, so a missing *front* face still shows the inside of
the back through it. Rendered against a flat backdrop at 900px and counting
what comes through:

| | front faces only | as shipped (DoubleSide) |
|---|---|---|
| Bernard's torso | 6.39% see-through | 0.64% |
| Sims' torso | — | 0.23% |

Drawing the lining in a litmus colour and counting it shows where the outer
shell has no surface facing the camera at all: **7.1% of Bernard's figure**,
26,733 pixels of 375,703. What you were looking at through those gaps was
**the inside of his own back**. That is
what reads as a body that is semi-transparent all over rather than one with
holes in it — and it is why "make the material opaque" kept not fixing it. It
was already opaque.

### The fix

There is no repairing 90,000 triangles of generated mesh here, so the gaps are
backed rather than closed. The same skinned geometry is drawn a second time, 6
mm inside the surface, sharing the geometry buffer and the skeleton:

- **6 mm** is enough that a hole in the outer shell and the matching hole in
  the lining no longer line up along the view ray, and little enough that the
  lining stays inside a finger. Measured across offsets: 3 mm → 0.15%, 6 mm →
  0.05%, 10 mm → 0.03%. A uniform scale instead of a normal offset does
  nothing at all (0.64% → 0.64%), because it displaces the surface along the
  view ray rather than across it.
- **Double-sided** beats either face alone: at the same 6 mm, front-only leaves
  0.10% and back-only 0.25%.
- It reads **the body's own texture at the same UV**, so what shows through a
  pinhole is the colour that should have been there rather than a dark speck.
  Unlit and map-only, so it costs one texture fetch rather than a second
  shading pass, and it casts no shadow.
- The inset is applied **before** the skin. Offset after skinning, it is
  rotated twice and the lining walks out of the body as the character moves.

| | before | after |
|---|---|---|
| Bernard's torso see-through | 0.64% | **0.05%** |
| Sims' torso see-through | 0.23% | **0.03%** |

Checked with the lining drawn in a litmus colour across idle, walk and run: it
appears only inside the silhouette, never past it.

## 2. The walk and the run

`locomotion.js` does not play the clips in the GLB files. It poses the bones
directly and solves the feet with IK, so one change reaches the player, the
named cast and every generated resident at once.

Measured against the speeds the game actually uses — 1.45 m/s walking, 3.8
running — three things were wrong.

### The foot landed while still moving forwards

The swing used a smoothstep, which arrives with **zero** velocity. In the
model's own space, where a planted foot travels backwards at exactly the body's
speed, the frame before touchdown read **+0.25 m/s** at a walk — the foot was
still going forwards — and then jumped **1.58 m/s in a single frame**. At a run
it jumped **3.87 m/s**. That is a skate on every step.

The swing is now a cubic that leaves and arrives at the ground's own speed. The
forward overshoot it produces late in swing is the retraction a real foot makes
just before it lands.

```
walk, model-space foot velocity, frames either side of touchdown
  before   1.44  1.17  0.88  0.57  0.25 │ -1.08 -1.45 -1.45      jump 1.58 m/s
  after    0.88  0.44 -0.03 -0.52 -1.05 │ -1.43 -1.45 -1.45      jump 0.52 m/s
```

### The hips ran down a rail

There was no lateral movement at all while walking. A body has to put its
weight over the foot holding it up; without that, no amount of leg animation
reads as weight. The pelvis now carries across onto the standing leg once per
step, and which way that is comes from the rig rather than being assumed, so a
mirrored skeleton does not sway backwards.

Measured excursion: **4.5 cm** at a walk and **2.0 cm** at a run, against about
4.5 cm and half that for a person.

### It walked like it was kneeling

The pelvis dropped because the foot was planted the full half-stride ahead of
the hip, and reaching that far with a straight leg costs `L - sqrt(L² - reach²)`
— 17 cm a step at a brisk walk.

Two changes. The foot's travel through stance is no longer centred on the hip:
the hip passes over the planted foot at about 40% of stance, so the foot is
planted nearer the body than it is left behind. And a foot **in the air** no
longer pulls the pelvis down — that was most of the bounce, because the moment
the trailing foot left the ground it was still at its furthest back, so the
deepest reach of the whole cycle was being demanded of a leg with no weight on
it. The release is off the moment the two feet are on different treads, which
is compared directly rather than inferred from slope: slope reads near zero on
a flight of flat treads, which is exactly where the depth is real.

| pelvis rise and fall | before | after | a person |
|---|---|---|---|
| 1.45 m/s walk | 9.0 cm | 7.4 cm | ~4.5 cm |
| 3.8 m/s run | 13.5 cm | 12.5 cm | ~9 cm |

Better, not solved. Getting the rest of it means shortening the stride, and
this rig's legs are short for its height — its hip-to-ankle is about 44.5% of
height against a human's 49% — so a shorter stride has to be paid for in
cadence, and past a point that reads as scurrying. The stride and cadence are
currently close to measured human values at both speeds, and I would rather
leave a little bounce than make the walk hurried. It is left where it is
deliberately.

### What did not change

The planted foot still lands exactly where it is put. Maximum IK error on a
foot in contact is **0 mm**, on the flat and on the stairs, before and after —
the same as it was. All of the residual error is a foot in mid-air being
slightly under-extended at the extremes of its arc, which is a slightly less
straight knee and nothing you can see.

## Checks

`npm test` — 189 passing, three of them new. Each was run against the
unmodified source first and fails there:

- *the foot is already travelling with the ground at the moment it lands* —
  fails with "still going forwards at 0.44 m/s".
- *the pelvis carries across onto whichever leg is standing* — fails with
  "0.0 cm of hip sway".
- *every supplied body is backed* — fails; there is no lining.

The see-through percentages come from rendering the real `actorFrom` path in a
browser against a flat backdrop and counting backdrop pixels inside the
silhouette, not from reading the code.
