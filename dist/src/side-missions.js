// Optional, original stories alongside the main mystery. No main-story flags,
// weapons or relics are consumed or granted here. See docs/side-stories.md.
export const SIDE_MISSIONS=Object.freeze({
  lamp:{title:'A light for the landing',owner:'walker',contact:'Walker · Level 144 · wing B',end:7,
    objectives:[
      'Ask Walker about the landing light, or read her work-order stand outside wing B on Level 144.',
      'Read the fault plate at the service stand outside wing A on Level 140.',
      'Ask Carla for a 24-volt relay: Supply, Level 126, wing C. Her dispatch stand also accepts the request.',
      'Return to the service stand outside wing A, Level 140. Isolate its circuit.',
      'Fit the replacement relay in the isolated panel on Level 140.',
      'Close and test the repaired panel on Level 140.',
      'Tell Walker the lamp holds steady, or sign her work-order stand on Level 144, wing B.',
      'A steady light now marks the landing. Walker has signed your repair docket.',
    ]},
  parcel:{title:'The parcel without a name',owner:'carla',contact:'Carla · Level 126 · wing C',end:4,
    objectives:[
      'Ask Carla about an unclaimed parcel, or read her dispatch stand outside wing C on Level 126.',
      'Find the unclaimed parcel on the recovery stand outside wing A on Level 61.',
      'Read the torn routing label on the recovery stand, Level 61. Keep the wrapping sealed.',
      'The green cross and 062 identify Medical. Hand it to Pete on Level 62, wing A, or return it to Carla on 126, wing C.',
      'The parcel has an owner again. Its delivery is recorded.',
    ]},
  sky:{title:'Lights on the glass',owner:'lukas',contact:'Lukas · Level 19 · wing C',end:4,
    objectives:[
      'Ask Lukas about his observations, or read his correspondence stand outside wing C on Level 19.',
      'Read the three archived observation strips at the cafeteria entrance, Level 1, wing A. No need to wait for night.',
      'Compare the timed strips with Lukas on Level 19, wing C. What changed against the fixed tree mark?',
      'Choose: leave an anonymous copy at the school stand on Level 35, wing A, or ask Lukas to keep the observations private.',
      'The observations are preserved. The choice of who sees them was yours.',
    ]},
});
const step=(mission,from,to,message)=>({mission,from,to,message});
const ACTIONS=Object.freeze({
  'lamp-accept':step('lamp',0,1,'Walker pushes a docket across the bench. “One landing lamp, 140 A. People use that light to find their way home. Read the fault plate before you fetch anything.”'),
  'lamp-diagnose':step('lamp',1,2,'FAULT 140-A: supply steady; relay coil open. Replacement: 24 V. Carla at Supply, Level 126 wing C, keeps the tested spares. You copy the rating into your journal.'),
  'lamp-spare':step('lamp',2,3,'Carla checks the rating and wraps a tested relay. “Tell Walker I checked it twice. She will check it again.” The relay and an insulated service key go into your satchel.'),
  'lamp-isolate':step('lamp',3,4,'You turn the service key. The panel’s supply indicator goes dark. The isolated relay drawer can now be opened.'),
  'lamp-fit':step('lamp',4,5,'The replacement relay seats against its stop. You close the drawer and latch the cover.'),
  'lamp-test':step('lamp',5,6,'The contact closes cleanly. A warm, steady light settles over the landing. Report back to Walker on Level 144, wing B.'),
  'lamp-report':step('lamp',6,7,'Walker studies the returned reading. “Good. Someone will come up those stairs tonight and never know your name. That is a repair worth doing.” She signs your docket.'),
  'parcel-accept':step('parcel',0,1,'Carla taps a blank line in the ledger. “Recovery on 61 has a parcel with half an address. Find where it belongs. Leave it sealed; the name was lost, not the owner’s right to it.”'),
  'parcel-collect':step('parcel',1,2,'You lift the sealed cloth bundle. A torn routing slip remains clipped to the stand. Read it before choosing where to take the parcel.'),
  'parcel-label':step('parcel',2,3,'Under the torn fold: a green cross, “062”, and “clean ward linen — P. Nichols”. This is a clinic delivery, not salvage. Pete is on Level 62, wing A.'),
  'parcel-deliver':step('parcel',3,4,'Pete turns the parcel over and smiles at the stitched corner. “Our orderly mended these. I thought the bundle had been pulped.” He signs the receipt and puts the linen out for his next shift.'),
  'parcel-return':step('parcel',3,4,'Carla writes 062 into the blank space. “You could have guessed and sent it round again. You brought back an address.” She sets the bundle aside for the next Medical porter.'),
  'sky-accept':step('sky',0,1,'Lukas lowers his voice. “I copied the lights three times. My strips are at the cafeteria entrance, Level 1. The tree is my fixed mark. Tell me what moves; do not tell me what you want it to mean.”'),
  'sky-read':step('sky',1,2,'OBSERVATIONS: 2200 / 2300 / 0000. The tree mark stays at 50. The three light marks read 18–30–42, then 26–38–50, then 34–46–58. Their spacing stays the same while the whole pattern moves. Return to Lukas, 19 C.'),
  'sky-pattern':step('sky',2,3,'Lukas lays the strips edge to edge. “The same gaps. A moving pattern against a fixed hill. That is something we measured.” He offers a clean copy. “The school on 35 could use a puzzle with no answer written underneath. Or I can keep it here.”'),
  'sky-school':step('sky',3,4,'You leave the unsigned chart in the school’s collection stand. A note beside it reads: “Show your working. Questions are welcome.” The next lesson has something new to look at.'),
  'sky-private':step('sky',3,4,'Lukas folds the copy inside his notebook. “Not every question has to be asked in a crowd. I will keep looking.” The chart stays beside his correspondence stand.'),
});
const topic=(id,label,reply,follow)=>({id,label,reply,...(follow?{follow}:{})});
const actTopic=(action,label)=>({...topic('side-'+action,label,ACTIONS[action].message),sideAction:action});
export class SideMissions{
  constructor(){this.stages={lamp:0,parcel:0,sky:0};this.outcomes={};this.notes={lamp:[],parcel:[],sky:[]};}
  get carried(){
    const items=[];
    if(this.stages.lamp>=3&&this.stages.lamp<5)items.push('Tested 24-volt relay');
    if(this.stages.lamp>=3&&this.stages.lamp<7)items.push('Insulated service key');
    if(this.stages.parcel>=2&&this.stages.parcel<4)items.push('Sealed ward-linen parcel');
    if(this.stages.sky>=2&&this.stages.sky<4)items.push('Lukas’s observation strips');
    return items;
  }
  get active(){return Object.entries(this.stages).filter(([id,n])=>n>0&&n<SIDE_MISSIONS[id].end).length;}
  get completed(){return Object.entries(this.stages).filter(([id,n])=>n===SIDE_MISSIONS[id].end).length;}
  perform(action){
    const event=ACTIONS[action];
    if(!event||this.stages[event.mission]!==event.from)return {changed:false,message:'That step is already settled, or you still need the earlier clue. Your journal has the current lead.'};
    this.stages[event.mission]=event.to;this.notes[event.mission].push(event.message);
    if(event.mission==='parcel'&&event.to===4)this.outcomes.parcel=action==='parcel-deliver'?'medical':'supply';
    if(event.mission==='sky'&&event.to===4)this.outcomes.sky=action==='sky-school'?'school':'private';
    return {changed:true,message:event.message,mission:event.mission,completed:event.to===SIDE_MISSIONS[event.mission].end};
  }
  availableAt(id){
    const s=this.stages;
    if(id==='lamp-panel')return ({1:'lamp-diagnose',3:'lamp-isolate',4:'lamp-fit',5:'lamp-test'})[s.lamp]||null;
    if(id==='parcel-stand')return ({1:'parcel-collect',2:'parcel-label'})[s.parcel]||null;
    if(id==='sky-strips'&&s.sky===1)return 'sky-read';
    if(id==='school-copy'&&s.sky===3)return 'sky-school';
    return null;
  }
  topics(owner){
    const s=this.stages,out=[];
    const offer=(id,label,action,request)=>out.push(topic('side-offer-'+id,label,request,[actTopic(action,'I will help.'),topic('side-later-'+id,'Another time.','The request stays here. There is no deadline.')]));
    if(owner==='walker'){
      if(s.lamp===0)offer('lamp','That unfinished repair docket?', 'lamp-accept','“It is a little fault. That does not mean it is nobody’s problem.” Walker points to a landing number: 140 A.');
      else if(s.lamp===6)out.push(actTopic('lamp-report','The landing lamp holds steady.'));
      else out.push(topic('side-lamp-status','About the landing light…',SIDE_MISSIONS.lamp.objectives[s.lamp]));
    }
    if(owner==='carla'){
      if(s.lamp===2)out.push(actTopic('lamp-spare','Walker needs a tested 24-volt relay.'));
      if(s.parcel===0)offer('parcel','A parcel nobody will claim?', 'parcel-accept','“Lost routing slip. Still somebody’s things.” Carla has marked Recovery, 61 A, in her ledger.');
      else if(s.parcel===3)out.push(actTopic('parcel-return','Return the parcel with its recovered address.'));
      else out.push(topic('side-parcel-status','About the unclaimed parcel…',s.parcel===4?this.notes.parcel.at(-1):SIDE_MISSIONS.parcel.objectives[s.parcel]));
    }
    if(owner==='pete'&&s.parcel<3)out.push(topic('side-clinic-collections','About clinic collections…','Unclaimed deliveries are traced through Carla at Supply, Level 126, wing C. Her dispatch stand keeps the requests.'));
    if(owner==='pete'&&s.parcel===3)out.push(actTopic('parcel-deliver','A sealed linen delivery, addressed to you.'));
    if(owner==='pete'&&this.outcomes.parcel==='medical')out.push(topic('side-parcel-thanks','Did the linen reach your ward?', '“It is on the collection stand. One less thing the night orderly has to chase. Thank you.”'));
    if(owner==='lukas'){
      if(s.sky===0)offer('sky','What are those timed observations?', 'sky-accept','“Everybody looks at the hill. I kept looking above it.” Lukas asks whether you would compare his three copies.');
      else if(s.sky===2)out.push(topic('side-sky-compare','I have compared the observation strips.','“The tree is fixed. The spacing is fixed. What does that leave?”',[
        actTopic('sky-pattern','The whole pattern moves against the hill.'),
        topic('side-sky-reflection','It is a fixed reflection on the screen.','“A fixed mark would stay beside the tree. These do not. Compare the three numbered rows again.”'),
        topic('side-sky-safe','It proves the outside is safe.','“A moving light cannot tell us what the air will do. Keep the observation separate from the hope.”'),
      ]));
      else if(s.sky===3)out.push(actTopic('sky-private','Keep the chart private for now.'));
      else out.push(topic('side-sky-status','About the observations…',s.sky===4?this.notes.sky.at(-1):SIDE_MISSIONS.sky.objectives[s.sky]));
    }
    return out;
  }
  journal(){return Object.entries(SIDE_MISSIONS).filter(([id])=>this.stages[id]>0).map(([id,q])=>({id,...q,stage:this.stages[id],complete:this.stages[id]===q.end,objective:q.objectives[this.stages[id]],notes:[...this.notes[id]],outcome:this.outcomes[id]||null}));}
  save(){return {version:1,stages:{...this.stages},outcomes:{...this.outcomes}};}
  static load(saved){
    const result=new SideMissions();
    for(const [id,q]of Object.entries(SIDE_MISSIONS)){
      const n=saved?.stages?.[id];if(!Number.isInteger(n)||n<0||n>q.end)continue;
      result.stages[id]=n;
      for(const [action,e]of Object.entries(ACTIONS))if(e.mission===id&&e.to<=n){
        if(id==='parcel'&&e.to===4&&action!==(saved?.outcomes?.parcel==='medical'?'parcel-deliver':'parcel-return'))continue;
        if(id==='sky'&&e.to===4&&action!==(saved?.outcomes?.sky==='school'?'sky-school':'sky-private'))continue;
        result.notes[id].push(e.message);
      }
      if(id==='parcel'&&n===4)result.outcomes.parcel=saved?.outcomes?.parcel==='medical'?'medical':'supply';
      if(id==='sky'&&n===4)result.outcomes.sky=saved?.outcomes?.sky==='school'?'school':'private';
    }
    return result;
  }
}
