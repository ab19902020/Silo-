// George Wilkins' computer.
//
// A red-level relic is not a cutscene. What is on the drive has to be found by
// somebody who decided to go looking for it, which means the machine has to be
// willing to show you nothing at all — and go on showing you nothing for as
// long as you accept the first answer it gives.
//
// So the whole discovery is one deliberate act. The drive mounts as an
// ordinary portable store belonging to a mechanic: work orders, shift logs,
// parts counts, a note to himself about a pump. There is no folder called
// anything interesting, nothing is greyed out, and nothing on the screen
// suggests there is more. The concealed volume answers to exactly one thing —
// a search for the word George traded a book for the right to read — and until
// somebody types it, the machine's honest answer is that this is a mechanic's
// drive with a mechanic's files on it.
//
// This module is the terminal, not the terminal's screen: no DOM, no Three.js,
// no rendering. `view` is a serialisable description of what the screen should
// say, and the host draws it. That keeps the state machine testable on its own
// and keeps the machine ignorant of which mode the game is in.

const STATES=Object.freeze(['off','no-media','mounted','revealed','reading']);
export { STATES as TERMINAL_STATES };

// The one word the concealed volume answers to. Matching is on a trimmed,
// case-folded query and is a substring test, so "LIBRARY", " library " and
// "the library" all work and nothing else does.
export const KEY='library';

const dir=(name,detail)=>({kind:'dir',name,detail});
const file=(name,size,modified,detail,body)=>({kind:'file',name,size,modified,detail,body});

