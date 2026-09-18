// Playing Chapter One, for the tests that only care about what comes after it.
//
// The chapter is a job: watch the cleaning, talk to Mara, take the dispatch off
// the runners' rack, work the shift to Supply, hand it over, and be given the
// parcel that was lodged against your name. Tests that are about the gas line
// or the drone should not have to spell that out, but they should not be able
// to skip it either — if a beat stops working, every one of these fails with it.
import assert from 'node:assert/strict';

export function playChapterOne(story,{ask=0}={}){
  assert.equal(story.chapter,'cleaning','Chapter One does not start from the cleaning');
  story.beginSearch();
  assert.equal(story.chapter,'the-clean');
  assert.equal(story.spokeToMara(),true,'Mara will not talk');
  for(const who of ['marnes','billings','jahns'].slice(0,ask))story.askedAbout(who);
  assert.ok(story.take('dispatch'),'the runners’ rack gave out no dispatch');
  assert.equal(story.reachedSupply(),true,'the shift does not reach Supply');
  assert.equal(story.deliverDispatch(),true,'the dispatch cannot be handed over');
  assert.ok(story.take('package'),'the parcel was not released');
  // This stops with the parcel in the satchel and the deputy still ahead: he
  // is the last beat of Chapter Two, and the tests that are about him need to
  // meet him themselves. The parcel used to end the chapter here, which sent
  // the player off to Level 026 while the game was still waiting for them to
  // walk past the man at the door.
  assert.equal(story.chapter,'the-package','the parcel ends the chapter before the deputy has been met');
  return story;
}
