# Chapter One, and the hand in the last second of the clean

The brief was to redirect the story, not rebuild the game: keep the cleaning
that is already here, make the cleaner ours, and let what he does in front of
the lens be the thing the whole game hangs off.

## What was kept

Everything. The walk out of the ramp, the crater, the dead tree, the lens, the
climb, the helmet coming off in his hands, the long rest — that sequence is
untouched. It is cut against `assets/audio/silo-18-opening.mp3`, and a note in
`opening.js` has always said that moving one beat means retiming the other, so
the timings are now written down in a test:

| | |
|---|---|
| opening | 90 s |
| the clean | 21 – 30 s |
| helmet off | 69.4 s |
| phases | emerge · approach · clean · turn · walk · helmet · crawl · rest |

`the existing cleaning is untouched: the same beats at the same seconds` walks
all twelve and fails if any of them moves.

## The people on the hill are ours now

The cleaner was Holston Becker and the woman at the foot of the tree was
Allison Becker. They are **Sheriff Nathan Reeve** and **Hana Reeve** —
original Silo 18 characters, invented for this game. She was sent out before
him; he has come to lie beside her. The scene, the relationship and every frame
of animation are exactly as they were.

The rename is complete rather than cosmetic: the cast, the level-6 directory
entry, the cinema caption, the chapter HUD, the welcome copy, three residents'
conversations, the research panel. A test reads every shipped `.js` and
`index.html` and fails if either name appears anywhere. The rest of the
television cast is untouched and stays exactly as it was — this was about the
cleaner.

## The gesture

Just before he turns away, he raises his free hand to the lens, opens it, and
holds it there. It is deliberate and it is brief.

Where it goes mattered more than what it is. A new beat after the clean would
have pushed the climb, the helmet and the rest off the score. But the wiping
arm's own envelope is already back to zero at 0.84 of the way through the
clean — the last sixth of it was a man standing still. So the gesture lives
there, from **0.86 to the end of the existing window**: 28.74 s to 30 s, inside
the clean, and **not one downstream timing moves**.

It is the left hand. The cloth is in his right, so the gesture never touches
the wiping animation that was already built.

Measured on the real rig, stepped a frame at a time the way the game runs it:

| | free hand, above the ground | out from the shoulder |
|---|---|---|
| 28.0 s, before | 0.78 m | 0.02 m |
| 29.5 s, held | **1.31 m** | **0.49 m** |
| 31.0 s, turned away | 0.78 m | 0.06 m |

Held at full extension for about three quarters of a second, then down before
he turns. Long enough to be a decision; short enough that the room reads it as
a man steadying himself. Nobody in the cafeteria remarks on it.

## What was wrong with the first version

Worth writing down, because it is the reason for everything below. The first
pass got the *structure* right — cleaning, gesture, witness, parcel — and then
asked the player for this:

1. walk to the book, press Use
2. watch ninety seconds
3. click three dialogue buttons
4. open the directory, click 110
5. walk to the counter, press Use

Five inputs. No friction, no pressure, nothing to find out, and the one good
beat — the hand — went cold the moment Mara stopped talking. A chapter that is
structurally correct and has no play in it is still an errand.

Three things were added, and each is here because without it the chapter goes
back to being an errand.

### The room closes ranks

Four people who were in the cafeteria, each with a reasonable answer ready, and
**none of them lying**. Marnes did not take notes. Billings knows arms cramp
after two hours in a suit. The Mayor has watched eleven cleanings and every one
of them turned round and waved. Mara asked two people herself, and the second
one asked her why she was asking — which is the part she keeps thinking about.

You are not being silenced. You are being *agreed with*, and that is worse.
Ask three of them and the chapter's own objective changes: **"Nobody in that
room saw a thing. You did, and so did one runner."**

It is entirely optional and the chapter finishes without it. A test proves
both: that all four answers are reasonable, and that a player who asks nobody
can still finish.

### The job is a job

A runner carries. The dispatch is a real object on a real rack — pigeonholes by
destination band, a chalked shift list, a shelf at writing height — standing
beside the station door in the cafeteria, where the dispatchers work. You take
it, it goes in your satchel, and it is the reason you are allowed on the stairs.

Without it there is no shift. Without the shift, Supply has no reason to look
anybody up.

### The parcel has to be earned

The clerk is not an obstacle and she is not a puzzle. **Delen Osgood** is a
woman doing her job correctly, which is worse: she breaks the seal, reads the
dispatch in about four seconds, writes in a ledger the size of a paving slab,
and then does not dismiss you. There is a hold against your name. Eleven days
old. Holding fee paid up front, *which people do not do*.

She checks the signature, and something goes out of her face.

> "I am going to give you your parcel, because the slip is in order and I have
> no reason on this earth not to. And then I am going to forget I read the name."

### Chapter Two ends on a turn

**Deputy Aron Kell** is holding the stair door. He is polite. He looks at the
satchel rather than at you, he takes out a notebook, and he does not hurry.

You can tell him who lodged it or you can not. Neither answer is punished and
neither is safe — if you tell him, he stops writing, looks tired rather than
official, and says he would open it somewhere with a door and not tell the next
person who asks. Either way he writes your name and the level in the notebook,
and you watch him do it.

