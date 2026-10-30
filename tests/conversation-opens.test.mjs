import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../dist/src/main.js',import.meta.url),'utf8');

// Pull one top-level `function name(...){...}` out of main.js by matching
// braces, so these tests read the real body rather than a line range that
// drifts every time something is inserted above it.
function body(name){
 const start=source.indexOf(`function ${name}(`);
 assert.notEqual(start,-1,`main.js no longer defines ${name}`);
 let i=source.indexOf('{',start),depth=0,quote=null,line=false,block=false;
 for(let j=i;j<source.length;j++){
  const c=source[j],next=source[j+1];
  if(line){if(c==='\n')line=false;continue;}
  if(block){if(c==='*'&&next==='/'){block=false;j++;}continue;}
  if(quote){if(c==='\\'){j++;continue;}if(c===quote)quote=null;continue;}
  if(c==='/'&&next==='/'){line=true;j++;continue;}
  if(c==='/'&&next==='*'){block=true;j++;continue;}
  if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
  if(c==='{')depth++;
  else if(c==='}'&&--depth===0)return source.slice(i,j+1);
 }
 assert.fail(`${name} is not brace-balanced`);
}

test('starting a conversation actually puts it on the screen',()=>{
 // The regression this exists for: the six lines that open the panel were
 // dropped off the end of startConversation, and nothing anywhere noticed.
 // renderChoices had already built the entire dialogue — speaker, greeting,
 // every numbered topic — so the DOM was perfect and no error was thrown.
 // The dialog was simply never shown. Pressing Talk on any resident in the
 // silo did nothing at all, and the scripted scenes (Mara, the clerk, the
 // deputy, Billings) kept working because they open the panel themselves,
 // which is exactly why playing those scenes did not reveal it.
 //
 // So: the generic path every ordinary resident goes through has to do all
 // four of these, and each one is load-bearing on its own.
 const fn=body('startConversation');
 assert.match(fn,/\bconversation\.show\(\)/,
   'startConversation never shows the conversation dialog — Talk will do nothing on every resident');
 assert.match(fn,/\btalking\s*=\s*\{/,
   'startConversation never sets `talking` — the pause, the camera and Esc all read it');
 assert.match(fn,/population\.talkingTo\s*=/,
   'startConversation never tells population who you are talking to — the resident will not turn to face you');
 assert.match(fn,/classList\.add\('talking'\)/,
   'startConversation never marks the body as talking — the HUD will not get out of the way');
});

test('every way into a conversation ends up opening the panel',()=>{
 // startConversation is not the only entrance: the scripted scenes call
 // openDialog(conversation) instead. Both are fine. What is not fine is a
 // third kind that builds a dialogue and shows nothing, which is the shape
 // the bug above had. Anything that fills in the speaker must also open the
 // panel somewhere in the same function.
 const fills=[...source.matchAll(/function\s+(\w+)\s*\(/g)].map(m=>m[1])
   .filter(name=>{
     const fn=body(name);
     return /\$\('speakerName'\)\.textContent\s*=/.test(fn);
   });
 assert.ok(fills.length>=2,`expected several conversation entrances, found ${fills.length}`);
 for(const name of fills){
  const fn=body(name);
  assert.ok(/conversation\.show\(\)/.test(fn)||/openDialog\(conversation\)/.test(fn),
    `${name} writes a speaker into the conversation panel but never opens it`);
 }
});
