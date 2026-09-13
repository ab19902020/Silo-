import { wrapHour, formatClock } from './silo-time.js';
import { WORK_ROLES, NAMED_DUTIES, PERSONAL_ROUNDS } from './work-roles.js';

// Original work rosters for the game, driven by the same clock as the lamps.
export const JOBS=Object.freeze({
  porter:{title:'Porter',tool:'parcel',tasks:['Collecting signed parcels','Delivering supplies','Checking delivery receipts'],sound:'gate'},
  mechanical:{title:'Maintenance engineer',tool:'spanner',tasks:['Inspecting a bearing','Tightening a service coupling','Recording a pressure reading'],sound:'clank'},
  farm:{title:'Crop worker',tool:'basket',tasks:['Sorting the harvest','Checking irrigation','Packing vegetables for the kitchens'],sound:'drop'},
  medical:{title:'Medical orderly',tool:'clipboard',tasks:['Checking the treatment list','Sorting clean dressings','Recording supplies for the next shift'],sound:'gate'},
  it:{title:'IT technician',tool:'clipboard',tasks:['Checking a terminal log','Inspecting a circuit board','Recording a service fault'],sound:'clank'},
  security:{title:'Security officer',tool:'clipboard',tasks:['Checking the duty book','Inspecting the gallery','Taking a witness statement'],sound:'door'},
  kitchen:{title:'Kitchen worker',tool:'tray',tasks:['Clearing the serving counter','Preparing the next meal','Collecting returned dishes'],sound:'chairs'},
  trader:{title:'Market worker',tool:'parcel',tasks:['Checking incoming stock','Serving a customer','Counting the day’s receipts'],sound:'drop'},
  cleaner:{title:'Cleaning attendant',tool:'cloth',tasks:['Wiping a work surface','Collecting used cloths','Checking the cleaning round'],sound:'chairs'},
  laundry:{title:'Laundry worker',tool:'basket',tasks:['Sorting clean linen','Folding the next collection','Checking a laundry ticket'],sound:'gate'},
  water:{title:'Water technician',tool:'spanner',tasks:['Checking a valve','Reading a flow gauge','Inspecting a pump seal'],sound:'clank'},
  recycling:{title:'Reclamation worker',tool:'parcel',tasks:['Sorting reusable parts','Checking a salvage manifest','Packing reclaimed material'],sound:'drop'},
  miner:{title:'Mine worker',tool:'spanner',tasks:['Checking a drill fitting','Inspecting the supports','Preparing a tool for the next crew'],sound:'clank'},
  clerk:{title:'Records clerk',tool:'clipboard',tasks:['Checking a requisition','Updating the work ledger','Preparing the next shift’s paperwork'],sound:'gate'},
  teacher:{title:'Teaching assistant',tool:'clipboard',tasks:['Preparing a lesson','Checking exercise books','Returning classroom materials'],sound:'chairs'},
  community:{title:'Community attendant',tool:'clipboard',tasks:['Checking on a neighbour','Organising household requests','Helping with the floor register'],sound:'door'},
});
const NAMED={juliette:'mechanical',sims:'security',bernard:'it',walker:'mechanical',knox:'mechanical',shirley:'mechanical',cooper:'mechanical',teddy:'mechanical',billings:'security',hank:'security',marnes:'security',amundsen:'security',jahns:'clerk',meadows:'clerk',carla:'trader',patrick:'trader',pete:'medical',gloria:'community',lukas:'it',camille:'community'};
const KIND={engineer:'mechanical',workshop:'mechanical',generator:'mechanical',utility:'mechanical',supply:'trader',bazaar:'trader',shopper:'trader',cafeteria:'kitchen',diner:'kitchen',janitorial:'cleaner',residential:'community',office:'clerk',judicial:'security',sheriff:'security',vault:'it',surveillance:'security',park:'farm',bar:'kitchen',school:'teacher',mines:'miner'};
export function identitySeed(id){let n=2166136261;for(const c of String(id))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
export function assignWorkday(resident){
  const seed=NAMED[resident.id]?identitySeed(resident.id):Number.isFinite(resident.seed)?resident.seed:identitySeed(resident.id),raw=resident.kind||resident.type;
  // Table workers bring mending and paperwork to the cafeteria; gallery workers
  // have rounds suited to public spaces rather than fictional machines in a wall.
  const shared=raw==='diner'?['clerk','teacher','laundry']:['cleaner','mechanical','clerk','community','laundry'];
  const job=NAMED[resident.id]||(['resident','residential','diner'].includes(raw)?shared[seed%shared.length]:null)||KIND[raw]||(JOBS[raw]?raw:null)||shared[seed%shared.length];
  const roles=WORK_ROLES[job],specialty=roles[Math.floor(seed/7)%roles.length];
  const essential=['porter','mechanical','water','medical','security','it','kitchen'].includes(job);
  const shift=resident.shift??(essential?seed%3:0),start=wrapHour(6+shift*8+(seed%7)*.08);
  const level=resident.definition?.level??resident.level??144,wing=resident.wing??seed%6,place=typeof level==='number'?`Level ${level}, wing ${String.fromCharCode(65+wing)}`:level==='generator'?'generator hall':'mine working';
  const station=raw==='diner'?`cafeteria table ${1+seed%20}`:`${place}, round ${1+seed%12}`;
  const personal=PERSONAL_ROUNDS[Math.floor(seed/13)%PERSONAL_ROUNDS.length];
  return {job,title:resident.definition?.role||resident.role||specialty.title,specialty:NAMED_DUTIES[resident.id]?(resident.definition?.role||resident.role||specialty.title):specialty.title,seed,start,end:wrapHour(start+8),homeLevel:level,workLevel:level,station,
    tool:/mend|cloth/i.test(specialty.title)?'cloth':/clerk|registrar|keeper|tutor/i.test(specialty.title)?'clipboard':JOBS[job].tool,
    tasks:NAMED_DUTIES[resident.id]||specialty.tasks,personal,assignment:`${resident.id}: ${station}`,
    timetable:[{at:start,activity:'work'},{at:wrapHour(start+2.25),activity:'break'},{at:wrapHour(start+2.55),activity:'work'},{at:wrapHour(start+4.3),activity:'meal'},{at:wrapHour(start+4.85),activity:'work'},{at:wrapHour(start+8),activity:'errand'},{at:wrapHour(start+10),activity:'off-duty'},{at:wrapHour(start+15),activity:'rest'}]};
}
export function workAt(roster,hour){
  const elapsed=wrapHour(hour-roster.start);let phase='work';
  if(elapsed>=15)phase='rest';else if(elapsed>=10)phase='off-duty';else if(elapsed>=8)phase='errand';else if(elapsed>=4.3&&elapsed<4.85)phase='meal';else if(elapsed>=2.25&&elapsed<2.55)phase='break';
  const tasks=roster.tasks||JOBS[roster.job].tasks,taskIndex=(Math.floor(elapsed*3)+roster.seed)%tasks.length;
  const labels={work:tasks[taskIndex],break:'Taking a water break',meal:'Having a meal',errand:roster.personal[0], 'off-duty':roster.personal[1],rest:'Rest period — keeping things quiet'};
  return {phase,task:labels[phase],taskIndex,job:roster.job,title:roster.title,onDuty:phase==='work',shift:`${formatClock(roster.start)}–${formatClock(roster.end)}`};
}
export function workConversation(roster,current){
  return {id:'daily-work',label:'What are you doing today?',reply:`${current.task}. I’m responsible for ${roster.specialty.toLowerCase()} work at ${roster.station}. My shift is ${current.shift}.`,follow:[
    {id:'shift-roster',label:'What does your day look like?',reply:`Work starts at ${formatClock(roster.start)}. A short break at ${formatClock(roster.start+2.25)}, food at ${formatClock(roster.start+4.3)}, then I hand over at ${formatClock(roster.end)}. Afterwards: ${roster.personal[0].toLowerCase()}.`},
    {id:'current-task',label:'What is next?',reply:current.onDuty?roster.tasks[(current.taskIndex+1)%roster.tasks.length]+'. That is the next thing on my round.':'My next shift starts at '+formatClock(roster.start)+'. Until then, I’m '+roster.personal[1].toLowerCase()+'.'},
  ]};
}
