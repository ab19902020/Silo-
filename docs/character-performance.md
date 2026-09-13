# Character performance and lighting pass

This release changes the shared runtime character system. It retains the supplied
Juliette, Sims and Bernard surfaces, their textures, opaque coat linings, story
state, controls, sound and existing world content.

## Movement

The three leads now use different recorded walking performances. Juliette uses
CMU 07_01, Sims 07_03 and Bernard the slower 07_04 performance. Running blends
into CMU 35_17. The compact recordings drive arm aims, pelvic rotation, chest
counter-rotation, lateral weight transfer, swing clearance and foot track width.
The original ankle pivots were at the boot cuffs; the runtime rebind moves them
into the ankles while preserving the neutral mesh exactly.

This is a retargeted hybrid, not a literal playback of the source recording.
Distance-driven phase, a continuous support/swing path, heel-to-toe roll and
terrain IK keep each supporting foot on the physical floor or stair tread.
Walk/run transitions retain phase; arm retargeting starts from the same relaxed
pose as idle. Pelvis movement remains below 6.5 cm at normal walking speed.
The old embedded GLB clips remain available to external asset viewers; the game
uses the updated `SkeletalMotion` runtime.

The recorded measurements can be rebuilt with:

```sh
python scripts/prepare-captured-gaits.py SOURCE_BVH_DIRECTORY dist/src/captured-gaits.js
```

Each generated track records its source SHA-256 and selected frame interval.

## Residents

Every named resident and ambient crowd template now uses retargeted anatomical
body topology and hands, a continuous anatomical head with eyelids, nose, lips
and ears, and an eight-person face atlas. Clothing is smoothed and draped over
the underlying body. Pocket strips and knit detailing follow curved garments.
Skin, fabric, hair and leather keep separate surface responses within the shared
material. Face detail stays opaque, and the texture atlas has a skin-coloured
loading fallback. The existing outfit palette, heights, hair choices, activities
and identity records remain the source of character variation; these are game
characters, not scans of the television actors.

Rebuild the derived anatomy and atlas from the source mesh, rig, weights and
skin packs:

```sh
python scripts/prepare-resident-head.py SOURCE/base.obj SOURCE_SKIN_PACK_DIRECTORY
python scripts/prepare-resident-body.py SOURCE
```

The preparation scripts require NumPy, SciPy and Pillow, not the shipped game.
Only the clothed body, head data and cropped face atlas ship. Normal residents
still use one skinned mesh and material; cleaning suits retain their existing
separate helmet and visor finishes.

## Lighting

Interior lighting keeps the existing physical fixtures and stable light pool.
The environmental fill has a front bounce card, warmer ground bounce and less
flat overhead fill. Shadow normal bias is reduced from 4.5 cm to 8 mm indoors
and from 6 cm to 12 mm outside. High quality uses a 2048-pixel interior shadow
map; balanced keeps 1024. Contact shading uses a shorter, tighter radius with
more sensitivity near feet and furniture. Low quality retains its existing
shadow and post-processing budget. Night dimming, fixture colour consistency,
outside-only sunlight and separate underground lighting are preserved.

## Sources and licences

- [CMU Graphics Lab Motion Capture Database](https://mocap.cs.cmu.edu/),
  funded by NSF EIA-0196217. Source files: `07_01.bvh`, `07_03.bvh`, `07_04.bvh`,
  `35_17.bvh`. The database permits use for any purpose.
- [Bruce Hahne's cgspeed BVH conversion](https://sites.google.com/a/cgspeed.com/cgspeed/motion-capture/the-motionbuilder-friendly-bvh-conversion-release-of-cmus-motion-capture-database).
  Converted BVHs obtained from the [CMU mirror](https://github.com/una-dinosauria/cmu-mocap).
  Conversion terms impose no additional restrictions.
- [MakeHuman base mesh](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj),
  [default rig](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/rigs/default.mhskel)
  and [weights](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/rigs/default_weights.mhw):
  CC0; Data Collection AB, Joel Palmius and Jonas Hauquier, 2020–2021.
- Face source packs: [Skins 01](https://static.makehumancommunity.org/assets/assetpacks/skins01.html)
  and [Skins 02](https://static.makehumancommunity.org/assets/assetpacks/skins02.html),
  using their CC0 downloads. Selected sources are Toigo's light-skinned male
  bronze; OnlyTheGhosts' old Eurasian male, young Eurasian female, old Eurasian
  female and middle-aged Eurasian female; Mindfront's middle-aged African male;
  Jartur69's middle-aged Slavic male with beard; and Cutoff3D's Indian female skin.
  The build crops and resizes the head islands into a shared atlas and calibrates
  skin colour to each character's palette.

## Validation

The regression suite covers story progression and the walkthrough as well as
movement, residents, lighting and asset integrity. Additional checks exercise
the actual calibrated lead rigs, neutral surface preservation, planted feet,
pelvis travel, arm continuity, distinct looping performances, and every named
and crowd template's face UVs, opacity and hand bounds.

Separate offscreen GLES renders were used to inspect the supplied models,
resident bodies and walking sequences. They approximate material lighting and
are not screenshots of the game. The available managed browser cannot create a
WebGL context, so a complete in-game visual walkthrough and mobile frame-rate
assessment remain unverified here.