Chapter Three starts with somebody already looking at you.

## Chapter One · The Clean

The cleaning is the inciting event now. Reading the directory book used to open
the hunt for George directly; it opens **Chapter One** instead.

```
LAUNCH  →  SILO 18  →  the existing cleaning  →  the gesture
                                    ↓
                    CHAPTER ONE · THE CLEAN     Mara. Then your shift.
                                    ↓
                    CHAPTER ONE · THE PARCEL    Supply, Level 110
                                    ↓
                    everything George left behind, unchanged
```

**Mara Teague**, a runner on Level 001, was watching his hands rather than the
view. The exchange plays on the beat the screen goes back to the hill:

> **You:** Did you see that?
> **Mara:** The cleaning?
> **You:** No. His hand.
> *Mara looks toward the now-empty screen.*
> **Mara:** Yeah.
> **You:** What was it?
> **Mara:** I don't know.
> *(a beat)*
> **Mara:** But he wanted somebody to see it.

It explains nothing, and a test enforces that: the whole exchange is checked
against a list of words that would give it away — signal, message, code, sign,
meant, because, warning, told — and fails if any of them turns up. The hook has
to survive Chapter One intact.

The lines live in `the-clean.js`, which has no DOM and no Three.js in it, so
the writing can be checked without a browser. `main.js` draws it.

If the player skips the opening the scene does not ambush them; Mara is a
resident standing at the screen wall and the exchange plays when they walk up
to her.

## The player is a runner

That is why they are standing in the cafeteria at all, and it is what carries
them down the silo without the story having to invent an errand. Chapter One
sends them on a shift: **a dispatch for Supply, Level 110.**

## The parcel

Eleven days before he was sent out, Reeve lodged something at Supply against
the player's name, with a release date and no explanation. He paid the holding
fee himself. The date on the slip is today.

Inside there is no letter — only a bar chit from Level 026 with a name written
across the back of it: **G. WILKINS**. The lodging signature is N. REEVE.

That is the hand-off. The relic trail used to start from a receipt tucked in
the directory book; it starts from the parcel now, and the whole of the
existing investigation — the duck, the watch, the void, the hideout, the hard
drive, George's machine, the gas line, Billings, the airlock, the drone — runs
from there exactly as it did.

Arriving at Supply is the trigger. Nothing has to be pressed.

## What playing it in a browser found

Both of these passed every unit test and were broken in the game.

**The dismissal was never counted.** It was counted by comparing the button's
text to the written question — but `renderChoices` puts a numbered `<kbd>`
inside every button, so the label read back as
`"1Did you see what Reeve did at the end?"` and never matched. You could ask all
four people and the chapter would not notice. It is counted on the topic's own
id now, in `askTopic`, so it works wherever the topic is rendered.

**The pause wiped the line before it.** In the first Mara scene, the beat
cleared the line to an ellipsis the instant the player clicked, so
*"I don't know."* was replaced in the same tick it appeared and was never
readable. The pause leaves what was said on the screen now, and all three
scenes run through one `playScene` helper so it cannot regress in only one of
them.

## Checks

`npm test` — 288, with sixteen in `tests/chapter-one.test.mjs`:

- *the existing cleaning is untouched* — twelve phase beats at fixed seconds
- *the gesture happens inside the clean, before he turns away* — and is a hold
  of 0.35–1.2 s rather than a twitch or a speech
- *the free hand actually comes up to the lens* — measured on the rig, stepped
  at the real frame rate, and down again before he turns
- *the two people on the hill are original characters* — no shipped file names
  either of the two it replaced, and the research panel says whose invention
  they are
- *the exchange is the one that was written, and explains nothing*
- *Chapter One runs from the cleaning to the parcel, and the parcel hands off
  to George*
- *a Chapter One save comes back where it was left* — including who was asked,
  the job being carried, the shift being worked and what was said to the deputy
- *asking the room is four different people, and none of them explains it*
- *asking three changes what the chapter says, and asking twice does not count
  twice* — and the chapter can still be finished without asking anybody
- *the parcel has to be earned* — the dispatch is carried, handed over once,
  and only then released
- *Chapter Two ends with somebody having noticed* — two answers, both recorded,
  and he cannot appear before there is anything to notice
- *the runners' rack is a real thing you can walk up to* — it has a collider,
  so you cannot walk through it
- *the clerk and the deputy are people you walk up to, in the right order* —
  a body is walked at each and the game has to offer exactly that
- *the question about the hand is actually offered, to the right four people,
  at the right time* — and not to somebody on 144, not in Free Roam, not three
  chapters later, and not to Mara before she has spoken
- *the dismissal is counted on its own topic, not on what the button says*

The end-to-end walk in `tests/playthrough.test.mjs` now includes Chapter One:
it talks to Mara, runs to Supply, plans a route over the real floor to the
counter and requires the game to offer the parcel before taking it.

One thing found on the way and fixed: the Supply counter had no collider, so
you could walk through it. It has one now, and it stands back from the doorway
rather than across it.

### Still red, and not from this work

`waistbands stay on the torso and collars inherit only minor shoulder
influence` was already failing on `main` before any of this. It belongs to the
wardrobe work from another session and is untouched here.
