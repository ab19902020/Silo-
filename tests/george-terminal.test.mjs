import test from 'node:test';
import assert from 'node:assert/strict';
import { GeorgeTerminal, BLUEPRINT, KEY, TERMINAL_STATES } from '../dist/src/george-terminal.js';

// The terminal is the state machine, not the screen. If any of this needs a
// DOM or a renderer to run, it has stopped being that.
const serialisable=v=>{const s=JSON.stringify(v);return s!==undefined&&JSON.parse(s)!==undefined;};

test('the terminal is a plain module: no DOM, no renderer, serialisable output',()=>{
  const t=new GeorgeTerminal();
  assert.ok(serialisable(t.view),'the view has to survive a round trip through JSON');
  t.insertDrive(true);t.boot();t.search(KEY);t.open('/LIBRARY');t.open('/LIBRARY/SCHEMATIC.GAS');
  assert.ok(serialisable(t.view));
  assert.ok(TERMINAL_STATES.includes(t.view.state));
});

test('without the drive the machine says so and stays saying so',()=>{
  const t=new GeorgeTerminal();
  assert.equal(t.insertDrive(false),false,'a drive you do not have cannot be inserted');
  assert.equal(t.boot(),'no-media');
  const view=t.view;
  assert.equal(view.rows.length,0);
  assert.equal(view.canSearch,false);
  assert.match(view.status,/NO MEDIA/);
  // and nothing can be reached past it
  t.search(KEY);t.open('/LIBRARY');t.open('/LIBRARY/SCHEMATIC.GAS');
  assert.equal(t.view.state,'no-media');
  assert.equal(t.view.blueprint,null);
  assert.equal(t.found,false);
});

test('inserting the drive reveals nothing and advances nothing',()=>{
  const t=new GeorgeTerminal();
  assert.equal(t.insertDrive(true),true);
  assert.equal(t.state,'off','seating a cartridge is not booting the machine');
  assert.equal(t.found,false);
  assert.equal(t.boot(),'mounted');
  const view=t.view;
  assert.ok(view.rows.length>2,'a mounted volume with nothing on it is not mundane, it is broken');
  // The whole point: the listing has to look like a mechanic's drive.
  const names=view.rows.map(r=>r.name.toLowerCase()).join(' ');
  assert.ok(!names.includes(KEY),`the mounted listing names the ${KEY} straight away`);
  assert.ok(view.rows.every(r=>!r.concealed),'something is flagged as concealed before it has been found');
  assert.equal(view.blueprint,null);
});

test('the concealed volume cannot be walked into by name before it is searched for',()=>{
  const t=new GeorgeTerminal();t.insertDrive(true);t.boot();
  for(const path of ['/LIBRARY','/LIBRARY/SCHEMATIC.GAS','/LIBRARY/NOTES.TXT']){
    t.open(path);
    assert.ok(!t.view.breadcrumb.includes('LIBRARY'),`${path} opened without being found`);
    assert.equal(t.view.blueprint,null);
  }
  t.list('/LIBRARY');
  assert.deepEqual(t.view.breadcrumb,['/']);
  assert.equal(t.opened,false);
});

test('search is case-insensitive, trims, and only one word answers',()=>{
  for(const query of ['library','LIBRARY','  Library  ','the library','LiBrArY files']){
    const t=new GeorgeTerminal();t.insertDrive(true);t.boot();
    t.search(query);
    assert.equal(t.found,true,`"${query}" should have found it`);
    assert.equal(t.view.state,'revealed');
  }
  for(const query of ['','   ','librar','libary','books','george','schematic','gas','pump','/LIBRARY']){
    const t=new GeorgeTerminal();t.insertDrive(true);t.boot();
    t.search(query);
    assert.equal(t.found,query==='/LIBRARY',`"${query}" should not have found it`);
  }
});

