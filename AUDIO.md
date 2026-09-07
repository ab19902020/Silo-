# Audio — what changed, and what to leave alone

**Note for Astra (and anyone else working on this repo at the same time.)**
This pass added sound and *only* sound. It was deliberately kept away from the
world, physics, rooms, characters and rendering so it can land alongside
in-flight upgrades without a conflict.

## Files touched

| File | Change |
| --- | --- |
| `dist/src/audio.js` | Rewritten. The whole audio engine lives here. |
| `dist/src/main.js` | 6 small edits, listed below. Nothing else. |
| `dist/index.html` | One line: a **Music** slider added to the settings panel. |
| `dist/assets/audio/silo-18-theme.mp3` | New. The supplied soundtrack, re-encoded for the web. |
| `dist/assets/audio/manifest.json` | New. Provenance and encoding record. |
| `tests/audio.test.mjs` | New. 6 tests guarding the above. |
| `README.md` | A short **Sound** section; the credits line corrected. |
| `.nojekyll` | New, empty. Stops GitHub Pages running the build through Jekyll. |

**Not touched:** `world.js`, `physics.js`, `rooms.js`, `kit.js`, `data.js`,
`characters.js`, `surface.js`, `rendering.js`, `top-floor.js`, `bazaar.js`,
`underground.js`, `generator-hall.js`, `passages.js`, `materials.js`,
`workshop-details.js`, `style.css`, `docs/`, `scripts/`, the existing tests, or
any character, material or Lost Signal asset.

## The soundtrack

The supplied 24 MB / 320 kbps master is re-encoded to **8.1 MiB VBR ~113 kbps,
44.1 kHz stereo** (`libmp3lame -q:a 5`). Measured spectral error against the
master is 0.006 with the full 22 kHz bandwidth retained — it is a background
bed at roughly −21 dBFS RMS in the mix, so this is transparent. The 24 MB master
is not committed; its SHA-256 is recorded in `manifest.json` so it can be
matched again.

It plays **everywhere in the silo and never restarts**. It is fetched in the
background after `audio.start()`, decoded once into an `AudioBuffer`, and looped
on a single source node that nothing else in the game touches. Travelling
between levels, opening dialogs and pausing all leave it running; only the
**Sound** toggle and the **Music** slider change it.

The loop is genuinely gapless. The master runs at full level from its first
sample to its last, and its butt-join discontinuity (0.006) is *smaller* than
the largest neighbouring-sample delta in the material (0.023), so it rejoins
itself inaudibly. `audibleBounds()` additionally trims any decoder padding at
runtime before setting `loopStart` / `loopEnd`, because MP3 decoders differ on
whether they honour the LAME gapless header. Chromium honours it and trims
nothing; Safari may not, and is then covered.

**The one tradeoff worth knowing about.** Ten minutes of stereo decodes to a
**201.9 MB** `AudioBuffer` (measured, not estimated). That is what buys the
sample-accurate loop point, and it is fine next to this game's WebGL scene on a
desktop or a recent phone. If a device refuses the allocation — or the fetch
fails — `streamMusic()` falls back to a media element streaming the same file
at near-zero memory, accepting the browser's own seam once every ten minutes.
Both paths are verified in Chromium. If you ever want the memory back, the
honest fix is a shorter loop, not a lower bitrate.

## Everything else is synthesised

No other audio file is bundled. `audio.js` generates, at runtime:

- **Footsteps** on five materials — concrete, metal grating, rock, surface grit
  and soft floors — chosen by location. Each step is a pitch-dropping body
  thump plus a filtered noise impact, with a resonant clang added on steel.
  Pitch, gain and noise offset are randomised per step and the stereo image
  alternates left/right, so a corridor never sounds like a loop. Cadence is
  driven by `body.distanceWalked`, not by frame time, so it stays correct at
  any frame rate and lengthens the stride when running.
- **Doors** (latch, the leaf taking its weight, hinge scrape, seating thunk),
  the **airlock** (clunk, pressure equalising, door motor), the **lens wipe**
  (a stroked band-passed loop that runs for exactly as long as the cleaning
  does), the **torch** switch, the **travel** swell and the interface click.
- **Ambience beds** per location: a detuned mains hum, ventilation room tone,
  wind, and an LFO-throbbed turbine that is only audible in the generator hall,
  Mechanical and the excavator.
- **Occasional life** every 11–26 s: distant plate-steel clanks, drips,
  structural creaks, and wind gusts on the surface.
- A **2.1 s synthetic impulse response** giving the shaft its concrete tail.
  Footsteps and doors send to it; the soundtrack and the interface do not.

## Signal path

```
destination <- limiter <- master (LEVEL 2.2, or 0 when Sound is off)
                            <- musicBus  <- tone filter <- looping soundtrack
                            <- ambience (0.6) <- hum / air / wind / turbine
                            <- sfx      <- footsteps, doors, interface
                            <- spaceReturn <- convolver <- spaceSend
```

Measured by rendering through Chromium's real Web Audio engine (not a mock):

| | peak | RMS |
| --- | --- | --- |
| Soundtrack alone, settled | −9.7 dB | −20.7 dB |
| Room tone, ordinary level | −18.3 dB | −26.2 dB |
| Room tone, generator hall | −9.7 dB | −20.4 dB |
| Footsteps alone | −12.9 dB | — |
| Worst case, everything at once | −5.5 dB | −18.4 dB |
| Sound switched off | −86.7 dB | — |

Nothing clips; the limiter catches the rest.

## If you change something

- `main.js` calls only these: `start()`, `setEnabled(bool)`,
  `setMusicVolume(0..1)`, `setLocation(type)`, `step(distance, speed)`,
  `click()`, `door(open)`, `airlock()`, `torch(on)`, `travel()`,
  `scrubStart()`, `scrubStop()`. All are safe to call before the audio context
  exists — they no-op. A browser with no Web Audio at all is survivable too;
  there is a test for it.
- `setLocation()` takes a special-location id or a room type straight from
  `data.js`. **If you add a new room type, add it to `PLACES` in `audio.js`**,
  otherwise it quietly falls back to the standard interior.
- Never modulate a bus gain with an LFO connected directly to `.gain`. The
  modulation is *added* to the base value, so a bed at level 0 still leaks. The
  turbine and the lens wipe both have a dedicated stage inside the chain for
  this reason.
- `npm test` covers it. `tests/audio.test.mjs` runs against a recording stub,
  so it does not need a browser.

## The six edits in `main.js`

1. `saveSettings()` — persists `music`.
2. `updateSettings()` — applies the slider and updates its readout.
3. The settings restore loop — `'music'` added to the id list.
4. `travel()` — `audio.start(); audio.travel();` on departure.
5. `use()` — reformatted so each interaction gets its own sound instead of one
   shared click. The behaviour is otherwise identical.
6. `frame()` — the lens-wipe loop starts and stops with `surface.cleaning`.
   The existing "lens clean" notification still fires at the same moment.
