# Steady artificial lighting

The lighting pass fixes brightness drops when walking between floors and rooms.
It preserves the existing world, characters, missions, controls and renderer.

## What changed

- Structural fixtures on the current floor and both neighbouring floors stay
  available across a stair flight. Crossing the rounded floor counter no longer
  retires the entire light pool.
- The existing caged lamps on the stair spine now illuminate the stairs.
  Gallery sources match the wall fittings. Actual room lights replace the
  duplicate generic wing lights that were over-lighting some rooms.
- The pool still contains eight PointLights: six selected sources and two
  slots for overlapping handovers. A retiring source reaches zero before it
  moves. Zero-intensity slots remain visible to the renderer, keeping Three.js's
  light-count shader signature constant during ordinary movement.
- All six wings are considered by physical distance. Player bearing no longer
  removes a whole wing's fixtures; the top-floor cafeteria no longer excludes
  the other top-floor rooms or stair lighting.
- Room light influence blends with continuous height, separating stacked rooms
  without switching at a numbered-floor boundary. Department haze also blends
  over several flights. The night schedule eases fixture output and warmth.
- The single fixture-mounted shadow light contributes a restrained part of
  the illumination instead of duplicating a room's full light output. It still
  moves only while dark. Existing contact shadows and quality budgets remain.
- Long-distance directory travel starts with destination lighting. Entering an
  underground space clears the old pool and shadow intensity. The repaired
  optional work lamp shares the pool instead of introducing another shader light.
- Fixture positions and room transforms are cached. There are no new sun,
  player-following fill or interior sky lights. Direct sunlight remains exclusive
  to the physical exterior; the cafeteria feed retains its separate scene.

## Checks

`tests/interior-lighting.test.mjs` covers running up and down three real stair
flights, room entrances, fixed source positions, top-floor coverage, fast travel,
underground/exterior transitions, haze continuity and the repaired work lamp.
Existing night-cycle, shared-tone, shadow-position and story tests remain intact.

Run `node scripts/measure-lighting.mjs` to repeat the two deterministic routes.
The script measures local incident-light continuity using the shipped point-light
attenuation. It is a lighting proxy, not a screenshot, final pixel luminance,
shadowed irradiance or a device frame-rate measurement.

| Route measurement | Previous main (853a0c4) | This pass |
| --- | ---: | ---: |
| Worst consecutive-frame change, stairs | 35.79% | 0.82% |
| Frames with all local lamps below intensity 1, stairs | 39 | 0 |
| Point-light visibility-count changes, stairs | 36 | 0 |
| Worst consecutive-frame change, room entrance and return | 1.07% | 0.50% |
| Point-light visibility-count changes, room route | 12 | 0 |

Both routes sample 1,200 frames at 60 Hz. The stair route crosses three floor
boundaries. Regression tests additionally traverse the stairs in both directions
at twice that pace. Day/night balance remains deliberately shallow and all
ordinary interior fittings retain the same warm-neutral base colour.

The available managed browser has been unable to create a WebGL context.
Final in-game visual judgement and Android GPU frame rate still need a device
playtest; the numerical checks do not establish those results.
