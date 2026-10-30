# Optional stories: life in the silo

Three original side stories expand the resident workdays. They work in both
Story and Free Roam, can be interleaved, and never consume main-story equipment,
grant a story unlock or alter the ending. The other agents’ character work and
latest main-menu changes are retained.

## Where to start

| Story | Start | What you do | Lasting result |
| --- | --- | --- | --- |
| A light for the landing | Walker, 144 B | Diagnose the fault on 140 A; obtain the correct relay from Carla on 126 C; isolate, replace and test it; report back | A real warm light illuminates the landing; Walker signs the repair docket |
| The parcel without a name | Carla, 126 C | Recover a sealed parcel on 61 A; decipher its torn routing slip; deliver it to Pete on 62 A or return it through Supply | Linen appears at Medical or on Carla’s dispatch stand; the recipient acknowledges the outcome |
| Lights on the glass | Lukas, 19 C | Read three archived observation strips at the cafeteria entrance on 1 A; interpret the changing pattern; decide whether to share it | An anonymous chart appears at the school on 35 A, or remains privately beside Lukas’s stand |

The contacts’ correspondence stands are on the gallery outside the indicated
wings. They provide the same mission choices when playing as the contact, or
when a resident is temporarily outside the active crowd budget. You can also
use the ordinary NPC conversation. Required main-story contacts keep their
existing dialogue and locations.

## Playing and reading

Requests appear as optional conversation topics. Agreeing begins a mission;
“another time” leaves it available without a deadline. Physical tasks use the
existing Use control. The lamp’s isolation, replacement and test each take a
short work interval; traveling interrupts unfinished work.

The existing journal records the current lead, carried mission items, every
collected clue, and the responses you received. Completed stories retain their
outcomes. The sky observation clue also has a labelled diagram showing the
three timed rows and the fixed tree reference. Incorrect interpretations prompt
you to compare the evidence again rather than silently completing the puzzle.

Nothing automatically opens a new mission panel. No floating quest markers,
forced clock waits or timed failures are added. Route length depends heavily on
whether you walk or use the directory; no measured extra playtime is claimed.

Story saves include the side stories. Starting a new Story resets them with that
story. Free Roam keeps its own side-story save, so visiting it does not erase
story progress. Relay keys, parcels and observation strips are mission items,
listed in the journal; they are not additional main-story relics.

## Research and original writing

These are original side stories, not episodes or missing canonical scenes.
The research for this pass used public source material, not full streamed
television episodes or the complete novels.

- [Hugh Howey’s extended Wool excerpt](https://reactormag.com/wool-excerpt/)
  supports the everyday setting of loaded stair porters, repair, education,
  food shops and garment work. It informed the small scale of the favours.
- [Apple’s Silo listing and episode descriptions](https://tv.apple.com/us/show/silo/umc.cmc.3yksgc857px0k0rqe5zd4jice)
  identify the engineer, generator and civic/security roles used by the game.
- [Silo television character and episode summary](https://en.wikipedia.org/wiki/Silo_(TV_series))
  is a secondary cross-check for Walker’s electronics work, Carla’s Supply role,
  and Lukas observing moving lights on the cafeteria screen in season one.
  The game’s sky puzzle borrows that interest, not the show’s dialogue.

The fault rating, parcels, observation coordinates, repair instructions, dialogue,
rewards, stand placements and every branch are invented for this game. The sky
puzzle deliberately distinguishes an observation from a claim that the outside
is safe. It does not provide the main mystery’s answer or bypass Billings.

## Integration and validation

- `side-missions.js`: bounded progression, original dialogue, carried items,
  journal entries and save/load. Repeating a finished action cannot duplicate
  a reward or change a resolved branch.
- `side-mission-world.js`: eight small physical stands, collision integration,
  a repaired artificial lamp and visible delivery/chart outcomes. They stream
  with the existing floors; no new full interior is built.
- `side-mission-journal.js`: the existing journal’s mission section and accessible
  observation diagram. The journal remains available in Free Roam.
- `main.js`: conversation choices, Use actions, interruptible work and persistence.
  `world.js` includes the new stands in existing collision and line-of-sight
  checks. The main story’s progression module is unchanged.

The complete suite passes **240/240 tests**. New tests exercise interleaving all
three stories, saving after every step, invalid-order rejection, both endings
of each branching story, and unchanged main-story state. Every physical stand
has a supported approach; an actual character body walks up and the real
interaction selector must offer that stand. Outcome meshes and the repaired
light are checked after floor streaming and save/load. Runtime validation checks
all entrypoints, imports and syntax.

The remote browser could not open the local preview (`ERR_BLOCKED_BY_CLIENT`).
Consequently this pass does not claim a browser-verified visual playthrough or
AAA visual fidelity. Final device performance and the new journal’s appearance
still need a player check in the deployed build.
