import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Turn a phone sideways and the directory book had no book in it.
//
// The panel is a flex column of fixed-height furniture — head, context bar,
// tabs, search field, landmark shortcuts, footer — with the level list as the
// one flexible child. On a 390px-tall viewport that furniture adds up to more
// than the panel's own 94dvh, and the list carried a min-height of 80px, so it
// refused to shrink into the space that was left. The overflow went off the
// bottom edge and `overflow:hidden` on the panel swallowed it: the list was
// laid out below the panel, the footer with it, and neither could be scrolled
// to, because the clipping happened on the panel and not inside the list.
//
// The pixel measurements are a browser's job and are recorded in
// docs/directory-book.md. What is asserted here is the cascade itself: at the
// viewport sizes a phone actually reports in landscape, does the stylesheet
// still leave the list with a floor it cannot fit under, inside a box that
// throws away whatever does not fit?

const CSS=fs.readFileSync(path.join(import.meta.dirname,'..','dist','style.css'),'utf8');

// Every selector in the sheet that can reach the list or the open book panel.
// Asserted exhaustive below, so the cascade walked here is the whole cascade.
const LIST=['.location-list','.book-panel .location-list'];
const PANEL=['.book-panel[open]'];

function rules(css){
  const out=[];
  let source=css.replace(/\/\*[\s\S]*?\*\//g,'');
  const walk=(text,media)=>{
    const re=/([^{}]+)\{/g;let m;
    while((m=re.exec(text))){
      const head=m[1].trim();
      let depth=1,i=re.lastIndex;
      while(i<text.length&&depth>0){if(text[i]==='{')depth++;else if(text[i]==='}')depth--;i++;}
      const body=text.slice(re.lastIndex,i-1);
      re.lastIndex=i;
      if(head.startsWith('@media'))walk(body,head.slice(6).trim());
      else if(head.startsWith('@'))continue;
      else for(const selector of head.split(','))out.push({selector:selector.trim(),media,body});
    }
  };
  walk(source,'');
  return out;
}
const ALL=rules(CSS);

// (max-width:Npx), (min-height:Npx) and friends, joined with `and`, alternatives
// separated by commas. Anything using a feature this does not model returns
// null, and the exhaustiveness check below refuses to let such a block touch
// the book — so an unmodelled query can never silently change the answer.
function evaluate(condition,{width,height}){
  if(!condition)return true;
  let modelled=true;
  const ok=condition.split(',').some(alternative=>alternative.split(/\s+and\s+/).every(part=>{
    const m=part.trim().match(/^\((max|min)-(width|height)\s*:\s*([\d.]+)px\)$/);
    if(!m){modelled=false;return false;}
    const value=Number(m[3]),actual=m[2]==='width'?width:height;
    return m[1]==='max'?actual<=value:actual>=value;
  }));
  return modelled?ok:null;
}

const specificity=selector=>{
  const ids=(selector.match(/#[\w-]+/g)||[]).length;
  const classes=(selector.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+/g)||[]).length;
  return ids*100+classes*10;
};

// The winning value of one property for one element at one viewport.
function resolve(selectors,property,viewport){
  let best=null,rank=-1;
  ALL.forEach((rule,order)=>{
    if(!selectors.includes(rule.selector))return;
    if(evaluate(rule.media,viewport)!==true)return;
    const declaration=[...rule.body.matchAll(/(^|;)\s*([\w-]+)\s*:\s*([^;]+)/g)].filter(d=>d[2].trim()===property).pop();
    if(!declaration)return;
    const score=specificity(rule.selector)*100000+order;
    if(score>=rank){rank=score;best=declaration[3].trim();}
  });
  return best;
}

test('nothing in the sheet reaches the book except the selectors this file walks',()=>{
  const strays=ALL.filter(r=>/location-list|locationList/.test(r.selector)&&!LIST.includes(r.selector))
    .concat(ALL.filter(r=>/\.book-panel\[open\]/.test(r.selector)&&!PANEL.includes(r.selector)));
  assert.deepEqual(strays.map(r=>r.selector),[],'a selector reaches the list or the open panel that this test does not model');
  // ...and no query this cannot read is allowed to style the book, because the
  // cascade above would quietly skip it.
  const unreadable=ALL.filter(r=>r.media&&evaluate(r.media,{width:844,height:390})===null&&/book-panel|location-list/.test(r.selector));
  assert.deepEqual(unreadable.map(r=>r.media),[],'the book is styled inside a media query this test cannot evaluate');
});

// A phone in landscape, an old phone in landscape, a tall phone in landscape,
// and a desktop window dragged short. Portrait and a tablet are here to prove
// the fix did not reach anywhere it had no business reaching.
const VIEWPORTS=[
  {name:'phone landscape',width:844,height:390,short:true},
  {name:'small phone landscape',width:740,height:360,short:true},
  {name:'older phone landscape',width:568,height:320,short:true},
  {name:'tall phone landscape',width:932,height:430,short:true},
  {name:'short desktop window',width:1400,height:520,short:true},
  {name:'phone portrait',width:390,height:844,short:false},
  {name:'tablet landscape',width:1024,height:768,short:false},
];

test('on a short screen the level list is never floored above the space it has',()=>{
  for(const viewport of VIEWPORTS){
    const floor=resolve(LIST,'min-height',viewport);
    if(viewport.short){
      assert.equal(floor,'0',`${viewport.name}: the list still insists on ${floor}, which is what pushed it off the panel`);
    }else{
      assert.equal(floor,'80px',`${viewport.name}: the short-screen rules have reached a screen that is not short`);
    }
  }
});

test('on a short screen the book either re-lays out or scrolls — it never just clips',()=>{
  for(const viewport of VIEWPORTS.filter(v=>v.short)){
    const display=resolve(PANEL,'display',viewport);
    const overflow=resolve(PANEL,'overflow',viewport);
    const column=resolve(LIST,'grid-column',viewport);
    const row=resolve(LIST,'grid-row',viewport);
    if(display==='grid'){
      // Two pages: the list takes the right-hand one at the panel's full
      // height, which is the only reason it has room at all.
      assert.equal(column,'2',`${viewport.name}: the list is not on the right-hand page`);
      assert.match(row||'',/\/\s*-1$/,`${viewport.name}: the list stops short of the bottom of the panel instead of running to it`);
    }else{
      // Or one column that scrolls as a single document, head and all.
      assert.equal(overflow,'auto',`${viewport.name}: the panel neither re-lays out nor scrolls, so whatever overflows is lost`);
    }
  }
});

test('a portrait phone and a tablet are left exactly as they were',()=>{
  for(const viewport of VIEWPORTS.filter(v=>!v.short)){
    assert.equal(resolve(PANEL,'display',viewport),'flex',`${viewport.name}: the landscape layout has leaked onto a tall screen`);
    assert.equal(resolve(PANEL,'overflow',viewport),'hidden',`${viewport.name}: the panel has started scrolling as a whole`);
    assert.equal(resolve(LIST,'grid-column',viewport),null,`${viewport.name}: the list has been given a grid position it cannot use`);
  }
});

// The regression in one line: the list's floor and the panel's clipping are
// only safe together while the panel is tall enough to hold the furniture.
test('the tall-screen defaults are still the pair that needs watching',()=>{
  const tall={width:1024,height:768};
  assert.equal(resolve(LIST,'min-height',tall),'80px');
  assert.equal(resolve(PANEL,'overflow',tall),'hidden');
});

// The other way the book failed to scroll, and the one that survives a
// rotation: the list keeps its scroll position across a re-render. Search for
// Mechanical with the list a thousand pixels down and you get four results,
// all of them above where you are looking — an empty book with the answer in
// it. Every call to renderDirectory is the player changing what the list
// shows, so every one of them should land at the top of it.
test('rebuilding the list takes you back to the top of it',()=>{
  const source=fs.readFileSync(path.join(import.meta.dirname,'..','dist','src','main.js'),'utf8');
  const body=source.slice(source.indexOf('function renderDirectory()'));
  const end=body.indexOf('\nfunction ');
  assert.ok(end>0,'renderDirectory is not where this test thinks it is');
  assert.match(body.slice(0,end),/scrollTop\s*=\s*0/,'renderDirectory leaves the list wherever the last one was scrolled to');
  // One owner, like the story interactions. Hand-rolled resets at the call
  // sites are how half the callers end up without one.
  const resets=source.match(/scrollTop\s*=\s*0/g)||[];
  assert.equal(resets.length,1,`${resets.length} places reset the directory's scroll; it should be the render`);
});
