# Character finish and creator access

Integrated on top of the expanded cast/creator release `c1d01ac`, including the
staircase and lighting merges. This preserves the 114 selectable identities,
existing saved profiles, single active-player allocation, four-weight fitted
clothing and the other agent’s hand and gait work.

## Changes

- Added **Create character** directly to the redesigned start menu and its HTML
  fallback. It opens the existing studio’s creation tab. **Choose character**
  remains available for the cast. Both enable when the game finishes loading.
- Replaced rectangular shoe platforms and oval uppers with closed, rounded
  sections, a narrower heel, shaped instep and a separate overlapping sole.
  These remain part of the shared skinned mesh; no extra draw calls or lights.
- Regularized only the open neckline boundary, preserving shoulder anatomy.
  Matching neck/chest weights and an overlapping neck section close the gap
  beneath the head during movement.
- Split shirt/trouser triangles at the sewn waistline. Colour cannot interpolate
  into jagged trouser triangles above it; original sleeve/hand colours remain.
  The boundary stays fixed during cloth smoothing. Existing fitted decorations
  continue to sample the actual body surface and inherit its skin weights.

## Checks and limits

The full automated suite passed: **260 tests, zero failures**. Runtime validation
checked 214 files, local imports, entrypoints and JavaScript syntax.

Regression tests cover closed rounded soles, shoe/sole overlap, neckline shape
across supported builds, hem topology, unchanged sleeve colouring and normalized
weights. The cast tests exercise all 114 rigs in idle/walk/run poses, custom
profile replacement, foot contact and wrist continuity. Existing fitted-clothing
checks verify attachment while the torso bends.

A temporary DOM integration harness exercised the actual Create menu listener
and studio: opening directly in Create, editing and saving, reopening, cancel
without overwriting the saved profile, filtering/selecting Bernard, and restoring
the saved custom resident. It used real actor meshes and storage, with GPU preview
rendering disabled. No extra production or test dependencies were added.

Offscreen GLES renders checked standing/walking coats, robes, shirts and medical
outfits. These renders approximate lighting; they are not full game screenshots.
The managed browser blocks the local preview connection. Full in-game GPU and
on-device mobile visual checks remain outstanding.
