// Original incidental histories; named characters retain their established
// occupations and relationships. These are game dialogue, not show quotations.
const histories={
  juliette:['My father works in Medical. I went down to Mechanical. We found different ways to fix things.','George could make a discarded thing feel important. I still catch myself wanting to show him something.'],
  walker:['People bring their radios here. A little box lets you hear a familiar voice without leaving your room.','Carla understands what a useful part is worth. We have had enough arguments over them to prove it.'],
  lukas:['After a shift I used to sit in the cafeteria and draw the moving lights. Nobody had asked me to.','A pattern means more when you notice it yourself. I kept the drawings even when I had no explanation.'],
  billings:['Kathleen and our child give me a reason to go home. I try to remember that everyone I question has a home too.','I learned procedure in Judicial. Following it and understanding it are different kinds of work.'],
  bernard:['Most people only think about IT when something has failed. I prefer the days when nobody thinks about us.','Responsibility does not finish when a shift ends. Some records must stay with the person entrusted with them.'],
  shirley:['Juliette belongs down here with us. We have spent too many shifts keeping one another out of trouble.','You learn a person by watching them work. Who checks a fitting twice; who leaves you the good wrench.'],
  knox:['I answer for the people working below the last landing. A missed repair upstairs reaches us eventually.','Shirley will tell you when something is wrong. That is a useful quality in a place full of people who keep quiet.'],
  pete:['Juliette is my daughter. Being able to treat a patient does not teach you how to speak to your own child.','I have spent a lifetime looking at charts. They leave an extraordinary amount out.'],
  gloria:['I remember families before they became entries in a record. That is what people forget about this work.','Someone once trusted me with a question. I still think remembering the question matters.'],
  marnes:['Holston and I worked together. After enough shifts you stop needing to explain every glance.','Jahns listens before she makes up her mind. I have seen how much walking that costs her.'],
  jahns:['Every landing has people who feel the floors above never listen. Going to them matters.','Marnes has a practical answer for almost everything. Sometimes that is exactly what a long day needs.'],
  sims:['Camille and our son are my family. You cannot separate what I do from wanting them safe.','I learned to notice who goes quiet when a door opens. Work follows you home that way.'],
  camille:['Robert and I have a son. When people speak about the future, that is who I picture.','A home is more than a door you can close. You have to pay attention to what comes through it.'],
  carla:['Supply and Mechanical depend on each other, however much the paperwork suggests otherwise.','Walker sees a circuit where other people see scrap. I have learned to keep certain things aside.'],
  patrick:['Repair work teaches you what people value. It is often the thing they are most reluctant to explain.','Something can be worthless on an inventory and irreplaceable to its owner.'],
  meadows:['There are things in an office that tell you more than its official records. Some are best left where they are.','A title can make people mistake your silence for certainty.'],
};
function hash(value){let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export function personalHistory(person){
  if(histories[person.id])return histories[person.id];
  const n=hash(person.id||person.name),level=Number.isInteger(person.level)?person.level:144;
  const beginnings=['My mother repaired clothes. She taught me to turn a worn cuff before replacing it.','I shared a room with two brothers growing up. A quiet corner still feels like a luxury.','My first job was carrying deliveries. I knew people by the sound of their doors.','My father kept a little notebook of repairs. I still use his measurements.','I learned to read from the notices outside our gallery. Now I stop to read every one.','My grandmother grew herbs in an old tin. I have kept the tin longer than any of the plants.'];
  const habits=['I mend clothes for a neighbour after shift. They bring supper; I bring the needle.','There is a loose stair near home. I keep meaning to put in the repair request myself.','I save a seat for a friend on rest days. Sometimes sitting together is enough.','I keep a tally of the repairs I have finished. It helps on days when another three things break.','I take the long way home to hear the music outside the common room.','I draw the gallery from my doorway. You start noticing all the small changes.'];
  return [beginnings[n%beginnings.length]+` Home is around Level ${level}.`,habits[Math.floor(n/7)%habits.length]];
}

// Visits and selected topics persist independently from the story checkpoint.
// Bounded storage; malformed or unavailable local storage never blocks play.
export class ConversationMemory{
  constructor(storage=null){this.storage=storage;this.records=Object.create(null);try{const data=JSON.parse(storage?.getItem('silo18-conversations')||'{}');if(data&&typeof data==='object'&&!Array.isArray(data))for(const [key,value] of Object.entries(data).slice(-160))if(value&&Number.isSafeInteger(value.visits)&&value.visits>=0)this.records[key]={visits:value.visits,topics:Object.fromEntries(Object.entries(value.topics||{}).filter(([k,v])=>k.length<80&&Number.isSafeInteger(v)&&v>=0))};}catch{}}
  record(id){const key=String(id||'resident').slice(0,100);if(!Object.hasOwn(this.records,key))Object.defineProperty(this.records,key,{value:{visits:0,topics:{}},enumerable:true,configurable:true});return this.records[key];}
  visit(id){const r=this.record(id),n=r.visits++;this.save();return n;}
  reply(id,topic){const r=this.record(id),lines=topic.replies||[topic.reply],n=Object.hasOwn(r.topics,topic.id)?r.topics[topic.id]:0;Object.defineProperty(r.topics,topic.id,{value:n+1,writable:true,enumerable:true,configurable:true});this.save();return lines[n%lines.length];}
  save(){const keys=Object.keys(this.records);for(const key of keys.slice(0,Math.max(0,keys.length-160)))delete this.records[key];try{this.storage?.setItem('silo18-conversations',JSON.stringify(this.records));}catch{}}
}

export function residentName(seed){
  const first=['Ada','Jonah','Mira','Ellis','Nell','Isaac','Ruth','Tomas','Leah','Eli','Mara','Theo','Cora','Arun','June','Owen'];
  const last=['Vale','Reed','Hale','Moss','Ward','Cole','Finch','Bell','Pike','Ash','Rowe','Hill'];
  return `${first[seed%first.length]} ${last[Math.floor(seed/first.length)%last.length]}`;
}
