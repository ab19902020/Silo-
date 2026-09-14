# Playable television cast and resident creator

This release replaces the three imported playable GLBs with the same anatomical,
fully skinned resident system used by the NPCs. Juliette Nichols, Robert Sims and
Bernard Holland remain playable identities. The old binaries are regression
fixtures outside `dist`, and are never loaded or deployed. The hard-drive relic
is preserved. The production download shrinks by approximately 18.5 MiB.

The registry contains 114 named television identities spanning Seasons 1–3,
including all existing named game residents, the historical cleaners and George,
Silo 17 survivors, the Before Times ensemble, and credited supporting residents.
Young and adult performances of the same identity share one entry. Unnamed
background credits are represented by the existing ambient population, not
claimed as separately identified television characters. This is an audited named
cast selection, not a claim to enumerate every uncredited extra.

## Character and season references

- [Apple cast and crew](https://www.apple.com/tv-pr/originals/silo/cast-crew/): official season cast billing.
- [Apple’s June 2026 Season 3 announcement](https://www.apple.com/tv-pr/news/2026/06/apple-tv-unveils-trailer-for-third-season-of-its-globally-acclaimed-drama-silo-starring-and-executive-produced-by-rebecca-ferguson/): Daniel Keene, Helen Drew, the Before Times setting, and returning/new performers.
- [Television cast index](https://en.wikipedia.org/wiki/Silo_(TV_series)#Cast_and_characters): named principal, recurring and guest identities, checked against the official cast and episode credits. Names such as Henry and Victor follow the aired television roles rather than speculative book-role assignments.
- [Episode credits](https://www.imdb.com/title/tt35047389/fullcredits/): Season 3 role names surfaced in indexed credits. Direct full-page access was unavailable during this audit.
- [IMDb series credits](https://www.imdb.com/title/tt14688458/fullcredits/): indexed Anthony Sims and Tim credits.
- [Jacob Nichols episode credit](https://www.imdb.com/title/tt16091606/characters/nm12052515/): the Season 1 historical family member.
- [MovieMeter credited ensemble](https://www.moviemeter.com/tv/scifi/silo/season/1/cast): secondary named roles. Its season pages repeat the wider series ensemble, so a page’s season heading is not evidence of that character’s first season. The principal season mapping comes from the television cast index; supporting roles are grouped by the corresponding episode-era credit blocks.

Appearance and costume variants are original fan interpretations. Shared CC0
anatomy and face atlases are credited in the runtime NOTICE. These are not actor
scans, licensed likeness assets, or claims of photorealistic reconstruction.
Unknown exact floor placements are game placements. The historical and Before
Times selections do not rewrite the opening-era NPC population or quest script.

## Creator and continuity

The welcome menu’s Character button opens TV selection or Create your resident.
The same studio opens from the HUD, C key, and controller D-pad. Players can edit
name, department, body frame, height, build, face width, age, skin, hair style and
colour, eye colour, facial hair, clothing cut and colour, sleeves and glasses.
A draggable 3D preview includes a walking demonstration and keyboard rotation.

Profiles are normalized and stored in `silo18-custom-resident-v1`; the existing
settings save retains the selected identity. Story progress remains independent.
Blocked or full storage produces a truthful current-visit-only message. Invalid
or missing old character selections fall back to Juliette. Editing an existing
custom resident rebuilds its mesh rather than returning a stale cached template.
Only the active player and its outside-feed clone are retained; preview geometry
is replaced and disposed as controls change. The preview pauses on dialog close.

NPCs and players share the fitted garment surfaces, skinning weights, cloth
seams, separate surface finishes, hand alignment and captured gait styles.
Bald styles suppress hair painted into the face atlas. Sims and Bernard have
shorter character-specific coats; Juliette has a tapered ponytail and workwear.

## Verification

Automated checks cover profile normalization and storage failures, all playable
mesh weights and motion poses, replacement of the active/feed skeletons, revised
custom appearances, continuous wrists, foot contacts and legacy game regressions.
The imported-model tests remain historical calibration regressions; the new
`character-creator.test.mjs` explicitly exercises the actual common runtime rigs.

Browser review uses the real studio, save functions and CharacterCast in a
temporary fixture at desktop, phone portrait and phone landscape dimensions.
Custom creation, persistence after reopening, season filtering and selection
were exercised. Temporary fixtures are removed before publication.

The managed browser cannot create a WebGL context. Thus the full live 3D game
and GPU preview could not be playtested there. Actual skinned meshes were
independently rendered through offscreen GLES for idle, walking, running and
seated visual inspection. This does not substitute for an on-device playthrough.
