// Chapter One. What the cleaning was for.
//
// The opening is not being replaced. The walk out, the crater, the lens, the
// climb to the tree, the helmet, the long rest — all of that is the sequence
// that was already built, cut against assets/audio/silo-18-opening.mp3, and it
// still runs frame for frame. What is new is one thing inside it and
// everything that comes after.
//
// Inside it: in the last second and a quarter of the clean, before he turns
// away, the cleaner raises his free hand to the lens and holds it open. See
// GESTURE_FROM in opening.js — it sits in the tail of the existing clean
// window precisely so that nothing downstream has to move.
//
// After it: the room decides it was nothing. One person does not.
//
// This file is the writing, not the screen: no DOM, no Three.js, nothing that
// needs a renderer. `main.js` draws it. That keeps the scene checkable on its
// own and keeps the story out of the frame loop.

// The two people on the hill are original Silo 18 characters. Neither is from
// the television series or the books, and the game says so in its research
// panel rather than leaving it to be assumed.
export const CLEANER=Object.freeze({
  id:'reeve', name:'Nathan Reeve', role:'Sheriff',
  // Sent out today. What he did in front of the lens is the whole story.
  partner:'hana',
});
export const PARTNER=Object.freeze({
  id:'hana', name:'Hana Reeve', role:'IT systems',
  // Sent out before him. She has been at the foot of the dead tree since.
});

// The one person in the cafeteria who was watching his hands.
export const WITNESS=Object.freeze({id:'mara', name:'Mara Teague', role:'RUNNER · LEVEL 001'});

// The exchange, immediately after the screen goes back to the hill.
//
// It is four beats and it explains nothing, which is the point: the gesture is
// the hook for the whole story and Chapter One is not allowed to solve it.
// `say` is the player. `reply` is Mara. `stage` is what the room does. The
// `beat` before her last line is a real pause — she has decided to say it.
export const AFTER_THE_CLEAN=Object.freeze([
  Object.freeze({say:'Did you see that?', reply:'The cleaning?'}),
  Object.freeze({say:'No. His hand.', reply:'Yeah.',
    stage:'Mara looks toward the now-empty screen.'}),
  Object.freeze({say:'What was it?', reply:'I don’t know.'}),
  Object.freeze({beat:1500, reply:'But he wanted somebody to see it.'}),
]);
export const WITNESS_OPENER='Half the room has gone back to their trays.';
export const WITNESS_CLOSE='Leave it';

// What the silo says about it, in the hours after.
//
// Nobody here is lying and nobody is covering anything up. They saw the same
// thing you did and it was nothing, and every one of them has a reasonable
// explanation ready, and that is what makes it frightening: you are not being
// silenced, you are being agreed with. The point of asking around is not to
// collect a clue. It is to find out that you are on your own with this.
//
// `who` is a named resident who is actually somewhere the player passes in
// Chapter One. `close` is what they say if you push it a second time.
export const DISMISSALS=Object.freeze([
  Object.freeze({who:'marnes',
    ask:'Did you see what Reeve did at the end?',
    reply:'I watched a man I worked with for nine years walk up a hill and lie down. '+
      'I did not take notes.',
    close:'Whatever you think you saw, keep it where it is. It does you no good out loud.'}),
  Object.freeze({who:'billings',
    ask:'His hand, at the lens. Did you see it?',
    reply:'He had been in that suit the better part of two hours. Arms cramp. '+
      'People put a hand out to steady themselves and there is nothing to steady on.',
    close:'I have a file to close on him today. I would rather close it quietly.'}),
  Object.freeze({who:'jahns',
    ask:'Something he did before he turned away.',
    reply:'Everyone waves. They all wave, in the end. I have watched eleven of them '+
      'and every single one turned round and waved at a camera.',
    close:'It is a lens, not a window. There was nobody out there for him to wave to.'}),
  Object.freeze({who:'mara',
    ask:'Has anybody else said anything about his hand?',
    reply:'I asked two people. One said the wind. One asked me why I was asking.',
    close:'That second one is the part I keep thinking about.'}),
]);
// Asking three of the four is enough to feel it. It is optional — the chapter
// can be finished without a single one of these — but it is the difference
// between a job and a story.
export const DISMISSALS_TO_FEEL_IT=3;
export const CLOSED_RANKS='Nobody in that room saw a thing. You did, and so did one runner.';

// The job itself. A runner carries; the whole of Chapter One is the walk.
//
// The dispatch and the parcel are *items*, and items are described in exactly
// one place: COLLECTABLES in story.js, which owns the name, the blurb, where
// the thing lies and what unlocks it. This file used to restate both of them,
// and the copies had already begun to disagree — the dispatch's position here
// was a landing it is no longer on. So only what is this scene's own writing
// lives below, and only the fields the staging actually reads.
//
// (story.js cannot be imported from here: it reaches THREE through mementos.js,
// and this file is deliberately loadable without a renderer.)

