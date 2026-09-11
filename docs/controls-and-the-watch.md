# The watch, the prompts, and the controller

Three complaints, three different causes.

## 1. The watch nobody could find

Not a missing model and not a broken one. `watch.glb` is 13,922 triangles
across eight materials, it loads, and in the bazaar the game offers you *Take
George Wilkins' wristwatch* when you walk up to the counter. You just cannot
see what it is offering.

Two reasons, both measurable:

**It was floating.** The relic sat at `y = .94`. The counter it was supposed to
be lying on has its top at `.835` — `table()` in `kit.js` beds a counter top at
`.79` with a `.09` rise. So the watch hung **10.5 cm of clear air above the
counter**, which at a glance reads as nothing being there at all.

**There was nowhere for it to lie.** Two separate passes dress these counters:
`bazaar.js` lays out the stall's own goods — for the textile stall, seven bolts
of cloth on a 0.49 pitch — and then `dressBazaar` in `environment-details.js`
lays three wooden trays over the top of them. Neither pass knew about the
relic, so the watch's spot was inside a bolt of cloth with a tray over it.

So the counter now keeps one space clear, and both passes know about it.
`REPAIR_COUNTER` lives in `environment-details.js` — the lower of the two
modules, so `bazaar.js` can import it without a cycle — and each pass skips
the piece that would stand in it. In the gap there is a felt mat, a repair
ticket, a loupe on end and a few spare pins, and the watch lies on the mat at
`.855`. It reads as a space somebody cleared to put a customer's watch down,
which is what the ticket in the duck says happened.

`story.js` still carries the coordinates as literals, because that file has no
imports and is worth keeping that way. A test asserts the two agree.

### The glint the code kept promising

`relics.js` has carried this comment for a long time:

> A relic is a real object at its real size, and a PEZ dispenser on a bar among
> forty mugs is genuinely hard to see. A faint glint above it is the
> concession.

There was no glint. Nothing in the file ever built one. Supplied relics now
carry a trace of their own texture as emissive at 5.5% — not a marker and not
a glow, and at arm's length you cannot tell it is there. It only stops a five
centimetre object sinking entirely into a room lit by half a dozen fittings.

### A guard that already existed

Moving the watch to the Electrical Repairs counter — which is where a watch
left for repair belongs — failed `every collectable stands in open space you
can actually walk up to`, an existing test that walks a body at the relic and
requires it to arrive: *watch on 100/0 cannot be reached: stopped 5.8 m away*.
That shop is at the far end of the street and the straight line into it goes
through a wall. The test is a crude criterion but it encodes a real one, so
the watch stayed at the counter it was already at and got the space instead.

## 2. Prompts covering the silo

Measured first, because the complaint and the build did not obviously agree.
With the game idle in story mode, everything permanently on screen adds up to:

| viewport | covered |
|---|---|
| 1280 × 760 desktop | 0.2% |
| 844 × 390 phone landscape | 0.6% |
| 390 × 844 phone portrait | 0.6% |

That is the ☰ button and nothing else. The header, the bottom bar and the
control legend are already hidden until asked for.

So what covers the view is the **contextual prompt**, and it was offered far
too readily: anything within five metres and inside a cone **71° off the middle
of the view**. A corridor of doors or a gallery with people in it kept one on
screen more or less permanently.

The cone now closes with distance, because that is what a target does — at
arm's length you can reach something well off to the side, and at five metres
you have to be looking at it:

```
0.45 m and nearer   56° off the middle
5 m                 21°
```

Sampled over a two-metre grid across every wing of five levels, looking in
sixteen directions from each point — 34,176 views:

| | a prompt was on screen |
|---|---|
| before | 3.5% of views |
| after | **2.1%** |

A 40% cut, and the ones that remain are things you are actually looking at.

## 3. The controller

Every button used to do two jobs, and two of them conflicted outright:

```
before
  sprint   R2 or L1 or L3        fire     R2
  reload   L1                    use      □ or R1
  torch    △                     view     R3
  pause    ○                     book     Options or Create
```

R2 was sprint *and* fire, so holding the trigger to run meant you could not
stop running to shoot. L1 was sprint *and* reload. L2 and the whole D-pad were
unused. Aim had no button at all on a pad, and on a keyboard it shared Shift
with sprint.

It is now the map a console player already knows:

```
left stick   move — a gentle push walks, full is a jog
L3           sprint, held
right stick  look                      R3   first or third person
✕            jump                      ○    close the panel, or pause
□            reload                    △    interact — take, open, talk, travel
R1           interact as well          L1   torch
L2           aim                       R2   fire
Options      your directory            Create  what you are carrying
D-pad        ↑ torch · ↓ satchel · ← think about it · → character
```

In a conversation, △ asks the first question, □ the second and ○ steps away, so
an exchange can happen without reaching for a key. Aiming also slows the right
stick to 45%, so the sight can be put on something smaller than a doorway.

The whole map is printed in Settings, and a test asserts the panel and the code
agree — a controller map that lies is worse than none.

On the keyboard, aim moved to the **right mouse button**, which is where it is
in every other first-person game, so Shift is only sprint again.

### Vibration

`haptics.js` is one call over two very different devices. A DualSense reports a
`vibrationActuator` and takes a duration with two magnitudes — the
low-frequency motor you feel as a thump and the high-frequency one you feel as
a buzz. A phone has `navigator.vibrate` and one setting: on. So each effect is
written the way the pad wants it and flattened to a duration for the phone,
where strength has to become length.

Ten effects, none longer than 260 ms: a tick when something new comes within
reach, a knock for a door or a lever, a firm double for picking something up, a
turn for a relic in the inspector, a dull refusal for something sealed, a kick
for a shot scaled by the weapon, a thump for a landing scaled by the impact,
and the shift bell.

Two things it will not do. It will not fire more than once every 55 ms, or
turning on the spot in a corridor of identical doors would buzz once a frame —
the prompt tick is keyed on the label for the same reason. And it is a switch
in Settings, on by default, separate from *reduce camera motion*: somebody who
asked their system for less motion has not asked for less vibration.

## Checks

`npm test` — 198 passing, nine of them new in
`tests/controls-and-relics.test.mjs`, and each was run against the unmodified
source first:

- *the watch rests on the counter rather than floating over it*
- *the textile counter has a clear space where the watch lies* — fails with
  "55 vertices stand in the space the watch lies in"
- *no pad button is asked to do two things at once* — fails with "sprint is not
  on L3"; it also asserts no button is both a held control and a tapped one
- *the settings panel documents the map it actually implements*
- *something has to be near the middle of the view before it offers itself* —
  fails with "at 4.4 m it still offers itself 71 degrees off to the side"
- four on the vibration: every effect short and audible, the switch holds off,
  one effect does not fire once a frame, and a device with no vibration at all
  is not an error

The 0.2% HUD figure comes from walking the DOM of a running game and summing
what is actually painted, not from reading the stylesheet.
