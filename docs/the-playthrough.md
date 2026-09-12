# Walking the whole thing

The brief was to play the game through — the relics, George's house, the hard
drive, the blueprint, the gas line, the airlock, the drone — and make sure all
of it is actually there and actually works.

## 1. Driving the run instead of reading it

The story graph had good tests already. So did the terminal, and so did each
relic's clearance. None of them would notice a chapter that advances correctly
but sends you at a prompt the game will not offer, which is the failure a
player meets.

So `tests/playthrough.test.mjs` drives the real `Story` through the real
`SiloWorld` with a real `CharacterBody`. For each beat it plans a route over
the floor the colliders report, walks a body along it, looks at the thing, and
requires `world.nearestInteraction` to hand back exactly that. Fourteen
chapters, eight collectables, four pipe fittings, both airlock doors.

Two things were needed to make that honest, and both were my harness rather
than the game:

- **Straight-line steering is not navigation.** The deck is an annulus with a
  hole in the middle, so "head towards it" walks into the well. The route is
  planned breadth-first over a half-metre grid of cells a body of the right
  radius can stand in.
- **A cell 1.7 m from the thing can be in another room.** The first version
  cheerfully "arrived" on the far side of a wall and then reported that the
  game was offering nothing. A goal cell now has to be able to *see* the
  target — same `blockedFromView` the game itself uses.

With that, the run completes: **8/8 collectables, 14/14 chapters, out onto the
hill and the drone down.** What the walk found was not a broken storyline. It
was two things you could not see.

## 2. Where the hard drive plugs in

The complaint was that you cannot see where the drive goes, and it was right.

The machine sits on the apartment's dining table — `table(k,5.7,3.4,1.3,.8)`,
whose top `kit.js` beds at **.835**, spanning x 5.05..6.35 and z 3.0..3.8.
Measured piece by piece against that table, the old desk was:

| | floats above the top | hangs off the table |
|---|---|---|
| the tower | 85 mm | — |
| the keyboard shelf | 35 mm | 275 mm off the front — all of it |
| the black block | 80 mm | 90 mm off the front |
| the cable | 14 mm | 152 mm off the front, 37 mm off the right |
| the paper | 57 mm | 170 mm off the left — 70% of it |

And the thing meant to read as a socket was a 130 × 50 × 220 mm black block
with a 30 mm tube ending in mid-air. Nothing on the desk said "a drive goes
here", and nothing on the desk changed when one did: the screen read EXTERNAL
STORAGE MISSING for the rest of the game, drive in or not.

What is there now, all of it bedded on .835 and inside the table:

- A **cartridge bay** — plinth, two cheeks, a roof, a dark inside — with a
  **148 × 79 mm mouth** facing the player behind a brass rim. Sized to the
  drive the game hands you, which is 90 × 146 × 52 mm, and then a little over.
- A **placard** on the back of it reading EXTERNAL STORE 18, standing above the
  roof rather than in front of the slot.
- A **lamp** on the plinth: red while the slot is empty, green with the drive
  in.
- The lead running from the back of the bay **along the table** into the back
  of the machine, so the two read as one thing.
- The drive itself **appears in the slot**, its face proud of the mouth with a
  brass pull, and the screen changes from EXTERNAL STORAGE / MISSING to
  STORE 18 / MOUNTED.

Both states are built once and toggled; nothing is rebuilt while you are
standing there. `world.driveSeated` carries it, so Level 068 comes back right
after it streams out and in again.

### Three prompts do not fit on a table 1.3 m across

The note beside the machine got its own prompt, 330 mm from the computer's.
Standing in front of the note and looking straight at it, the game offered the
computer **every time** — at that range the cone deciding what you are looking
at is 56° wide and the two are 28° apart, so the nearer one wins and the nearer
one is the computer. The note is about the bay, so it now sits under the bay
and shares its prompt. Two prompts, 0.75 m apart, and each one wins from in
front of itself.

## 3. Reading the schematic

`.terminal-panel` is capped at 90dvh. Nothing inside it scrolled. So the
recovered sheet — a drawing and nine numbered steps — was laid out past the
bottom of the box and simply lost:

| viewport | content below the panel | anything scrollable |
|---|---|---|
| 1280 × 760 desktop | 475 px | none |
| 390 × 844 portrait | 691 px | none |
| 844 × 390 landscape | **808 px** | none |

