// Original game dialogue, not transcribed television lines. Answers stay within
// each resident's knowledge and the opening-era setting.
const voices={
  juliette:['I keep the machines running. If something sounds wrong, it usually is.','Start in Mechanical. Walker can show you what everyone upstairs depends on.','I knew Holston. I am still trying to understand why he went out.'],
  sims:['Judicial keeps order. Most people can live their lives because we do our work.','The public galleries are open. Restricted offices are another matter.','The cleaning is over. Let the families have their privacy.'],
  bernard:['IT protects the systems that keep this place functioning. Records, terminals, the network.','If you need a department, use the directory. A missing record should be reported.','The screens are there so people can see for themselves.'],
  walker:['Bring me the broken part before you throw it down a chute. We might get another year out of it.','My bench is in Mechanical, all the way down. Mind the loose parts.','I would rather listen to a machine. At least you can work out why it stopped.'],
  knox:['Mechanical keeps the generator steady. Heat, power, pumps — people notice us when one stops.','Keep the main work lanes clear. The generator hall is below the last numbered floor.','We still have a shift to finish. The lights cannot go out while everyone is watching.'],
  shirley:['There is always another seal to replace. You learn to tell the harmless rattles from the expensive ones.','Look for the work lamps down in Mechanical. Stay clear of the moving machinery.','Juliette has enough on her mind. Give her room.'],
  jahns:['I try to hear from every part of the silo. A report upstairs rarely tells the whole story.','Walk a few floors before you choose a destination. You learn more that way.','A cleaning leaves a silence behind it. People need time.'],
  marnes:['I work with the sheriff. Most days it is disputes, paperwork and keeping people out of trouble.','The station is beside this cafeteria. The preparation rooms are farther through.','Holston was a good man. I do not have an explanation that makes this easier.'],
  billings:['I have worked in Judicial and in the sheriff’s office. Procedure matters when people are frightened.','If you are looking for help, start at the station next to the cafeteria.','I would rather speak about what we know than add another rumour.'],
  lukas:['I work with systems. In the evenings I try to make sense of the lights in the sky.','Come back to the cafeteria after dark. You can see the stars on a clear night.','I keep watching the same view and finding things I missed.'],
  camille:['My family comes first. You learn to pay attention to what people leave unsaid.','The galleries connect the homes and departments. You do not have to hurry through them.','There are people in this room who knew them. Listen before you ask.'],
  meadows:['Judicial settles disputes and administers the Pact. The weight of it is not always visible from the gallery.','The Judicial offices are on Level 14. Not every conversation belongs in a corridor.','A screen can show you an event without explaining a person.'],
  carla:['Supply finds the parts. Mechanical reminds us how urgently they need them.','If you have something useful, keep it intact. Repairable is better than scrap.','People still need their meals, their shifts and their deliveries.'],
  patrick:['I repair things. Sometimes I find things that somebody else stopped looking for.','The bazaar is worth a visit. Look down the side aisles, not just at the front counters.','Questions travel quickly here. Be careful which ones you ask loudly.'],
  pete:['I am a physician. There is more to looking after someone than what appears on a chart.','Medical is on Level 62. Ask at the desk before entering a treatment room.','I would rather not discuss another family’s grief in the corridor.'],
  gloria:['I used to help families. Now people often assume I have nothing left to remember.','Sit for a moment. Everyone seems to be on their way somewhere.','Remember the people. Not just the way they left.'],
  hank:['I am a deputy down here. People know each other, so most trouble finds me without a report.','The lower galleries lead into Mechanical. Follow the floor numbers if you lose your way.','We heard. It feels far away until you see everyone watching the same screen.'],
  cooper:['I am learning the machinery. Knowing the name of a part is easier than getting it back into place.','Start with the walkways in Mechanical. Ask before touching a control.','I did not know them. I saw how quiet everyone went.'],
  teddy:['Mechanical. If it rattles, leaks or needs carrying, someone will find me.','There are work areas below the last level. Keep to the marked platforms.','Nobody down here stopped working for long. That does not mean nobody cared.'],
  amundsen:['Judicial security. Keep the passages clear and there should not be a problem.','Public areas are in the directory. A locked room is locked for a reason.','There is nothing to be gained from spreading guesses.'],
};
const trades={
  porter:['Deliveries. You get to know the stairs very well in this job.','The bridge changes direction from floor to floor. Keep an eye on the next landing.'],
  diner:['I have a break before my next shift. Usually there is more conversation in here.','The station is through the side of the cafeteria. The directory is in the book.'],
  bazaar:['Repairs and exchanges. Very little down here is too old to be useful.','There are shops down the side aisles as well as the main bazaar street.'],
  farm:['I work with the crops. Water, light and patience; you cannot hurry the last one.','Agriculture has several working areas. Leave the growing beds undisturbed.'],
  medical:['I help in Medical. We have to stretch every clean sheet and every piece of equipment.','The treatment rooms open from the department corridor. Someone at the desk can help.'],
  mechanical:['Machinery and maintenance. You can feel the generator through the floor down here.','Mechanical is on the lowest numbered level, with the generator hall beneath it.'],
  mines:['Mining shift. The rock makes us work for every useful piece.','Stay inside the supported passage. There is a drill at the working end.'],
  it:['Systems and records. A quiet terminal does not always mean nothing is happening.','IT is on Level 19. Ask at the entrance before going into a work room.'],
  water:['Pumps, filters and pipework. A small leak becomes everyone’s problem if we leave it.','Water treatment is on Level 55. You can see the circulation equipment there.'],
  recycling:['We sort what comes down and save whatever can be used again.','Try Supply or the bazaar before throwing away something repairable.'],
};
export function conversationFor(resident,{cleaned=false,playerName=''}={}){
  const id=resident.id,raw=resident.kind||resident.appearance?.outfit||'resident',kind=({engineer:'mechanical',workshop:'mechanical',miner:'mines',cafeteria:'diner'}[raw]||raw),lines=voices[id]||[...(trades[kind]||['I live and work here, like everyone else. Each floor has its own routines.','The galleries take you around a level; the central stairs take you between them.']),'It was quiet after the cleaning. Some people stayed to watch the hill.'];
  const greeting=id==='walker'&&playerName.includes('Juliette')?'Jules. Come here. What have you broken this time?':id==='shirley'&&playerName.includes('Juliette')?'There you are. I was wondering where you had got to.':cleaned?'You saw the cleaning too?':'Morning. Have you found where you are going?';
  return {name:resident.name,role:resident.role||({diner:'Cafeteria resident',porter:'Porter',bazaar:'Bazaar trader'}[kind]||'Silo resident'),greeting,topics:[{id:'work',label:'What do you do here?',reply:lines[0]},{id:'places',label:'Where should I look around?',reply:lines[1]},{id:'cleaning',label:cleaned?'About Holston’s cleaning…':'Why is everyone watching?',reply:cleaned?lines[2]:'There is a cleaning today. People gather here to watch the outside screen.'}]};
}
