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

## Floor program

Levels without a documented television assignment are filled with residential or service wings. Every numbered level has six enterable wings. The directory exposes placement notes. Judicial at 14 and Medical at 50 are television-associated placements whose room arrangements remain inferred. Locations such as the mayor’s office, sheriff’s office, education, orchards, workshop and intermediate Supply levels are explicitly reconstruction placements.

IT uses 19, recycling 20 and water filtration 55. The lowest numbered landing is 144. Its generator is included in the Mechanical wing; the scale and precise vertical relationship of the turbine hall have been simplified to keep the route usable. The mines, excavator access and hidden passage use lower maintenance travel points. The mines’ detailed layout and furnishing are inferred.

## Coverage and limits

- All 144 levels are generated, with persistent distant gallery/stair geometry and nearby furnished room streaming.
- Apartment and department interiors share construction kits. They are not 864 unique verified television rooms.
- Furniture, doors and walls are collidable. The imported props retain their original Lost Signal geometry.
- The outside view is an original rendered landscape; the player does not explore an exterior town.
- There is no simulation of 10,000 inhabitants, show dialogue, combat or story quests.
- The digging machine is a detailed static environment; the generator rotor animates. Neither is an engineering simulator.
- Touch input, keyboard input, renderer settings and error handling are implemented. Automated validation covers source, assets, geometry and physics. Visual equivalence, browser behavior and frame rate require device testing and are not certified by the automated checks.

## Lost Signal provenance

Source repository: [ab19902020/Lost-signal-](https://github.com/ab19902020/Lost-signal-), commit `aa4c1d00d173b3aa98560617e2d541d3ff093dee`.

The original `src/silo.js` and `blender/generate_habitat_v4.py` are preserved under `reference/lost-signal/`. The runtime reuses the original circle/arc/oriented-box collision implementation and character controller. Selected furniture, hydroponic, mechanical and service models are preserved under `dist/assets/lost-signal/`. The seven-level structure was redesigned around the television-scale 144-level model. Nothing was written back to Lost Signal.
