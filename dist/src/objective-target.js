// Who the current objective wants you to talk to.
//
// The silo is full of people who look like each other on purpose — same
// overalls, same light, same job. That is right for the place and wrong for
// finding one particular person, and "go and see Mara" is no help at all when
// there are nine women in work clothes in the cafeteria. So the one person the
// objective actually needs gets a small mark over their head.
//
// The rule this file exists to hold: at most ONE person is ever marked, and
// only while talking to them is the thing the story is waiting on. The moment
// that conversation is done the mark goes, even though the person is still
// standing there. A marker over everybody who has a line is a marker over
// nobody.
//
// No DOM and no Three.js here — this decides who, and story-marker.js draws
// it. That keeps the rule testable without a renderer.

// Each row: the person's resident id, and a test against the story. First row
// whose `when` is true wins, so the order is the order of the chapters.
//
// Rows are only added for a conversation that the story is genuinely blocked
// on. Marking somebody optional — the four people who dismiss the gesture, for
// instance — would defeat the whole point: those are a thing you may do, and
// the game should not put a green dot on all four and call it guidance.
const RULES=Object.freeze([
  // Chapter One. She is the only other person who was watching his hands.
  {id:'mara', when:s=>s.chapter==='the-clean'&&!s.hasFlag('mara-spoke')},
  // Chapter Two. The counter, both halves of it: handing the dispatch over,
  // and then the hold she will not let you leave without.
  {id:'delen', when:s=>s.chapter==='the-package'&&!s.hasFlag('dispatch-delivered')&&s.has('dispatch')},
  {id:'delen', when:s=>s.chapter==='the-package'&&s.hasFlag('dispatch-delivered')&&!s.has('package')},
  // And the door out, once the parcel is in your satchel.
  {id:'kell',  when:s=>s.hasFlag('parcel-taken')&&!s.hasFlag('deputy-met')},
  // Later: the one conversation the middle of the game turns on.
  {id:'billings', when:s=>s.chapter==='billings'&&s.has('georgia')},
]);

// The resident the mark belongs over, or null when the objective is a place or
// an object rather than a person. Null is the normal case and is not a gap:
// most of this game is looking for things, and a marker that is always on
// somewhere is wallpaper.
export function objectiveTarget(story){
  if(!story||!story.story)return null;                 // free roam marks nobody
  for(const rule of RULES){
    let hit=false;
    try{hit=!!rule.when(story);}catch{hit=false;}       // a story mid-migration must not break the frame
    if(hit)return rule.id;
  }
  return null;
}

// Exported for the tests, so they check the real table rather than a copy.
export const OBJECTIVE_RULES=RULES;
