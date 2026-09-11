# Silo 18

## Play the latest build

[Play Silo 18](https://ab19902020.github.io/Silo-/)

Choose **Story · New game** for the mystery, or **Free Roam · All areas** to
explore immediately. The integrated build includes Claude's mine, terminal,
story guidance and audio work; Silos 0–50 outside; explorable flooded Silo 17;
Blender-authored small relics with 3D inspection; earthen bowl terrain; and
consistent artificial interior lighting.

See [this release's changes and validation limits](docs/relic-world-polish.md),
[the mystery route and research](docs/mystery-expansion.md), and
[agent integration history](docs/AGENT_COORDINATION.md).

## Smooth stairs and a market with people in it

- **Changing floors no longer drops frames.** A level is six rooms, a set of
  doors and a dozen canvas-drawn signs — 23 ms of work — and it was all being
  done in the single frame you crossed the floor in, against a 16.7 ms budget.
  That is why the lights seemed to stutter on. A level is now built a wing at a
  time from a queue the frame loop feeds with whatever time it can spare, and
  the floor you are walking towards is finished before the one behind you.
  Descending ten floors, seven runs of 900 frames each, medians: frames over
  the 16.7 ms budget **7 → 0**, and the 99th-percentile frame **15.8 ms →
  6.5 ms**.
- Everything else on the frame was measured and cleared: the world update costs
  0.03–0.05 ms, the whole light rig 0.02 ms, and 48 residents about 1 ms. Two
  small allocation leaks in the per-frame path were tidied up anyway, because
  the litter they left is the kind a browser stops to sweep at an awkward
  moment.
- **The bazaar is a market now.** It had sixteen people arranged in a
  four-by-four grid with nowhere to go — over two and a half minutes, seventeen
  of the eighteen people on that level moved zero metres. There are now six
  traders, one keeping each shop, eight shoppers who each visit three stalls in
  a different order and stand at the counter to be served, and four people
  walking through on their way somewhere else. Every position was checked
  against the level's own colliders, so nobody stands inside a counter.

See [the floor and market notes](docs/floors-and-the-market.md).

## The watch, the prompts and the controller

- **The watch is findable.** It was never a missing model — the game was
  already offering *Take George Wilkins' wristwatch* at the bazaar counter. It
  was hanging 10.5 cm above that counter, and the spot it hung over was inside
  a bolt of cloth with a wooden tray on top, because two separate dressing
  passes lay goods on those counters and neither knew the relic was there. The
  counter now keeps a space clear in both passes, with a felt mat, a repair
  ticket and a loupe in it, and the watch lying on the mat. Relics also carry a
  trace of their own texture as light now — the "faint glint" the code has
  promised in a comment for months and never actually built.
- **Fewer prompts over the view.** Measured first: everything permanently on
  screen adds up to 0.2% of a desktop display and 0.6% of a phone — the ☰
  button and nothing else. What covers the silo is the contextual prompt, and
  it was offered for anything within five metres inside a cone 71° wide. The
  cone now closes with distance — 56° at arm's length, 21° at five metres — so
  you have to be looking at a thing before it offers itself. Across 34,176
  sampled views, a prompt was on screen 3.5% of the time before and 2.1% after.
- **A proper controller map.** R2 used to be sprint *and* fire, so holding the
  trigger to run meant you could not stop running to shoot; L1 was sprint and
  reload; L2 and the D-pad did nothing. It is now the map a console player
  knows: left stick moves, L3 sprints, ✕ jumps, △ or R1 interacts, □ reloads,
  ○ backs out, L1 is the torch, L2 aims and R2 fires, Options opens the
  directory, and the D-pad covers the torch, the satchel, a hint and the cast.
  The full map is printed in Settings, and a test keeps the panel and the code
  in step. On a keyboard, aim moved to the right mouse button so Shift is only
  sprint again.
- **It vibrates.** A DualSense gets both motors; a phone gets `navigator.vibrate`
  with the strength converted to length. Ten short effects — picking something
  up, a door, a shot scaled by the weapon, a landing scaled by the impact, a
  refusal, the shift bell — rate-limited so nothing buzzes once a frame, with
  its own switch in Settings.

See [the controls and watch notes](docs/controls-and-the-watch.md).

## Solid bodies and a better walk

- **Bernard and Sims are solid now.** Both rendered partly see-through, and it
  was never the materials — all three bodies are one opaque mesh with correct
  indices and clean skin weights. The meshes are not watertight: 52% of
  Bernard's edges and 47% of Sims' have only one triangle on them, against 18%
  of Juliette's, and 7.1% of Bernard's figure was missing its front surface
  entirely. What you were
  seeing through those gaps was the inside of his own back, which is why he
  read as translucent all over rather than as a body with holes in it. The
  same skinned geometry is now drawn a second time six millimetres inside the
  surface, reading the body's own texture, so a gap shows cloth instead of the
  room. Bernard's torso goes from 0.64% see-through to 0.05%, Sims' from 0.23%
  to 0.03%.
- **The foot no longer lands while it is still moving forwards.** The swing
  arrived with zero speed, so the foot touched down travelling forward with
  the body and had to stop dead — a 1.6 m/s jump at a walk and 3.9 at a run,
  on every step. It now leaves and arrives at the ground's own speed.
- **The hips carry across onto the leg that is standing**, about 4.5 cm at a
  walk and 2 cm at a run, as a person does. There was no lateral movement at
  all before, and that is most of what made the walk read as mechanical.
- **Less of the kneeling walk.** The foot is planted nearer the body than it
  is left behind, and a foot in the air no longer drags the pelvis down to
  meet it. All of this is in the one procedural gait, so it reaches the player,
  the named cast and every resident in the silo at once.

See [the body and gait notes](docs/bodies-and-gait.md).

## Talking to people, and the book in your hand

- **Everyone named has their own questions.** The dialogue was one list of five
  questions handed to all twenty residents, so you learned the questionnaire in
  your first conversation and there was nothing after it. Walker is asked about
  his bench and about teaching Juliette; Knox is asked whether the upper levels
  listen; Lukas is asked what he is counting. The list itself now tells you who
  you are standing in front of.
- **Questions open into follow-ups.** Ask Juliette about George and you can
  then ask what happened to him and what he showed her. Two levels deep, with a
  way back up. The named cast also have opinions of each other, and the unnamed
  are composed from a trade, a home level, someone they know and a thing they
  keep, so the hundredth resident is a different person from the first.
- **The panel is a typeset card** rather than a box of boxes: the name is the
  loudest thing on it, what they said is set in a serif with a rule of its own,
  and the questions are quiet rows you can scan. Asked rows dim so you can see
  your way through a long conversation.
- **The directory book works sideways.** Turn a phone to landscape and the book
  had no directory in it — its fixed furniture came to more than the panel's
  own height, so the level list and the footer were laid out past the bottom
  edge and clipped away, with nothing to scroll. The book now opens into two
  pages on a short screen: the search and shortcuts down the left, the levels
  down the right at full height. A landscape phone gets more of the list than a
  1024×768 tablet does.
- Searching the directory also takes you back to the top of the results, rather
  than leaving you scrolled a thousand pixels below the four matches.

See [the conversation notes](docs/conversations.md) and
[the directory book notes](docs/directory-book.md).

## Atmosphere

- **The silo keeps time.** One clock, one schedule, and it is the only thing that knows what hour it is — lighting, crowd, ambience and the view out of the great screen all read it, so no part of the silo can be at a different hour from another. Fixtures dim and run down towards a warm filament on the night cycle, the galleries empty and fill again, the cafeteria fills three times, and three shift bells ring at 0600, 1400 and 2200.
- **Something to listen to.** The silo's own noises are chosen by where you are, what hour it is and whether anyone is awake to make them, instead of a blind timer picking one of four sounds. On the stairs — the one place the silo is really audible — you hear runs of feet on steel one to four floors off, quieter and duller the further away they are. Nothing in it speaks: the public address is a chime, a carrier, a cadence with no words in it and a click.
- **The look.** Halation off the practicals, cold concrete shadows against tungsten highlights, contrast that lets the dark actually go dark, vignette and shadow grain — and an eye that adapts by about half a stop when you step off a lit gallery into the shaft.

See [the atmosphere notes](docs/atmosphere.md).

## Latest residents, conversation and cleaning work

- Rebuilt the head as one continuous sculpted surface. The face was two dozen ellipsoids and boxes laid over a sphere: the hair cap crossed the skull and cut torn bands across the forehead and cheeks, and the brows and age lines floated a centimetre off it. Brows, lashes, lips and stubble are painted onto the skin now, so nothing on a face can cross it.
- Every resident on every floor walks a routine — a ring of stops with something to do at each one — instead of standing on one spot while twelve porters orbit the gallery.
- Talking keeps you in the silo. The panel no longer pauses the world; the person stops, turns to face you and stays turned, the camera settles on them, and **1**–**9** ask, **0** goes back a level, **E** or **Esc** steps away.
- Restaged the cleaning so the cafeteria screen can actually see it: Holston is framed at the lens, steps in to wipe, and the rag blanks the picture on each pass. The helmet is a helmet rather than a pale sphere the size of a skull, and it comes off in his hands.
- The directory book is on a front table and picking it up no longer snaps the camera into the screen.
- Fixed the book itself: the frame loop was overwriting the pickup prompt every tick, so a new game could not be started at all. The book is also findable now — a tan, brass-cornered volume with a lit title plate, on a table laid with nothing else, off the line the player character stands on.
- A prompt now only appears for something you can see. The gun room's racks sit under two metres behind the cafeteria's east wall, so walking up to blank blockwork offered you a rifle through it.
- The crater has a rim that closes the horizon and falls away behind, and the dead tree is grown rather than assembled from four dozen straight cylinders.

See [the notes and reference limits](docs/residents-and-the-cleaning.md).

## Interface, conversations and rendering update

- The chapter card now clears automatically. Navigation opens with **H / ☰**, touch controls fade when idle, and the cleaning opens with an unobstructed picture.
- Approach a resident and press **E / Use** to ask about their work, nearby places or the cleaning. Named characters and general department workers have different replies.
- Added offscreen edge smoothing, corrected contact shading on sloping floors, neutral ceiling lighting, worn steel finishes, and finer exterior materials.
- Upgraded generated faces and hair, differentiated skin/fabric/leather, and added reflective cleaning visors. All supplied characters retain their opaque, double-sided rigs.
- The void has continuous rippled water with quality-scaled planar reflections, coherent rock strata and the restored photographic rock maps.
- Holston settles beside Allison with full-body ground contact. The 90-second opening and the existing audio timings are retained.

See [implementation, checks and limits](docs/immersive-update.md).

## Latest reference update

Stair bridges now rotate between three directions throughout all 144 floors, with matching walkable flights, concrete gallery guards and protected terminal landings. The cafeteria has rounded petal lights and layered ceiling frames based on the supplied still. The exterior sensor looks over the exit from behind: Holston emerges with his back to the camera, then turns and approaches it. The raised panorama includes sky and stars; choose **Settings → Outside sky → Night** to see them immediately.

NPC faces, hair, clothing and boots have more detail; walking, activity transitions, jump ascent and landing poses are improved. The opening audio and ambience are preserved. See [implementation, checks and reconstruction limits](docs/reference-update.md).

## Living silo and cafeteria opening

- Begin in the Level 1 cafeteria. Approach the directory book and press **Use / E**. The live screen shows Holston leaving, cleaning the sensor, removing his helmet and lying beside Allison. Open the book afterward to use the 144-level directory. Screen focus, skip and replay are available.
- Added 20 original character models beyond the three supplied meshes. Seventeen living cast members join the playable selection: **20 playable characters** in total. Holston and Allison appear in the opening; George’s model is included as a reusable asset without placing him alive in this scene.
- Added residents to every numbered level, seated cafeteria diners, bazaar groups, porters and workers in the generator hall and mines. Up to 28/48/72 nearby residents are active depending on graphics quality; 3,549 placement records span the environment.
- Fixed overlapping void water and deck surfaces, disabled the moving shadow light in the lower areas, and added fixed practical lights. The camp-to-water ladder and sealed-door route remain walkable.
- Finished the top landing’s visible central spine and terminal parapet. The concealed Mechanical entrance now has a movable warning plate, intact masonry around a real opening, supported approaches and a return route from the void.
- Integrated Claude’s controller, jump, gait and audio changes before publishing this update.

The cast is modeled from reference costumes and roles, with approximate faces. The public material does not establish a complete surveyed set plan or the exact warning-sign wording, so this is **not a verified one-to-one replica**. See [release details and limits](docs/living-silo.md) and the [22 reusable rigged GLBs](models/README.md).

## Latest stairwell rebuild

- Rebuilt every guard in the stairwell to the supplied reference frames: one cast concrete section — a plumb wall with a half-round coping — swept along the helix, round the landing corner and out along the bridge. No metal posts, caps or handrails remain in the shaft, and the treads are bare concrete wedges.
- Closed the open corner at every landing. The flight's coping now leaves the helix on a tangent and arrives on the bridge guard's line, on the opposite side of the bridge at each end, the way the stair changes direction as it climbs.
- Added the lit newel column at each bridge end, continuous through all 144 storeys with one collar per level.
- Rebuilt the distant level of detail to the same rise, guard and columns, so a level no longer changes shape as it crosses the detail boundary.
- Walkable widths, floor heights and the rest of the silo are unchanged.

See [the stairwell notes and reference limits](docs/stairwell-guards.md).

## Earlier visibility, staircase and void repairs

- Character garments now render both faces as opaque surfaces, preventing reverse-facing coat panels from disappearing. The close camera hides the whole avatar before it cuts through a coat.
- Rebuilt the staircase guards as continuous rising surfaces sharing one clear opening at every landing. Superseded by the stairwell rebuild above, which replaced the metal rails and posts with cast concrete.
- Preserved the camp’s bed, shelf, table and relics, moving the room to the sheltered perimeter of the excavation. Its ledge entrance is an actual opening.
- Replaced the caged descent with a rung ladder and climbing poses for all three characters. Approach and press **Use / E** to descend or return; you can look around during the climb.
- The ladder leads to supported water, a round tunnel through the cavern wall and the sealed door at its far end. Walk the complete route and return without a teleport.

See [the repair notes and reference limits](docs/visibility-stairs-void.md).

## Latest animation and visual update

- Repaired trouser skin weights below Sims’s and Bernard’s coat hems. All three supplied models now include eight looping motions, with a continuous runtime gait, terrain-aware planted feet, measured leg joints, smoother turns, stair transitions and landing recovery.
- Footsteps follow planted-foot contacts; Claude’s soundtrack, ambience and interaction sounds remain in place.
- Added household objects, kitchen tile relief, woven runners, enamel pendants, dressed desks, market scales and shop valances, medical bed fittings, service pipes, gauges, generator bolts and mine hardware.
- Added shaft fascia layers and fluted columns, finer cloth and foliage, CRT terminal detail, wall patina and revised contact shading. Apartment lights now sit inside the rooms, beneath their ceilings.

See [the animation and visual upgrade notes](docs/visual-upgrade.md) for references, validation and reconstruction limits.

## Character and exterior foundation

- Three supplied characters are rigged and selectable: Juliette Nichols, Robert Sims and Bernard Holland. Each has a relaxed bind pose, foot planting, and first/third-person views. The other two stay at their departments.
- The supplied hard-drive relic is on Walker’s repair bench; use the directory shortcut to inspect it.
- Fixed the false ground gap around the exit and added streaming exterior terrain without a finite collision edge.
- Reframed the live cafeteria panorama around the barren bowl and right-hand dead tree. The sensor housing and city skyline are absent from the panorama; the actual ramp mouth is visible. The exterior contains no city geometry.

## Earlier environment update

- Fixed gravity-induced invisible walls at wing entrances. A regression walks out of and back into all **864 destinations** on all **144 levels**.
- Added a dedicated bazaar: six enterable shops, narrow market street, deep rounded shopfronts, ribbed overhangs, red food lamps, bunting, repair counters and merchandise. Its location on Level 100 is inferred, not confirmed TV canon.
- Added a continuous 3.2 m wide rear service gallery on Levels 2–144, connected to standard wings through real doorways. The Level 1 civic/cleaning complex keeps its bespoke route; cafeteria screens are not cut through for a rear exit.
- Added photographic 1K PBR concrete, painted metal, tiled floors and rock. Meter-scaled mapping prevents stretched textures on long walls. All maps are CC0 with recorded provenance.
- Rebuilt shaft pylons with segmented light belts and core capsule lights; added deep portal surrounds, rounded domestic kitchen alcoves, worn household furnishings and detailed analogue workshop equipment.

## Explore

- **144 numbered levels**, all with circular galleries, connected concrete spiral stairs, full-depth landings and six furnished wings.
- A broad curved cafeteria screen with a continuously rendered exterior feed; reconstructed apartments, each with living/kitchen space, bedroom and bathroom; the sheriff’s office, Judicial, IT, the vault, observation room, Medical, education, agriculture, recycling, water filtration, Supply and workshops.
- A 50 m diameter generator hall below Level 144, with six turbine panels, overhead crane, exposed rotor and a walkable upper gantry.
- A separate excavator cavern with radial cutting arms, a central tower, water, catwalks and inspection access; supported mine workings, ore carts, a rock drill and a sealed lower tunnel.
- A connected Level 1 cafeteria, sheriff’s station, Holding 3, preparation room, interlocked pressure doors and slatted ramp to the barren surface. A sunken hatch, squat camera monument, dead tree, rocky crater and barren rim. Use / E cleans the lens and clears the cafeteria feed.
- Physically shaded material maps, surface normals and roughness, rounded furniture edges, local shadows, contact shading, reflection lighting, subtle bloom and moving exterior dust.
- Openable doors, solid walls and furniture, inspection points, a torch, a continuous soundtrack with surface-aware footsteps and located ambience, a searchable floor directory and travel shortcuts.
- Touch controls for phones, keyboard/mouse controls, fullscreen, brightness and rendering settings.

## Sound

- The supplied **ten-minute soundtrack** plays continuously everywhere in the silo, from the moment you enter. It never restarts or ducks as you travel between levels, and its loop is gapless. Set its level with **Music** in settings; **Sound** silences everything.
- **Footsteps are real recordings.** Every room inside the silo walks on the same concrete floor, so walking it end to end sounds like one building; only the places that are not silo floor differ — cut rock in the mines and the void, grit on the surface, and water where you wade. They were synthesised until they weren't good enough; the recordings are from Minetest Game under CC BY-SA 3.0, attributed and licensed in [`dist/assets/audio/footsteps/README.txt`](dist/assets/audio/footsteps/README.txt).
- **Firearms** on the sheriff's range fire real recordings — 9 mm, .308 and 20-gauge reports, and magazine, bolt, shell and cylinder sounds scheduled across each reload the way that weapon actually loads.
- Doors, the pressure-door airlock, the lens wipe, the torch and the interface each have their own sound; the mains hum, ventilation, wind and turbine throb change with the location, and a synthesised impulse response gives the shaft its concrete tail.
- The soundtrack, the footsteps and the gunfire are bundled files. Everything else is generated at runtime. See [the audio notes](AUDIO.md).

## The sheriff's range

Behind the sheriff's station on Level 1: twenty-two metres, four lanes, and the
complete weapon collection from **Lost Signal** racked along both walls — five
rifles, five shotguns, four sniper rifles, two SMGs, five pistols, three
revolvers and two blades, every one of them usable. Take one off the rack, and
the bench beside it resupplies you.

Steel plates swing and ring when you hit them; paper silhouettes take a hole
where the round went through. Recoil is added to your aim rather than replacing
it, so it has to be pulled back down. Weapon models load the first time one is
picked up, so a player who never goes down there never pays for them.

See [the range notes](docs/gun-range.md).

## Down in the void

The camp sits beside the outer ledge. Its ladder descends to the water; the hidden tunnel passes through the cavern perimeter and ends at a sealed door. The room’s exact position and dimensions remain reconstructed. Gallery signs stay mounted to their walls and the gallery pylons stay clear of doorway approaches. [The world notes](WORLD.md) retain the history of the earlier implementation.

The directory’s travel feature is a visitor shortcut, not an in-world elevator. The central stairs physically connect every numbered floor. Lower maintenance hatches use explicit travel transitions into the mines and cavern. The cleaning route is continuously walkable in both directions. The hidden tunnel’s far door remains sealed. Explore mode remains open; Story mode includes a short drone encounter after escape.

## Accuracy

**This is not a certified one-to-one production replica.** No complete dimensioned, room-by-room television blueprint was available in the reviewed sources. The 144-level count and principal architectural motifs are supported by the show’s production references. Room plans, many departmental placements and all exact modeled dimensions are estimates. Every unseen floor is furnished using reusable layouts rather than presented as a verified television floor plan.

See [research and reconstruction decisions](docs/reconstruction.md), [the full level schedule](docs/level-schedule.json) and the in-world **Research & accuracy** panel. The project combines the existing explorable environment with an original mystery-adventure adaptation. Unseen architecture and invented story connections are identified as reconstructions.

## Controls

| Action | Computer | Phone |
| --- | --- | --- |
| Move | WASD or arrow keys | Left joystick |
| Look | Drag, or click to capture the mouse | Drag the right side |
| Run | Hold Shift | Run button |
| Open / inspect / clean lens | E | Use button or the central prompt |
| Directory | M | Directory button |
| Torch | F | Torch button |
| Character | C | Character button |
| Think it through (a hint) | T | The button on the chapter card |
| Fire | Left mouse (captured) or G | FIRE button |
| Reload / aim / sling | R / hold Shift / H | — |
| First / third person | V | View button |
| Pause | Esc / Silo 18 mark | Silo 18 mark |

## Run locally

All runtime files and the pinned Three.js 0.180.0 engine are stored here. There are no CDN, font service, remote model or image dependencies.

```sh
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. Use an HTTP server rather than opening an ES-module file directly. The root `index.html` also forwards to `dist/` for a static host serving the repository root.

## Verify

Node 22 or newer; no package installation required.

```sh
npm test
npm run validate
```

The tests construct the world and exercise all 144 bridge connections, all 143 stair intervals, walking in both directions, rotated doors, directory destinations, lower access and original glTF assets. They also check the complete cleaning walk out and back, mutually exclusive pressure doors, lens cleaning state, domestic room openings, generator gantry access, all-level geometry coverage and bounded floor streaming. These are geometry/physics and static checks; they do not constitute browser rendering, device performance or visual equivalence testing.

## Project layout

- `dist/src/data.js` — scale, complete level program and reference sources.
- `dist/src/world.js` — full shaft, floor streaming, doors, lighting and collision.
- `dist/src/rooms.js` — furnished department and residence templates.
- `dist/src/top-floor.js` — connected cafeteria, sheriff, holding room and airlock.
- `dist/src/surface.js` — ramp, terrain, camera, lens cleaning and live feed.
- `dist/src/generator-hall.js` — lower turbine hall and maintenance stairs.
- `dist/src/rendering.js` — contact shading, bloom and reflection environment.
- `dist/src/underground.js` — mines, excavator, flooded void and sealed passage.
- `dist/src/kit.js` — reusable meshes, material surfaces and instancing.
- `dist/src/physics.js` — adapted Lost Signal collision and walking controller.
- `dist/src/main.js` — controls, directory, interaction, audio and render loop.
- `dist/src/audio.js` — soundtrack playback, footsteps, interaction sounds, ambience and shaft reverb.
- `dist/assets/audio/` — the supplied soundtrack and its provenance record.
- `dist/assets/lost-signal/` — preserved interior GLBs.
- `reference/lost-signal/` — the original silo source and Blender habitat generator.

## Credits

The original Lost Signal source was read at commit `aa4c1d00d173b3aa98560617e2d541d3ff093dee`; that repository was not modified. New modeled geometry, material surfaces, interface, runtime audio synthesis and cafeteria-screen landscape are authored for this reconstruction. Three.js is provided under its [MIT license](dist/vendor/THREE-LICENSE.txt). Television and production art remain the property of their respective owners; reference links are provided, and show frames, show music and extracted studio models are not bundled. The bundled soundtrack was supplied by the repository owner and is not taken from the television production; its provenance and encoding are recorded in `dist/assets/audio/manifest.json`. The three character likeness meshes and hard-drive model were supplied by the user; their hashes and preparation metadata are in `dist/assets/characters/manifest.json`.
