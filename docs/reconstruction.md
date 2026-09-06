# Silo 18 — research and reconstruction decisions

Research reviewed on 6 September 2026. The television adaptation takes precedence over the novels. This file separates source evidence from decisions made to fill the gaps in an explorable model.

## Evidence

| Source | What it supports | Limits |
| --- | --- | --- |
| [VFX Voice: Unraveling the Mysteries of Silo](https://vfxvoice.com/unraveling-the-mysteries-of-silo/) | 144 levels; large central staircase and galleries; apartment, farm and cafeteria production images. | No complete measured plan of all rooms. |
| [Arnaud Valette: Silo Shaft Design](https://arnaudvalette.artstation.com/projects/39xAqA) | Credited shaft concept work made with production designer Gavin Bocquet. | Early concept proportions, not final surveyed dimensions. |
| [Outpost VFX: Modeling the Machines](https://www.outpost-vfx.com/en/news/silo-s1-modelling-the-machines-of-an-underground-city/) | Six generator panels, a crane/chain opening mechanism, an excavator tower with radial arms and detailed industrial fittings. | The article’s introductory storey count conflicts with the better-supported 144. Its machine descriptions are used, not that count. |
| [British Cinematographer: Lightbridge / Silo](https://britishcinematographer.co.uk/lightbridge-silo/) | Mark Patten’s lighting approach and a broad cafeteria display integrated into the set. | Screen/set measurements are not a complete architectural plan. |
| [Silo Wiki: Silo-18](https://silo.telepedia.net/wiki/Silo-18) | Secondary episode-indexed locations for recycling (20) and water filtration (55). | Secondary source; layouts are not supplied. |
| [Silo Wiki: IT Department](https://silo.telepedia.net/wiki/IT_Department) | Distinguishes television IT on 19 from the novels’ IT on 34. | Secondary source. |

## Shape and material reference

The shaft uses the finished series’ rounded concrete language: a broad central core, wedge treads, solid low parapets with narrow metal rails, deep bridges, repeated columns and muted industrial finishes. The cafeteria includes a horizontally rounded screen and a radial ceiling fixture. Mechanical uses a faceted cylindrical generator, catwalk, pipe banks and an inspection opening. The excavator is an abandoned tower with skeletal arms and large cutting drums. These are original modeled interpretations of production images, not imported production meshes.

## Metric model

| Dimension | Implemented value | Status |
| --- | --- | --- |
| Numbered levels | 144 | Established television-world count |
| Numbered floor interval | 10 m | Estimate |
| Upper-to-lower numbered landing span | 1,430 m | Consequence of the interval |
| Open atrium diameter | 36 m | Visual estimate |
| Stair core diameter | 6.2 m | Visual estimate |
| Stair outside diameter | 14.6 m | Visual estimate |
| Clear stair width | 4.2 m | Consequence of the chosen radii |
| Gallery outer diameter | 51.2 m | Estimate |
| Outer nominal envelope | 108 m | Estimate, not a production measurement |
| Spiral repetition | One full turn per numbered interval | Model assumption; no reliable primary textual turn count established |
| Stair pieces per interval | 72, including flat landing sectors | Modeled geometry; not a claimed show step count |
| Standard wing | 20 × 24 m; 5.8 m internal height | Reusable reconstruction layout |
| Excavator cavern | Approximately 160 m across | Reconstruction estimate, separate from the atrium |

The stair uses flat end sectors where the bridge joins. This provides full head clearance and prevents a bridge underside from blocking a character before the final tread. The visible geometry and collision share the same stair profile.

## Second-build production references

The user’s requested [Silo 18 wiki](https://silo.fandom.com/wiki/Silo_18) blocks automated full-page fetching. Its indexed department entries and [translated television floor index](https://silo.fandom.com/de/wiki/Silo_18) informed the location corrections. The reconstruction does not claim to have obtained a complete production blueprint from that page.

- [Lux Machina’s production account](https://www.luxmc.com/silo) and its cafeteria image show the broad curved LED wall, heavy frame and radial ceiling feature. The new principal display is modeled at 30 m wide; this remains an estimate.
- [Official trailer frames reproduced by This Is Cool](https://www.this-is-cool.co.uk/official-trailer-for-silo-a-new-sci-fi-series-coming-to-apple-tv/) show a slatted incline, angled upper tunnel corners, repeating ribs, cyan wall strips and red ceiling indicators.
- [The cleaning-chamber still in Die Zukunft](https://diezukunft.de/review/film/silo-und-noch-eine-dystopie) shows brown wall tiles, a rounded rectangular blast-door surround and diagonal panel seams.
- [A Season 2 exterior still](https://minhtuanmobile.com/tin-tuc/giai-thich-chi-tiet-ket-thuc-silo-mua-2/) shows the low sunken hatch, reinforced lid panels and a squat concrete sensor monument with splayed buttresses. The camera lens is obscured in that frame; its exact mount and position are inferred.

Images were inspected as references and are not bundled in the game. The environment omits every character and body visible in those references.

## Floor program

All 144 numbered galleries remain represented in the world. The directory opens on all levels and exposes six direct wing destinations for each, totaling 864 wings. Residential wings now contain four separate homes (2,476 apartments in the modeled schedule), with a central corridor and reachable domestic rooms. These counts describe this reconstruction, not a canonical room census.

The schedule corrects the main television locations: Level 1 cafeteria → sheriff’s station → holding/preparation → airlock; Judicial on 14; IT on 19; janitorial and the concealed Watcher Room on 20; Medical on 50 and 62; water on 55; agriculture on 80; lower recycling and IT relay on 126; Juliette’s residence on 140; Walker’s workshop and Mechanical on 144. Wiki-associated residential nameplates and porter/bar locations are included. Unknown level assignments and the precise unseen interior arrangements remain inferred.

The generator occupies a separate 50 m diameter, 27 m high hall at y=52 m, below the last numbered landing at y=80 m. An annular maintenance deck is reachable by a half-turn stair. Mines, cavern and generator entry use explicit exploration travel points. The cleaning route, in contrast, is physically continuous: the 44 m ramp climbs 14 m to the surface; these are model dimensions, not verified set measurements.

The outside camera renders the same authored terrain, hatch, camera monument and skyline used by the walkable surface, with shared geometry/materials and animated dust. Its lens soil clears over a four-second cleaning interaction, reflected on every loaded cafeteria display. The two pressure doors are interlocked; choosing one closes the other before opening it. Reentry is allowed for environment exploration.

## Coverage and limits

- All 144 levels are generated. Fifteen nearby levels use detailed structure; the remaining levels retain simpler physical silhouettes. The union always covers all 144, with no duplicate or omitted numbered landing. Nearby room contents stream independently.
- Apartment and department interiors share construction kits. They are not individually verified television floor plans.
- Furniture, doors and walls are collidable. The imported props retain their original Lost Signal geometry.
- The exterior is an original, walkable rocky landscape with distant ruined buildings, not an enterable town. The exact surface geography is reconstructed.
- There is no simulation of 10,000 inhabitants, show dialogue, combat or story quests.
- The digging machine is a detailed static environment; the generator rotor animates. Neither is an engineering simulator.
- The visual upgrade includes 512 px layered albedo/normal/roughness maps, rounded furniture edges, local soft shadows, reflection lighting, depth-based contact shading and restrained bloom. Balanced/high settings use these effects; battery saver disables the shadow/composition passes. Unsupported floating-point color targets fall back to byte targets.
- Touch input, keyboard input, renderer settings and error handling are implemented. Automated validation covers source, assets, geometry and physics. Visual equivalence, browser behavior and frame rate require device testing and are not certified by the automated checks.

## Lost Signal provenance

Source repository: [ab19902020/Lost-signal-](https://github.com/ab19902020/Lost-signal-), commit `aa4c1d00d173b3aa98560617e2d541d3ff093dee`.

The original `src/silo.js` and `blender/generate_habitat_v4.py` are preserved under `reference/lost-signal/`. The runtime reuses the original circle/arc/oriented-box collision implementation and character controller. Selected furniture, hydroponic, mechanical and service models are preserved under `dist/assets/lost-signal/`. The seven-level structure was redesigned around the television-scale 144-level model. Nothing was written back to Lost Signal.