// Later in Chapter One. Before he was sent out, Reeve lodged something at
// Supply against the player's name, with a release date and no explanation.
// A clerk hands it over because the paperwork is in order.
export const PACKAGE=Object.freeze({
  id:'package',
  // Supply, in the wing the directory sends you to. The staging reads these two
  // to place the clerk and the counter; the item itself is in story.js.
  level:110, wing:0,
  // What the clerk says when the slip checks out.
  counter:'“Held for release.” She turns the slip round so you can read the '+
    'date. “Eleven days it has sat there. He paid the holding fee himself.”',
});

// The Supply counter, Level 110. She is not an obstacle and she is not a
// puzzle. She is a woman doing her job correctly, which is worse: the parcel
// is released because the paperwork is in order, and the paperwork is in order
// because a man arranged it eleven days before he was sent out to die.
export const CLERK=Object.freeze({
  id:'delen', name:'Delen Osgood', role:'SUPPLY COUNTER · LEVEL 110',
  greet:'Runner. You will want a signature.',
  // Handing the dispatch over. Runners carry; runners do not read.
  hand:Object.freeze({
    say:'Dispatch from 001. Same day.',
    reply:'She breaks the seal with her thumb, reads it in about four seconds, '+
      'and writes in a ledger the size of a paving slab. “Received.” She stamps '+
      'your copy and slides it back without looking up.'}),
  // And then she does not dismiss you.
  hold:Object.freeze([
    Object.freeze({say:'Is that everything?',
      reply:'“No.” She turns a page back. “There is a hold against your name.”'}),
    Object.freeze({say:'Against my name?',
      reply:'She turns the ledger round so you can read it: your name, a date '+
        'eleven days old, and a second line in different ink. RELEASE ON — and '+
        'today’s date. “Lodged in person. Holding fee paid up front, which people '+
        'do not do.”'}),
    Object.freeze({say:'Who lodged it?',
      stage:'She checks the signature, and something goes out of her face.',
      reply:'“N. Reeve.” A pause. “That was this morning, was it not. The '+
        'cleaning.”'}),
    Object.freeze({beat:1600,
      reply:'“I am going to give you your parcel,” she says carefully, “because '+
        'the slip is in order and I have no reason on this earth not to. And then '+
        'I am going to forget I read the name.”'}),
  ]),
  release:'She sets it on the counter between you and steps back from it.',
});

// Leaving. Chapter Two does not end on an errand: it ends with the player
// finding out that collecting a dead man's parcel was noticed by somebody
// whose job is noticing. He is not a threat yet. That is the point — he is
// polite, and he remembers your name.
export const DEPUTY=Object.freeze({
  id:'kell', name:'Deputy Aron Kell', role:'DOWN DEEP STATION · LEVEL 105',
  greet:'Held the door for you. Long way down for a 001 runner.',
  beats:Object.freeze([
    Object.freeze({say:'Supply run. Same-day dispatch.',
      reply:'“Mm.” He looks at the satchel rather than at you. “And they gave '+
        'you something back.”'}),
    Object.freeze({say:'A hold. It had my name on it.',
      reply:'“It would.” He takes out a notebook, and he does not hurry. '+
        '“Who lodged it, did they say?”'}),
    Object.freeze({say:'They did not say.', tell:false,
      reply:'He writes something short. “No. They would not.” He puts the '+
        'notebook away and holds the stair door open for you.'}),
    Object.freeze({say:'Sheriff Reeve lodged it.', tell:true,
      reply:'He stops writing. For a second he looks tired rather than official. '+
        '“Then I would open it somewhere with a door,” he says, “and I would not '+
        'tell the next person who asks.”'}),
  ]),
  // Either answer is allowed. Neither is punished and neither is safe.
  close:'He writes your name and the level in the notebook either way. You watch '+
    'him do it.',
});

// Where the two of them stand. Room-local, so this file still needs no
// Three.js: main.js turns them into world points with roomPoint.
export const COUNTER_AT=Object.freeze([0,1.02,3.5]);      // in front of the Supply counter
export const STAIR_DOOR_AT=Object.freeze([0,1.5,-1.7]);   // the wing door, on the way out

// The runner's first shift. The player is a message runner on Level 001: the
// job is why they are standing in the cafeteria at all, and it is what carries
// them down to Supply without the story having to invent an errand.
export const FIRST_RUN=Object.freeze({
  from:1, to:PACKAGE.level,
  label:'Dispatch to Supply, Level 110',
  brief:'A sealed dispatch for Supply. Runners carry, runners do not read.',
});

// True once the player has both watched the cleaning and seen the gesture —
// which is the same moment, because the gesture is inside the cleaning.
export const sawTheGesture=story=>!!story&&story.chapterIndex>=1;
