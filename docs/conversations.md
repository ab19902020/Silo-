# Talking to people

Two complaints, one cause. The dialogue was shallow and the panel was clunky,
and both came from the same decision: every person in the silo was handed the
same five questions and one line behind each.

## What was wrong

`conversationFor` built the identical topic list for everybody — *what do you
do here, where should I look around, why is everyone watching, tell me about
yourself, what keeps you going* — and filled it from a per-character array of
three lines. Twenty different people answered the same interview. You learned
the shape of the questionnaire in your first conversation and there was
nothing after that, because there was nowhere for a conversation to go: five
answers and the list was spent.

The panel had the matching problem. A flat slab, a flat line of text, and four
filled rectangles under it, all the same visual weight. Nothing on the card
told you what to read first.

## The dialogue

**Everyone named has their own questions.** Written out of their own life, so
the list itself tells you who you are standing in front of. Walker is asked
about his bench, about teaching Juliette, about arguing with Supply. Knox is
asked whether the upper levels listen. Lukas is asked what he is counting. You
cannot mistake one for another, which is the whole point.

**Questions open into follow-ups.** A topic can carry `follow`, and asking it
replaces the list with what it opened up, plus a way back. That is the
difference between talking to somebody and reading five answers off them: ask
Juliette about George and you can then ask what happened to him, and what he
showed her. Two levels deep — enough to go somewhere, not so much that it
becomes a maze.

**They know each other.** `OPINIONS` gives the named cast a view of their
colleagues, surfaced as one extra question. Ask Shirley about Juliette and you
get Shirley's opinion of her, not a line about Mechanical.

**The unnamed are composed, not templated.** A trade, a home level, somebody
they know, a thing they keep, a thing they worry about and a small pleasure,
each picked independently from a hash of their id. Two porters share a trade
and differ everywhere else, so the hundredth resident is a different person
from the first.

**Repeat asks say something new.** `replies` is the cycle `ConversationMemory`
walks, so pressing the same question twice is never the same answer twice, and
the greeting changes once they have met you.

### A note on the writing

All of it is original. None of it is transcribed from the television series,
and the named cast keep only their established occupations and relationships.
That constraint was already on this file and it still holds.

### Topic ids

The composed residents keep stable semantic ids — `work`, `places`, `history`,
`off-shift`, `cleaning` — rather than slugs of their own wording, because the
memory is keyed on them and rephrasing a question should not silently forget
that the player already asked it. The named cast derive ids from their labels,
which are unique within a person and never reused across people.

## The panel

It is a typeset card now rather than a box of boxes:

- The person's name is the loudest thing on it; the role sits above it in
  letterspaced caps.
- What they said gets room, a serif face and a rule of its own — marked as
  speech instead of trapped in another rectangle.
- Questions are quiet rows separated by hairlines, so five of them read as a
  list you can scan. A row with more behind it shows a chevron.
- Asked-but-not-showing rows dim, so you can see your way through a long
  conversation without losing track of where you have been.
- The footer is one band: the key hints on the left, *Step away* on the right,
  instead of a hint floating above a full-width slab.
- A lit filament along the top edge — the one warm thing on the card.

`0` goes back up a level, `1`–`9` ask, `E`/`Esc` step away. The panel still
does not pause the silo: the world runs behind it, the person turns to face
you and the camera settles on them.

## The bug this turned up

`pick()` indexed its pools with `list[n % list.length]` where `n` came from a
hashed id shifted with `>>`. That is a *signed* shift, so any hash above 2³¹
came back negative, and a negative modulo indexed off the front of the array
and returned `undefined` — which is how a resident ended up saying "Mostly
undefined." It is wrapped properly now, and the existing content test that
catches `undefined` in any line is what found it.

## Checks

`npm test` — 180 passing. The conversation contract was updated rather than
preserved: asserting that every resident has exactly five topics was asserting
the fault. It now asserts a sane range with unique ids, that every line of
every follow-up is real text, that every person has at least one follow-up,
and — the new one — that no two named residents are handed the same set of
questions.
