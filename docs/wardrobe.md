# What the silo wears

Everything below the neck on a generated resident used to be one
`LatheGeometry` — a body of revolution, squashed to 72 per cent in z, with a
sphere stuck on each shoulder for a sleeve and a few flat cards laid on the
chest for an outfit.

A lathe has exactly one radius at each height. It cannot be wider than it is
deep, cannot nip in at the waist, cannot put the seat behind the spine and
cannot square off a shoulder. So every resident in the silo was the same
drainpipe in a different colour, and from three metres away the whole cast was
wearing the same thing.

## The body

`resident-model.js` now carries one set of landmarks for a clothed torso:

```
[height, half-width, half-depth, how far forward of the spine, how square]
```

read through a Catmull-Rom spline. Eight landmarks describe a whole body and
the surface between them is smooth. The cross-section is a superellipse, so a
shoulder can square off while the waist under it stays round.

The figures are the measured ones. A man is about 50 cm across the shoulders,
37 across the chest and 26 through it, and comes in to 32 at the waist. The old
profile ran 30 cm wide from the hip to the armpit with no waist in it at all.

Everything else is cut from that one body. `bodyAt(y)` gives the section at any
height and `front(y)` gives how far forward the chest is there, which is what
keeps a coat, the shirt under it, the belt round both and every button on the
front of it on one figure rather than three concentric tubes.

## The shoulder

The half-metre across a man's shoulders is the deltoid, not the ribcage. Three
attempts went into this:

1. Widening the torso itself to shoulder width gave a hard square shelf with a
   corner on it — American football pads, worn under a cardigan.
2. Capping the sleeve level with the collar gave a leg-of-mutton sleeve.
3. What works: the torso stops at the armpit, and the sleeve sweep **starts
   beside the neck**, runs out along the line the shoulder actually takes and
   only then turns down the arm. The yoke, the shoulder and the sleeve are one
   surface.

While that sweep is still running outward its cross-section is vertical, so
flattening it there is what turns a round roll of cloth lying on the collarbones
into a shoulder. Above the joint the cloth is bound to the chest and below it to
the arm, so reaching does not tear the yoke open.

## The wardrobe

`GARMENTS` is a table of silhouettes, not decals. Each entry says where the
garment ends, how much cloth stands off the body, whether it hangs open, what
the collar does, how long the sleeve is and what closes the front.

| | Cut |
| --- | --- |
| `work` | Mechanical's coverall: one cloth collar to ankle, loose, webbing belt, bib pockets, a tool pocket wrapping the thigh |
| `uniform` | Sheriff and deputies: fitted tunic below the hip, stand collar, shoulder straps, duty belt |
| `shirt` | Tucked in, open collar, button placket |
| `knit` | Heavy jumper, no closure, ribbed hem and cuffs |
| `cardigan` | Hangs open over a shirt, ribbed front bands |
| `vest` | Waistcoat, deep V, the shirt's sleeves are the sleeves |
| `coat` | Long, open, notched lapels, hem flaring at mid-thigh |
| `medical` | The same cut in lighter cloth, patch pockets at the hip |
| `robe` | Mayor and judge: full length, rolled shawl collar, bell sleeves |
| `suit` | The cleaning suit: pack, harness, hoses, sealed collar |

Open garments are built with real cloth thickness — a second surface just inside
the first, joined along every open edge. Without it an open coat is a
zero-thickness shell that vanishes edge-on and shows its own lining through
itself, which is what the old lathe skirts did every time a resident turned.

A shirt is built under every open garment and **only** under an open one. Under
a closed garment it is two surfaces a few millimetres apart competing for the
same pixels, which came out as a rash of torn patches across the belly.

## Three cloths, not one

Trousers used to be the coat colour at 64 per cent, so each resident was a
single hue from collar to boot. Now a resident has an outer garment, a shirt and
a pair of trousers, named in `resident-data.js` rather than derived, and a
coverall is the one garment that is deliberately all one cloth.

## Hands, boots and the rest

- A hand at rest hangs **edge-on**: the palm faces the thigh, so the blade of it
  is deep front-to-back and thin across. It used to be built the other way round
  — a flat paddle presented to the camera with four straight pegs fanned off the
  bottom, which is a rake, and it sits right on the edge of the silhouette where
  you cannot miss it. The fingers curl now, index at the front, little at the
  back.
- A boot is a last swept along the length of the foot: heel, ball, a toe box
  that narrows, a vamp over the instep and a sole under all of it. It used to be
  a sphere with a box under it whose corners stuck out past the toe as a visible
  plinth — the feet of a deep-sea diver.
- A pocket lies on the garment it is sewn to, with its rim wound as one loop
  round the perimeter so the normals agree. A flat box stuck on the chest shows
  daylight behind it the moment the resident turns, and a rim stitched edge by
  edge comes out half inside out and reads as a dark hole.
- The trouser seat is wide enough at the crotch to hold both thighs and close to
  the body at the waist, and every pair has a waistband whether or not a belt
  goes over it. Without one the trouser front just stopped, and through the front
  of an open cardigan that read as a dark rectangle hanging on the hips.

## What the tests hold

`tests/wardrobe.test.mjs`:

- the wardrobe spans real shapes — the three long garments measure like long
  garments against everything cut to the hip, and no two hip-length cuts come
  out identical;
- the loose open garments stand off the body down the front, and the closed ones
  do not;
- through every opening there is a different cloth, which is what separates a
  waistcoat from a shirt when the depth cannot;
- the body has a waist between its chest and its hips;
- the hands hang edge-on;
- every garment is bound to a joint that exists. An unknown joint name used to
  fall through `indexOf` as -1, which becomes 65535 in an unsigned skin index
  and takes out every resident on the level rather than the one garment that
  named it wrongly.

The mesh budget is unchanged: about 15.6 k vertices and 28.5 k triangles per
resident, one draw call, vertex-coloured.
