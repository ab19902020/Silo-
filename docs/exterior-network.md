# Exterior silo network

The game now reserves visible surface positions for Silos 0 through 50. Silo
18 occupies the current crater and Silo 17 is its nearest walkable neighbour;
only Silo 17 has a breached, flooded crown. The other 49 locations are exterior
silhouettes, not implied full interiors.

The existence of multiple nearby silos and the flooded condition of Silo 17
are story facts. A complete public, dimensioned survey fixing the bearing and
distance of every numbered silo was not found. The staggered field in
`exterior-network.js` is therefore a coherent game reconstruction, not a canon
map. It is deliberately data-driven so verified coordinates can replace the
reconstruction without rebuilding the meshes or story.

All crowns reuse three low-detail geometries and shared materials. There are no
per-silo lights, physics simulations, or interiors, keeping the field inside a
mobile-friendly geometry budget. Silo 17 alone adds rubble, a service throat,
and a dark water sheet.
