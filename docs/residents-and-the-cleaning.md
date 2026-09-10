# Residents, conversations, the cleaning and the crater — 9 September 2026

Six things Adam reported, with a screenshot of the first one: an NPC whose face
had torn brown patches across it. This note records what each of them actually
was, because in most cases the visible symptom was not the bug.

## The faces

The screenshot showed shattered brown blotches over a resident's forehead and
cheeks. That was not a texture or a shader: the head was built from about two
dozen separate ellipsoids and boxes laid over a sphere, and the hair cap and
the skull were two ellipsoids of different proportions. Two such surfaces have
to cross, and where they crossed they cut hard-edged bands across the face.

Everything else on the face had the same failure in a milder form. The brow
bars stood 15 mm proud of the brow, the crow's feet 25 mm off the cheek and
the forehead lines sat on the surface only by luck; the eyelids were a ring of
fourteen beads and the lips a stack of flat discs. Geometry laid on geometry
has no correct offset. Nudging the numbers cannot fix it.

**The head is one continuous surface now.** Brow ridge, eye sockets,
cheekbones, nose, lips, chin and jaw are sculpted into it as displacements of
a single skin mesh, and brows, lashes, lip colour and stubble are painted onto
that mesh per vertex. Nothing on the face is an object on the face, so nothing
can cross it or float off it.

Two things this needed:

- **A warped grid.** A uniform sphere puts two columns across the whole nose
  and smooths it into the cheek. Rings and columns are distributed by
  integrating a density, so they crowd onto the face.
- **The seam at the back.** A sphere's seam ran down the middle of the face.

The hair is generated from the same surface, pushed out along its own normal,
so it cannot intersect the skull. Below the hairline its thickness goes
negative and the cap sinks inside the head — that is what gives a smooth
hairline. Dropping quads at a threshold, which was the first attempt, gives a
staircase. Long hair is one mass; it was sixteen straight tapered tubes a side
and read as plastic bristles.

Also on the body: a neck that tapers from the jaw into the collarbones rather
than a 21 cm ellipsoid as wide at the top as at the shoulders, and a deltoid as
deep as the arm is round rather than a plate stuck on the side of the torso.

## Routines

Every resident on all 144 floors stood on one spot, apart from twelve porters
orbiting the gallery for ever. Each now walks a **routine**: a ring of stops
with a pose and a hold at each. Porters call at two wing doors and go out along
the bridge to the stairs; residents lean on the well rail and watch the shaft,
wait at a neighbour's door and cross to the far side; the second worker in each
wing works the room instead of standing at the bench. The lower areas use the
same mechanism.

A regression walks three levels for forty seconds and requires at least six
residents to have gone somewhere, and none of them to have ended up inside the
furniture.

## Conversations

Talking was a modal panel over a paused silo, reached through the same Use
prompt as a door, and whoever you had addressed carried on walking away up the
gallery while you read their lines.

The panel is **shown, not modalled**. The floor keeps running behind it. The
person stops, turns to face you and stays turned; the camera settles on them;
the prompt carries their role as well as their name. `1`–`4` ask, `E` or `Esc`
steps away, and walking more than five metres ends it. One subtlety worth
recording: the keydown guard bailed out on any `dialog` ancestor, which killed
those keys inside the panel that now holds focus.

## The cleaning

The staging was in the wrong place for the camera that films it. The sensor is
at eye height and tilted slightly up, so anyone closer than 1.8 m is entirely
below frame — and Holston did the whole clean from 44 cm away, with the rag
aimed 6 cm under the lens. What the cafeteria screen showed for those nine
seconds was an empty hillside wiping itself.

He now stands at 2.6 m, where the helmet and shoulders are in shot; steps in
over the first fifth of the phase, wipes, and steps back out over the last.
The rag crosses the lens and blanks the picture on each pass, which is the only
thing that reads as contact from inside the silo. **The beats did not move**,
so the cut against `silo-18-opening.mp3` is unchanged.

Two other things Adam pointed at:

- **The helmet read as a head.** It was a pale sphere the size of a skull in
  the same cream as the suit, and the sensor looks *down* on a cleaner, so what
  the screen showed was the crown. It is now a shell in its own harder grey,
  wider than a head and flattened on top, with a dark faceplate carried up onto
  the crown where the camera can see it, a crest, a brow bar, ear cups, a lamp
  and a locking neck ring.
- **The helmet coming off** blinked from his head to the ground four metres
  away in one frame. He holds it for a second in the hands that lifted it, and
  then sets it down.

The lens grime was a 70 × 22 chequer of hashed cells, which reads as a mosaic
rather than dirt. It is interpolated noise now, with a streak component and a
ragged wipe edge.

## The book and the screen

The directory book was on a middle table and picking it up snapped the camera
into the picture. It is on a **front** table with the player beside it, so the
whole 30 m display is in front of you, and picking it up leaves you in the
room — free to look around and walk, standing where the rest of the silo is
standing. *Focus on screen* is still there when you want the wall.

## The crater

The ground climbed away from the silo and never came back down. That reads as
the inside of a bowl but never as a rim, because nothing stands against the
sky. It rises to a crest 44 m up at 230 m out — ten degrees above the exit, so
it closes the horizon on every bearing — and falls away behind it. The crest is
a ring of hills rather than a cone, with spurs down the inside of it, and a
band of dust on the horizon that the far crest dissolves into instead of the
sky drawing a hard line along every ridge.

The dead tree was four dozen straight untapered cylinders, each its own mesh
and its own draw call, forking twice into a Y. It is grown now, from a seeded
rule: a trunk that leans off the slope and flares into root spurs, dividing
four times into hundreds of thinning, bending twigs, merged into one mesh.

## Checks

`npm test` — 93 passing, three cases added and one rewritten. `npm run
validate` for the module graph.

The rewritten one is worth naming. `the wiping hand strayed …` asserted a
*maximum* distance from the sensor across the whole clean, which only made
sense while he stood at arm's length for all nine seconds. It measures the
closest approach now; the assertions that the rag covers the lens and that the
screen flicks out on each pass, rather than staying dark, are unchanged and are
what actually guarantee the shot.

## Limits

Faces, helmet and crater dimensions are read off the reference frames and the
televised exterior by eye and scaled against the silo's existing geometry. The
resident models are original approximations, not likenesses; this is a close
match to the supplied material, **not a verified one-to-one replica**.
