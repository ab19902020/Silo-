# TV world and relic polish

This pass builds on the current GitHub game, including the subsequently received
`4dd0df7` movement and cinema update. It preserves the 14-chapter investigation,
the supplied characters and hard drive, the opening, the terminal puzzle and
the quieter pickup flow. Collect an object, open the satchel and choose
**Inspect in 3D** to examine it.

## Close examination

The inspector now has named detail views: a watch face and its reverse clue,
the PEZ repair ticket, the drive connector, tool working ends and book pages.
Georgia opens to an original, readable Atlanta spread with a bookmark. Drag,
pinch, scroll, keyboard rotation, flip and reset remain available. A satchel
button makes it possible to compare discoveries without returning to play.

The camera fits a bounding sphere to the narrower field of view, keeping a
rotating model inside a portrait screen. Short landscape screens put the
object beside the text; descriptions can scroll. Reflected studio light makes
metal visible. The paused world stops rendering while the inspector renders,
avoiding two full scenes competing on a phone.

The PEZ stem is now worn blue and Georgia has an ochre cover with red lettering.
The existing Blender geometry remains intact. The exported GLBs and manifest
are updated by `scripts/polish-relic-palettes.mjs`; the Blender build script also
applies the revised palettes on the next authoring rebuild. The existing
`.blend` files were not regenerated in this environment.

## Optional finds and floor details

Five optional, physically modelled finds sit on supported work surfaces:

| Find | Location | Visible detail |
| --- | --- | --- |
| Mechanical heat tape | 144, wing B | Hollow core, foil layers and loose end |
| Video camera | 144, wing B | Lens, cassette door, strap and battery contacts |
| Magnifying lens | 062, wing A | Glass, brass rim and repaired handle |
| Numbered IT key | 019, wing A | Metal case, red window, contacts and ring |
| Retired sheriff’s badge | 001, wing A | Raised shield, lettering and reverse pin |

These do not replace quest equipment or unlock story doors. The existing
eight required collectables still complete the investigation. Optional finds
and discovered floor notes survive story saves.

Each of the 144 levels has a distinct resident record mounted on the gallery
wall: a repair, a ritual, a missing object or a trace of someone's life. Read
one by looking at its notice and interacting. Found records are collected in
the satchel for rereading. They add television-inspired details about repairs,
porters, mirrors, the Pact, the lottery, Mechanical and daily life without
adding quest requirements or exposing unread entries.

## Placement and story fixes

Wide department signs, including Merchants Hall, now clear the circular wall
at their corners. Two brackets bridge the resulting gap. This fixes the
clipping caused by placing a wide, flat plate tangent to a curved wall.
Cafeteria, sheriff, holding, range and market signs have actual rods, brackets
or header supports. Interior entrance signs face the room; shop labels clear
the doorway trim. The cafeteria tea urn has a cabinet beneath it, and tray
papers and book stacks have corrected resting heights.

The pipe-cover message now sends the player right to the isolation wheel,
matching both the recovered schematic and the installed fitting.

## Reference and interpretation

The television production's architecture and material vocabulary guide this
pass. See the production interviews in [VFX Voice](https://vfxvoice.com/unraveling-the-mysteries-of-silo/)
and [Sally Crees' Silo work](https://www.sallycreescostumedesign.co.uk/home/silo-apple-tv-seasons-1-and-2).
Secondary visual references include the [episode-six book still](https://endlessvolo.com/silo-s1e6r.html),
a [blue-stem PEZ recreation](https://www.etsy.com/listing/1882341082/silo-inspired-rubber-duck-pez-dispenser)
and the [numbered key still](https://www.imdb.com/news/ni65078354/).
The replica is a palette aid, not an authoritative production specification.

The optional models, book-page writing, all floor records and their locations
are original game recreations. The new finds are not screen scans or a claim
that the show assigns those objects to these exact rooms. Existing game-only
story beats remain part of this game's investigation.

## Verification and limits

- The full Node suite exercises the physically walked 14-chapter route,
  required pickups, the terminal, pipe fittings, airlock and ending, alongside
  all 864 wing routes and the latest movement/cinema checks.
- New tests require all 144 notes to be offered by the actual interaction
  system from supported, unobstructed floor positions. They check distinct
  records, saved discoveries and optional finds that cannot advance the quest.
- Every optional model is checked for scale, surface contact and an actual
  pickup approach. Gallery tests now check both plate corners and bracket
  contact; requiring a flat plate's centre to touch a curved wall hid the
  original clipping defect.
- Inspector fitting is checked across portrait and landscape aspect ratios.
  Standalone front/reverse geometry renders were inspected for the small relics
  and the open book. Those renders use simplified lighting and are not game
  screenshots.
- Runtime asset validation and `git diff --check` are release gates.

The managed preview browser cannot create a WebGL context. A visual walkthrough
and frame-rate check in the actual game remain unverified here; automated route
checks and separate model renders do not establish visual perfection.
