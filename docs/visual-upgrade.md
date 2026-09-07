# Animation and visual upgrade — 7 September 2026

This update builds on commit `bfa9faa40c2f21b31739a3933ab685eb3057870e`, including Claude’s audio, mounted signs, cleared doorway approaches and excavator descent. Those features remain in the combined build.

## Character movement

The three supplied meshes retain their textures, proportions and existing skeletons. The repair separates 2,644 Bernard vertices and 2,232 Sims vertices below the coat hems from coat joints, attaching the trousers to the corresponding thigh and shin. Each GLB contains Idle, Walk, Run, StairUp, StairDown, TurnLeft, TurnRight and Fall clips. They are generated skeletal motions, not motion capture.

The game uses one continuous distance-driven gait instead of restarting a clip at each change of pace. A two-bone leg solver uses each model’s measured joint lengths. Stance feet retain their world position, sample the physical floor and allow the pelvis to lower on stairs. Arm swing, elbow bend, torso lean, coat movement and idle breathing follow the same phase. Heading and vertical body movement are smoothed; short gaps while descending steps do not immediately trigger the fall pose. Landing restores ground contacts. Footstep sounds use those contact events, while the original distance-based audio interface remains compatible.

Walk and run inputs are 1.45 m/s and 3.8 m/s. Character selection, department posts, first/third-person views, the supplied relic and the cleaner’s image in the live exterior feed remain available.

## Environment

New set dressing extends the existing room layouts: raised kitchen tiles, radios, bread bins, books, mugs, woven runners and framed household copies of the Pact; paperwork and enamel CRT terminals; market valances, scales and merchandise; medical bed fittings, curtain rings and bedside cupboards; bolted pressure pipes, valves and gauges; generator controls and mine hardware.

The shaft has layered concrete fascias, portal reveals and fluted column surfaces. The cafeteria has additional pier detail, serving equipment and table objects. Materials add cloth weave, shaped leaves, restrained wall staining and revised metal roughness. Contact shading and colour balance retain warm fittings against cooler concrete. Apartment lighting is positioned beneath the ceilings and follows the closest practical fittings.

Most additions sit on existing furniture, against walls or overhead. The continuous stairs, wing entrances, rear galleries, cleaning route and solid exterior remain governed by the existing collision geometry.

## References and limits

- [Production VFX discussion and credited stills](https://vfxvoice.com/unraveling-the-mysteries-of-silo/) informed the shaft, cafeteria and generator material language. The article supports the 144-level structure.
- [Lux Machina’s production case study](https://www.luxmc.com/silo) describes the curved cafeteria display and its degraded exterior image.
- [Arnaud Valette’s credited Silo concept work](https://arnaudvalette.artstation.com/projects/Dvb9q0) and [Sally Crees’s production gallery](https://www.sallycreescostumedesign.co.uk/home/silo-apple-tv-seasons-1-and-2) supplement the existing market references.
- The requested [Silo 18 Fandom page](https://silo.fandom.com/wiki/Silo_18) could not be retrieved during this update. Its full contents and all linked images were not inspected.

Reference images guide the modelling; this update does not bundle new production screenshots as textures. Existing photographic material maps retain their recorded CC0 provenance. Exact dimensions, unseen room plans and many department placements remain reconstructions. The project does not claim a verified one-to-one reproduction of every television set.

## Validation and reproduction

`npm test` checks skeletal weights, finite normalized joint rotations, looping clip seams, stance-foot stability on stepped terrain, pace changes, landing recovery and contact-driven footsteps. Existing regressions cover all 864 wing destinations, 144 levels, stairs, service routes, bazaar shops, the complete cleaning route, the exterior and Claude’s audio/void work. `npm run validate` checks runtime entrypoints, local imports and JavaScript syntax.

`node scripts/repair-character-assets.mjs bfa9faa40c2f21b31739a3933ab685eb3057870e` rebuilds the repaired assets from the original rigged baseline. `scripts/inspect-motion.mjs` and `scripts/render-motion.py` support an offline inspection of deformed character poses with their actual texture maps. The Python renderer needs NumPy and Pillow. These images are asset checks, not screenshots of the running game.

Browser rendering, Android performance, sound mixing on a real device and visual equivalence to the show were not verified in this update.
