# Expressive residents and a detailed character studio

Built on main `67cee36`, preserving the 114-character roster, schedules, story,
shared fitted clothing, player selection and previous lighting/stair fixes.

## Carrying and animation

The old parcel enclosed the wrist. Its revised geometry hangs below a handle,
with separate ties and a label. Its socket follows the palm in the hand’s bind
space and scales with the resident. A blended carrying pose supports the load
away from the torso, curls the fingers and keeps the parcel upright as the
resident turns. Loaded porters carry it along their routes; empty return journeys
hide it. Linen baskets use the same arm/grip handling. Counter parcels have a
separate placement so the new hanging origin does not put them through tables.

Grip updates run after the normal pose and activity blending. The underlying
walking, running, stair IK, foot planting and job performances remain intact.
The carrier uses the newest hand-frame calibration, not a second skeleton.

Shared residents now have shaped eyelids and independently timed short blinks.
The same expression runs on the player, preview and outside-feed clone. The
cleaner’s eyes settle closed when resting. One relative GPU morph target keeps
expressions per actor while retaining shared geometry; body vertices have zero
blink displacement. A frame does not rebuild or upload the complete mesh.

## Faces and preview

Twelve controls modify actual geometry: face width/length, jaw, chin, cheekbones,
nose width/profile, eye spacing/size, brow height, mouth width and lip fullness.
Smooth regional changes preserve the neck seam. Eyes, eyelids, scalp and glasses
use the sculpted dimensions. Frames are fitted in front of the actual forehead
and nose surface so their rims no longer disappear into the face.

Existing NPC identities receive modest deterministic facial variation unless an
explicit value is already supplied. Streaming or reloading keeps the same face.
These are original character interpretations, not scanned actor likenesses.

Skin texture normalization now happens per fragment before blending with the
skin colour. The old inverse tint interpolation created pale triangular bands
at the texture/scalp boundary. `resident-head.js` supplies unnormalized skin
colour; `resident-surface.js` applies the atlas tile’s mean. Keep these paired.

The creator has four editing sections, six face presets, a variation action and
face reset. Face/hair editing automatically frames the face; Full body enables
idle, walk and run previews. Changes only persist on Save & play. Existing v1
profiles gain neutral missing controls and retain identity, clothing and story
progress. Name-only edits no longer rebuild the preview mesh.

## Verification

Checks cover old-profile migration, preset identity preservation, every control’s
geometry effect, combined slider extremes, repeatable NPC faces, parcel/body
intersection through poses and sizes, blink isolation and shared-geometry safety.
The existing suite covers all selectable rigs, feet, hands, clothing attachments,
work schedules, porter journeys, opening continuity and the wider game.

A temporary DOM integration harness exercised the actual menu listener, editing
sections, preset and slider changes, preview framing/motion choice, save/reopen,
cancel, switching cast members and restoring the saved custom resident. This
uses actual meshes and storage, with GPU preview disabled. It adds no production
or CI dependencies.

Offscreen GLES renders reviewed facial variants, glasses, skin seams, eyelids
and carrying. These approximate the game’s lighting and do not replace a full
on-device playthrough. The managed browser cannot run the full WebGL game;
mobile rendering and motion still need that practical check.
