# External agent integration

The user's one external Claude agent delivered both the mine network and
George's terminal on `claude/staircase-design-consistency-wy6052`:

| Package | Original commit | Integration |
| --- | --- | --- |
| Mine network | `1e0d125` | Cherry-picked with Claude authorship; connected at `(105, 48, 0)` |
| George terminal | `2d8f7c8` | Cherry-picked with Claude authorship; dialog and story integration complete |

Codex owns the host architecture, visuals, story progression, pressure gallery,
exterior network, Silo 17 and final integration. No second Claude is required.

The complete delivered branch at `00a61eb` is also merged, preserving Claude's
resident face meshes, daily routines, live conversations, cleaning staging,
front-table book, crater rim and batched tree. Its prior audio, water and gun
range merge is retained. Live resident conversations remain active while the
terminal and Billings' story decision use the existing modal controls.
The original mine brief is retained for history; no package is awaiting delivery.

The integrated mine uses translated collision and interaction data, renders
independently of the void and caps active fixed lamps at 4/6/10 by quality.
`mine-deep-face` connects to the separate pressure gallery and is its return
point. The terminal retains Claude's mundane files and concealed library, with
its blueprint route and tools reconciled to the implemented pressure sequence.

See `mystery-expansion.md` for validation and the remaining hardware playtest.
The user subsequently authorized merging all work to main and publishing a playable
link. The release preserves the existing GitHub Pages workflow and hosting identity.
Claude’s subsequent story, pickup-visibility and consistent footstep fixes are
included; see `relic-world-polish.md` for the final polish pass.

## Footsteps — a note for whoever touches the audio next

`dist/assets/audio/footsteps/` is real recorded audio under CC BY-SA 3.0, not
synthesis. Three things in it are load-bearing and were each a reported defect
before they were fixed, so please do not undo them:

1. **The whole silo walks on one floor.** Every interior place maps to
   `concrete`. Only the mines and the void (`rock`), the crater outside
   (`grit`) and standing in water (`wet`) differ. Changing footstep character
   at every door made it read as several different games.
2. **Those four use four different source recordings.** `rock` and `grit` were
   both gravel for a while and walking out onto the crater sounded exactly like
   walking through the mines.
3. **The water takes are cut splashes, not the head of the file.** The source
   is continuous wading; see the README beside the recordings. A take with no
   attack is inaudible underfoot, which is what the basin used to be.

`tests/audio.test.mjs` fails if any of the three is broken, and again if the
licence, the attribution or the record of changes goes missing.

## Residents — a note for whoever touches the models next

An earlier pass on this branch rebuilt the resident body as a parametric loft
with its own wardrobe table. `main` has since replaced the whole thing with a
baked anatomical mesh (`resident-body-data.js`) and a garment surface that
projects cloth onto the bind pose (`garment-surface.js`), which is the better
system and the one that survives. The loft is dropped; what follows is written
against the mesh that is actually there.

The figure and its clothes, as of the pass after that:

- `resident-body.js` reshapes the baked trunk before anything is fitted to it:
  shoulders slope about 3.5 cm from neck to tip (they were a flat shelf), the
  waist comes in, the trunk is about 12% shallower, legs taper at the knee and
  ankle, and build makes limbs thicker all round instead of stretching them
  sideways into ovals. `tests/resident-figure.test.mjs` and the updated
  shoulder assertion in `resident-tailoring.test.mjs` hold this.
- `resident-cloth.js` gives the shirt and trousers real thickness by inflating
  the covered body along its normals, flattening the front of the pelvis, and
  relaxing the result. Without it the clothing is a colour on bare anatomy.
- Open garments (coat, cardigan, lab coat, waistcoat) are one shell sampled
  round the body, sharing `JACKET_STAND`/`JACKET_OPEN` with the coat skirts so
  they meet at the waist. Radial samples are rejected if they land on the far
  side of the body — high on the chest they used to, and built the jacket
  inside the torso.
- "Forearm" for rolled sleeves is decided by skin weight, not by width; the old
  width test painted bare skin on the hips.

## Frame budget — what was cut and where it lives

Level 001 on Balanced was drawing about 6.1 million triangles a frame. It is
now about 3.1 million, and Low is lower again. If something starts dragging,
check these first before adding more detail:

- The shaft (`world.js`, `updateStructure`): the full-detail band is ±4/±2/±1
  storeys by quality instead of fifteen. Only the storey you stand on casts
  shadows (±1 on High). It does that through a small copy of the detailed kit on
  layer 1 (`SHADOW_ONLY`), which only the lamp's shadow camera renders. The band
  and the far shaft never cast shadows.
- The surface (`world.update`) is drawn only outside or past the inner airlock
  door (top-local z > 52). The two doors never open together, so it cannot be
  seen from anywhere else.
- Residents: past 13 m (9 Low, 18 High) a resident swaps to a merged copy of
  their own mesh, about a third of the triangles (`resident-lod.js`). Only
  residents within 15 m (8/28) cast shadows. Off-screen residents update five
  times a second.
- Every crowd, porter and cast model is tailored while the title screen is up
  (`warmResident`), so walking into a crowd does not stall a frame on building
  someone.
- Touch devices start on Low until the player picks a setting.

## Android app

`android/` builds the game into an APK (`android/build.sh`, see
`android/README.md`). It packs `dist/` exactly as it is, so anything that works
on GitHub Pages works in the app — but two things are worth knowing:

- The app serves files from `https://appassets.androidplatform.net/`. Keep asset
  URLs relative (as they are now); an absolute URL to another host will not load
  offline. New file types need a MIME entry in `MainActivity.TYPES`.
- Back runs the page's Escape behaviour: it fires `cancel` on the open
  `<dialog>`, or a keydown `Escape` when none is open.
