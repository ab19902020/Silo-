import { SIDE_MISSIONS } from './side-missions.js';
// Uses the existing satchel: no unsolicited mission panel during play.
export function renderSideJournal(list,missions){
  const el=(tag,text,className)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;};
  const section=el('section',null,'journal-chapters side-stories');
  section.append(el('h3',`Life in the silo · ${missions.active} open · ${missions.completed} complete`));
  if(missions.carried.length)section.append(el('p','Carrying for residents: '+missions.carried.join(' · '),'journal-hint'));
  const records=missions.journal();
  if(!records.length){section.append(el('p','Small favours begin in conversation. Ask Walker (144 B), Carla (126 C) or Lukas (19 C). Their correspondence stands are outside those wings, so every playable character can take part.','journal-hint'));}
  for(const q of records){
    const row=el('article',null,`journal-chapter ${q.complete?'done':'now'}`),copy=el('div');
    row.append(el('span',q.complete?'✓':'•'));copy.append(el('strong',q.title),el('p',q.objective));
    const notes=el('details'),summary=el('summary','Read collected clues and replies');notes.append(summary);
    for(const text of q.notes)notes.append(el('p',text));
    if(q.id==='sky'&&q.stage>=2)notes.append(observationChart());
    copy.append(notes);row.append(copy);section.append(row);
  }
  const unseen=Object.entries(SIDE_MISSIONS).filter(([id])=>missions.stages[id]===0);
  if(records.length&&unseen.length){const d=el('details');d.append(el('summary','Other residents with requests'));for(const [,q]of unseen)d.append(el('p',q.contact));section.append(d);}
  list.append(section);
}
export function observationChart(){
  const ns='http://www.w3.org/2000/svg',make=(tag,attrs)=>{const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
  const svg=make('svg',{viewBox:'0 0 320 128',role:'img','aria-label':'Timed observations: three evenly spaced light marks shift right while the tree reference remains fixed.',width:'100%',style:'max-width:420px;display:block;margin-top:12px;background:#16201b;border:1px solid #526758;border-radius:6px'});
  const title=make('title',{});title.textContent='Lukas’s archived observations';svg.append(title);
  svg.append(make('line',{x1:195,y1:10,x2:195,y2:110,stroke:'#cdb578','stroke-width':2}));
  for(const [i,marks]of [[18,30,42],[26,38,50],[34,46,58]].entries()){
    const y=25+i*32,label=make('text',{x:12,y:y+4,fill:'#bdcbbb','font-size':12});label.textContent=['2200','2300','0000'][i];svg.append(label);
    svg.append(make('line',{x1:65,y1:y,x2:305,y2:y,stroke:'#344638'}));
    for(const p of marks)svg.append(make('circle',{cx:70+p*2.5,cy:y,r:4,fill:'#e3e9cf'}));
  }
  const label=make('text',{x:195,y:122,fill:'#cdb578','text-anchor':'middle','font-size':10});label.textContent='Fixed tree mark';svg.append(label);return svg;
}
