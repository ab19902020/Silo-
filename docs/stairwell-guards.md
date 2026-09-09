> Historical guard-profile notes. The later [reference update](reference-update.md) adds rotating bridge bearings, 240° flights, matching gallery parapets and clipped flat treads. Its topology and validation details supersede the single-bearing geometry described below.

# Stairwell guards rebuilt to the reference — 8 September 2026

Adam supplied three frames of the great stairwell — two renders of the shaft
looking down through several storeys, and a production still of the same space
full of people — with one instruction: make the staircases match, one to one,
and leave the rest of the silo alone. This note records what those frames show,
what the build did instead, and what is now the same.

## What the reference shows

- **No metal balustrade anywhere.** Every guard in the shaft is cast concrete:
  a plumb wall finished with a half-round coping the same width as the wall.
  There are no posts, no pipe handrails and no separate cap.
- **One continuous guard.** The coping leaves the helix on a tangent, sweeps
  round the landing corner on a generous radius, and runs on down the bridge as
  the same section. Flight, landing and bridge are one piece of concrete.
- **Bare treads.** The winders are plain concrete wedges. They read on their own
  shadow; there is no nosing strip.
- **A column at each bridge end**, thicker than the guard, running the full
  depth of the shaft, with the bridge coping bending into it. Each column
  carries one lit collar per storey — a ring of narrow bright slats between two
  dark metal rings — set at the height the coping meets it. Stacked down the
  shaft, those collars are what give the frames their depth.

## What the build had

`staircase.js` built the helix guard from four separate helical ribbons — a dark
concrete wall, a concrete cap and two metal handrails — plus 33 metal posts, and
a dark metal nosing on every tread. The bridge used a low concrete wall with the
generic `railing()` pipe-and-post rail on top. Neither matched the reference, and
they did not match each other.

Worse, the guard was **discontinuous at the landing**. The helix guard stopped at
`stairOpening`, its own radius; the bridge guard began 0.3 m further out on a
different line. The corner between them — the exact place the reference makes its
most visible sweep — was open concrete edge.

## What it is now

One cross-section, `PARAPET`, is swept along a path by `parapetGeometry`. The
faces stay plumb and only the coping follows the rise, which is how the concrete
is actually cast. Three paths use it, so the three guards are necessarily
identical:

| path | guard |
| --- | --- |
| `helixPath` | the flight, riding the tread nosings through its flat landing zones |
| `landingPath` | the corner, a bezier leaving the helix on its tangent and arriving on the bridge line |
| `straightPath` | the bridge run, and the terminal parapet at levels 1 and 144 |

The flight builds both corner sweeps itself: one at its foot on the `+z` side,
one at its head on the `-z` side, a full storey up. That is the staircase
changing direction as it climbs — the flight arrives on the opposite side of the
bridge from the one it left — so the sweeps land on the right bridge at every
level without the level needing to know which flights exist. Levels 1 and 144,
which have no flight on one side, get the straight terminal parapet instead.

`buildNewel` adds the column and its lit collar at each bridge end, instanced
per level so the columns are continuous through all 144 storeys.

Treads lost their nosing strip. Metal handrails, caps and posts are gone.

**The distant level of detail was rebuilt to match**, which was a real
inconsistency of its own: distant flights used a linear rise over 24 steps, so a
level visibly changed shape as it crossed the detail boundary. Distant flights
now use the same `stairStepY` rise, the same swept guard and the same lit
columns at a lower tessellation.

## Dimensions and collision

The guard is 1.13 m to the crown, 0.26 m thick. Its centreline is placed so the
inner face lands on `stairRadius - .1` on the helix and `landingHalf - .1` on
the bridge — the radii the collision has always used. **The walkable width of
every stair, landing and bridge is unchanged**; the collision volumes moved by
at most 0.01 m, to follow the swept profile exactly. The bridge slab is 0.16 m
wider each side than before, so the guard stands on concrete rather than on air;
the walkable half-width is still 1.8 m.

The newels are boxed rather than added as collision columns: they are stairwell
newels standing on the bridge, not gallery pylons in a doorway approach, and the
pylon-clearance test is about the latter.

## Checks

`tests/staircase.test.mjs` previously asserted that no stair geometry entered a
strip 3.68 m wide across the landing threshold. That strip included 0.14 m of the
bridge parapet on each side, so it could only ever pass while the corner stayed
open — the test was holding the gap in place. It now measures the **clear
walkway between the guards**, and two new cases cover what replaced the gap: that
each landing sweep starts exactly where the flight's guard stops and ends on the
bridge guard's line without oversailing the walkway, and that a swept guard comes
out solid and facing outwards rather than inside out.

The existing physics regressions are unchanged and still pass: 143 continuous
stair intervals, walking a full flight up and down, all 144 bridges unobstructed,
and no way to fall from the top, bottom or a mid-silo landing.

`npm test` — 65 passing. `npm run validate` for the module graph. Scene geometry
is 6.53 M triangles, slightly below the 6.57 M it was before this change.

## Limits

The frames are the only dimensional evidence used here. Guard height, wall
thickness, coping radius, column diameter, collar height and the corner radius
are read off them by eye and scaled against the silo's existing well radius,
bridge width and storey height, none of which were changed. The reference
renders are not production drawings and the still is a graded frame, so this is
a close match to the supplied images, **not a verified one-to-one replica** of
the built set.
