# The sheriff's range

A twenty-two metre room behind the sheriff's station on Level 1, with the
weapon collection from **Lost Signal** racked along both walls and four lanes
to fire them down.

A silo that hangs people for going outside keeps its firearms somewhere, and
its deputies have to qualify on them somewhere too. Nothing in the source
material describes such a room, so this is a placement rather than a claim —
the same footing as Holding 3 and the cleaning preparation room next door.

## Where it is

The station's back wall is split around a 2.6 m doorway, and the range runs
south from it:

```
                 z=44  ┌──────────────── cleaning preparation
                       │
       sheriff's       │  desks, cells, duty monitor
       station         │
                 z=24  ├──── doorway ────┐   <- the wall the range shares
                       │  FIRING LINE    │       with the station
                 z=20  │  ▏ ▏ ▏ ▏        │   4 benches, one per lane
                       │                 │
                 z=7.5 │  ▣ ▣ ▣ ▣        │   steel plates and paper
                       │                 │
                 z=3.2 │  ╲╲╲╲╲╲╲╲╲╲     │   sloped backstop over sand
                 z=2   └─────────────────┘
                      x=18            x=34
```

The shooter comes in behind the firing line and everything downrange points
away from the door. A test fails if that ordering is ever broken — targets
between the line and the door would mean the lanes were pointed back into the
sheriff's office.

## What is on the racks

Twenty-six weapons, every one of them usable:

| Family | Count |
| --- | --- |
| Assault rifles | 5 — service rifle, carbine, heavy rifle, bullpup, AKM |
| Shotguns | 5 — combat, riot, short-stock, sawed-off, Mossberg 590A1 |
| Sniper rifles | 4 — marksman, bolt-action, scout, anti-materiel |
| Submachine guns | 2 — compact, suppressed |
| Pistols | 5 — sidearm 9 mm, compact, service, heavy, Glock 19 |
| Revolvers | 3 — .357, snub, .44 |
| Blades | 2 — bayonet, combat knife |

Long guns are on the west wall, handguns and blades on the east. Taking one is
an interaction on its rack slot; the bench on the right racks whatever you are
carrying, and the ammunition bench on the left resupplies it.

## Controls

| | |
| --- | --- |
| Fire | Left mouse (pointer locked), `G`, or the FIRE button on touch |
| Reload | `R` |
| Aim | Hold `Shift` — tighter spread, less recoil, weapon comes up to the eye |
| Sling it | `H` |

The ammunition readout sits under the crosshair and turns red on an empty
magazine. It is hidden entirely when you are empty-handed.

## How it works

`dist/src/weapons.js` is the catalogue, ported whole from Lost Signal's
`src/weapons.js` — the recoil profiles, rates of fire, spreads, magazine sizes
and audio voices are the numbers already tuned there. Re-entering twenty-six of
them by hand would only have introduced transcription errors. What is added is
`model`, naming the mesh each weapon uses.

`dist/src/firearms.js` is the part that puts one in your hands: loading the mesh
on demand, tracking what is in the magazine, throwing the camera around when it
goes off, and working out what the round hit.

Recoil is **added to your aim rather than replacing it**, so it can be pulled
back down the way a real one has to be. Each shot adds a rise and a sideways
swing from the weapon's own profile; `climb` decides what share of the rise you
are left holding once it settles, which is why an AKM walks up the target and a
suppressed SMG does not.

Models load the first time a weapon is picked up, not at start-up. Twenty-six
weapons is fourteen megabytes, and a player who never comes down here should
never pay for it. The firing recordings load with the first weapon taken.

## Targets

Two per lane. A paper silhouette takes a hole where the round goes through it —
the hole is placed at the actual intersection point, and the sixty oldest are
kept. A steel plate on a pivot swings when hit and rights itself, and rings a
beat after the shot; at fifteen metres that ring is the only confirmation a
shooter gets, which is the entire point of a plate.

Buckshot throws `pellets` traces at once, so a shotgun scatters across a target
rather than punching one hole.

## Sound

Firing and handling are real recordings, supplied to the Lost Signal repository
by its owner: 9 mm, .308 and 20-gauge reports, and magazine, bolt, shell,
cylinder and slide sounds for the reloads. `reloadSamplesForWeapon` schedules
them the way the weapon actually works — a revolver opens, cocks and closes; a
shotgun takes one shell at a time; a bolt gun runs its bolt.

The pack has no revolver report, so the three revolvers use their own modelled
voice rather than a 9 mm recording pretending to be a .44.

Every shot sends hard into the shaft reverb, because a firearm indoors is
mostly the room answering it.

## Licence

The weapon models are the **Quaternius Ultimate Guns Pack**, CC0 1.0,
re-exported with an orientation marker and front/rear sight nodes. See
`dist/assets/lost-signal/guns/SOURCES.txt`. The firing and handling recordings
were supplied by the repository owner. The catalogue and handling code are
carried over from `ab19902020/Lost-signal-`, the same author's repository.
