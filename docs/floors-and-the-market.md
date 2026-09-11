# The stutter on the stairs, and the empty market

Two complaints. Walking down to another floor drops frames as the lights come
on, and the bazaar does not feel like anywhere.

## 1. The floor you walk into

### What it cost

A level is six rooms, a set of double doors, a level plate, the wing signs and
whatever the floor is dressed with. Measured cold, with no renderer involved at
all:

| | |
|---|---|
| one room, median | 2.6 ms |
| the slowest room (`workshop`) | 7.7 ms |
| a typical six-wing level | **23 ms** |
| the top floor on its own | 45.6 ms |

`world.update` called `setLevel` the instant `levelAt(position.y)` changed, and
`setLevel` built the level and both its neighbours **synchronously, in that one
frame**. At sixty frames a second the whole budget is 16.7 ms. So crossing a
floor cost two or three dropped frames, every flight, and the room lights
appeared to stutter on because the frame they appeared in was three frames long.

None of the rest of it was the problem, and it is worth writing down what was
checked and cleared:

| | |
|---|---|
| `world.update`, standing still | 0.05 ms/frame |
| `world.update`, walking the gallery ring | 0.03 ms/frame |
| the whole light rig | 0.02 ms/frame |
| `population.update`, 48 residents | 0.6–1.1 ms/frame |
| the bookkeeping in `setLevel` with nothing to build | 4.3 ms |

### What it does now

The work is not the problem; doing all of it at once is. `buildLevel` is a
generator that yields between wings, so a level can be built a piece at a time:

- `loadLevel(level)` drains it in one go — for the floor you are standing on,
  and for a lift to somewhere else, where there is no alternative.
- `queueLevel(level)` puts it on a queue instead.
- `buildAhead(ms)` is called once a frame with whatever time the frame can
  spare and steps the queue until the budget runs out.

`setLevel` now builds only the floor you are actually on, and queues its two
neighbours **in the direction you are travelling** — walking down, the floor
below is finished before the one above. Nothing joins the scene until the last
step, so a half-built floor is never visible; when one finishes it rejoins the
door and interaction lists immediately, because the player could reach it.

The pump runs after the picture is drawn, and skips a frame that was already
late: the work is not urgent, which is the entire point of moving it.

```js
world.buildAhead(dt<.024?4:0);
```

### What it measures

Descending ten floors at stair pace, 900 frames, the frame loop running
throughout. Seven runs of each, medians across the runs — a single run of this
is not worth reporting, and the first version of this table said 31.7 → 11.6 ms
on the strength of one, which was mostly scheduler noise:

| | frames over 16.7 ms | 99th percentile | worst |
|---|---|---|---|
| before | 7 | 15.8 ms | 37 ms |
| **after** | **0** | **6.5 ms** | 13 ms |

The count of frames over budget is the number that matters and it is the
steadiest: 10, 7, 9, 4, 6, 5, 9 before against 0, 0, 0, 2, 1, 0, 0 after. The
worst frame is the least stable of the three — one of the seven "after" runs
threw a 44 ms outlier that had nothing to do with the silo — so it is quoted
last and should not be read too closely.

The median frame is unchanged at 0.04 ms. This moved work; it did not remove
any.

One smaller thing found on the way: the room-visibility loop made a fresh
`Vector3` for each of eighteen rooms every frame, and the key light made
another. A few hundred throwaway objects a second is the kind of litter a
browser eventually stops to sweep up, and that sweep is a dropped frame with no
visible cause. They are scratch vectors now.

## 2. The market

The bazaar is a street with six shops off it. What it had was this:

```js
if(level===100)for(let i=0;i<16;i++)add(roomPoint(level,0,(i%4-1.5)*3,5+Math.floor(i/4)*4),
  {kind:'bazaar',activity:i%3?'talk':'work',wing:0});
```

Sixteen people in a four-by-four grid, none of them given anywhere to go.
Simulated for two and a half minutes: **seventeen of the eighteen people on
that level moved zero metres.** Every other floor in the silo has routines —
porters calling at wing doors, residents at the well rail — and the busiest
room in the building had none.

### What is there now

Every position was checked against the level's own colliders rather than
guessed. The shops open off the street through a portal at `x = ±3.3` and the
counters stand against the back wall, so a route into a stall has to go through
the doorway and stop in front of the counter:

```
bazaar wing 0, local x across (-10 .. 10), z down
 3 #......#.....#......#     shop   street   shop
 4 #...................#     the doorways
 5 #...................#
 6 ######.#.....#.######     the counters
```

- **Six traders**, one to a shop. At the counter, then along it to the shelves
  at the end, then back to the front to talk to whoever is there. They keep the
  stall rather than tour the silo, which is what a trader does.
- **Eight shoppers**, each visiting three stalls in a different order so the
  street is never a queue of people going the same way. Into the shop, stand at
  the counter to be served for eight to twelve seconds, back out, on to the
  next.
- **Four people passing through**, because a street is also the way to
  somewhere else.

The generic pair of static residents every wing gets is skipped for the bazaar
now, the way it already was for the cafeteria: they would only have added two
more people standing on one spot in the middle of the busiest room in the silo.

### What it measures

The same two and a half minutes:

| | people | median distance walked | never moved |
|---|---|---|---|
| before | 18 | 0.0 m | 17 |
| traders | 6 | 32 m | 0 |
| shoppers | 8 | 116 m | 0 |
| passing through | 4 | 152 m | 0 |

All 44 records and all 239 stops on the level survive the collider validation
`Population.load` puts them through, so nobody is standing inside a counter and
no stop is unreachable.

## Checks

`npm test` — 206 passing, eight of them new in
`tests/streaming-and-market.test.mjs`, and each group was run against the
unmodified source first:

- *arriving on a floor builds that floor and only queues its neighbours* —
  fails with "level 59 was built during the transition instead of queued"
- *a half-built floor is in neither the world nor the scene*
- *the queue finishes a floor, and it comes out the same as building it
  outright* — same room, door and interaction counts either way
- *walking down a flight builds nothing in the frame you cross in* — counts
  calls to `buildLevel` across the transition and requires zero
- *a budget of nothing does nothing, and the queue is dropped when you walk
  away from it*
- *everyone in the bazaar has somewhere to be* — every market person has at
  least three stops spread over more than a metre
- *every stall, and every route into one, is somewhere a body can actually
  stand* — no record or stop is dropped by the colliders, and no trader is
  standing in the street
- *nobody in the bazaar spends the day standing on one spot* — forty seconds of
  the real population loop, and every market person has to have moved

None of the frame timings are asserted in the test suite. Wall-clock
assertions are flaky on a shared machine, so the tests assert the structural
property that produces the timing — that nothing is built in the frame the
floor is crossed in — and the milliseconds above are measured separately.
