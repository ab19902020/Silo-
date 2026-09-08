# Visibility, staircase and void repairs — 8 September 2026

This update addresses Adam’s report of partially invisible Sims/Bernard models, posts across staircase landings and an incorrectly arranged camp/descent/hidden door.

It incorporates Claude’s newer impact-audio update from main (`2b6ee51`), including the revised footstep and fitting sounds. The contact-driven footstep interface remains intact.

## Character surfaces

The uploaded GLBs use RGB textures and opaque materials, but their thin clothing was rendered with back-face culling. Moving coat panels could therefore expose missing reverse faces. The game now clones each actor’s materials, renders both faces and explicitly retains opaque depth-writing surfaces. A close third-person camera hides the entire avatar before reaching its volume instead of slicing through the broader coats. The supplied meshes, skin weights, textures and earlier animations are retained.

The regression traces rays against actual deformed garment triangles from both sides. It also checks opacity and exercises all three skeletons through ladder poses. These checks do not reproduce Android GPU rendering; a remaining device-specific visibility problem would need a screenshot or video of the affected view.

## Central stairs

The previous landing filter always retained cylinder geometry, including rail posts, and omitted the concrete parapet caps from its material filter. Those visible components remained across the otherwise open landing. `staircase.js` constructs the whole guard around one shared opening and gives the concrete parapet and metal handrails a continuous rise. Collision uses the same opening rule. Flat treads, floor connections and all 144 numbered levels remain.

The regression checks rendered geometry inside both bridge openings, including posts, caps and rails. Existing movement tests still exercise the complete numbered stair system and gallery connections.

## Excavator and hidden route

The earlier caged stair and central-tower bulkhead are removed. The bed, table, shelf, relics and curtain remain together in a camp beside the outer ledge, entered through an opening in the salvaged wall. An uncaged rung ladder beside the open side descends to the water. Use/E starts a continuous mount, climb and dismount; all three people have ladder poses. Pausing freezes the climb, and directory travel detaches safely.

The water has a supported basin floor. The route continues through an opening in the cavern perimeter, into a circular culvert and up a shallow submerged incline to the sealed door at the far end. The tunnel directory shortcut reaches this same physical space. Walking between the camp, water and tunnel does not change scenes or teleport.

## Reference basis and limits

- [Outpost VFX’s excavator modelling interview](https://www.outpost-vfx.com/en/news/silo-s1-modelling-the-machines-of-an-underground-city/) describes the tower, radial machinery and ladder structures, with credited before/after stills. It provides the production basis for the machine’s material and access vocabulary.
- [Season 1 episode 2 reference page](https://ecency.com/@skiptvads/silo-holstons-pick-episode-2) indexes frames of the hideout and describes the bed/relics beside the flooded excavation. Its accompanying commentary is a secondary account, not a blueprint.
- [Season 2 episode 9 reference page](https://endlessvolo.com/blogs/silo-s2e9r.html) indexes the water/tunnel sequence and a circular tunnel still. The water-level tunnel relationship informs the corrected route.
- The request for a ladder rather than a caged stair is Adam’s explicit correction. No complete surveyed plan or exact camp coordinates were available. Image links were indexed, but source JPEG downloading was unavailable during this update; the images were not inspected pixel by pixel.

The camp offset, ladder length, wading depth, tunnel length and final door detailing remain estimates. The build is closer to the requested spatial arrangement, and does not claim a verified one-to-one replica.

## Checks

`npm test` includes deformed garment visibility, climbing pose bounds, clear rendered staircase openings, physical camp access and full down-to-door-and-back traversal with each character’s body dimensions. `npm run validate` checks runtime syntax, entrypoints and local imports. Browser visual equivalence and mobile frame rate are not verified by these checks.
