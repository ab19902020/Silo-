import {FACE_CONTROLS,FACE_PRESETS} from './face-shape.js';
import {PLAYABLE_CHARACTERS} from './characters.js';
import {CharacterPreview} from './character-preview.js';
import {DEFAULT_PROFILE,DEPARTMENTS,SKIN_TONES,SKIN_NAMES,HAIR_TONES,HAIR_NAMES,CLOTH_TONES,CLOTH_NAMES,
 EYE_TONES,EYE_NAMES,SHOE_TONES,SHOE_NAMES,FRAME_TONES,FRAME_NAMES,HAIR_STYLES,OUTFITS,TROUSER_FITS,FOOTWEAR,
 FRAME_STYLES,FABRICS,COAT_LENGTHS,normalizeProfile,definitionFromProfile,loadProfile,saveProfile,applyFacePreset,randomizeFace} from './character-profile.js';
const title=s=>s.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,v=>v.toUpperCase());

export class CharacterStudio{
 constructor(dialog,{storage,onChoose,onCustom,onClose}){
  this.dialog=dialog;this.storage=storage;this.onChoose=onChoose;this.onCustom=onCustom;this.onClose=onClose;this.tab='cast';this.selected='juliette';this.pending='juliette';this.profile=loadProfile(storage)||{...DEFAULT_PROFILE};this.returnFocus=null;this.editorSection='identity';
  const find=id=>dialog.querySelector('#'+id);this.find=find;this.list=find('characterList');this.form=find('residentForm');
  this.preview=new CharacterPreview(find('residentPreview'),find('previewHint'));
  this.buildForm();
  find('castTab').onclick=()=>this.setTab('cast');find('createTab').onclick=()=>this.setTab('create');
  for(const tab of ['cast','create'])find(tab+'Tab').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'cast':e.key==='End'?'create':tab==='cast'?'create':'cast';this.setTab(next);find(next+'Tab').focus();}});
  find('castSearch').oninput=()=>this.renderList();find('castSeason').onchange=()=>this.renderList();
  find('residentTurnLeft').onclick=()=>this.preview.turn(-.4);find('residentTurnRight').onclick=()=>this.preview.turn(.4);
  find('residentPose').onchange=()=>{this.preview.pose=find('residentPose').value;};
  for(const view of ['face','full'])find(view+'View').onclick=()=>this.setView(view);
  find('playResident').onclick=()=>this.commit();
  this.form.addEventListener('submit',e=>{e.preventDefault();this.commit();});
  let timer;this.form.addEventListener('input',()=>{this.readForm();clearTimeout(timer);timer=setTimeout(()=>{if(this.tab==='create'&&this.dialog.open)this.showCustom();},100);});
  this.dialog.addEventListener('close',()=>{clearTimeout(timer);this.preview.close();});
 }
 buildForm(){
  this.editorGroups={};this.editorTabs={};
  const nav=document.createElement('div');nav.className='editor-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Resident details');this.form.before(nav);
  const sections=[['identity','Identity'],['face','Face'],['hair','Hair & skin'],['clothing','Clothing']];
  const group=(id,name)=>{const box=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=name;box.append(legend);box.id='editor-'+id;box.setAttribute('role','tabpanel');box.setAttribute('aria-labelledby','edit-'+id);this.form.append(box);this.editorGroups[id]=box;return box;};
  for(const [id,label] of sections){const button=document.createElement('button');button.type='button';button.id='edit-'+id;button.textContent=label;button.setAttribute('role','tab');button.setAttribute('aria-controls','editor-'+id);button.onclick=()=>this.setSection(id);button.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const index=sections.findIndex(([key])=>key===id),next=e.key==='Home'?0:e.key==='End'?3:(index+(e.key==='ArrowLeft'?3:1))%4;this.setSection(sections[next][0]);this.editorTabs[sections[next][0]].focus();}};nav.append(button);this.editorTabs[id]=button;}

  const field=(box,label,key,control)=>{const wrap=document.createElement('label'),text=document.createElement('span');text.textContent=label;control.name=key;control.id='profile-'+key;wrap.className='resident-field';wrap.append(text,control);box.append(wrap);return control;};
  const select=(box,label,key,values)=>{const el=document.createElement('select');for(const [value,text] of values){const o=document.createElement('option');o.value=value;o.textContent=text;el.append(o);}return field(box,label,key,el);};
  const range=(box,label,key,min,max,step)=>{const el=document.createElement('input');el.type='range';el.min=min;el.max=max;el.step=step;const output=document.createElement('output');output.htmlFor='profile-'+key;field(box,label,key,el).parentElement.append(output);el.addEventListener('input',()=>this.syncOutput(key));};
  const palette=(box,label,key,colors,names)=>{const set=document.createElement('fieldset'),legend=document.createElement('legend');set.className='resident-palette';legend.textContent=label;set.append(legend);colors.forEach((color,i)=>{const wrap=document.createElement('label'),el=document.createElement('input'),swatch=document.createElement('span');el.type='radio';el.name=key;el.value=i;el.setAttribute('aria-label',names[i]);swatch.style.setProperty('--swatch','#'+color.toString(16).padStart(6,'0'));swatch.title=names[i];wrap.append(el,swatch);set.append(wrap);});box.append(set);};
  let box=group('identity','Your identity'),name=document.createElement('input');name.type='text';name.maxLength=32;name.required=true;name.autocomplete='off';field(box,'Resident name','name',name);
  select(box,'Department','department',Object.entries(DEPARTMENTS).map(([k,v])=>[k,v.name]));
  select(box,'Body shape','frame',[['balanced','Broad shoulders'],['slender','Narrow shoulders']]);
  range(box,'Height','height',155,195,1);range(box,'Build','build',.88,1.15,.01);
  box=group('face','Sculpt your face');
  const preset=select(box,'Starting face','facePreset',Object.entries(FACE_PRESETS).map(([key,c])=>[key,c.label]));preset.removeAttribute('name');preset.id='facePreset';
  preset.onchange=()=>{this.readForm();this.profile=applyFacePreset(this.profile,preset.value);this.writeForm();this.showCustom();};
  const actions=document.createElement('div');actions.className='face-actions';
  for(const [label,fn] of [['New variation',p=>randomizeFace(p)],['Reset face',p=>applyFacePreset(p,'balanced')]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{this.readForm();this.profile=fn(this.profile);this.writeForm();preset.value='balanced';this.showCustom();};actions.append(b);}box.append(actions);
  for(const [key,c] of Object.entries(FACE_CONTROLS))range(box,c.label,key,c.min,c.max,.01);
  box=group('hair','Hair, skin & age');range(box,'Age','age',0,1,.05);
  palette(box,'Skin tone','skin',SKIN_TONES,SKIN_NAMES);
  select(box,'Hair style','hairStyle',HAIR_STYLES.map(v=>[v,title(v)]));
  palette(box,'Hair colour','hair',HAIR_TONES,HAIR_NAMES);
  palette(box,'Eye colour','eyes',EYE_TONES,EYE_NAMES);range(box,'Facial hair','beard',0,1,.1);
  box=group('clothing','Clothing & accessories');select(box,'Outfit','outfit',OUTFITS.map(v=>[v,{work:'Utility coveralls',uniform:'Deputy uniform',coat:'Long coat',shirt:'Work shirt',knit:'Knitted top',cardigan:'Cardigan',robe:'Formal robe',medical:'Medical coat',vest:'Sleeveless waistcoat'}[v]]));
  select(box,'Fabric','fabric',FABRICS.map(v=>[v,{plain:'Plain woven',ribbed:'Fine rib',striped:'Muted stripes'}[v]]));
  palette(box,'Top / outer layer','cloth',CLOTH_TONES,CLOTH_NAMES);
  palette(box,'Shirt underneath','underlayer',CLOTH_TONES,CLOTH_NAMES);
  select(box,'Trouser cut','trouserFit',TROUSER_FITS.map(v=>[v,title(v)]));
  palette(box,'Trousers','trousers',CLOTH_TONES,CLOTH_NAMES);
  select(box,'Footwear','footwear',FOOTWEAR.map(v=>[v,{work:'Laced work shoes',boots:'Ankle boots',slipon:'Slip-on shoes'}[v]]));
  palette(box,'Footwear colour','shoes',SHOE_TONES,SHOE_NAMES);
  select(box,'Glasses shape','frameStyle',FRAME_STYLES.map(v=>[v,title(v)]));
  palette(box,'Glasses frame','frames',FRAME_TONES,FRAME_NAMES);
  select(box,'Coat / robe length','coatLength',COAT_LENGTHS.map(c=>[c.id,c.label]));
  for(const [key,label] of [['glasses','Glasses'],['shortSleeves','Short sleeves'],
    ['quilted','Quilted jacket'],['tattoo','Forearm tattoo'],['chain','Chain of office']]){
   const input=document.createElement('input');input.type='checkbox';field(box,label,key,input).parentElement.classList.add('resident-check');}
  this.writeForm();this.setSection('identity');
 }
 setSection(id){
  const changed=this.editorSection!==id;this.editorSection=id;
  if(changed){const scroller=this.dialog.querySelector('.studio-controls');if(scroller)scroller.scrollTop=0;}
  for(const [key,group] of Object.entries(this.editorGroups)){group.hidden=key!==id;const tab=this.editorTabs[key];tab.setAttribute('aria-selected',String(key===id));tab.tabIndex=key===id?0:-1;}
  this.setView(['face','hair'].includes(id)?'face':'full');
 }
 setView(view){
  this.preview.view=view;this.find('residentPose').disabled=view==='face';for(const v of ['face','full'])this.find(v+'View').setAttribute('aria-pressed',String(view===v));this.preview.render();
 }
 syncOutput(key){const input=this.form.elements.namedItem(key),out=input.parentElement.querySelector('output');if(out)out.textContent=key==='height'?input.value+' cm':key==='age'?Math.round(20+Number(input.value)*60)+' years':key==='build'?Math.round(Number(input.value)*100)+'%':key==='faceWidth'?Math.round(Number(input.value)*100)+'%':(FACE_CONTROLS[key]?.default===0?(Number(input.value)===0?'Balanced':(Number(input.value)>0?'+':'')+Math.round(Number(input.value)*100)+'%'):Math.round(Number(input.value)*100)+'%');}
 writeForm(){for(const [key,value] of Object.entries(this.profile)){const input=this.form.elements.namedItem(key);if(!input)continue;if(input.type==='checkbox')input.checked=value;else input.value=value;this.syncOutputSafe(key);} }
 syncOutputSafe(key){const input=this.form.elements.namedItem(key);if(input?.type==='range')this.syncOutput(key);}
 readForm(){const raw=Object.fromEntries(new FormData(this.form));for(const key of ['glasses','shortSleeves'])raw[key]=this.form.elements.namedItem(key).checked;this.profile=normalizeProfile(raw);}
 open(selected='juliette',tab='cast'){
  this.selected=selected;this.pending=selected;this.profile=loadProfile(this.storage)||this.profile;this.writeForm();this.setTab(tab);this.preview.open();
 }
 setTab(tab){
  this.tab=tab;for(const mode of ['cast','create']){this.find(mode+'Tab').setAttribute('aria-selected',String(tab===mode));this.find(mode+'Tab').tabIndex=tab===mode?0:-1;this.find(mode+'Pane').hidden=mode!==tab;}
  this.find('studioMessage').textContent='Your story progress stays with you.';
  if(tab==='cast'){this.renderList();this.showDefinition(this.current());}else{this.setSection(this.editorSection);this.showCustom();}
 }
 current(){return this.pending==='custom-resident'?definitionFromProfile(this.profile):PLAYABLE_CHARACTERS.find(d=>d.id===this.pending)||PLAYABLE_CHARACTERS[0];}
 renderList(){
  const query=this.find('castSearch').value.toLowerCase().trim(),season=Number(this.find('castSeason').value),saved=loadProfile(this.storage);
  const all=[...(saved?[definitionFromProfile(saved)]:[]),...PLAYABLE_CHARACTERS];
  const filtered=all.filter(c=>(!season||c.season===season||c.featuredSeason===season)&&[c.name,c.role,c.origin].join(' ').toLowerCase().includes(query));
  this.list.replaceChildren();this.find('castCount').textContent=filtered.length+' characters';
  for(const c of filtered){
   const b=document.createElement('button');b.type='button';b.className='character-card resident-card';b.dataset.character=c.id;b.setAttribute('aria-pressed',String(c.id===this.pending));b.setAttribute('aria-label','Preview '+c.name);
   const number=document.createElement('span');number.className='resident-avatar';number.textContent=c.name.split(' · ')[0].split(' ').slice(0,2).map(w=>w[0]).join('');number.style.setProperty('--avatar-color','#'+c.appearance.coat.toString(16).padStart(6,'0'));
   const copy=document.createElement('span');copy.className='character-copy';const name=document.createElement('strong');name.textContent=c.name;const role=document.createElement('small');role.textContent=c.role;
   const label=document.createElement('span');label.className='selection-label';label.textContent=c.id===this.selected?'PLAYING AS':c.custom?'YOUR RESIDENT':`${c.origin} · ${c.featuredSeason===3?'S2–3':'S'+c.season}`;
   copy.append(name,role,label);b.append(number,copy);b.onclick=()=>{this.pending=c.id;for(const card of this.list.children)card.setAttribute('aria-pressed',String(card===b));this.showDefinition(c);};this.list.append(b);
  }
  this.find('castEmpty').hidden=filtered.length>0;
 }
 showDefinition(def){this.preview.show(def);this.find('previewName').textContent=def.name;this.find('previewRole').textContent=def.role;this.find('previewOrigin').textContent=def.custom?'YOUR RESIDENT':def.origin+' · TELEVISION CAST';this.find('playResident').textContent=def.custom?'Play as your resident':'Play as '+def.name.split(' · ')[0];}
 showCustom(){this.showDefinition(definitionFromProfile(this.profile));this.find('playResident').textContent='Save & play as your resident';}
 commit(){
  if(this.tab==='create'){
   if(!this.form.elements.namedItem('name').checkValidity())this.setSection('identity');if(!this.form.reportValidity())return;this.readForm();const definition=definitionFromProfile(this.profile),saved=saveProfile(this.storage,this.profile);this.onCustom(definition);this.onChoose(definition.id);
   if(!saved)this.onClose?.('Your resident is ready for this visit. This browser could not save it for next time.');
  }else this.onChoose(this.current().id);
 }
}
