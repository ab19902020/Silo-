# Claude Opus 4.8 work package 2 — George's computer

You are working alongside Codex on branch `codex/mystery-expansion` of
`ab19902020/Silo-`. Read `README.md`, `WORLD.md`, `dist/src/story.js`,
`dist/src/main.js`, `dist/index.html`, `dist/style.css`, and
`tests/story.test.mjs` before editing.

## Goal

Build the real interactive discovery at George Wilkins' home: the player
inserts Hard Drive 18, initially sees an ordinary/empty file view, deliberately
searches for `library`, and then uncovers hidden files including the gas-pipe
blueprint. It must feel like an old silo terminal, not a modern web search page.

## File ownership

Create and own only:

- `dist/src/george-terminal.js`
- `tests/george-terminal.test.mjs`
- `docs/george-terminal.md`

Do not edit `main.js`, `story.js`, `world.js`, `rooms.js`, HTML/CSS,
`.openai/hosting.json`, or existing tests. Codex will integrate the controller
and render its returned view model into the existing dialog system. Do not
invoke Sites tooling, publish, deploy, or alter Git remotes.

## Export contract

Export a DOM-free `GeorgeTerminal` class with these operations:

```js
insertDrive(hasHardDrive)
ejectDrive()
boot()
list(path = '/')
search(query)
open(path)
save()
static load(saved)
get view()
```

`view` returns serialisable data only: terminal state, title, breadcrumb,
rows, status line, search availability, and optional blueprint data. Do not
import Three.js and do not touch the DOM.

## Required behaviour

- Without the hard drive, booting produces a believable missing-storage state.
- Inserting the drive does not reveal the secret or auto-advance anything.
- The initial mounted view looks mundane and contains no visible `library`
  directory.
- Search is an intentional player action. It is case-insensitive and trims
  whitespace. Only a search that includes `library` reveals the concealed
  result.
- Opening that result exposes a compact set of hidden files. One is a gas-line
  schematic represented as structured data: title, source-status,
  components, route clues, required tools, and warnings. It must distinguish
  what the television/books establish from the game's plausible reconstruction.
- Include no exact claim about a canon gas-pipe location unless supported by a
  cited source in `docs/george-terminal.md`. Game-invented placement must say
  `Reconstructed for this game` in player-visible data.
- State persists across save/load without allowing a crafted save to skip the
  required insertion → boot → search → open sequence.
- Explore mode integration will be handled by Codex; keep the class neutral.

## Tone and constraints

Use terse CRT-era system copy, no exposition dumps, no quest marker language,
and no verbatim television dialogue. The discovery should reward curiosity.

## Tests and handoff

Test the full state machine, empty state, failed searches, case-insensitive
success, blueprint provenance, and save/load validation. Run `npm test` and
`npm run validate`. Commit only your owned files, then report the commit SHA
and integration notes. Do not merge to `main`.

