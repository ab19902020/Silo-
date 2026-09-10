# Mystery expansion — integration and release notes

## Scope and status

This continues the existing authored Three.js game. Silo 18's 144 floors,
streaming, staircase, NPC population, supplied models, audio and 90-second
Holston opening remain in place. The story is a new game adaptation with a
roughly 30-minute design target, not a reenactment of an entire television season.

Claude's delivered mine network (`1e0d125`) and George terminal (`2d8f7c8`)
are integrated, with author attribution preserved. Coordination and changes to
the handoff contracts are recorded in `AGENT_COORDINATION.md`.

Implemented in this branch:

- Claude's complete delivered branch: continuous resident faces, daily walking
  routines, live conversations, improved cleaner/helmet/lens staging, a front
  cafeteria book table, crater rim and a merged tree mesh. The 90-second audio
  timing is preserved.

- Fourteen connected mine areas with two loops, a pump chamber, fan gallery,
  collapse and cache branches, ore face and optional inscriptions. The deep-face
  hatch connects to the pressure gallery. Active fixed mine lamps are capped
  at 4/6/10 for low/balanced/high quality; the void is hidden while in the mine.
- Artificial interior light, floor-zone atmosphere, service dressing and
  height-dependent wall ageing. No sun in the interior scene. The cafeteria
  image is a separate exterior camera feed, as before.
- Stationary relics with readable descriptions and a persistent journal; no
  floating quest columns. PEZ → repair ticket → watch and Medical's Georgia
  book. The watch points to the concealed Mechanical access.
- Inspect the blocked access, find a crowbar and return. The existing warning
  panel and collision open together. The supplied Hard Drive 18 mesh is on the
  hideout table in Story mode; its former workshop inspection remains in Explore.
- George's actual labelled apartment on 068/A contains his computer and an
  unplugged connector. Mounting the drive and booting reveals only ordinary maintenance files.
  The player must search for `library`, enter that directory and open the
  schematic. A nearby paper provides a diegetic hint. The terminal persists.
- Water Filtration's kit, then a separate pressure gallery reached from the
  mine drill. Four timed, spatial interactions: pry the cover, isolate, fit the
  collar, torque it. The cover and collar visibly change with progress.
- Billings' branching conversation requires the Atlanta page and capped pipe.
  He grants the existing riot shotgun with its real model, sound, ammunition,
  recoil and reload. The other racks remain unavailable in Story mode.
- A sealed suit and the existing interlocked airlock lead to daylight and a
  two-hit drone fight. Story mode offers no lens-cleaning interaction. Defeat
  retries at the airlock with ammunition; victory permits return trips and free
  exploration. Directory travel cannot bypass the finale or the void breach.
- All requested exterior identifiers 0–50. The 49 sealed crowns use three
  instanced geometry batches, plus number plates. Silo 18 retains its existing
  exit; Silo 17 has a breached crown and separately streamed interior.
- Silo 17 has three traversable landings, two continuous stair towers, a wading
  floor, emergency fixtures, high-water marks, pump log and return route.
- Both water areas have reactive rings, wakes and a fixed 48-droplet ballistic
  splash pool; low quality skips planar reflection without disabling interaction.
- Continue restores story, terminal and a supported checkpoint. Explore does
  not overwrite the saved story. Invalid/inconsistent save fields cannot simply
  assert completion without the prerequisite items and progression.

## Intended route and pacing

| Beat | Route | Design allowance |
| --- | --- | --- |
| Opening and first lead | Cafeteria book and Holston | 2–3 min |
| Objects and people | Bar 026, Bazaar 100, Medical 062 | 5–7 min |
| Concealed access | Mechanical, crowbar, hideout, drive | 5–7 min |
| Recovery | Wilkins 068/A, ordinary index, hidden files | 3–4 min |
| Service line | Filtration 055, mine, pressure gallery | 4–5 min |
| Escape | Billings, Supply 144/D, airlock, drone | 4–6 min |

These are design allowances, **not measured playtest durations**. Directory
travel remains an optional visitor shortcut; walking the full 144-level staircase
takes substantially longer. Silo 17 is post-finale exploration.

## Research and reconstruction boundary

Sources reviewed on 2026-09-09:

- [Apple TV's official Silo overview](https://www.apple.com/tv-pr/originals/silo/)
  establishes the adaptation and series context. It does not supply dimensioned
  gas-pipe or exterior-network coordinates.
- [Apple's episode and production-image page](https://www.apple.com/tv-pr/originals/silo/episodes-images/)
  was checked; the available text did not expose a surveyed floor/site plan.
- [Decider's season-three finale recap](https://decider.com/2026/09/04/silo-season-3-episode-10-recap/)
  and [SciFi Spiral's finale recap](https://scifispiral.com/post/silo-season-3-episode-10-troy-recap-silo-1-revealed-and-silo-18-defeats-the-safeguard)
  were indexed as describing a mine/pipe intervention. These are secondary
  recaps, not engineering plans or authority for an exact physical coordinate.
- Existing production, costume and environment references remain in
  `dist/src/data.js`, `docs/reconstruction.md` and `WORLD.md`.

The pressure gallery, its coordinates, interface, clues, sequence and required
tools are **reconstructed for this game**. The terminal displays that status.
No exact canonical gas-line coordinate is claimed. The user's 0–50 numbering
includes **Silo 0 as an explicit game extension**. The staggered field and 178 m
neighbour spacing are a coherent game layout, not a verified canon map. Only
the 17/18 neighbouring relationship is used to guide placement. The flooded
interior's three accessible landings and all detailed room plans are invented.
Billings' conversation and this escape/drone sequence are original game writing.
The book establishes an earlier outside world; Billings does not claim a picture
proves today's air is safe.

## Validation and remaining release gates

**135 automated tests pass** (`npm test`). Static validation checks 169 runtime
files, local entrypoints, imports and JavaScript syntax (`npm run validate`).

Automated checks cover terminal sequencing and recovery, progression gates,
pipe order, Billings' evidence, drone defeat/retry/victory, all UI IDs, supported
new destinations, translated mine loops and hatch access, bounded stationary
lamps, empty abandoned-space population, physical stair descent/ascent in Silo 17, exterior geometry
budgets and the existing full regression suite.

The supervised browser reached the game but failed before renderer startup:
WebGL is disabled in that browser (`GL_RENDERER = Disabled`). A single retry
confirmed the limitation. **No successful 3D browser playthrough, visual QA,
device FPS measurement or measured 30-minute run is claimed.** Run the release
candidate on a WebGL 2 capable desktop and phone before merging or publishing.

The existing hosting project returned `Sites project not found`; its manifest
has been preserved. This branch is a reviewable source update, not a new live
publication. Remaining release gates: complete a real-time story run, check touch combat and visual quality on hardware,
and resolve the existing hosting identity before any requested deployment.
