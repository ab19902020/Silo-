# Atmosphere — the clock, the noises, and the look

Three systems, built to answer one request: make it feel like being inside the
silo rather than inside a model of it. They are deliberately separate — a clock,
a sound director and a grade — and they meet only through data.

## 1. The silo keeps time

`dist/src/silo-time.js`

Nothing in the show is lit like an office at three in the afternoon all day
long, and the silo was. The clock fixes that, and the important part is not
that it exists but that **it is the only thing that knows what hour it is.**
Lighting, crowd, ambience and the sky all read one schedule, so no part of the
silo can be at a different hour from another. A lamp cannot be on the night
cycle while the cafeteria screen shows noon.

The schedule is six curves interpolated around a keyframed day:

| curve | what reads it |
|---|---|
| `lamp` | interior fixture brightness and the ambient fill |
| `warmth` | how far those fixtures run down towards a warm filament |
| `crowd` | how many residents the population keeps alive |
| `meal` | seating pressure at the three meals |
| `bustle` | how often the silo makes a noise you did not make |
| `daylight` | the sky, and so the great screen |

Keyframes rather than formulae because the shape matters: three sharp meal
peaks with empty stretches between them, a fast lamp ramp at 0600 and a slow
one down from 2100, and a working day that is cold-white in the middle and
amber at both ends. A test sweeps the whole day at hundredths of an hour and
asserts every curve stays inside 0–1 and never jumps, including across
midnight — the lamps have to fade, not step.

### Bells

Three shift bells, at 0600, 1400 and 2200. `SiloClock.update` returns the bells
**crossed by that step** rather than testing for equality against a moment
every frame rate will miss. It also refuses to ring anything at all when a step
covers more than a day, so a tab left in the background does not come back and
ring thirty. The test runs a full day at four frame rates from 60fps to one
frame every eleven seconds and asserts the same three bells in the same order
each time.

The clock stops during the cleaning. Ninety seconds of Holston crossing the
hill should not also be ninety seconds of the sun moving behind him.

### What it actually changes

- **Fixtures.** `world.lampScale` and `world.lampWarmth` come off the schedule
  once a frame and everything downstream uses them. The tint is re-applied
  every frame rather than when a lamp is placed, so a fixture lit at noon and
  still burning at midnight goes amber *where it stands* instead of waiting to
  be relocated before it notices the hour. The ambient fill drops with the
  lamps: dimming fixtures without dimming the fill just looks underexposed.
- **Crowd.** The population limit scales with `crowd`, floored at six — there is
  always somebody on shift. Named residents already sort first, so the story
  cannot be locked out by the night cycle emptying a gallery.
- **The view out.** The sky follows `daylight` instead of a second sun on a
  timer of its own, and *Follow the silo clock* is the default for the outside
  view. The cafeteria screen shows the hour the room is living in.
- **Nothing, if there is no clock.** With `world.schedule` null there is no tint
  and no dimming. An unscheduled silo is exactly the silo the rest of the
  repository's tests already assert, which is why none of them had to change.

## 2. Something to listen to

`dist/src/ambient-events.js`

What was here was a blind timer: every eleven to twenty-six seconds it picked
one of four sounds from the ambience bed's family. It did not know the floor,
the hour, or that ten thousand people live above and below you — so a landing
at three in the morning sounded like the bazaar at noon.

The director decides now. It is pure scheduling and returns descriptors;
`audio.js` renders them, which is what keeps it testable. Twelve sounds
weighted per place, and three gates that matter more than the weights:

- **nobody is up.** Below a `bustle` of 0.3 only the nocturnal sounds survive —
  the shaft settling, water, steel taking up load, a door. Nobody drops a
  spanner at three in the morning.
- **nobody is there.** Coughs and chairs need a `crowd` above 0.22, so an empty
  cafeteria is an empty cafeteria.
- **never twice.** A repeated id is weighted down to a quarter. Two identical
  clanks in a row read as a loop, and one loop undoes a hundred good ones.

### The stairwell

The one place the silo is genuinely audible, and it gets its own table. Runs of
three to eight feet on a steel flight, one to four floors off, panned, losing
their top end and their level with distance, with a gain envelope over the run
so somebody crosses a landing and keeps going rather than simply stopping. Off
the stairs you do not hear them at all.

### The public address, and what this build will not do

The tannoy is a two-note chime, the carrier opening, a cadence, and the key let
go. **It has no words in it.** There is no synthesised dialogue and no cloned
voice anywhere in this system — the cadence is a band around the vowel
formants opening and closing at speech rate, which is what actually survives
two hundred metres of concrete. The same rule is why "an argument behind a
door" is rendered as a door and footsteps.

## 3. The look

`dist/src/rendering.js`

The cheapest thing in the game per unit of effect: it touches no geometry and
changes every frame everywhere. It extends the existing composition pass rather
than adding another one, so the cost is a longer shader, not a longer pipeline.

- **Halation.** A real lens does not stop a bright practical at the edge of the
  fixture; it spreads, and it spreads warm. Twelve taps at a radius scaled to
  the frame rather than the pixel count, so a phone and a monitor bleed by the
  same amount of picture.
- **The grade.** Cold concrete in the shadows, tungsten in the highlights;
  colour taken out overall and a little put back into whatever is actually
  bright, so the practicals stay amber while the concrete goes grey.
- **Contrast** about a mid grey, as a power curve. This buffer is still linear
  and a lamp in it is not 1.0 — doing the contrast with a smoothstep drives
  every highlight negative. There is a real toe under it, because the dark has
  to be allowed to go dark or none of the rest reads.
- **Grain** in the shadows, where film has it, and never on the battery setting
  where it would cost a phone detail it cannot spare.

### The eye

Auto-exposure, entirely on the GPU: the frame is reduced to 32×32, then to a
single pixel with sixty-four taps, and damped against the previous frame's
single pixel through a ping-pong pair. Nothing is ever read back, so the
pipeline never stalls waiting for the frame it just drew.

Luminance is stored as log2 remapped into 0–1 over twenty-four stops, which
means byte targets carry it to about a tenth of a stop and the whole chain
works on hardware with no float render targets at all. Damping is done in log
space, where a stop is a stop.

It is clamped to roughly half a stop in each direction on purpose. This is
somebody stepping off a lit gallery into the shaft and letting their eyes go —
not a camera hunting a new exposure every time you turn your head.

## Checks

`node --test tests/atmosphere.test.mjs` — 13 cases. The schedule as a closed
continuous loop; the four-digit clock; bells at four frame rates and across
midnight; a stopped clock and a multi-day step; six forged saves; the
director's vocabulary, its night, its empty rooms and its stairwell; and two
that run the real `SiloWorld` and `Population` to prove the fixtures and the
crowd follow the hour, rather than the modules merely agreeing with themselves.

The look is checked by rendering it: the same room at noon, evening and two in
the morning, with the console watched for shader compilation, because a shader
that fails to compile fails quietly.
