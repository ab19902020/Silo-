// Play Silo 18 from the title to the ridge, in a real browser, and report
// every place a player would get stuck.
//
//   node scripts/dev.mjs --port 4173 &
//   node scripts/playthrough.mjs
//
// This is not a unit test and it does not mock anything. It boots the real
// page, starts a real story, and then only ever does things a player can do:
// travel with the directory, walk up to something, press Use, click a line of
// dialogue. It never calls a story method to move itself along — if it has to
// cheat to get past a step, that step is broken.
//
// The one thing it does not simulate is walking: it places the body next to
// what it is reaching for rather than pathing across the floor, because
// route-finding is already covered by tests/playthrough.test.mjs and mixing
// the two makes a navigation failure look like a story failure.
//
// Why it works the way it does. Twice now this harness has accused the game of
// a bug that was its own, and both times for the same reason: reading state the
// frame loop had not refreshed yet.
//
//  1. It pressed Use from wherever the player happened to be standing and
//     called the chapter stuck when nothing happened. The watch on Level 100 is
//     reachable from five approach angles out of six and it had picked the
//     sixth. So it asks the game what it is being offered BEFORE pressing
//     anything, and tries the ring of approaches a player would.
//  2. It then reported the Supply clerk "in the room but never offered", from
//     sixty approaches. She was offered fine. `residentInteractions` is rebuilt
//     every frame and only carries people within five metres of the body, so
//     teleporting next to her and querying in the same tick reads a list built
//     for where the player was standing before — forty-five metres away, across
//     the floor. A real player walks, and the list keeps up with them.
//
// Hence the two stages in approach(): move, let a frame rebuild the world's idea
// of what is nearby, and only then sweep the angles. Stuck now means no angle
// works against a current pool, which is a real finding: a player cannot get at
// it either.
// Playwright is a dev tool, not a dependency of the game — dist/ ships with no
// package manager at all — so it is imported from wherever it happens to live
// rather than from node_modules next to this file.
const {chromium}=await (async()=>{
  const places=['playwright','/opt/node22/lib/node_modules/playwright/index.mjs',
    process.env.PLAYWRIGHT,'playwright-core'].filter(Boolean);
  for(const where of places){try{return await import(where);}catch{}}
  console.error('Playwright not found. Install it, or set PLAYWRIGHT to its entry point.');
  process.exit(2);
})();

const PORT=process.env.PORT||4173;
const PAGE=process.env.URL||`http://127.0.0.1:${PORT}/index.html`;
const HEADFUL=process.env.HEADFUL==='1';

