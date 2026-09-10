# Story, Free Roam and reference polish

The start screen offers **Story · New game** and **Free Roam · All areas**.
Free Roam opens the Mechanical bulkhead, all directory destinations, the
outside field and Silo 17 immediately. It does not overwrite the stored story
save. The satchel shows collected items without revealing story chapters.

## Story and relics

Claude's visible-interaction and supported directory-book fixes are included.
The objective now follows the PEZ repair ticket to the Level 100 watch, changes
after the hideout opens, and redirects players to Medical returns if they reach
Billings without the Georgia book. Hints reset when these leads change.
George's terminal still requires insertion, reboot, a real `library` search,
opening the hidden directory and reading the gas schematic. Tools, the ordered
pipe sequence, the book handoff, suit, airlock and drone retain their gates.
The designed route is roughly 30 minutes; its actual player completion time
has not been measured in this environment.

The PEZ dispenser, watch and Georgia/Atlanta book were authored in Blender 4.0.2.
Editable sources are in `models/relics`; reproducible authoring is in
`scripts/blender/build_relics.py`; browser GLBs are in `dist/assets/relics`.
The watch has a reverse-side wave/arrow engraving. The book has an original
stylised Atlanta cover illustration, not a reproduction of the show's artwork.
The existing supplied hard-drive model is retained. Relics rest on surfaces,
and pickup opens a separate 3D inspection view. Drag or arrow keys rotate;
scroll, pinch or +/- zoom; Other side and Reset are also available. Items can
be inspected again through the satchel (B).

## Exterior and light

The supplied aerial still establishes earthen bowls with raised rims and low
central hatches. The surrounding plain is level; every crater has a circular, even crest.
All 51 positions share a terrain height function for both
rendering and walking. The field follows the supplied drawing's clustered
composition. Its small blurred labels do not resolve every numbered location:
this remains an explicitly approximate layout, not a verified canon survey.
Silo 17 neighbours 18; Silo 0 remains a gameplay extension. Only 18 and 17 have
interiors. A distant ruined skyline is revealed outside. The cafeteria feed
keeps the field hidden behind the near rim, with its dead tree left of centre;
the cleaning actors' final positions follow that tree.

Ordinary interior lamps and ambient illumination share a warm neutral tone.
Rear service-gallery and Mechanical spur fittings now participate in the fixed
light pool. Lamps fade out before being reassigned; the shadow caster remains
attached to a fixture. Sunlight is restricted to the exterior and the separate
camera-feed scene. Emergency lights retain their functional colours.

The bridge guards now start exactly where the curved landing guards end.
Their previous overlapping wall runs could render two coplanar faces over the
same patch of concrete. Terminal guards meet the same shared seam.

## Verification and hosting

Automated checks exercise the complete story progression and save recovery,
the terminal discovery, pipe order, suit/weapon/drone gates, supported physical
routes, all 864 wing destinations, all 144 floors, mine loops and Silo 17 stairs.
Added checks cover Blender GLB loading/materials/scale/draw budgets, every small
relic's pickup approach, Free Roam access, bowl separation and fixed warm lamps.
CPU Blender renders were inspected for all three new relics.

The available cloud browser reports `Error creating WebGL context` before the
game starts. Full interactive visual QA and target-device frame rates therefore
remain unverified; do not describe the automated checks as a browser playthrough.
The user explicitly authorized publishing to main for their own playtest.
The existing GitHub Pages workflow publishes `dist` to
https://ab19902020.github.io/Silo-/ . Existing hosting identity is preserved.
