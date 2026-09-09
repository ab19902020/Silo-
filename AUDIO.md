> Reference update: audio files and playback behavior are unchanged. The cleaner now emerges for 0–8 s, circles the ramp for 8–18 s, cleans for 18–27 s and turns for 27–30 s. The hill walk, helmet removal, crawl and rest retain their 30/60/68/80/90 s boundaries. See [the current route notes](docs/reference-update.md).

> Sound-effects rewrite, 9 September 2026: the footsteps, impacts and shaft
> reverb described below have been rebuilt from the ground up. **The soundtrack,
> the opening piece and the opening scene are untouched.** See
> [the rewrite notes](#the-tap-dancer--9-september-2026) at the top of this file.

# The tap dancer — 9 September 2026

Walking sounded like tap shoes. It was one wrong term in one line of arithmetic,
and it had cost the silo every footstep in it.

## What was actually wrong

Measured through Chromium, a boot on concrete in the old build was:

| | old build | a boot on concrete |
| --- | --- | --- |
| decay to -20 dB | **5 ms** | 60-120 ms |
| spectral centroid | **10,364 Hz** | 400-900 Hz |
| energy below 120 Hz | **1 %** | 20-35 % |
| energy above 5 kHz | **83 %** | under 5 % |
| crest factor | **41** | 10-15 |

Five milliseconds of almost pure treble. That is not a footstep; that is a
castanet.

The cause was `b0 = Math.sin(w) * (1 - r)` in the resonator. `(1 - r)` is a
mode's bandwidth: 4e-4 for a 95 Hz mode that rings for 48 ms against 4e-3 for a
3.1 kHz mode that rings for 5. So every low mode came out three hundred times
too quiet, and **every material in the game collapsed into its top two octaves
regardless of what its table said.** The tables were right all along. They were
never audible.

Four more faults were underneath it:

- **No sole and no body.** 46 % of the output was raw noise burst passed
  through un-resonated. Nothing modelled the shoe, and nothing modelled the
  eighty kilos arriving behind it.
- **The second contact was a tap.** The forefoot landed 48-86 ms after the heel
  at a third of full level and *pitched up*. A sole flattening is duller than
  the edge that struck; pitching it up is literally a heel-toe tap figure.
- **Variation was pitch only.** Four takes played at different playback rates
  share one spectrum, and the ear hears the repeat.
- **The stairs were concrete.** The great stairway is open steel and runs
  through every level in the silo.

## What it is now

`b0 = sqrt(1 - r^2) / 2` with a `(1 - z^-2)` numerator, which is the fix and
one more besides: the old resonator was an all-pole *lowpass*, so it passed DC.
A 180 Hz mode damped over 28 ms has a DC gain of about 1.6, and the strike pulse
is full of DC, so a broad sub-300 Hz lump sat under every impact — cloth
measured 56 % of its energy below 120 Hz with no mode anywhere near there. The
zeros at DC and Nyquist are what a real mode has, and they take the lump away.
The `sqrt(1 - r^2)` term equalises **energy** rather than peak height, so a gain
in the table means what it says whether the mode rings for 75 ms or 5.

Each impact is now three things arriving together:

| field | what it is |
| --- | --- |
| `bright`, `burst`, `shape` | **the sole.** A boot is a lossy spring, so the strike is a few ms of shaped push rather than a click. |
| `body` | **the mass.** One low half-cycle with a fast attack — what you feel as much as hear, and what was missing entirely. |
| `modes` | **the floor and the room.** `[frequency Hz, decay s, gain]`. |
| `direct` | the contact patch radiating on its own, high-passed because a small radiator is poor at low frequencies. |
| `grains` | loose material scattered off the surface, added *after* the sole so it keeps the top octaves the sole takes out of the strike. |
| `send` | how much of it goes to the shaft reverb. Open grating throws far more into the well than a carpeted residential floor; a fixed send made every surface sound like the same room. |

**The strike is a force pulse, not a noise burst.** A 3-8 ms burst of noise is a
random comb filter: across six renders of concrete the share of energy between
2 and 5 kHz swung from 7 % to 50 %, so one step landed dull and the next one
ticked. A decaying exponential over the contact time is what actually happens
when a heel meets a floor, its spectrum has no nulls, and jittering its length
varies brightness smoothly. Worst-case take-to-take band spread went from 57
points to 17.

Six takes of each impact, and each hit also gets its own **tilt** — a low-pass
corner that moves per hit. Pitching a sample keeps its spectral shape, so pitch
variation alone still repeats audibly; moving the corner changes which modes
survive.

`level` in `FOOTFALL` now means **loudness, not peak height**. Every take is
normalised to peak 1 for headroom, but a sharp transient with no tail (a rug)
carries far less energy at that peak than something that rings (a steel deck) —
measured, 6 dB at the same gain. Each bank carries a `trim` that brings it to a
common RMS, clamped to [0.4, 2.2] so a peaky material (struck glass measures a
crest factor of 76) cannot drive the limiter on one hit.

## Measured, after

A walk on concrete through the real graph:

| | before | after |
| --- | --- | --- |
| decay to -20 dB | 5 ms | **110 ms** |
| centroid | 10,364 Hz | **878 Hz** |
| below 120 Hz | 1 % | **22 %** |
| above 5 kHz | 83 % | **0 %** |
| crest factor | 41 | **11** |

Level is up about 5 dB on the old build; a run is 6 dB above a walk. Per-surface
RMS runs from a covered floor at the quiet end to open grating at the loud, in
that order, with grating ringing for 245 ms against concrete's 110.

## The shaft reverb was a hiss

The impulse response used a single one-pole at roughly 2.3 kHz and measured
**60 % of its energy above 2 kHz**. That is tape hiss, not a hundred and forty
levels of concrete, and against the new darker impacts it was most of what you
heard. It is now two poles at about 800 Hz with the corner closing further as
the tail decays, because air and concrete both absorb the top end faster than
the bottom. Level is matched to the old tail by RMS, so the per-location `space`
values still mean what they did.

## New materials

`grating` (steel stair treads), `soil`, `wet`, and for pickups `paper`, `cloth`,
`glass`, `plastic`, `timber`.

## Picking things up

The old build played **one interface click for every relic in the silo**.
`audio.pickup(kind)` is now four things close together: fingers finding the
edge, the object answering with its own material, the sleeve moving behind
both, and — for anything with weight — it settling into the hand. `audio.drop`
is the same object without the sleeve, plus a rock and settle.

Each collectable in `story.js` carries a `sound` field naming its material, so
adding a relic means adding one word. Unknown kinds fall back to `relic`.

## The stairs

`audio.setSurface('grating')` overrides the room's floor while the player is on
the central staircase; `setSurface(null)` hands it back. One line in
`updateHUD`, keyed off the radius that already decides the location name.

## What I did not touch

- `silo-18-theme.mp3`, `silo-18-opening.mp3`, and every function that handles
  them.
- `opening.js` and the opening scene.
- The directory-book pickup in `main.js` still calls `audio.click()`. It is the
  one pickup in the game that is part of the opening, so I left it alone —
  changing it to `audio.pickup('book')` is a one-line edit if you want it.

## Tools

The tuning harness lives outside the repo (it was scratch), but the method is
worth repeating if you touch the tables: render each material offline, measure
band energy with a **full-length FFT** — a log-spaced probe sweep cannot see a
high-Q mode, and two sweeps with different step sizes disagreed by a factor of
twenty on the same buffer — then fit the mode gains to a target band balance,
correcting the target against what the real renderer produces, because the modes
share one excitation and interfere rather than summing as independent powers.

# Two music files now, and the opening is cut to one of them — 8 September 2026

`dist/assets/audio/` holds two tracks and they have different jobs.

| File | Job |
| --- | --- |
| `silo-18-theme.mp3` | The **bed**. Ten minute seamless loop, no speech. Plays everywhere in the silo, forever. |
| `silo-18-opening.mp3` | The **opening piece**. Ten and a half minutes that start with the cleaning speech and turn into the score. Plays **once**, from the top, on the frame the directory book is picked up. When it ends the bed takes over and loops from there on. |

They are mastered to -14.7 and -14.8 LUFS, within 0.1 LU, so the hand-over is
not a step in level. **There is a test that keeps them there** — if you replace
either file, match the other or the test fails and tells you by how much.

## The API

```
holdMusic()            keep the bed silent; safe before start()
playOpeningTheme()     start the opening piece from the top; the bed waits
stopOpeningTheme()     stop it and rewind (used when the opening is replayed)
releaseMusic()         start the bed — a no-op while the piece is still running
setStoryPaused(bool)   hold the piece with the scene
stopMusic()            stop the bed's source
```

`main.js` calls `syncMusicGate()` from `openingChanged()` and `begin()`: held
while the state is `find-book`, released otherwise. The book pickup calls
`playOpeningTheme()` **before** `takeBook()`, because `takeBook()` fires
`openingChanged` and a gate that still read "held" there would start the bed
for one frame.

## Why the piece streams and the bed does not

The bed is decoded into an `AudioBuffer` because it needs a sample-accurate
loop point. The piece is a one-shot, so it does not — and streaming it through
a media element buys three things: it starts on the frame it is asked to
instead of after a ten minute decode (which matters, because the scene is cut
against it), it costs no memory where a decode would cost about 230 MB, and the
download is progressive.

The catch, and the reason `setStoryPaused` exists: **a media element does not
stop when the AudioContext is suspended**, the way a buffer source does. The
scene stops advancing when the game is paused or the tab is hidden, so the
element has to be paused with it or the two drift apart. `frame()` does that in
one line.

## The cut

Measured off `silo-18-opening.mp3`, not guessed — a 2 s-window RMS envelope and
a per-2 s crest factor, which is what separates speech from score:

```
0:00-0:54   spoken word          crest 5-11
0:56-       score established    crest 3-4
1:19        the loudest bar in the file
1:27-1:29   a second swell
```

Against the beats in `opening.js` (0-12 emerge, 12-26 clean, 26-30 turn, 30-60
walk, 60-68 helmet, 68-80 crawl, 80-90 rest): the climb out of the hatch, the
clean and the long walk up the hill all play under the speech; the score
arrives as he reaches the tree and the helmet comes off; the peak lands as he
drags himself the last few metres to her; the swell is on him going still.
**Retime one and you have to retime the other.**

## Verified in Chromium

Not just in the stub: silence on the music bus with the ambience muted while
the book is still on the table, signal on it six seconds into the speech, the
pause holding position to the millisecond, and the hand-over firing on `ended`.

---

# The soundtrack is now held for the opening — 8 September 2026

`SiloAudio` gained four methods and nothing else in the mix changed.

```
holdMusic()                  keep the theme silent; safe before start()
startMusicAt(offset, fade)   start or restart `offset` seconds into the loop
releaseMusic()               start from the top, if it was held
stopMusic()                  stop the source; a later startMusicAt restarts it
```

`main.js` calls `syncMusicGate()` from `openingChanged()` and `begin()`: the
theme is held while the opening state is `find-book`, so **the cafeteria is
silent until you pick up the directory book**, and released for anyone who
skips the opening or has already seen it. The pickup itself calls
`startMusicAt(MUSIC_CUE, 2.5)`.

`MUSIC_CUE` lives in `opening.js` and is 17. The reason is measured, not
guessed: the ten minute master is five passes of a two minute cycle, and a
2 s-window RMS envelope of the file puts its loudest bar at 0:85 and its
quietest at 0:80. Cueing at 0:17 therefore lands the swell on the moment
Holston walks into shot, the silence under the helmet coming off at scene
t=63, and the peak on t=68 — three seconds into the fall. **The cue and the
scene beats are one decision; changing either alone breaks the cut.**

If the decode has not finished when the book is picked up, `startOffset()` adds
the wait to the cue point, so a slow decode delays the music rather than
sliding it out of step. The media-element fallback seeks the same way.

---

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

### Impacts are modelled, not drawn with oscillators

> **Superseded 9 September 2026.** The resonator arithmetic, the excitation, the
> take count, the material list and the measured figures in this section were
> all replaced by the rewrite at the top of this file. The description of *why*
> modal synthesis rather than oscillators still holds.

The first pass built every impact from oscillators: a sine with a falling
pitch for the body, one band-passed noise burst on top, a triangle for the ring
on steel. That is a kick drum, a hi-hat and a cowbell, and it sounded like one.

Impacts are now **modal synthesis**. A short excitation — a noise burst, plus
scattered grains where the surface is loose — is fed through a bank of damped
two-pole resonators, `y[n] = b0·x[n] + a1·y[n-1] + a2·y[n-2]`. The frequencies
and decay times of those modes *are* the material: that is what a struck solid
actually does. Each entry in `IMPACTS` is one such object. Four takes of each
are rendered into `AudioBuffer`s once at start-up and played back as samples
with per-hit pitch, level and pan variation — one sample retriggered is the
machine-gun footstep everyone recognises.

Measured through Chromium's own engine, the floors now separate the way they
should: concrete 112 ms of tail, steel grating 157 ms and ringing, rock 190 ms
and grit 182 ms of crunch, a covered floor 78 ms and dead. Consecutive steps
vary about 1.8× in level.

- **Footsteps** on five materials, chosen by location. A walk lands heel then
  toe 50–90 ms later; a run lands once and harder. Loose floors get a scuff as
  the boot leaves them. Cadence comes from the rig's own planted-foot contacts
  where a character is loaded, and falls back to `body.distanceWalked` — never
  frame time — otherwise.
- **Doors** (latch throwing, the leaf taking its weight, hinge drag, and the
  seating thunk and latch drop on close), the **airlock** (dogs releasing,
  pressure equalising, motor, and a second clunk at the end of travel), the
  **lens wipe**, a real sprung **torch** toggle and a mechanical interface
  click — all built from the same modelled impacts rather than beeps.
- **Ambience beds** per location: a detuned mains hum, ventilation room tone,
  wind, and an LFO-throbbed turbine that is only audible in the generator hall,
  Mechanical and the excavator.
- **Occasional life** every 11–26 s: plate-steel clanks, drips, structural
  creaks and wind gusts. Distant events are low-passed as well as quiet —
  distance takes the top off a sound long before it takes the level. The drip
  sweeps **up** in pitch, because the cavity a drop makes in water shrinks as
  it closes; sweeping it down is the usual mistake and was in the first pass.
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
- Adding a material means adding an entry to `IMPACTS` and, for a floor, to
  `FLOORS` and `FOOTFALL`. Decay times are what carry the identity: a covered
  floor must damp its low mode *faster* than bare concrete, not slower. The
  first pass had that backwards and a rug rang like a slab; there is a test for
  it now.
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
