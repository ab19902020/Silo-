// Shared, lightweight HUD pieces. No renderer or game state is owned here.
const paths={
 menu:'M5 6h14M5 12h14M5 18h14',
 file:'M6 3h8l4 4v14H6z M14 3v5h4M9 12h6M9 15h6M9 18h4',
 talk:'M6 4h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-7l-5 4v-4a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zM7 10h2m2 0h2m2 0h2',
 cube:'m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9M7.5 5.5l9 5',
 thought:'M9 20v-4a6 6 0 1 1 8-6v3l-3 1v6M8 8h1m3-2h1m-1 4h1m-5 2h1',
 play:'M3 4h18v16H3zM10 8l6 4-6 4z',focus:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
 skip:'m3 5 8 7-8 7zm10 0 8 7-8 7z',chevron:'m6 15 6-6 6 6',
 run:'M14 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4M6 10l4-2 4 3 4 1m-8-4-2 7 5 2 1 5M8 15l-4 5',
 hand:'M8 12V6a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v6-3a1.5 1.5 0 0 1 3 0v6c0 4-3 7-7 7-3 0-5-2-7-5l-3-4c-1-2 1-3 2-2l3 2',
 arrow:'M6 18 18 6M7 6h11v11'
};
export const icon=name=>`<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.file}"/></svg>`;
export function buttonLabel(button,text){const span=button.querySelector('.button-label');(span||button).textContent=text;}
export function installInterface(doc=document){
 const $=id=>doc.getElementById(id);
 $('hud').querySelector('nav').prepend($('home'));
 for(const [id,name] of Object.entries({controlsButton:'menu',hintButton:'thought',satchelButton:'cube',openBookButton:'file',runButton:'run',jumpButton:'chevron',touchUse:'hand',focusScreenButton:'focus',skipOpening:'skip'})){
  const b=$(id);if(!b)continue;const text=b.textContent;b.innerHTML=icon(name)+'<span class="button-label"></span>';buttonLabel(b,id==='satchelButton'?'Inventory':text);
 }
 const interaction=$('interaction');interaction.insertAdjacentHTML('afterbegin',`<span class="interaction-icon">${icon('talk')}</span>`);
 const key=interaction.querySelector('kbd');const action=doc.createElement('span');action.id='interactionAction';action.textContent='Use';
 const foot=doc.createElement('span');foot.className='interaction-action';foot.append(key,action);interaction.append(foot);
 $('chapterHud').insertAdjacentHTML('afterbegin',`<div class="clue-head"><span>CLUE</span><button id="clueToggle" aria-label="Collapse clue" aria-expanded="true" aria-controls="chapterObjective chapterWhere chapterHint">${icon('chevron')}</button></div><span class="clue-icon">${icon('file')}</span>`);
 $('clueToggle').addEventListener('click',()=>{
  const collapsed=$('chapterHud').classList.toggle('clue-collapsed');$('clueToggle').setAttribute('aria-expanded',String(!collapsed));$('clueToggle').setAttribute('aria-label',collapsed?'Expand clue':'Collapse clue');
  doc.body.style.setProperty('--card-h',$('chapterHud').offsetHeight+'px');
 });
 $('cinemaControls').insertAdjacentHTML('afterbegin',`<span class="cinema-icon">${icon('play')}</span>`);
 const copy=doc.createElement('div');copy.className='cinema-copy';$('cinemaStatus').before(copy);copy.append($('cinemaStatus'));
 copy.insertAdjacentHTML('beforeend','<div class="cinema-timeline"><progress id="cinemaProgress" max="1" value="0" aria-label="Cleaning playback progress"></progress><span id="cinemaRemaining"></span></div>');
}
export function interactionCopy(target){
 return target.resident?{name:target.resident.name,hint:target.resident.role||'Silo resident',action:'Talk',kind:'person'}:
  {name:target.label,hint:target.hint||'',action:'Use',kind:'object'};
}
export function paintInteraction(doc,target){
 const copy=interactionCopy(target),prompt=doc.getElementById('interaction');
 if(prompt.dataset.kind!==copy.kind)prompt.querySelector('.interaction-icon').innerHTML=icon(copy.kind==='person'?'talk':'hand');
 doc.getElementById('interactionLabel').textContent=copy.name;doc.getElementById('interactionHint').textContent=copy.hint;doc.getElementById('interactionAction').textContent=copy.action;prompt.dataset.kind=copy.kind;
}
export function paintCinema(doc,time,duration){
 doc.getElementById('cinemaStatus').textContent='The cleaning';doc.getElementById('cinemaProgress').value=Math.max(0,Math.min(1,time/duration));doc.getElementById('cinemaRemaining').textContent=Math.max(0,Math.ceil(duration-time))+'s';
}
export function paintNotice(doc,message,kind='UPDATE'){
 const toast=doc.getElementById('toast');toast.replaceChildren();
 const symbol=doc.createElement('span');symbol.className='notice-icon';symbol.innerHTML=icon('file');
 const copy=doc.createElement('span'),title=doc.createElement('small'),line=doc.createElement('span');title.textContent=kind;line.textContent=message;copy.append(title,line);toast.append(symbol,copy);
}
