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

// And the other half of "where do I go": most objectives are a thing, not a
// person. The parcel on the counter, the crowbar on the tool board, the book
// in Medical returns — each is one small object somewhere on a floor the size
// of a town square, and the objective line can only ever name the floor.
//
// This is derived rather than listed. A collectable already says what it needs
// before it exists (`needs`) and the story already knows whether it is showing
// (`visible`), so the thing the chapter wants is simply: showing, not yet in
// your satchel, and gated on where you are in the story. A hand-written table
// would go stale the first time a chapter moved.
//
// `items` is passed in rather than imported: story.js reaches THREE through
// mementos.js, and this file has to stay loadable without a renderer.
// Three items carry the trail without being gated on a chapter, because they
// are always in the world and it is the WRITING that sends you to them: the
// duck on the bar counter, George's watch at the market, the Georgia book in
// Medical returns. They have no `needs`, so the rule below cannot find them,
// and they are named here rather than inferred — inferring "the item on the
// floor the objective names" would mark the heat tape and the camcorder on
// Level 144, which are scenery, not the trail.
const TRAIL=Object.freeze([
  {id:'pez',    when:s=>s.chapter==='clues'&&!s.has('pez')},
  {id:'watch',  when:s=>s.chapter==='clues'&&s.has('pez')},
  {id:'georgia',when:s=>s.chapter==='billings'&&!s.has('georgia')},
]);

export function objectiveItem(story,items){
  if(!story||!story.story||!Array.isArray(items))return null;
  const gettable=id=>{
    try{return !story.has(id)&&story.visible(id);}catch{return false;}
  };
  // The trail first: these are the steps a chapter's own text walks you
  // through, and they are more specific than the chapter's gate.
  for(const row of TRAIL){
    let hit=false;
    try{hit=!!row.when(story);}catch{hit=false;}
    if(hit&&gettable(row.id))return row.id;
  }
  // Then anything the chapter explicitly opens. `needs` is the gate the story
  // lifts, so an item carrying this chapter's name is what it is waiting on.
  for(const item of items){
    if(!item||!item.id)continue;
    if(item.needs===story.chapter&&gettable(item.id))return item.id;
  }
  return null;
}

// What the game should be pointing at right now: a person if the story is
// waiting on a conversation, otherwise the thing it is waiting on you to find.
// A person wins, because a conversation is always the more specific ask.
export function objectiveMark(story,items){
  const who=objectiveTarget(story);
  if(who)return {kind:'person',id:who};
  const what=objectiveItem(story,items);
  return what?{kind:'thing',id:what}:null;
}
