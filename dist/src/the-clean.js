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

// What the silo says about it, in the hours after. Nobody is lying; they saw
// the same thing and it was nothing.
export const DISMISSALS=Object.freeze([
  'He was steadying himself. The wind up there takes your feet out.',
  'Everyone waves. They all wave. You would.',
  'He had been in that suit two hours. His arm cramped.',
  'It is a camera, not a window. He could not see anybody to wave at.',
]);

// Later in Chapter One. Before he was sent out, Reeve lodged something at
// Supply against the player's name, with a release date and no explanation.
// A clerk hands it over because the paperwork is in order.
export const PACKAGE=Object.freeze({
  id:'package',
  name:'A parcel lodged against your name',
  eyebrow:'SUPPLY · HELD FOR RELEASE',
  level:110, wing:0,
  // Supply's counter, in the wing the directory sends you to.
  at:[.95,.835,4.18],
  needs:'the-package',
  blurb:'Brown paper, string, and a Supply hold-slip filled out eleven days '+
    'ago in a careful hand: release to the named runner, and a date. The date '+
    'is today. Inside there is no letter — only a bar chit from Level 026 with '+
    'a name written across the back of it: G. WILKINS. The lodging signature '+
    'is N. REEVE.',
  source:'Original game writing. The parcel, the hold-slip and Sheriff Reeve '+
    'are this game’s invention and are not drawn from the television series.',
  // What the clerk says when the slip checks out.
  counter:'“Held for release.” She turns the slip round so you can read the '+
    'date. “Eleven days it has sat there. He paid the holding fee himself.”',
});

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
