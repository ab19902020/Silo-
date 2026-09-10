# Exterior silo network

Silos 0–50 occupy earthen bowls with raised rims and low rectangular hatches.
Silo 18 occupies the original exit; Silo 17 is a walkable neighbour with an
entry to its separately streamed flooded interior. Other silos have exterior
hatches only.

`exterior-layout.js` follows the supplied drawing's clustered composition, but
its small blurred numbers cannot establish a verified numbered survey. Scale,
spacing and uncertain assignments are declared game reconstruction. Silo 0 is
a gameplay extension. This is not a one-to-one canon map.

The same terrain function defines the visible bowls and walking surface.
The other 49 hatches use three instanced geometry batches and shared materials;
there are no individual lights or full interiors for them. Terrain tiles stream
around the player with a bounded cache. Silo 17 adds a broken hatch lip and a
transition to its flooded galleries. See `relic-world-polish.md` for validation.