test('finding it, opening it, and reading the schematic',()=>{
  const t=new GeorgeTerminal();t.insertDrive(true);t.boot();
  t.search('Library');
  const revealed=t.view.rows.filter(r=>r.concealed);
  assert.equal(revealed.length,1,'the search returns exactly one unindexed match');
  t.open(revealed[0].id);
  assert.equal(t.opened,true);
  const inside=t.view;
  assert.ok(inside.rows.length>=3,'the concealed volume is compact but not empty');
  assert.ok(inside.breadcrumb.includes('LIBRARY'));
  const sheet=inside.rows.find(r=>r.name.endsWith('.GAS'));
  assert.ok(sheet,'no schematic on the concealed volume');
  t.open(sheet.id);
  const view=t.view;
  assert.equal(view.state,'reading');
  assert.ok(view.blueprint,'the schematic has to come back as data, not as prose');
  assert.ok(Array.isArray(view.blueprint.components)&&view.blueprint.components.length>=4);
  assert.ok(Array.isArray(view.blueprint.route)&&view.blueprint.route.length>=3);
  assert.ok(Array.isArray(view.blueprint.tools)&&view.blueprint.tools.length>=2);
  assert.ok(Array.isArray(view.blueprint.warnings)&&view.blueprint.warnings.length>=2);
  // and you can walk back out of it again
  t.back();assert.equal(t.view.state,'revealed');
  t.back();assert.deepEqual(t.view.breadcrumb,['/']);
});

// The one thing in here that is a claim about somebody else's fiction. Every
// position on the sheet is this game's invention, and the player is told so on
// the sheet itself rather than in a document they will never open.
test('the schematic says what it made up, in the data the player reads',()=>{
  assert.equal(BLUEPRINT.sourceStatus,'Reconstructed for this game');
  assert.ok(BLUEPRINT.reconstructed.length>=3,'a reconstruction that lists nothing it reconstructed is not honest');
  assert.ok(BLUEPRINT.established.length>=1);
  for(const part of BLUEPRINT.components)assert.equal(part.status,'Reconstructed for this game',`${part.id} claims a provenance it does not have`);
  assert.ok(BLUEPRINT.warnings.some(w=>/RECONSTRUCTION|UNVERIFIED/.test(w)),'the sheet does not warn that it is unverified');
  // No level number, no floor number, no coordinate: this build does not know
  // where a gas line runs in the television silo and must not imply that it does.
  const prose=JSON.stringify(BLUEPRINT);
  assert.ok(!/\bLevel\s*\d|\bfloor\s*\d|\bL\d{2,3}\b/i.test(prose),'the sheet names a specific floor as if it were canon');
});

test('a crafted save cannot skip the drive, the boot or the search',()=>{
  const forged=[
    {found:true,opened:true,path:'/LIBRARY',file:'/LIBRARY/SCHEMATIC.GAS'},
    {drive:true,found:true,opened:true,path:'/LIBRARY',file:'/LIBRARY/SCHEMATIC.GAS'},
    {drive:true,booted:true,opened:true,path:'/LIBRARY',file:'/LIBRARY/SCHEMATIC.GAS'},
    {drive:true,booted:true,found:'yes',path:'/LIBRARY'},
  ];
  for(const saved of forged){
    const t=GeorgeTerminal.load(saved);
    assert.equal(t.view.blueprint,null,`a forged save handed over the schematic: ${JSON.stringify(saved)}`);
    assert.ok(!t.view.breadcrumb.includes('LIBRARY'),`a forged save opened the concealed volume: ${JSON.stringify(saved)}`);
  }
  for(const saved of [null,undefined,'library',42,{path:{}},{file:[]}]){
    const t=GeorgeTerminal.load(saved);
    assert.ok(TERMINAL_STATES.includes(t.view.state));
    assert.equal(t.view.blueprint,null);
  }
});

test('an honest save round-trips exactly, and ejecting forgets everything',()=>{
  const t=new GeorgeTerminal();t.insertDrive(true);t.boot();t.search('library');
  t.open('/LIBRARY');t.open('/LIBRARY/NOTES.TXT');
  const back=GeorgeTerminal.load(JSON.parse(JSON.stringify(t.save())));
  assert.deepEqual(back.view,t.view,'a legitimate save did not come back the same');
  assert.equal(back.found,true);assert.equal(back.opened,true);

  assert.equal(t.ejectDrive(),true);
  assert.equal(t.state,'off');
  assert.equal(t.found,false,'the concealed volume stayed found with the cartridge out');
  assert.equal(t.view.blueprint,null);
  t.boot();
  assert.equal(t.view.state,'no-media');
});
