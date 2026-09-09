# The mine network — work package 1

`dist/src/mine-network.js`, `tests/mine-network.test.mjs`. Built to the contract
in `docs/CLAUDE_AGENT_1_MINE_NETWORK.md`. No other file is touched:
`underground.js`, `world.js`, `main.js`, `story.js`, the UI and every existing
test are untouched, and Codex owns the integration.

## What was there

One straight drive, 8 m wide and 64 m long, with a rock face at each end. You
could see all of it from the door.

A mine is not a corridor. It is a decision about which way to go, made
repeatedly, in the dark, by somebody who has to be able to find their way back
out. The thing that makes a network legible is not signage — it is having gone
somewhere, come back a different way, and recognised where you are.

## The plan

Local coordinates, origin at the mine anchor. `x` across, `z` along, `y` up.

```
                              ORE FACE 18
                            (-7..7, 47..55)
                                   |
   PUMP        WEST DRIVE     CROSS-CUT 4      EAST DRIVE      BRANCH 3
 (-32..-24, ─ (-24..-18, ─── (-24..24, ─────── (18..24, ────── (24..35,
   17..29)      13..41)        41..47)          13..41)         19..25)
                    |             |                 |             |
                    |        VENTILATION            |         [collapsed]
                    |         (-4..4, 19..41)       |
                    |             |    \            |
                    |             |   TOOL CACHE    |
                    |          FAN CHAMBER          |
                    |         (up three steps)      |
                    └──────── SWITCH CHAMBER ───────┘
                              (-11..11, 5..19)
                                   |
                            ARRIVAL GALLERY
                             (-4..4, -33..5)
                                   |
                            ↑ Mechanical
```

Three ways lead north out of the switch chamber — the west drive, the
ventilation gallery and the east drive — and cross-cut 4 joins all three at the
top. That is **two genuine loops**, and it is the whole point: you can go up one
way and come back another, which is what turns a route into a place.

Off those: an ore face being worked, a pump chamber abandoned with the water
still in it, a branch that genuinely collapsed, a tool cache, and a fan chamber
up three steps that nothing sends you to.

**Nothing here is a fake door.** If a passage is drawn, it is walkable; if it is
blocked, you can walk up to the blockage and see what blocked it. The tests
prove both halves of that for the closed branch.

## How the walls are made

The network is a 1 m cell grid. A wall is emitted **wherever a floor cell has no
floor cell beside it**, and collinear segments are merged into runs.

That is worth stating plainly, because it is what makes the thing correct.
Junctions open by themselves: two areas that share a boundary value have
adjacent cells, so no wall is generated between them, and there is no list of
doorways to get wrong. It is impossible to draw an opening into solid rock or to
leave a floor edge unwalled, because both are the same decision made in one
place. The colliders come off the same runs, so the collision cannot disagree
with the geometry about where the rock is.

Rock is left 30 cm inside the edge of every floor, so a body always has ground
under the whole of its footprint. The tests walk every reachable position and
check all four edges.

## Finding your way

No floating markers, no quest arrows, nothing that is not a thing somebody put
there:

| | |
| --- | --- |
| **Painted route bands** | Both walls at 1.5 m, unbroken, one colour per route — ochre for the arrival, blue west, red east, pale green for the ventilation gallery. At shoulder height so it can be followed by hand as well as by eye. |
| **Numbered timbers** | Each set is numbered by notches cut into the near post, in fours, the way a set actually is. |
| **Cable colour** | The overhead tray carries the colour of the route it feeds. |
| **Chalk arrows** | On the floor at every junction, pointing back the way out. |
| **Airflow cloth** | Rags nailed to the roof of the ventilation gallery, hanging into the draught. They all lean the same way, and that way is the fan. |
| **Light** | Warm strung lamps in the arrival, bright and even in the switch chamber, one hard work light at the deep face, a single failing green lamp in the pump chamber, and nothing at all in the fan chamber but what leaks in. |

A painted route board on the switch chamber wall shows the four bars in their
four colours with the route number tallied beside each. It is paint, not a sign
— what a shift boss would actually mark up.

## Budget

