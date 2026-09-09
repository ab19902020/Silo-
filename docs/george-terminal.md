# George's computer — work package 2

`dist/src/george-terminal.js`, `tests/george-terminal.test.mjs`. Built to the
contract in `docs/CLAUDE_AGENT_2_GEORGE_TERMINAL.md`. No other file is touched:
the class is DOM-free and renderer-free, and Codex owns the integration into
the dialog system and the Explore-mode behaviour.

## What it is

A state machine for one interaction: the player puts Hard Drive 18 into
George Wilkins' terminal, sees an ordinary mechanic's drive, decides on their
own to go looking, searches for `library`, and finds what he died for.

The design rests on one rule — **the machine has to be willing to show you
nothing, and go on showing you nothing.** A concealed volume that hints at
itself is not concealed; it is a quest marker with a lock on it. So:

- The mounted listing is work orders, shift logs, parts counts and a volume
  note. Nothing is greyed out, nothing is padlocked, no entry is named
  suggestively and no status line hints at more.
- `/LIBRARY` is in the root's children the whole time and is filtered out of
  every listing until it is asked for, so finding it puts it where it always
  was rather than conjuring a directory into existence.
- `open('/LIBRARY')` is refused before the search. Typing the path is not the
  same act as deciding the drive is hiding something, and the shortcut is the
  thing this machine exists to refuse.

Three of the mundane files carry a little of George in them without saying
anything — an order closed `NO FAULT FOUND` with `— WALKED IT TWICE.` under
the signature, a short list asking Supply for copper line *again*. None of them
is a hint. They are there because a drive with nothing of its owner on it is
not a drive, it is a puzzle box.

## The state machine

```
off ──insertDrive(true)──▶ off ──boot()──▶ mounted ──search(…library…)──▶ revealed
 │                                │                                          │
 └──boot() without a drive────────┴──▶ no-media                    open('/LIBRARY')
                                                                              │
                                                                          reading
```

`view` is the whole output: `state`, `title`, `breadcrumb`, `rows`, `body`,
`status`, `canSearch`, `query`, `driveInserted`, and `blueprint` — serialisable
data only, checked by a JSON round trip in the tests.

Search is a substring test on a trimmed, case-folded query, so `LIBRARY`,
`  Library  ` and `the library` all work and `librar`, `books`, `schematic` and
`gas` do not.

## Save integrity

A save is player-editable text, so `load` treats it as a claim rather than as
state. Each step is restored only if every step before it was restored too:

```js
t.drive  = saved.drive === true;
t.booted = t.drive  && saved.booted === true;
t.found  = t.booted && saved.found  === true;
t.opened = t.found  && saved.opened === true;
```

`path` and `file` are then validated against the tree and against
`blocked()`, and a file is only restored if it is a real file in the directory
the save also claims to be in. A save asserting `{found:true, opened:true,
file:'/LIBRARY/SCHEMATIC.GAS'}` with no drive gets an empty terminal. The
forged-save cases are in the tests.

Ejecting resets everything. The drive leaves with what is on it.

## Provenance — the part that matters

**This build makes no claim about where a gas line runs in the television silo
or in the books.** The work package is explicit that no exact canon location
may be asserted without a cited source, and I did not have one: nothing in the
material this reconstruction is built from — the sources listed in
`dist/src/data.js` and gathered in `docs/visual-reference-sources.json` —
establishes a gas-line route, a level, a junction or a dimension in Silo 18.

So the schematic asserts none of those things as canon. `BLUEPRINT.sourceStatus`
is `Reconstructed for this game`; every entry in `components` carries the same
status individually; `reconstructed` lists what was invented, item by item;
and the third warning printed on the sheet the player reads says the sheet is
a reconstruction and every position on it is unverified. A test asserts all of
that, and asserts that no level or floor number appears anywhere in the
blueprint data.

What the sheet claims as established is one sentence, and it is a statement
about the premise rather than about geometry:

> That the silo holds systems its own people are not shown, and that they can
> be used against them, is the premise the source material establishes.

That is the thing the drive is dangerous for knowing, and it is the reason the
discovery lands without needing a canon pipe route to land on. If a sourced
location is later established, the honest change is to add the citation here
and move the affected rows from `reconstructed` to `established` — the data is
shaped so that is an edit to two arrays and a status string, not a rewrite.

The `established` / `reconstructed` split is in the data rather than only in
this file on purpose: the player reads the data and does not read this file.

## Integration notes for Codex

- `new GeorgeTerminal()` per playthrough; `GeorgeTerminal.load(saved)` to
  restore. `save()` returns a flat object suitable for `localStorage`.
- `insertDrive(story.has('harddrive'))` — the class does not know about
  `Story` and should not be told about it.
- The host draws `view`. `rows[].concealed` is true only for the unindexed
  match, if you want to style it differently; `rows[].kind` is `dir` or `file`.
- `view.blueprint` is non-null only while the schematic is the open file. It is
  the same frozen object every time, so it can be compared by identity.
- `back()` walks out: file → directory → parent.
- There is no `update()` and nothing is animated; the class allocates only on
  the calls above.
- Explore mode is not referenced anywhere in the module. If Explore should
  hand the player the drive for free, that is `insertDrive(true)` at the call
  site.

## Checks

`node --test tests/george-terminal.test.mjs` — 9 passing. Covered: the
serialisable, DOM-free contract; the missing-media state and that nothing can
be reached past it; that inserting reveals nothing; that the concealed volume
cannot be opened by name before it is searched for; case-insensitive and
trimmed search with five queries that work and ten that do not; the full
find → open → read path and walking back out; blueprint provenance; four
forged saves and six malformed ones; and an honest save round-tripping to an
identical view.

`npm test` and `npm run validate` run clean with the module in place.
