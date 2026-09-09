# Stair bridges, cafeteria and exterior camera — 8 September 2026

Built on `b619e5a`, including the contributor's concrete stair guards, realistic resident proportions, hatch mouth, cell and sheriff monitors, and two separate audio tracks. The supplied reference files are preserved in [references](references/).

## What changed

- Bridges advance through **0°, 120° and 240°** on successive floors. A **240° rising flight** meets the next bridge. All 144 landings, 143 flights, signs, directory spawns, collision and distant instances share the same bearing functions. Gallery doorways and rooms retain their positions.
- Concrete gallery guards now match the helical and bridge parapets. Three pairs of continuous columns carry light collars through the shaft. Top and bottom terminal guards close the unserved side.
- Eleven flat treads at either end cover the full bridge-to-core junction; fifty 20 cm risers connect the floors. Walking snaps down to the next tread within the existing 30 cm step limit, while jumps and real drops remain airborne. Flat tread geometry is clipped against the bridge slab to eliminate coplanar flicker.
- The cafeteria has sixteen rounded luminous petals, a central light, three rounded concrete ceiling frames, recessed perimeter lamps, metal dining tabletops and a built-in screen surround. The directory book, seating routes and connected civic rooms remain accessible.
- The sensor now sits **behind and beside the exit**, facing outward. Holston emerges away from the lens, turns and walks around the curb to clean. The same hatch, ground and cleaner poses appear outdoors and in the feed; the sensor housing is excluded from its own picture. The dead tree remains on screen-right, with a barren enclosing crater and no city.
- The camera aims 5° above horizontal, leaving sky above the crater. **Settings → Outside sky** offers Day, Night and a twenty-minute cycle. Both views share the sky material and lighting state; a fixed angular star field appears at night.
- Residents have finer eyelids, ears, nostrils, hair locks, clothing folds, seams and boot laces. Small rigid details use fewer unnecessary subdivisions. NPCs blend between activities and use terrain foot placement. All playable rigs distinguish jump ascent, descent and landing; running foot motion fades out in the air.
- Regenerated the 22 reusable cast GLBs with seven clips, including Jump. The three supplied textured meshes remain intact and use the improved runtime solver.

## Opening and preserved audio

The opening remains 90 seconds. Its initial route now uses 0–8 s to emerge, 8–18 s to turn and circle the curb, 18–27 s to clean, and 27–30 s to turn toward Allison. The established hill walk at 30–60 s, helmet removal at 60–68 s, crawl at 68–80 s and rest at 80–90 s retain their timing against the supplied score. The cloth still contacts the lens and briefly fills the feed on each wipe.

The contributor's opening speech/score and ten-minute ambient bed, playback gate, pause synchronization, footsteps and interaction audio are preserved. Both audio files pass the existing manifest and playback tests.

## Verification and limits

Numerical and source checks cover all 864 room exits and entrances; support on all 144 bridges; all 143 stair intervals; up/down walking at each bridge bearing; top, bottom and intermediate barriers; the opening's ground/collision path and cloth projection; night state and sky framing; jumps on all three supplied rigs; generated skins/poses/exports; the hidden-door ladder; and audio behavior. Ray checks require a visible slab and exactly one top face at each sampled landing. Local module imports, syntax and runtime assets are validated.

No browser rendering or visual inspection of the running application was performed in this pass. Device frame rate, final on-screen appearance and actor likenesses are not certified by these checks.

The images show staggered bridges, but do not establish a surveyed plan or exact azimuths. The three-bearing scheme, dimensions and room proportions are a coherent reconstruction from the provided views, **not a verified one-to-one studio replica**. New faces remain approximate original game models.
