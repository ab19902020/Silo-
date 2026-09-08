# Living silo, opening and access repairs

This update preserves Claude’s `36a0759` and `532df67` work, including the revised gait, jumping, gamepad support, mobile controls and sound. It extends the landing and concealed-passage work and integrates the new opening and residents.

## What to try

1. Choose **Begin in cafeteria**, approach the book on the table and press **Use / E**.
2. Watch the live screen. Holston approaches the sensor, wipes it, turns toward the hill, removes his helmet, crawls to Allison and lies beside her. **Focus on screen** shows the same panorama; **Skip** and **Replay opening** are available.
3. Open the book afterward. Explore the 144-level directory, select a character and switch between first and third person. Completion is remembered on that browser.
4. On Level 144, walk through Mechanical into the rear service gallery. The dead-end spur between wings A and B ends at a large warning sign. Move it aside, then walk through the opening. The access transition brings you into a narrow passage at the excavation perimeter.
5. Walk out toward the drill, enter George and Juliette’s hideout, use its ladder to reach the supported water, then wade through the round culvert to the sealed door. Return by the same ladder and concealed passage.
6. Check the top landing and bridge, as well as the generator and mine workers. The top-floor column now has matching visible geometry and collision up to the ceiling.

## Cast and residents

Twenty new named meshes supplement the three supplied models. Seventeen additional living characters are selectable, for 20 playable characters overall. Holston and Allison are reserved for the opening and exterior, and George’s reusable model is exported without spawning a living duplicate. The new source includes shaped faces, hair, role-specific clothes, badges, pockets, belts, tools and skin-weighted limbs.

The 22 GLB exports include 21-bone skins and six looping clips, including seated, working and climbing motion. Original avatars keep their existing garment visibility repairs. Selected cast members are removed from the resident population to avoid duplicates.

There are 3,549 lightweight placement records across 144 levels and the generator/mines. Only nearby residents are instantiated: 28 on Low, 48 on Balanced, 72 on High. Porters and cafeteria walkers use the same supported collision world as the player, pause and reroute when blocked, and yield to nearby people. The secret void remains unpopulated. Additive distant footfalls, clothing and chair sounds use the existing sound system without replacing the soundtrack or adding voices.

## Geometry and lighting

- Replaced the overlapping basin circle and tunnel water plane with one continuous water mesh. Water no longer writes depth.
- Separated coplanar metal/concrete deck tops and corrected the last culvert step overlap. Lower-area camera clipping uses a shorter depth range.
- Removed the moving shadow spotlight in lower areas. The hideout, tunnel, entrance, generator and mines use fixed lights; ordinary gallery lighting remains available.
- Continued the visible central stair spine through the top storey. Extended the terminal parapet to the true chord of the circular column and returned its rails into the bridge/flight junction.
- Cut the visible rear-gallery wall to match the spur’s collision opening. The warning board moves while the surrounding wall remains. The opening has solid sides, a lintel, real depth and supported flooring, not a black plane. The void-side exit is unmarked and returns to the same Mechanical corridor.

## References and accuracy limits

- [Apple cast and crew](https://www.apple.com/tv-pr/originals/silo/cast-crew/) establishes cast identification.
- [Apple episode production stills](https://www.apple.com/tv-pr/originals/silo/episodes-images/) provides Season 1 and 2 costume references. Twelve captioned stills were inspected for the added ensemble.
- [Charlotte Morris’s costume portfolio](https://charlotte-morris.com/portfolio/silo-copy-1) informs layered and repaired workwear and the different social levels.
- [Outpost VFX’s machine breakdown](https://www.outpost-vfx.com/en/news/silo-s1-modelling-the-machines-of-an-underground-city/) informs the generator and excavator.
- [Arnaud Valette’s shaft concept work](https://arnaudvalette.artstation.com/projects/39xAqA) informs the broad shaft composition.
- The requested [Silo 18 Wiki](https://silo.fandom.com/wiki/Silo_18) remains linked alongside the department references already recorded in the game. Its main page did not permit automated fetching.

The new faces are approximate original meshes. No studio character assets, set survey or complete shot-by-shot plan was available. The 144 numbered levels are implemented, but unshown room allocations, measurements and connecting passage lengths remain reconstructed. The warning board’s **DANGER / DO NOT ENTER** wording is a clearly documented approximation, not a verified transcription. The concealed entrance uses a short scene transition between Mechanical and the void; the hideout, ladder, water and hidden door are one continuous physical route. The opening is a new game animation, not footage from the television episode.

## Verification

The combined 59-check regression run passed after integrating Claude’s changes. Three additional checks cover the visible top core, the warning-board route in both directions, and supported generator/mine workers with fixed lights. The opening check also verifies the wiping hand reaches the real sensor and that the directory unlocks, skip/replay state resets and the exterior/feed poses agree. Exported animation tracks are checked for loop continuity and reload through the game’s GLTFLoader.

Static validation checks local runtime imports and syntax. Archive creation verifies every exported GLB byte. These are numerical geometry, collision, animation and source checks; browser rendering, device frame rate and one-to-one visual equivalence have not been certified.
