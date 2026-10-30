# Layered wardrobes and fitted eyewear

Continues from main 1a2e622, retaining the 114-character roster, face sculpting,
blinking, motion, carrying, jobs, story and artificial-lighting work.

## What changes

- Coats, cardigans and medical coats open over a separate fitted shirt insert.
  Their hem lengths, front gaps and lapels differ. Cardigans end at the hip.
  A sleeveless waistcoat has a separate front and back over shirt sleeves.
- Shirt inserts use actual geometry rather than interpolated colour boundaries.
  Thin panels inherit the supporting torso's smooth normals and skin weights,
  removing the jagged dark patches caused by independently shaded grid panels.
- The creator separates top, underlayer and trouser colours; straight, tapered
  and cargo trousers; laced shoes, ankle boots and slip-ons; footwear colour;
  plain, ribbed and striped fabrics; round/rectangular glasses and frame metal.
- The saved v1 profile remains readable. Missing wardrobe fields receive defaults;
  face controls and identity remain unchanged. Saving still requires Save & play.
- Glasses sample the deformed face. Hinges flare past the brow before the temples
  turn toward the ears. Both shapes retain clearance across facial extremes.
- The head's jagged lower cut is tucked into the existing neck bridge, with the
  transition finishing below the jaw. Eyelids and facial morph ranges remain.
- Portrait editing uses a shorter preview and returns controls to the top when
  changing sections. The face/full-body and motion preview remain available.

Generic crowd appearances have seven light-complexion slots out of ten. This is
the requested visual art direction, not a demographic claim about the television
show. A mixed seed avoids floor-number/palette aliasing and preserves appearance
when residents stream back in. Named cast appearances are not remapped. The
palette remains bounded to limit shared-mesh memory on phones.

## Verification and limits

Regression checks exercise saved profiles, independent wardrobe channels, every
cut at small/large body extremes in idle/walk/run, normalized skin weights,
footwear contact, temple/rim clearance, and actual floor/porter population balance.
The full repository suite and runtime validation are required before main changes.

Geometry-only software renders compared outfit silhouettes and panel shading.
They omit the game's GPU material response and face atlas, and are not screenshots
from a phone. The coding workspace became unavailable during this update; the
repository's CI provides full-suite validation. Full on-device WebGL rendering,
frame rate and extended playtesting still need a practical check.

This is an incremental improvement to the shared procedural character system,
not a claim of Sims 3 fidelity or scanned actor likenesses.
