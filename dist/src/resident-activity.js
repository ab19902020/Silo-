// Small task-specific performances, with a pause between actions. All angles
// are relative to the neutral pose; equipment keeps its existing hand binding.
export function workGesture(m,tool,time){
 const cycle=(Math.sin(time*.85)+1)/2,working=Math.max(0,Math.sin(time*.85)),stroke=Math.sin(time*2.4)*working;
 m.rotate('Spine',.045);m.rotate('Head',.10);
 if(tool==='clipboard'){
  m.rotate('UpperArmR',-.27);m.rotate('ForearmR',-1.07);m.rotate('UpperArmL',-.18);m.rotate('ForearmL',-.75);
  m.rotate('HandR',-.10+stroke*.025);m.rotate('Head',.025*cycle);
 }else if(tool==='cloth'){
  m.rotate('UpperArmR',-.34-stroke*.08);m.rotate('ForearmR',-.72+stroke*.11);m.rotate('UpperArmL',-.12);m.rotate('ForearmL',-.23);
 }else if(['basket','tray','parcel'].includes(tool)){
  for(const s of ['L','R']){m.rotate('UpperArm'+s,-.20);m.rotate('Forearm'+s,-.97+stroke*.025);}
 }else{
  m.rotate('UpperArmR',-.32);m.rotate('ForearmR',-.82+stroke*.12);m.rotate('HandR',stroke*.045);m.rotate('UpperArmL',-.21);m.rotate('ForearmL',-.63);
 }
}
export function conversationGesture(m,time){
 // Listen most of the time, with an occasional restrained open-hand gesture.
 const gesture=Math.max(0,Math.sin(time*.67))**3;
 m.rotate('ForearmR',-.12-gesture*.36);m.rotate('UpperArmR',-.03-gesture*.11);
 m.rotate('Head',Math.sin(time*1.3)*gesture*.018);
}