// The visible volume. Dull on purpose. Every one of these is the sort of file
// a shift mechanic on a mid-silo floor would actually be carrying around, and
// none of them is a hint.
const TREE={
  // /LIBRARY is in the root's children the whole time and is filtered out of
  // every listing until it has been asked for, so that finding it puts it
  // where it always was rather than conjuring a directory into existence.
  '/':{node:dir('/','PORTABLE STORE 18'),children:['/ORDERS','/SHIFTS','/PARTS','/READ.ME','/LIBRARY']},
  '/ORDERS':{node:dir('ORDERS','WORK ORDERS · CLOSED'),children:['/ORDERS/W-4471.TXT','/ORDERS/W-4488.TXT','/ORDERS/W-4502.TXT']},
  '/ORDERS/W-4471.TXT':{node:file('W-4471.TXT',1204,'Y42 D118','CIRC PUMP 3 — SEAL',
    'ORDER W-4471  CLOSED\nCIRCULATION PUMP 3, LOWER GALLERY.\nMECHANICAL SEAL WEEPING AT 40 ML/HR.\nSEAL REPLACED. FACE SCORED — SEE PARTS.\nSIGNED: WILKINS, G.')},
  '/ORDERS/W-4488.TXT':{node:file('W-4488.TXT',962,'Y42 D131','FAN 11 — BEARING',
    'ORDER W-4488  CLOSED\nEXTRACT FAN 11. BEARING NOISE ON RUN UP.\nBEARING PACKED. NOISE UNCHANGED.\nRECOMMEND REPLACE, NOT REPACK.\nSIGNED: WILKINS, G.')},
  '/ORDERS/W-4502.TXT':{node:file('W-4502.TXT',1477,'Y42 D144','LINE PRESSURE — NO FAULT FOUND',
    'ORDER W-4502  CLOSED\nREPORTED PRESSURE DROP, RISER 4.\nWALKED THE LINE. GAUGES AGREE.\nNO FAULT FOUND. RECOMMEND CLOSE.\nSIGNED: WILKINS, G.\n\n— WALKED IT TWICE.')},
  '/SHIFTS':{node:dir('SHIFTS','SHIFT LOG · 90 DAYS'),children:['/SHIFTS/LOG.TXT','/SHIFTS/HOURS.TAB']},
  '/SHIFTS/LOG.TXT':{node:file('LOG.TXT',8840,'Y42 D144','ROLLING LOG',
    'D138 NIGHTS. QUIET.\nD139 NIGHTS. QUIET.\nD140 DAYS. PUMP 3 AGAIN.\nD141 DAYS. STORES SHUT AT 1400, NO REASON GIVEN.\nD142 OFF.\nD143 DAYS. QUIET.\nD144 DAYS.')},
  '/SHIFTS/HOURS.TAB':{node:file('HOURS.TAB',612,'Y42 D144','HOURS RETURNED','TABULAR DATA. 90 ROWS. NOTHING MARKED.')},
  '/PARTS':{node:dir('PARTS','COUNTS AND ORDERS'),children:['/PARTS/COUNT.TAB','/PARTS/SHORT.TXT']},
  '/PARTS/COUNT.TAB':{node:file('COUNT.TAB',4096,'Y42 D140','BIN COUNT','TABULAR DATA. 214 ROWS.')},
  '/PARTS/SHORT.TXT':{node:file('SHORT.TXT',388,'Y42 D140','SHORT LIST',
    'SEAL FACES 40MM — NONE IN STORES.\nBEARING 6204 — NONE IN STORES.\nCOPPER LINE 8MM — ASK SUPPLY. AGAIN.')},
  '/READ.ME':{node:file('READ.ME',204,'Y41 D002','VOLUME NOTE',
    'PORTABLE STORE 18.\nMECHANICAL. IF FOUND, RETURN TO SHIFT OFFICE.\nDO NOT REFORMAT.')},

  // Concealed. It is in the volume the whole time; the machine simply does not
  // admit it exists until it is asked for by name.
  '/LIBRARY':{hidden:true,node:dir('LIBRARY','—'),children:['/LIBRARY/INDEX','/LIBRARY/SCHEMATIC.GAS','/LIBRARY/NOTES.TXT','/LIBRARY/TRADE.TXT']},
  '/LIBRARY/INDEX':{node:file('INDEX',96,'—','VOLUME INDEX',
    'FOUR ENTRIES.\nNONE OF THEM ARE MINE.\nIF YOU ARE READING THIS I AM ALREADY IN THE RECORD.')},
  '/LIBRARY/SCHEMATIC.GAS':{node:file('SCHEMATIC.GAS',15628,'—','LINE SCHEMATIC · SEE VIEWER',null),blueprint:true},
  '/LIBRARY/NOTES.TXT':{node:file('NOTES.TXT',2210,'—','WORKING NOTES',
    'THE LINE IS NOT ON THE MAINTENANCE PLAN.\nIT IS ON THE STRUCTURAL PLAN, AND THE STRUCTURAL PLAN IS NOT ISSUED.\nIT RUNS WHERE NOBODY IS SCHEDULED TO WALK.\n\nIT IS FED, NOT VENTED. WHATEVER IT CARRIES COMES FROM SOMEWHERE\nAND IS MEANT TO ARRIVE SOMEWHERE.\n\nI HAVE NOT OPENED IT AND I AM NOT GOING TO.')},
  '/LIBRARY/TRADE.TXT':{node:file('TRADE.TXT',540,'—','WHAT IT COST',
    'ONE BOOK OF PHOTOGRAPHS, OUT.\nONE DRIVE, IN.\nHE SAID IT WAS THE BETTER HALF OF THE TRADE.\nHE WAS RIGHT AND HE KNEW IT.')},
};

