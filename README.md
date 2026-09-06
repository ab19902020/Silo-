# Silo 18

A browser-based, first-person reconstruction of the television silo, built in Adam’s **Silo-** repository using the circular collision system and selected interior assets from **Lost Signal**.

## Explore

- **144 numbered levels**, all with circular galleries, connected concrete spiral stairs, full-depth landings and six furnished wings.
- Cafeterias with an original rendered outside-screen view; residences with bedrooms, bathrooms and kitchens; the sheriff’s office, Judicial, IT, the vault, observation room, Medical, education, agriculture, recycling, water filtration, Supply and workshops.
- Mechanical’s six-panel generator, exposed turbine, pipe banks, gantry and crane.
- A separate excavator cavern with radial cutting arms, a central tower, water, catwalks and inspection access; supported mine workings, ore carts, a rock drill and a sealed lower tunnel.
- Openable doors, solid walls and furniture, inspection points, a torch, ambient machinery sound, a searchable floor directory and travel shortcuts.
- Touch controls for phones, keyboard/mouse controls, fullscreen, brightness and rendering settings.

The directory’s travel feature is a visitor shortcut, not an in-world elevator. The central stairs physically connect every numbered floor. Lower maintenance hatches use explicit travel transitions into the mines and cavern. The outer cleaning door and hidden tunnel door remain sealed.

## Accuracy

**This is not a certified one-to-one production replica.** No complete dimensioned, room-by-room television blueprint was available in the reviewed sources. The 144-level count and principal architectural motifs are supported by the show’s production references. Room plans, many departmental placements and all exact modeled dimensions are estimates. Every unseen floor is furnished using reusable layouts rather than presented as a verified television floor plan.

See [research and reconstruction decisions](docs/reconstruction.md), [the full level schedule](docs/level-schedule.json) and the in-world **Research & accuracy** panel. The project is an explorable environment, not a population simulation or a recreation of the show’s storyline.

## Controls

| Action | Computer | Phone |
| --- | --- | --- |
| Move | WASD or arrow keys | Left joystick |
| Look | Drag, or click to capture the mouse | Drag the right side |
| Run | Hold Shift | Run button |
| Open / inspect | E | Use button or the central prompt |
| Directory | M | Directory button |
| Torch | F | Torch button |
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

The tests construct the world and exercise all 144 bridge connections, all 143 stair intervals, walking in both directions, rotated doors, directory destinations, lower access and original glTF assets. They also check geometry finiteness and bounded floor streaming. These are geometry/physics and static checks; they do not constitute browser rendering, device performance or visual equivalence testing.

## Project layout

- `dist/src/data.js` — scale, complete level program and reference sources.
- `dist/src/world.js` — full shaft, floor streaming, doors, lighting and collision.
- `dist/src/rooms.js` — furnished department and residence templates.
- `dist/src/underground.js` — mines, excavator, flooded void and sealed passage.
- `dist/src/kit.js` — reusable meshes, material surfaces and instancing.
- `dist/src/physics.js` — adapted Lost Signal collision and walking controller.
- `dist/src/main.js` — controls, directory, interaction, audio and render loop.
- `dist/assets/lost-signal/` — preserved interior GLBs.
- `reference/lost-signal/` — the original silo source and Blender habitat generator.

## Credits

The original Lost Signal source was read at commit `aa4c1d00d173b3aa98560617e2d541d3ff093dee`; that repository was not modified. New modeled geometry, material surfaces, interface, ambient synthesis and cafeteria-screen landscape are authored for this reconstruction. Three.js is provided under its [MIT license](dist/vendor/THREE-LICENSE.txt). Television and production art remain the property of their respective owners; reference links are provided, and show frames, music, actor likenesses and extracted studio models are not bundled.