| | measured | budget |
| --- | --- | --- |
| Mesh batches | 38 | < 45 |
| Triangles | 153,084 | < 350,000 |
| Point lights | 24 | fixed practicals only |

Everything is merged to one batch per material through `Kit`. The airflow cloth
is a single `InstancedMesh` rather than one mesh a rag, and `update` writes into
its existing instance buffer. There is no directional light, nothing casts, and
nothing moves with the player — a test holds all three.

## The two things somebody scratched

Both invented for this build. Neither quotes, paraphrases or alludes to the
television series or the novels; there are no show frames, logos, dialogue or
copyrighted text anywhere in the module.

- **The tally**, on the last standing timber of the closed branch: sixty-one
  marks cut in fours and a sixty-second abandoned half way, with `NOT TODAY.
  — B.M.` under them in a steadier hand.
- **The cache lid**, chalked on the underside where only somebody putting
  something back would see it: `IF YOU ARE READING THIS THE LAMP IS ON MY
  SHELF. PUT IT BACK. — HOLLIS`

Both are carried on `interactions` with a `label` for the prompt and a `text`
for the reading, so they cost no geometry and no draw call. `B.M.` and `HOLLIS`
are not characters in the source material and are not intended to be read as
any; they are two people who worked here.

## Integration notes for Codex

- `buildMineNetwork(materials, {seed, detail})`. Put `root` at world
  `(105, 48, 0)`.
- `solids` and `walkways` are **local** and every one carries `local: true`.
  They are already in the shapes `world.js` consumes for `below`: walkways are
  `{kind:'box', x, z, w, d, y}`, solids are `{x, z, w, d, y0, y1}`. Each also
  carries `area`, which is the id of the chamber it belongs to — the loop tests
  use it and it may be useful for audio zones.
- The spawn at local `(0, 0, -29)` is clear, and the return interaction to
  Level 144 is at `(0, 1, -29)`.
- `destinations` carries `mine-arrival`, `mine-junction`, `mine-pump` and
  `mine-deep-face`, each with a local `position` and a `yaw` in the same
  convention as `world.destination`.
- `interactions` use `{position, label}` plus either `destination` or `action`.
  The two inscriptions also carry `text`; if the host has somewhere better to
  put a long reading than the notify line, that is the field.
- `update(dt, time, playerPosition, quality)` turns the fan and moves the
  airflow cloth. It is safe to omit entirely, safe with no arguments, and safe
  with `NaN`; it allocates nothing per frame and does nothing at `quality:
  'low'` beyond the fan. The rags only move while somebody is in the gallery.
- `chambers` describes the fourteen areas with their bounds, route letter and
  kind. `bounds` is the local AABB of everything.
- The old straight drive in `underground.js` and its two `walkways`/`solids`
  entries want removing at the same time as this goes in; its `MINING · ORE
  WORKING 18` and `MECHANICAL ↑` signs are reproduced here.

## Checks

`node --test tests/mine-network.test.mjs` — 9 passing. They build a walkability
grid from the collision the module actually returns and walk it with a 0.3 m,
1.78 m, 0.3 m-step body:

- every destination, interaction and inscription is reachable from the arrival;
- you can stand on each destination with clear floor under your whole footprint;
- closing any one of the three north routes leaves the deep face reachable, and
  closing all three cuts it off — which is what makes the loop genuine rather
  than a corridor drawn in a circle;
- the closed branch can be entered and cannot be walked through;
- no reachable position is on a lip, and nothing reachable is outside the plan;
- ids are unique and the three named destinations exist;
- geometry is finite and inside the declared bounds, within both budgets, and
  every collider is marked local;
- every light is a point light, none casts, none moves when `update` runs;
- `update` is optional and tolerant, and does not replace its instance buffer.

Two of those found real bugs while being written: the switch-chamber pillar was
standing on the line the arrival and the ventilation gallery share, with the
`mine-junction` spawn inside it, and the `mine-pump` spawn was inside the pump.

`npm test` and `npm run validate` run clean with the module in place.

## Limits

The mine is a reconstruction. Nothing in the source material establishes a plan,
a chamber count, a route or a dimension for the workings below Silo 18, and none
is claimed here: the layout, the names, the route colours and both inscriptions
are this build's invention.