// The gas line, as structured data rather than prose, so the host can draw it
// as a schematic and so every line of it can be checked.
//
// PROVENANCE. This build makes no claim about where a gas line runs in the
// television silo or in the books, because nothing in the material this
// reconstruction is built from establishes one. What the source material does
// establish is the general fact the schematic is dangerous for knowing — that
// the silo's own systems can be turned on the people inside it. Everything
// below that is geometry, and all of the geometry is this game's invention. It
// is labelled as such in the data itself, not only in the documentation,
// because the player reads the data and not the documentation.
// See docs/george-terminal.md.
export const BLUEPRINT=Object.freeze({
  id:'gas-line',
  title:'DISTRIBUTION LINE — UNSCHEDULED',
  subtitle:'STRUCTURAL PLAN SHEET 11 OF 14 · NOT ISSUED TO MAINTENANCE',
  sourceStatus:'Reconstructed for this game',
  established:Object.freeze([
    'That the silo holds systems its own people are not shown, and that they can be used against them, is the premise the source material establishes.',
  ]),
  reconstructed:Object.freeze([
    'Every route, level, junction and dimension on this sheet.',
    'The sheet number, the plan series and the notation.',
    'The existence of a distribution line at these positions in Silo 18.',
  ]),
  components:Object.freeze([
    {id:'source',label:'SOURCE VESSEL',note:'Below the last numbered floor, off the maintenance plan.',status:'Reconstructed for this game'},
    {id:'riser',label:'RISER',note:'One continuous run inside a structural void. No access doors on the drawing.',status:'Reconstructed for this game'},
    {id:'valve',label:'ISOLATION VALVE',note:'Motorised. No local handwheel. Not on any inspection round.',status:'Reconstructed for this game'},
    {id:'branch',label:'FLOOR BRANCHES',note:'One per numbered level, terminating behind the gallery soffit.',status:'Reconstructed for this game'},
    {id:'head',label:'DIFFUSER HEADS',note:'Flush. Drawn as ventilation on the issued sheets.',status:'Reconstructed for this game'},
  ]),
  route:Object.freeze([
    {step:1,clue:'The riser is drawn as structure, not as pipework. It is on a sheet maintenance is not issued.'},
    {step:2,clue:'It crosses no landing and no walkway. Nobody is scheduled to be anywhere it can be seen.'},
    {step:3,clue:'The branches stop behind the soffit. On the issued sheets that run is extract ventilation.'},
    {step:4,clue:'The valve is powered and has no handwheel. It is not opened from the floor it serves.'},
  ]),
  tools:Object.freeze([
    'A soffit key, or something flat enough to lift a panel without marking it.',
    'A pressure gauge that reads low and can be left in place.',
    'The issued ventilation sheet, to hold against this one.',
  ]),
  warnings:Object.freeze([
    'RED. POSSESSION IS SUFFICIENT.',
    'DO NOT BREAK INTO THE LINE. IF IT IS CHARGED YOU WILL NOT GET A SECOND READING.',
    'THIS SHEET IS A RECONSTRUCTION. TREAT EVERY POSITION ON IT AS UNVERIFIED.',
  ]),
});

const NO_MEDIA='NO MEDIA. INSERT CARTRIDGE AND RESTART.';
const parent=path=>path==='/'?null:(path.slice(0,path.lastIndexOf('/'))||'/');
const entry=path=>TREE[path];

export class GeorgeTerminal{
  constructor(){this.reset();}
  reset(){
    this.drive=false;this.booted=false;this.found=false;this.opened=false;
    this.path='/';this.file=null;this.query='';this.notice='';
  }

  // --- the machine ---------------------------------------------------------
  // Inserting is not discovering. The drive mounts and the volume looks like
  // what it says it is; nothing here advances anything.
  insertDrive(hasHardDrive){
    if(!hasHardDrive)return false;
    if(this.drive)return true;
    this.drive=true;this.notice='CARTRIDGE SEATED.';return true;
  }
  ejectDrive(){
    const had=this.drive;
    this.reset();
    this.notice=had?'CARTRIDGE RELEASED.':'';
    return had;
  }
  boot(){
    this.booted=true;this.file=null;this.path='/';this.query='';
    this.notice=this.drive?'VOLUME MOUNTED. 1 OF 1.':NO_MEDIA;
    return this.state;
  }

  list(path='/'){
    if(!this.mounted)return this.view;
    const target=entry(path)&&entry(path).children?path:'/';
    // The concealed volume can be walked into once it is known about, and not
    // before: opening it by name without asking for it is the shortcut this
    // whole machine exists to refuse.
    if(this.blocked(target)){this.notice='NO SUCH DIRECTORY.';return this.view;}
    this.path=target;this.file=null;this.notice='';
    return this.view;
  }

  // A search is a decision. It costs the player nothing but the thought, and
  // that thought is the entire discovery.
  search(query){
    this.query=String(query??'');
    if(!this.mounted)return this.view;
    const q=this.query.trim().toLowerCase();
    this.file=null;
    if(!q){this.notice='NOTHING TO FIND.';return this.view;}
    if(q.includes(KEY)){
      this.found=true;
      this.notice='1 MATCH. NOT INDEXED.';
    }else{
      this.notice=`NO MATCH FOR "${q.toUpperCase()}".`;
    }
    return this.view;
  }