On a phone in landscape all you could read was the words SCHEMATIC RECOVERED.

The head stays put and the content scrolls, the way Settings and the level list
already did. And in landscape — short and wide — it stops stacking, the same
answer the directory book got: the machine down the left, the sheet it
recovered down the right, each scrolling on its own at the panel's full height.
Checked by scrolling to the bottom in a browser at six sizes: **every line of
the route is reachable at all six**, and the drawing is on the first screen at
five of them.

The SVG labels were also bunched — SUPPLY and ISOLATE overlapping under one
component — and are centred on their own fittings now.

## 4. Telling you where to go

Reading the schematic used to leave you with *"Follow the red line past the
mine drill to the pressure gallery."* True, and the red band really does lead
there, but it names no floor, and the walk it means is **82 m** through the ore
workings from the arrival gallery.

- The chapter now says it plainly: *"The schematic puts the line below
  Mechanical, LEVEL 144 — the abandoned pressure gallery. Open your directory
  and travel there…"*, and finding the sheet says the same thing in a notice.
- The destination is the pressure gallery itself, not the floor it hangs under,
  so the directory **marks that row** rather than Level 144's, and *Take me
  there* travels rather than filtering a list.
- The scenic route is still there and is still the last hint: the mines, the
  red service band past the deep-face drill, the hatch at the ore face.

A test now requires **every** chapter that sends you somewhere to name the
floor in the objective text itself, not only in the destination card.

The sheet itself still names no floor, because this build does not know where a
gas line runs in the television silo and must not imply that it does — an
existing test enforces that, and the floor number belongs to the game's own
guidance rather than to the reconstruction.

## 5. The gallery, and the valve

The line, the wheel and the cover were all there and all reachable. Two things
were wrong or missing:

- The sheet said the isolation wheel is **left** of the coupling. The gallery's
  forward is +z, so the camera's right is world −x, and the wheel stands at
  x = −4: it is on your **right** as you face the fitting, with the telltale on
  your left. Corrected in both places the sheet says it.
- The inspection cover was a plain black rectangle. It has **fasteners and
  edge straps** now, so it reads as something you lever off.
- The telltale was a blank white board. It has a **dial, graduations, a red
  band and a needle** — sitting in the red while the line is charged, falling
  as you isolate it, resting at zero once the collar is torqued. It walks to
  each position rather than snapping, so you watch it drop while you are still
  standing at the fitting. It is the only thing in the gallery that tells you
  the work took.

## Checks

`npm test` — 215 passing, nine of them new in `tests/playthrough.test.mjs`, and
each group was run against the unmodified source first:

- *the whole run walks* — fails at the drive bay, which does not exist
- *every objective that sends you somewhere says which floor* — fails with
  "chapter pipe sends you to level 144 without saying so"
- *the gas line names its floor and the directory can travel straight to it*
- *George's machine stands on the table* — fails: the lowest piece over the
  table is at .849 and the desk spans x 4.88..6.39, z 2.72..3.67
- *putting the drive in changes what is on the desk and what the screen says*
- *the telltale shows the line falling to zero as you cap it*
- *the recovered schematic can always be scrolled to* — fails with "the panel
  neither re-lays out nor scrolls, so whatever overflows is lost"
- *the panel keeps its head still* — fails with "the panel is not a column"
- *nothing styles the terminal panel through a query this test cannot read*

The CSS cascade reader the directory-book test built is now shared
(`tests/helpers/css-cascade.mjs`), because two panels have now been broken by
the same thing and both fixes live in the cascade rather than in any one
declaration. Pixel measurements are a browser's job and are the tables above.

### What was checked and was already right

Worth writing down, because it is most of the run:

- Every relic is collectable, in order, from a place a body can walk to: the
  duck on the bar at 026, the watch on the trader's counter at 100, the Georgia
  book at 062, Hard Drive 18 on George's work surface in the hideout.
- The bulkhead asks for the crowbar, the crowbar is on the bench, and prying it
  opens the tunnel and the excavator.
- The drive unseals the Wilkins residence; the terminal refuses a drive you are
  not carrying, mounts a mechanic's volume that looks like nothing, and answers
  to exactly one search.
- The four pipe fittings are offered one at a time in the right order, and each
  is reachable.
- Billings wants the book first and says so; the shotgun comes across his desk;
  Supply opens; the airlock has both controls; stepping out launches the drone;
  two aimed barrels bring it down and the exterior network opens.
