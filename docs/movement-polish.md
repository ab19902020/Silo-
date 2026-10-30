# Movement polish and completed cinema cleanup

Integrated on top of upstream `996b73b` after reading its README and body/gait
notes. The new streaming, market, controller, dialogue and story work remains
in place. After finishing the earlier cinema cleanup, this pass changes only
character movement and its verification.

## Runtime animation

`SkeletalMotion` drives the supplied player models, generated playable cast,
residents and cleaners. It retains measured-leg IK, terrain sampling, heel/toe
roll, distance-driven phase and contact-based footstep timing.

- Shorter reaches and support intervals reduce the deep knee bend without
  substantially accelerating cadence.
- Supporting legs still constrain pelvis height; their load releases gradually
  instead of snapping the pelvis upward as the trailing foot lifts.
- Arms have an independent sinusoidal rhythm. They no longer inherit the
  asymmetry and overshoot of the planted-foot trajectory.
- Running has earlier, higher heel recovery and less added vertical bounce.
- Generated hands gain two finger segments per hand, relaxed during walking
  and curled for running. These share the existing skinned draw call. Supplied
  meshes retain their existing skeletons.
- Idle decelerates through the shared gait. Other resident activities clear
  foot anchors before a route resumes. Teleport/selection also clears run,
  slope, phase and pelvis compensation.

At 120 Hz, after settling at 1.45 m/s, measured pelvis excursion changes from
8.0 to 4.7 cm for Juliette, 8.6 to 5.1 cm for Bernard, and 6.9 to 3.9 cm for
Walker. At 3.8 m/s those measurements change from 10.1/10.9/11.6 cm to
8.0/8.7/9.4 cm respectively. These are game-rig measurements, not motion-capture
or a claim of anatomical fidelity.

## Finished earlier cleanup

The cleaning toolbar is smaller and fades after 4.5 seconds. H / the menu button
recalls it; hidden controls do not intercept input. Focus immediately clears
the toolbar. Relics show a pickup acknowledgement; 3D inspection remains in
the satchel rather than automatically interrupting movement with a modal.
Upstream's test that expected automatic inspection was updated to the requested
behavior, retaining checks for the pickup message and the satchel action.

Rock displacement now matches at shared triangle corners, closing the torn
geometry that resembled wreckage. Distant rock scale is bounded. The tree has a
slightly thicker trunk; the cleaners use terrain foot placement, distinct rest
poses and a final full-vertex ground-contact check.

## Verification and limits

- Full Node test suite, including the actual-world mystery playthrough, all 864
  wing routes, character exports, contacts on stairs, pace changes and landings.
- New movement tests cover three supplied rigs and three generated residents,
  supported-foot error, pelvis excursion, reset and conversation transitions.
- Browser check using the real stylesheet and interface functions: toolbar
  appears, fades, returns through the menu, and remains hidden in free roam.
- Offline renders inspect actual skinned before/after gait poses and the
  cafeteria camera geometry. These omit the final game's lighting/material
  pipeline. The preview browser cannot create a WebGL context, so an in-game
  visual and frame-rate pass remains unverified in this environment.

This is procedural animation, not newly imported motion capture. Standalone
previously exported GLB clips are historical exports; the game uses the updated
runtime solver and generated rigs.