  open(path){
    if(!this.mounted)return this.view;
    const found=entry(path);
    if(!found||this.blocked(path)){this.notice='NO SUCH FILE.';return this.view;}
    if(found.children){
      if(path==='/LIBRARY')this.opened=true;
      this.path=path;this.file=null;this.notice='';
      return this.view;
    }
    this.file=path;this.path=parent(path);this.notice='';
    return this.view;
  }

  back(){
    if(!this.mounted)return this.view;
    if(this.file){this.file=null;this.notice='';return this.view;}
    const up=parent(this.path);
    if(up)this.path=up;
    this.notice='';return this.view;
  }

  // --- derived state -------------------------------------------------------
  get mounted(){return this.drive&&this.booted;}
  get state(){
    if(!this.booted)return 'off';
    if(!this.drive)return 'no-media';
    if(this.file)return 'reading';
    return this.found?'revealed':'mounted';
  }
  // A path is blocked when it lies inside the concealed volume and the
  // concealed volume has not been asked for.
  blocked(path){return !this.found&&(path==='/LIBRARY'||path.startsWith('/LIBRARY/'));}

  rows(){
    const here=entry(this.path);
    if(!here||!here.children)return [];
    const rows=[];
    for(const child of here.children){
      const found=entry(child);
      if(!found||found.hidden&&!this.found)continue;
      rows.push({id:child,name:found.node.name,kind:found.node.kind,
        size:found.node.size??null,modified:found.node.modified??'—',
        detail:found.node.detail,concealed:!!found.hidden});
    }
    // The concealed volume, once known, is a search result rather than a
    // directory that was always there: it is listed last and marked.
    return rows;
  }

  get view(){
    const state=this.state,here=entry(this.path),open=this.file?entry(this.file):null;
    const crumbs=this.path==='/'?['/']:['/'].concat(this.path.split('/').filter(Boolean));
    if(this.file)crumbs.push(open.node.name);
    const view={
      state,
      title:state==='off'?'SILO 18 · TERMINAL':state==='no-media'?'SILO 18 · TERMINAL':
        this.file?open.node.name:here?`PORTABLE STORE 18 · ${here.node.name}`:'PORTABLE STORE 18',
      breadcrumb:state==='off'||state==='no-media'?[]:crumbs,
      rows:state==='off'||state==='no-media'?[]:this.file?[]:this.rows(),
      body:this.file?(open.node.body??null):null,
      status:this.status(),
      canSearch:this.mounted&&!this.file,
      query:this.query,
      driveInserted:this.drive,
      blueprint:this.file==='/LIBRARY/SCHEMATIC.GAS'?BLUEPRINT:null,
    };
    return view;
  }
  status(){
    if(this.notice)return this.notice;
    switch(this.state){
      case 'off':return this.drive?'CARTRIDGE SEATED. PRESS START.':'READY.';
      case 'no-media':return NO_MEDIA;
      case 'reading':return 'END OF FILE.';
      case 'revealed':return this.path.startsWith('/LIBRARY')?'UNINDEXED VOLUME.':'1 UNINDEXED MATCH.';
      default:return `${this.rows().length} ENTRIES.`;
    }
  }

  // --- persistence ---------------------------------------------------------
  save(){return {drive:this.drive,booted:this.booted,found:this.found,opened:this.opened,path:this.path,file:this.file,query:this.query};}
  // A save is player-editable data, so it is treated as a claim rather than as
  // state. Each step is restored only if every step before it was restored
  // too, which means a crafted save cannot hand somebody the schematic without
  // the drive, the boot and the search that are supposed to earn it.
  static load(saved){
    const t=new GeorgeTerminal();
    if(!saved||typeof saved!=='object')return t;
    t.drive=saved.drive===true;
    t.booted=t.drive&&saved.booted===true;
    t.found=t.booted&&saved.found===true;
    t.opened=t.found&&saved.opened===true;
    t.query=typeof saved.query==='string'?saved.query.slice(0,80):'';
    const path=typeof saved.path==='string'?saved.path:'/';
    t.path=t.mounted&&entry(path)?.children&&!t.blocked(path)?path:'/';
    const file=typeof saved.file==='string'?saved.file:null;
    t.file=file&&t.mounted&&entry(file)&&!entry(file).children&&!t.blocked(file)&&parent(file)===t.path?file:null;
    return t;
  }
}
