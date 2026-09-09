# Additional Silo 18 character models

`silo18-cast.zip` contains 22 standalone glTF 2.0 binary files and `manifest.json`: 20 new character models plus cleaning-suit variants for Holston and Allison. These are original game meshes with approximate likenesses, informed by Apple production stills and credited costume design. They are not studio assets or actor scans.

Every GLB contains a 21-bone skin and seven animations: Idle, Walk, Run, Jump, Sit, Work and Climb. Jump is a single takeoff-to-landing pose sequence; the other clips loop. Materials are opaque and double-sided, and skin weights are normalized. Skin, cloth, hair and leather have separate PBR finishes in the exports. The cleaning-suit shell and reflective visor have separate material groups; the opening removes both together.

Characters: Holston Becker, Allison Becker, Martha Walker, Knox, Shirley Campbell, Mayor Ruth Jahns, Deputy Sam Marnes, Paul Billings, Lukas Kyle, Camille Sims, Judge Mary Meadows, Carla McLain, Patrick Kennedy, Dr. Pete Nichols, Gloria Hildebrandt, Hank, Cooper, Teddy, Amundsen and George Wilkins.

The three user-supplied Juliette, Sims and Bernard meshes remain in `dist/assets/characters/`; they are not duplicated in this archive. George is not spawned alive during the opening timeline.

Regenerate the additional models from the same mesh and motion source used in the game:

```sh
node scripts/export-residents.mjs models/cast
python scripts/package-residents.py
```

Generated loose GLBs are ignored by Git; the verified ZIP and manifest are tracked. The browser builds the same geometry on demand instead of downloading the standalone exports. No additional package installation is required.