const browser=await chromium.launch({headless:!HEADFUL,
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const errors=[];
page.on('pageerror',e=>errors.push('pageerror: '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text().slice(0,180));});
await page.addInitScript(()=>{try{localStorage.clear();}catch{}});
await page.goto(PAGE,{waitUntil:'load'});
await page.waitForFunction(()=>window.__silo?.ready,null,{timeout:900000});

// Count real frames. Software rendering runs at about one a second, so every
// wait here is in frames rather than in milliseconds — a fixed sleep either
// wastes minutes or reads the state one frame before it changes, and the
// second of those looks exactly like a bug.
await page.evaluate(()=>{window.__f=0;const t=()=>{window.__f++;requestAnimationFrame(t);};requestAnimationFrame(t);});
const frames=n=>page.evaluate(async n=>{
  const from=window.__f,deadline=Date.now()+120000;
  while(window.__f-from<n&&Date.now()<deadline)await new Promise(r=>setTimeout(r,50));
},n);

const state=()=>page.evaluate(()=>{
  const s=window.__silo,d=document,panel=d.getElementById('conversation');
  const card=d.getElementById('chapterHud');
  return {chapter:s.story?.chapter,level:s.world?.activeLevel,special:s.world?.special||null,
    objective:(s.story?.objective||'').slice(0,90),
    where:s.story?.destination?.place||null,
    cardUp:card?!card.hidden:false,cardCompact:card?card.classList.contains('compact'):false,
    held:['dispatch','package','pez','watch','georgia','harddrive','crowbar','pipekit','suit','shotgun'].filter(i=>{try{return s.story?.has(i);}catch{return false;}}),
    mark:s.mark||null,
    prompt:(()=>{const el=d.getElementById('interaction');return el&&!el.hidden?el.textContent.replace(/\s+/g,' ').trim():null;})(),
    panelOpen:panel?.open||false,speaker:d.getElementById('speakerName')?.textContent||null};
});

// Everything on this floor a player could walk to, including people across the
// room — residentInteractions only carries those within five metres, which is
// the difference between "she is not in the game" and "she is over there".
const offers=()=>page.evaluate(()=>{
  const s=window.__silo,w=s.world,pool=[];
  const push=(list,kind)=>{for(const i of list||[])pool.push({kind,label:i.label,action:i.action||null,
    position:[i.position.x,i.position.y,i.position.z]});};
  if(w.special)push((w.specialSpace().interactions||[]).map(v=>({...v,position:{x:v.position[0],y:v.position[1],z:v.position[2]}})),'special');
  else push(w.interactions,'room');
  push(w.actorInteractions,'actor');push(w.residentInteractions,'resident');
  push(w.sideMissionInteractions,'side');push(w.storyInteractions,'story');
  for(const [id,a] of s.population?.actors||[]){
    if(!a.definition)continue;
    pool.push({kind:'person',label:'Talk to '+a.definition.name,action:'resident-'+id,
      position:[a.root.position.x,a.root.position.y+1.25,a.root.position.z]});
  }
  return pool;
});

// Stand where the game puts the prompt on screen for `want`, and tell me where
// that was. Everything here is deliberately slow and deliberately literal.
//
// The fast version — teleport, ask world.nearestInteraction, done — is wrong in
// three ways that all look like game bugs:
//   · residentInteractions is rebuilt per frame and only holds people within
//     five metres, so querying in the same tick reads a list built for wherever
//     the body was before;
//   · the frame loop arms nothing while the game is paused, which it is for a
//     moment after travelling, so use() silently does nothing;
//   · the physics resolves the body out of whatever it was teleported into, so
//     a spot that answers correctly this instant is not the spot the player is
//     standing on a frame later.
//
// So: put the body somewhere, let a frame happen, and read the prompt off the
// screen — the same words the player reads. Nothing is trusted that the player
// cannot see. Eight positions, and if none of them puts the prompt up, that is
// a real finding rather than an artefact.
const RING=[[1.3,0],[1.3,90],[1.3,180],[1.3,270],[2.0,45],[2.0,135],[2.0,225],[2.0,315]];
// The words on screen are not the words in the interaction. A person's prompt
// is their name and their job — "Mara Teague · Runner · dispatch" — while the
// interaction that produced it is labelled "Talk to Mara Teague". Matching the
// label against the screen therefore failed on every human being in the game,
// at all eight positions, while the game was offering them perfectly. So the
// needle is the part that actually appears: the name.
const needleFor=label=>{
  const m=/^Talk to (.+)$/.exec(label||'');
  return (m?m[1]:label||'').slice(0,18);
};
async function standWhereItOffers(pos,label){
  const needle=needleFor(label);
  const tried=[];
  for(const [back,deg] of RING){
    await page.evaluate(({pos,back,deg})=>{
      const s=window.__silo,b=s.body,at={x:pos[0],y:pos[1],z:pos[2]},ang=deg*Math.PI/180;
      b.position.x=at.x+Math.cos(ang)*back;
      b.position.z=at.z+Math.sin(ang)*back;
      s.look(Math.atan2(at.x-b.position.x,at.z-b.position.z)+Math.PI,
             Math.atan2(at.y-(b.position.y+b.eyeHeight),back));
    },{pos,back,deg});
    await frames(1);
    const shown=(await state()).prompt;
    tried.push(`${back}m/${deg}°:${shown?shown.replace(/E ?Use$|E ?Talk$/,'').trim().slice(0,28):'—'}`);
    if(shown&&shown.includes(needle))return {back,deg,prompt:shown,tried};
  }
  return {failed:true,tried};
}

const pressUse=()=>page.evaluate(()=>window.__silo.use());
const travel=id=>page.evaluate(id=>window.__silo.travel(id),id);
const closePanel=()=>page.evaluate(()=>{const c=document.getElementById('conversation');if(c?.open)document.getElementById('leaveConversation')?.click();});

// Work through a conversation the way a player does: pick every line that has
// not been asked yet, top to bottom, until it runs dry.
async function talkThrough(limit=14){
  const said=[];
  for(let i=0;i<limit;i++){
    const open=await page.evaluate(()=>document.getElementById('conversation')?.open||false);
    if(!open)break;
    const picked=await page.evaluate(()=>{
      for(const b of document.getElementById('dialogueChoices').children){
        if(b.classList.contains('asked')||b.classList.contains('dialogue-back'))continue;
        b.click();return b.textContent.replace(/^\d+/,'').trim();
      }
      return null;
    });
    if(!picked)break;
    said.push(picked);
    await frames(2);
  }
  return said;
}

const log=[];
const say=(...a)=>{const l=a.join(' ');console.log(l);log.push(l);};
const steps=[];

// Find the thing, get to where the game will offer it, press Use.
async function reach(match,want){
  const all=await offers();
  const hit=all.find(match);
  if(!hit)return {stuck:'nothing on this floor matches',nearby:[...new Set(all.map(o=>o.label))].slice(0,14)};
  const spot=await standWhereItOffers(hit.position,hit.label);
  if(spot.failed)return {
    stuck:`stood at eight places around "${hit.label}" and the game never put its prompt on screen`,
    saw:spot.tried,
    nearby:[...new Set(all.map(o=>o.label))].slice(0,14)};
  await pressUse();
  await frames(3);
  return {label:hit.label,from:`${spot.back} m at ${spot.deg}°`,prompt:spot.prompt};
}

const step=async (name,fn)=>{
  const before=await state();
  let r;try{r=await fn();}catch(e){r={stuck:'threw: '+e.message};}
  const after=await state();
  const moved=before.chapter!==after.chapter;
  steps.push({name,moved,before:before.chapter,after:after.chapter,stuck:r?.stuck||null});
  say(`\n--- ${name}`);
  say(`    ${before.chapter} -> ${after.chapter}${moved?'   ✓ advanced':''}`);
  say(`    level ${after.level}${after.special?'/'+after.special:''}   held [${after.held.join(',')}]`);
  say(`    card: ${after.cardUp?(after.cardCompact?'compact — '+(after.where||'(no destination)'):'full'):'HIDDEN'}   mark: ${after.mark?after.mark.kind+':'+after.mark.id:'-'}`);
  if(r?.from)say(`    reached "${r.label}" from ${r.from}`);
  if(r?.said?.length)say(`    said: ${r.said.join(' / ')}`);
  if(r?.stuck)say(`    ✗ STUCK: ${r.stuck}`+(r.saw?`\n      saw: ${r.saw.join('  ')}`:'')+(r.nearby?`\n      nearby: ${r.nearby.join(' | ')}`:''));
  return r;
};

say('=== SILO 18 · FULL PLAYTHROUGH ===');
await page.evaluate(()=>window.__silo.begin('story'));
await frames(3);
say('booted: '+JSON.stringify(await state()));

await step('take the directory book',()=>reach(o=>o.action==='opening-book','opening-book'));
say('\n(the cleaning is a timed scene; letting it finish)');
await page.evaluate(()=>window.__silo.opening?.finish?.());
await frames(6);

const chat=async (who,rx)=>{
  const r=await reach(o=>rx.test(o.label||''));
  if(r.stuck)return r;
  const said=await talkThrough();
  await frames(2);await closePanel();await frames(2);
  return {...r,said};
};

await step('Ch1 · talk to Mara',()=>chat('mara',/Mara/i));
await step('Ch1 · take the shift dispatch',()=>reach(o=>o.action==='take-dispatch','take-dispatch'));
await step('Ch2 · travel to Supply, 110',async()=>{await travel('110');await frames(8);return {};});
await step('Ch2 · the Supply counter',()=>chat('delen',/Osgood|Delen/i));
await step('Ch2 · take the parcel',()=>reach(o=>o.action==='relic:package','relic:package'));
await step('Ch2 · the deputy at the stair door',()=>chat('kell',/Kell/i));

await step('Ch3 · travel to the bar, 026',async()=>{await travel('26');await frames(8);return {};});
await step('Ch3 · take the duck',()=>reach(o=>o.action==='relic:pez','relic:pez'));
await step('Ch3 · travel to the market, 100',async()=>{await travel('100');await frames(8);return {};});
await step('Ch3 · take the watch',()=>reach(o=>o.action==='relic:watch','relic:watch'));

await step('Ch4 · travel to Mechanical, 144',async()=>{await travel('144');await frames(8);return {};});
await step('Ch4 · inspect the bulkhead',()=>reach(o=>/bulkhead/i.test(o.label||'')));
await step('Ch5 · take the crowbar',()=>reach(o=>o.action==='relic:crowbar','relic:crowbar'));
await step('Ch5 · lever the bulkhead open',()=>reach(o=>/bulkhead/i.test(o.label||'')));
await step('Ch6 · into the hideout',async()=>{await travel('excavator');await frames(9);return {};});
await step('Ch6 · take Hard Drive 18',()=>reach(o=>o.action==='hard-drive','hard-drive'));

await step('Ch7 · travel to the Wilkins room, 068',async()=>{await travel('68');await frames(8);return {};});
await step('Ch8 · George’s terminal',async()=>{
  const r=await reach(o=>o.action==='george-terminal','george-terminal');
  await page.evaluate(()=>{const d=document.getElementById('georgeTerminal');if(d?.open)d.close();});
  await frames(2);return r;});

await step('Ch9 · travel to Water Filtration, 055',async()=>{await travel('55');await frames(8);return {};});
await step('Ch9 · take the capping kit',()=>reach(o=>o.action==='relic:pipekit','relic:pipekit'));
await step('Ch10 · travel to the pressure gallery',async()=>{await travel('pipe-gallery');await frames(9);return {};});
for(const s of ['cover','isolate','collar','torque'])
  await step('Ch10 · pipe: '+s,async()=>{const r=await reach(o=>o.action==='pipe-'+s,'pipe-'+s);await frames(5);return r;});

await step('Ch11 · travel to Medical, 062',async()=>{await travel('62');await frames(8);return {};});
await step('Ch11 · take the Georgia book',()=>reach(o=>o.action==='relic:georgia','relic:georgia'));
await step('Ch11 · travel to the station, 001',async()=>{await travel('1');await frames(8);return {};});
await step('Ch11 · give Billings the page',()=>chat('billings',/Billings/i));

await step('Ch12 · travel to Supply, 144',async()=>{await travel('144');await frames(8);return {};});
await step('Ch12 · take the sealed suit',()=>reach(o=>o.action==='relic:suit','relic:suit'));
await step('Ch13 · travel to the airlock',async()=>{await travel('airlock');await frames(9);return {};});
await step('Ch13 · cycle the inner door',()=>reach(o=>/airlock-/.test(o.action||'')));

say('\n\n=== SUMMARY ===');
let stuck=0;
for(const s of steps){
  if(s.stuck)stuck++;
  say(`${s.stuck?'✗':s.moved?'✓':' '} ${s.name.padEnd(38)} ${String(s.before).padEnd(12)} -> ${s.after}${s.stuck?'   '+s.stuck.slice(0,70):''}`);
}
const end=await state();
say(`\nfinished in chapter "${end.chapter}" holding [${end.held.join(', ')}]`);
say(`${stuck} step${stuck===1?'':'s'} a player could not get past`);
say('page errors: '+(errors.length?'\n  '+errors.slice(0,8).join('\n  '):'none'));
const fs=await import('node:fs');
fs.writeFileSync(new globalThis.URL('../playthrough.log',import.meta.url),log.join('\n'));
await browser.close();
process.exit(stuck?1:0);
