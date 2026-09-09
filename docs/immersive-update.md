# Interface, conversations and visual update

The supplied gameplay screenshot showed a persistent chapter panel, large touch controls and jagged dark silhouettes. This update changes the runtime presentation and the underlying materials while preserving the contributor's staircase geometry, full set of floors, connected routes and audio.

## Playing

- Press **H** or tap **☰** for navigation, character selection, view and torch controls. Moving closes that menu. Touch movement buttons become smaller and fade after inactivity.
- The book objective appears briefly and clears. The directory remains available through **M / Directory** after the cleaning.
- Picking up the book starts the existing soundtrack and an unobstructed view of the exterior screen. Tap the picture or press **H / Space** to reveal playback controls. Choosing **Back to cafeteria** remains effective across the subsequent story phases.
- Approach a resident and press **E / Use** to open a conversation. Ask about their work, where to explore and Holston's cleaning. Replies are original game writing and reflect the speaker's department. Conversations pause movement and support keyboard focus and Escape.

## Rendering and models

The main offscreen render and sensor feed use multisampling when supported. The final composition includes conservative edge smoothing, with contact shading that distinguishes an occluder from the slope of the floor itself. Battery saver keeps edge smoothing but omits contact shading and water reflections.

The cafeteria uses fixed warm-white ceiling sources, subdued exposure and desaturated worn steel. Concrete and exterior rock retain the repository's credited photographic albedo, normal and roughness maps. The cavern shell now receives those maps after loading; coherent strata replace unrelated per-vertex noise.

The generated cast uses a continuous shaped face, finer hair strands and separate skin, cloth, leather and hair finishes. The runtime batches these finishes in one skinned mesh; the downloadable GLBs preserve them as PBR materials. The helmet shell and reflective visor disappear together during Holston's removal. The supplied Juliette, Sims and Bernard models keep their existing geometry, rigs and opaque coat rendering, with calibrated material response.

The basin and tunnel still share one water mesh. Shading ripples do not move its geometry. An obliquely clipped reflection camera excludes the bed beneath it; reflection updates are limited to 12 or 20 per second on balanced or high settings. The water remains at its existing collision height and the ladder/door route is retained.

Holston and Allison share a final heading on the slope, with a 70 cm lateral separation. The final lowering pivots around the pelvis and checks the visible skinned surface against the actual terrain, including the backpack. The opening remains 90 seconds and retains the existing soundtrack beats.

## Validation and reference limits

Run `npm run validate` and `npm test`. The regression suite covers all numbered levels, room exits, stair guards, supplied rigs, jumps, the complete opening and lens wipe, nighttime feed, single water sheet, ladder and concealed passage, audio, conversations, reflection state restoration, final body contact and export material references. `scripts/package-residents.py` verifies all regenerated archive bytes against the loose GLBs.

Release checks: **76 tests passed**, 75 runtime files passed import/syntax validation, and all 22 exported GLBs passed archive byte verification. The six changed shader families compiled and linked in a native GLES 3 context without rendering a scene. On a Linux machine with Mesa/EGL, reproduce that compile check with `node scripts/shader-sources.mjs` followed by `python scripts/compile-shaders.py`. This is a shader compile check, not a browser or device performance test.

The provided cafeteria and staircase images remain in `docs/references`. The Silo 18 wiki and production references are recorded in the existing research documents; the wiki returned a fetch error during this pass. The gameplay screenshot informed the interface changes. Character likenesses, unseen room plans and precise dimensions remain approximations. Automated geometry and source checks do not establish visual equivalence to the television footage. This pass was not visually tested in a browser.
