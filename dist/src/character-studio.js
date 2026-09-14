import {PLAYABLE_CHARACTERS} from './characters.js';
import {CharacterPreview} from './character-preview.js';
import {DEFAULT_PROFILE,DEPARTMENTS,SKIN_TONES,HAIR_TONES,CLOTH_TONES,EYE_TONES,HAIR_STYLES,OUTFITS,normalizeProfile,definitionFromProfile,loadProfile,saveProfile} from './character-profile.js';
const title=s=>s.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,v=>v.toUpperCase());

export class CharacterStudio{
 constructor(dialog,{storage,onChoose,onCustom,onClose}){
  this.dialog=dialog;this.storage=storage;this.onChoose=onChoose;this.onCustom=onCustom;this.onClose=onClose;this.tab='cast';this.selected='juliette';this.pending='juliette';this.profile=loadProfile(storage)||{...DEFAULT_PROFILE};this.returnFocus=null;
  const find=id=>dialog.querySelector('#'+id);this.find=find;this.list=find('characterList');this.form=find('residentForm');
  this.preview=new CharacterPreview(find('residentPreview'),find('previewHint'));
  this.buildForm();
  find('castTab').onclick=()=>this.setTab('cast');find('createTab').onclick=()=>this.setTab('create');
  for(const tab of ['cast','create'])find(tab+'Tab').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?'cast':e.key==='End'?'create':tab==='cast'?'create':'cast';this.setTab(next);find(next+'Tab').focus();}});
  find('castSearch').oninput=()=>this.renderList();find('castSeason').onchange=()=>this.renderList();
  find('residentTurnLeft').onclick=()=>this.preview.turn(-.4);find('residentTurnRight').onclick=()=>this.preview.turn(.4);
  find('residentWalk').onclick=()=>{this.preview.walking=!this.preview.walking;find('residentWalk').setAttribute('aria-pressed',String(this.preview.walking));find('residentWalk').textContent=this.preview.walking?'Stand still':'Preview walk';};
  find('playResident').onclick=()=>this.commit();
  this.form.addEventListener('submit',e=>{e.preventDefault();this.commit();});
  let timer;this.form.addEventListener('input',()=>{this.readForm();clearTimeout(timer);timer=setTimeout(()=>{if(this.tab==='create'&&this.dialog.open)this.showCustom();},100);});
  this.dialog.addEventListener('close',()=>{clearTimeout(timer);this.preview.close();});
 }
 buildForm(){
  const group=(name)=>{const box=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=name;box.append(legend);this.form.append(box);return box;};
  const field=(box,label,key,control)=>{const wrap=document.createElement('label'),text=document.createElement('span');text.textContent=label;control.name=key;control.id='profile-'+key;wrap.className='resident-field';wrap.append(text,control);box.append(wrap);return control;};
  const select=(box,label,key,values)=>{const el=document.createElement('select');for(const [value,text] of values){const o=document.createElement('option');o.value=value;o.textContent=text;el.append(o);}return field(box,label,key,el);};
  const range=(box,label,key,min,max,step)=>{const el=document.createElement('input');el.type='range';el.min=min;el.max=max;el.step=step;const output=document.createElement('output');output.htmlFor='profile-'+key;field(box,label,key,el).parentElement.append(output);el.addEventListener('input',()=>this.syncOutput(key));};
  const palette=(box,label,key,colors,names)=>{const set=document.createElement('fieldset'),legend=document.createElement('legend');set.className='resident-palette';legend.textContent=label;set.append(legend);colors.forEach((color,i)=>{const wrap=document.createElement('label'),el=document.createElement('input'),swatch=document.createElement('span');el.type='radio';el.name=key;el.value=i;el.setAttribute('aria-label',names[i]);swatch.style.setProperty('--swatch','#'+color.toString(16).padStart(6,'0'));swatch.title=names[i];wrap.append(el,swatch);set.append(wrap);});box.append(set);};
  let box=group('01 / Your identity'),name=document.createElement('input');name.type='text';name.maxLength=32;name.required=true;name.autocomplete='off';field(box,'Resident name','name',name);
  select(box,'Department','department',Object.entries(DEPARTMENTS).map(([k,v])=>[k,v.name]));
  select(box,'Body shape','frame',[['balanced','Broad shoulders'],['slender','Narrow shoulders']]);
  range(box,'Height','height',155,195,1);range(box,'Build','build',.88,1.15,.01);
  box=group('02 / Face & hair');range(box,'Face shape','faceWidth',.94,1.06,.01);range(box,'Age','age',0,1,.05);
  palette(box,'Skin tone','skin',SKIN_TONES,['Light','Warm','Tan','Brown','Deep','Dark']);
  select(box,'Hair style','hairStyle',HAIR_STYLES.map(v=>[v,title(v)]));
  palette(box,'Hair colour','hair',HAIR_TONES,['Black','Brown','Chestnut','Blonde','Auburn','Grey','Silver']);
  palette(box,'Eye colour','eyes',EYE_TONES,['Brown','Blue','Green','Grey']);range(box,'Facial hair','beard',0,1,.1);
  box=group('03 / Clothing');select(box,'Outfit','outfit',OUTFITS.map(v=>[v,{work:'Utility coveralls',uniform:'Deputy uniform',coat:'Long coat',shirt:'Work shirt',knit:'Knitted top',cardigan:'Cardigan',robe:'Formal robe',medical:'Medical coat'}[v]]));
  palette(box,'Clothing colour','cloth',CLOTH_TONES,['Silo green','Khaki','Slate blue','Charcoal','Sand','Stone','Rust']);
  for(const [key,label] of [['glasses','Glasses'],['shortSleeves','Short sleeves']]){const input=document.createElement('input');input.type='checkbox';field(box,label,key,input).parentElement.classList.add('resident-check');}
  this.writeForm();
 }
 syncOutput(key){const input=this.form.elements.namedItem(key),out=input.parentElement.querySelector('output');if(out)out.textContent=key==='height'?input.value+' cm':key==='age'?Math.round(20+Number(input.value)*60)+' years':key==='build'?Math.round(Number(input.value)*100)+'%':key==='faceWidth'?Math.round(Number(input.value)*100)+'%':Math.round(Number(input.value)*100)+'%';}
 writeForm(){for(const [key,value] of Object.entries(this.profile)){const input=this.form.elements.namedItem(key);if(!input)continue;if(input.type==='checkbox')input.checked=value;else input.value=value;this.syncOutputSafe(key);} }
 syncOutputSafe(key){const input=this.form.elements.namedItem(key);if(input?.type==='range')this.syncOutput(key);}
 readForm(){const raw=Object.fromEntries(new FormData(this.form));for(const key of ['glasses','shortSleeves'])raw[key]=this.form.elements.namedItem(key).checked;this.profile=normalizeProfile(raw);}
 open(selected='juliette',tab='cast'){
  this.selected=selected;this.pending=selected;this.profile=loadProfile(this.storage)||this.profile;this.writeForm();this.setTab(tab);this.preview.open();
 }
 setTab(tab){
  this.tab=tab;for(const mode of ['cast','create']){this.find(mode+'Tab').setAttribute('aria-selected',String(tab===mode));this.find(mode+'Tab').tabIndex=tab===mode?0:-1;this.find(mode+'Pane').hidden=mode!==tab;}
  this.find('studioMessage').textContent='Your story progress stays with you.';
  if(tab==='cast'){this.renderList();this.showDefinition(this.current());}else this.showCustom();
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
   if(!this.form.reportValidity())return;this.readForm();const definition=definitionFromProfile(this.profile),saved=saveProfile(this.storage,this.profile);this.onCustom(definition);this.onChoose(definition.id);
   if(!saved)this.onClose?.('Your resident is ready for this visit. This browser could not save it for next time.');
  }else this.onChoose(this.current().id);
 }
}
