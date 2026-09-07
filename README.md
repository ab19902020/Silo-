# Silo 18

A browser-based, first- and third-person reconstruction of the television silo, built in Adam’s **Silo-** repository using the circular collision system and selected interior assets from **Lost Signal**.

## Latest character and exterior update

- Three supplied characters are rigged and selectable: Juliette Nichols, Robert Sims and Bernard Holland. Each has idle, walk and run clips, a relaxed bind pose, foot planting, and first/third-person views. The other two stay at their departments.
- The supplied hard-drive relic is on Walker’s repair bench; use the directory shortcut to inspect it.
- Fixed the false ground gap around the exit and added streaming exterior terrain without a finite collision edge.
- Reframed the live cafeteria panorama around the barren bowl and right-hand dead tree. The sensor housing, ramp and city skyline are absent from the panorama. The exterior contains no city geometry.

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
- **Footsteps** follow the floor you are on — concrete galleries, metal grating in Mechanical and the generator hall, rock in the mines, grit on the surface, soft floors in the residences — with per-step variation rather than one repeated sample.
- Doors, the pressure-door airlock, the lens wipe, the torch and the interface each have their own sound; the mains hum, ventilation, wind and turbine throb change with the location, and a synthesised impulse response gives the shaft its concrete tail.
- Only the soundtrack is a bundled file. Everything else is generated at runtime. See [the audio notes](AUDIO.md).

The directory’s travel feature is a visitor shortcut, not an in-world elevator. The central stairs physically connect every numbered floor. Lower maintenance hatches use explicit travel transitions into the mines and cavern. The cleaning route is continuously walkable in both directions. The hidden tunnel’s far door remains sealed. There is no combat.

## Accuracy

**This is not a certified one-to-one production replica.** No complete dimensioned, room-by-room television blueprint was available in the reviewed sources. The 144-level count and principal architectural motifs are supported by the show’s production references. Room plans, many departmental placements and all exact modeled dimensions are estimates. Every unseen floor is furnished using reusable layouts rather than presented as a verified television floor plan.

See [research and reconstruction decisions](docs/reconstruction.md), [the full level schedule](docs/level-schedule.json) and the in-world **Research & accuracy** panel. The project is an explorable environment, not a population simulation or a recreation of the show’s storyline.

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
