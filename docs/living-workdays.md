# Living workdays and stair deliveries

This update builds on `da17abd` (the latest character performance, anatomy and
contact-lighting upgrade). It retains the existing cast, Claude-authored
personalities and conversations, story route, captured gait and character rigs.

## What to try

Choose Story or Free Roam. Walk a gallery and ask a resident **What are you doing
today?** Their answer names their responsibility, assigned round, current task,
shift and personal errand. Follow the timetable question to learn their break,
meal and handover times. Their answer changes as the existing silo clock advances.
No new notification panels open during play.

At the stair landings, look for porters with framed canvas packs. They collect
parcels at small relay counters, descend the actual spiral stair flights, leave
a delivery, and return with receipts. Outbound loads and return packs differ.
Porters pause for conversation and yield to a nearby player. A shift ending
halfway down a flight does not make them disappear: they reach a counter first.

Visit a workshop, clinic, farm, laundry, classroom or the market. Work props,
small work movements and quiet positional sounds follow the activity. Cafeteria
table workers bring paperwork, books or mending; they take breaks and meals
instead of all being labelled kitchen staff. During the opening, the audience
stops working to watch the screen.

## Responsibilities

The 3,693 existing population records across all 144 levels and the inhabited
lower workspaces receive individual assignments. The three supplied playable
characters also receive duties when they are NPCs. Fifty occupational
specializations sit within sixteen departments, alongside tailored duties for
named cast members.

| Department | Examples of individual responsibility |
| --- | --- |
| Porters | Parcels, messages, stores collections and signed returns |
| Mechanical | Lamp circuits, bearings, ventilation and tool checks |
| Agriculture | Seeds, hydroponic channels and harvest sorting |
| Medical | Clinic registration, dressings and supply counts |
| IT | Terminals, cable connections and fault records |
| Security | Gallery rounds, duty desk and document collections |
| Cafeteria | Counter service, pantry counts and clearing tables |
| Supply and market | Dispatch, hardware, cloth and stocktaking |
| Janitorial | Gallery rails, workshop surfaces and doorways |
| Laundry | Garment mending, linen sorting and collection tickets |
| Water | Filters, pumps and valve rounds |
| Recycling | Salvage, fasteners and paper reclamation |
| Mines | Drill tools, support inspections and ore tallies |
| Administration | Requisitions, shift registers and housing records |
| Education | Lessons, book repair and classroom materials |
| Community | Neighbour requests, notices and shared mending |

Walker examines electronics; Knox assigns maintenance crews; Cooper works from
an apprentice list; Pete checks patient notes; Carla allocates supplies; Billings
reviews statements and duty records. These activities supplement their existing
personalities. The same named resident keeps the same roster when visiting a
different level.

Every day has work, a water break, another work period, a meal, a final work
period, personal errands, social time and a quiet rest period. Essential services
use three shifts with staggered starts around the existing shift bells. Personal
errands include returning a borrowed book, collecting repaired clothing and
helping a neighbour. The existing clock is forty real minutes per silo day.

## Book and television grounding

Reviewed sources were Hugh Howey’s published extended **Wool excerpt** and
Apple’s public **Silo** episode descriptions and cast listing, not the full
novels or streamed episodes.

- [Hugh Howey, Wool excerpt, Reactor](https://reactormag.com/wool-excerpt/):
  describes heavily loaded stair porters, workshops, hydroponics, purification,
  a garment district, food shops, teachers and clerical/medical work. These
  informed the work families and the emphasis on busy stair traffic.
- [Silo, Apple TV](https://tv.apple.com/us/show/silo/umc.cmc.3yksgc857px0k0rqe5zd4jice):
  the season-one descriptions identify Juliette’s engineering and generator
  work, Jahns’s mayoral role, Marnes’s deputy role and Billings’s appointment.
  The existing game’s opening-era identities and story placements are retained.

The detailed tasks, station numbers, relay network, shift hours and personal
errands are **original game implementation**, not an official roster from the
books or show. No new canonical floor locations are asserted.

## Implementation and limits

- `work-roles.js` contains specialist duties and the cast’s individual work.
  `workday.js` derives stable assignments and activity from the existing clock.
- `population.js` changes reachable local stops and activities with the workday.
  Required story contacts remain near their established departments. Residents
  use nearby quiet stops for rest; this is not a simulation of everybody walking
  to a private bedroom. Seated table work uses the existing seated performance.
- `porter-traffic.js` maintains 216 lightweight shift records over 72 relay
  routes from Level 1 to 144. Local porters handle gallery rounds. The interlevel
  routes use separate ascent/descent lanes and the actual tread geometry.
- Only nearby actors receive skeletons: stair porters use at most 3/5/8 on
  low/balanced/high settings, counted within the existing crowd limits. Work
  props share geometry and materials. Counters keep their collision geometry
  when floors stream, and parcels appear after a delivery.
- Nearby work completions and actual porter foot contacts use existing ambient
  sounds. The cleaning and conversations suppress those added sounds.
- Local residents are simulated near the player; distant rosters derive their
  activity from time. Porter route progress persists across floor streaming.
  Delivery receipts are session ambience, not a persistent economic inventory.

## Validation

- `npm test`: **236/236 passing**, including the existing complete story
  playthrough, relics, world access, crowd movement and animation checks.
- New checks cover every resident’s complete day, varied duties, stable named
  assignments, named-contact availability, changing dialogue, table work and
  opening interruption.
- Route checks sample real floors and collision geometry across all three stair
  bearings and the bottom boundary, require continuous supported travel, and
  exercise delivery completion, parcel placement and floor-transition identity.
- `npm run validate`: runtime imports, entrypoints and syntax pass; 200 runtime
  files, approximately 64.77 MiB. `git diff --check` passes.
- A 1,200-update Node measurement of porter simulation, including up to five
  nearby actors, averaged **0.73 ms**, with **0.87 ms p95**, after warmup in this
  environment. This is CPU simulation timing, not a browser frame-rate claim.
- Work props were inspected in an offline render of the actual game geometry.
  That verifies attachments and shape, not final browser shaders, lighting or
  device performance. In-browser visual playtesting remains necessary.
