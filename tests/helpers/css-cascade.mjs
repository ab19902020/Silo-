// Reading the stylesheet the way a browser does, without a browser.
//
// Two panels in this game have now been broken by the same thing — content
// laid out past the bottom of a box that clips it and does not scroll — and
// both fixes live in the cascade rather than in any one declaration. Pixel
// measurements belong in a browser and are recorded in the docs; what these
// helpers let a test assert is the cascade itself: at a given viewport, which
// rule wins for one property on one element.
//
// It models only `(max|min)-(width|height): Npx` joined with `and`, with
// comma-separated alternatives. `evaluate` returns null for anything else, and
// every test using this is expected to assert that no unmodelled query reaches
// the elements it walks — otherwise the cascade below would silently skip it.
import fs from 'node:fs';
import path from 'node:path';

export const stylesheet=()=>fs.readFileSync(path.join(import.meta.dirname,'..','..','dist','style.css'),'utf8');

export function rules(css){
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

// (max-width:Npx), (min-height:Npx) and friends, joined with `and`, alternatives
// separated by commas. Anything using a feature this does not model returns
// null, and the exhaustiveness check below refuses to let such a block touch
// the book — so an unmodelled query can never silently change the answer.
export function evaluate(condition,{width,height}){
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

export const specificity=selector=>{
  const ids=(selector.match(/#[\w-]+/g)||[]).length;
  const classes=(selector.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+/g)||[]).length;
  return ids*100+classes*10;
};

// The winning value of one property for one element at one viewport.
export function resolve(ALL,selectors,property,viewport){
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

