# IT, residents and environmental polish

The update extends the existing game and preserves its story checkpoint,
six-wing floor layout, relic assets, exterior network and movement rig.

## Playable changes

- Free Roam: enter Level 19 IT, walk along the central server aisle, and use
  **Enter the IT vault**. The destination uses the same story seal checks as
  the directory. The vault's gallery entrance no longer has an opaque panel
  across its opening.
- The Algorithm has a pale cymatic particle surface, a wider dark console,
  curved panel tiers, counter lighting and an overhead ring. Asking a question
  excites the particles; the response settles gradually. All light is artificial.
- Address the Algorithm with topic buttons or typed subjects: Legacy, stars,
  Atbash, the Order and service references. Early story queries cannot reveal
  the gas-line record or bypass George's interactive library discovery.
- Residents have five conversation topics, personal histories and follow-ups.
  Return greetings and selected-topic progress persist separately from story
  saves. Background residents have stable individual names and memory keys;
  their existing shared visual templates and population limits remain intact.
- Lukas wears a worn ochre work jacket with chest pockets and stitched panels.
  Work and uniform garments gain pocket flaps without adding rendering passes.
- The lower service spur has wall-attached memorial writing and an inspectable
  trace beside the warning sign. IT has an observation sheet associated with
  Lukas; Walker's workshop has inspectable heat-tape test samples. These are
  optional discoveries without floating quest markers.
- Desk clutter follows the actual IT desk positions. Duplicate monitors are
  removed. Office props, cafeteria trays and vault shelf supplies rest on their
  supporting surfaces. Server platform meshes match their collision heights.
- Sign lettering fits both width and line height. Previously suspended
  entrance labels, gallery notices, cable trays and pendants gain supports.

## References and reconstruction limits

Primary visual reference: [Territory Studio, Silo](https://territorystudio.com/project/silo/).
The studio describes the Legacy archive, its Algorithm interface, cipher work
and sand-like cymatic visualisation. Its chamber still informed the curved
horizontal tiers, counter strip and overhead ring. The archive and the
Algorithm are distinct; the earlier game called the interface itself Legacy.

Costume reference: [Apple TV, The Dive](https://tv.apple.com/us/episode/the-dive/umc.cmc.1i451woozw5d3hgbpjqr65110).
The official still shows Lukas in a worn ochre pocketed jacket beside Bernard
at a concentric metal vault entrance. Clothing details are reconstructed in
the existing mesh style; actor likenesses are not claimed to be exact.

Heat tape, Lukas's observations, the Pact, the Order and the Legacy are show
references. All incidental writing, NPC lines, the memorial names, sample
notes and placements are original game adaptations. This is not a surveyed
one-to-one room replica. The server-aisle transition retains the game's existing
separate-wing architecture. The UI is text-interactive; no voice recognition
or actor-voice imitation is implemented.

## Verification

All 180 regression tests pass. Runtime validation checks 182 shipped files.
Automated checks cover free-roam access, a visible unobstructed vault entrance,
existing physical entry routes, particle response/resource disposal, multiline
sign bounds, wall-writing placement, durable distinct conversation memories,
archive discovery gates and the existing story/game regression suite.

The conversation panel was exercised at a 390 px panel width using the actual
UI functions, conversation modules and stylesheet in an isolated browser
fixture. Archive submission, repeated personal-history questions, return
greetings and hiding the archive input for residents were verified.

The provided browser cannot create a WebGL context. An offline render of the
actual vault meshes caught and helped correct a coplanar floor, unsupported
alcove panels and a partly obscured label. It does not reproduce Three.js PBR,
post-processing or final lighting. A live rendered playthrough and performance
measurement on the player's device remain unverified.
