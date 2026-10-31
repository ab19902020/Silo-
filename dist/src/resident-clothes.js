import * as T from '../vendor/three.module.js';

// How far an outer garment stands off the body it hangs on, and how wide it is
// open at the waist. The jacket shell and the coat skirt below it share both,
// so the two meet at the waist seam without a step.
export const JACKET_STAND={coat:.012,medical:.011,cardigan:.010,vest:.006,robe:.0018};
export const JACKET_OPEN={coat:.16,medical:.16,cardigan:.20,vest:.18,robe:.015};
// How far open the front is at the collarbone. The upper chest is narrow, so an
// angle that looks modest at the waist swallows most of it up here; at .64 the
// cardigan's V took the whole front of the chest and read as a bib.
export const JACKET_NECK={coat:.52,medical:.50,cardigan:.44,vest:.58};

// Cloth panels are thin, fitted surfaces with the same skinning as the body.
// Only actual hardware (buttons, buckle and tools) has rigid relief.
export function addResidentClothes({a,wide,coat,shirt,dark,surface,add,binding}){
 const TAU=Math.PI*2,clamp=T.MathUtils.clamp;
 const tint=(f)=>coat.clone().multiplyScalar(f);
 const layered=['coat','cardigan','medical','vest'].includes(a.outfit);
 const panel=(x,y,w,h,color,offset=.0016)=>{const g=new T.PlaneGeometry(w,h,8,10);g.translate(x,y,0);surface.fit(g,{smooth:true,offset:offset+(layered?.010:0)});add(g,color,'Chest',null,true);};
 const button=(x,y,r,color)=>{const g=new T.CircleGeometry(r,16);g.translate(x,y,0);surface.fit(g,{smooth:true,offset:layered?.015:.0030});add(g,color,'Chest');};
 const patch=(x,y,w,h)=>{
  panel(x,y,w,h,tint(.96));panel(x,y+h*.5-.008,w+.001,.016,tint(.88),.0024);
  for(const side of [-1,1])panel(x+side*(w/2-.003),y,.0008,h-.004,tint(1.08),.0025);
  panel(x,y-h/2+.003,w-.006,.0008,tint(1.08),.0025);
 };
 if(['work','uniform'].includes(a.outfit))for(const s of [-1,1])patch(s*.080*wide,1.277,.070,.086);
 if(!['knit','robe'].includes(a.outfit)&&!layered){
  panel(0,1.225,.012,.32,tint(.88));for(let i=0;i<5;i++)button(0,1.10+i*.057,.0034,dark);
 }
 if(a.outfit==='knit'){
  // Fine ribbing conforms to the chest; it is no longer a stack of blocks.
  for(let i=0;i<7;i++)panel(0,1.105+i*.039,.24,.0012,tint(.94));
 }
 // A collar, rather than a flat quad laid on the shoulder. The old one was four
 // corners of a plane fitted to the chest in the undershirt's colour, so from
 // any distance it read as a pale sticker above the breastbone — and a collar is
 // the garment feature you see first at conversation range.
 //
 // This is the shape a real one makes: a band standing against the neck, a roll
 // where it turns over, and a fall lying out across the shoulder. It is built on
 // the neck hole's own ellipse, which the body sews shut at a known size, so it
 // sits on the neck wherever the body around it has been reshaped.
 if(['work','uniform','shirt','vest','coat','medical','robe'].includes(a.outfit)){
  const stand=a.outfit==='work'?.030:.026, fall=a.outfit==='shirt'?.055:.048;
  const open=['coat','medical','vest'].includes(a.outfit)?.62:a.outfit==='robe'?.50:a.outfit==='shirt'?.44:.34;
  // [along the collar, how far out, how high, how dark]
  const profile=[[0,1.00,1.447,.94],[.32,1.06,1.474,.98],[.50,1.20,1.468,1.03],
                 [.74,1.38,1.450,.97],[1,1.00+fall*7.2,1.449-fall*.74,.90]];
  const at=t=>{
   for(let k=0;k<profile.length-1;k++){
    const [t0,r0,y0,s0]=profile[k],[t1,r1,y1,s1]=profile[k+1];
    if(t<=t1||k===profile.length-2){const f=clamp((t-t0)/Math.max(1e-6,t1-t0),0,1),e=f*f*(3-2*f);
     return [r0+(r1-r0)*e,y0+(y1-y0)*e,s0+(s1-s0)*e];}
   }
  };
  const rows=7,cols=30,p=[],idx=[],tones=[],si=[],sw=[];
  const neck=binding('Neck')[0],chest=binding('Chest')[0];
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
   const t=j/rows,[r,y,shade]=at(t),angle=open+(i/cols)*(TAU-open*2);
   // The stand hugs the neck and the fall spreads across the back more than the
   // front, the way a collar does when it is not being held down by a tie.
   const spread=1+.14*Math.max(0,-Math.cos(angle))*t;
   p.push(Math.sin(angle)*.066*wide*r*spread,y,Math.cos(angle)*.060*r*spread+.010);
   tones.push(shade);
   // The stand belongs to the neck; the fall lies on the shoulder and takes its
   // weights from the body there, so it moves with a shrug or a turned spine
   // rather than hanging off the neck bone like a hoop.
   const onShoulder=T.MathUtils.smoothstep(t,.45,1);
   const support=onShoulder>.01?surface.sample(Math.sin(angle),Math.min(y,1.408),Math.cos(angle),'radial'):null;
   const mix=new Map([[neck,(1-clamp((y-1.40)/.075,0,1))*0+clamp((y-1.40)/.075,0,1)],[chest,1-clamp((y-1.40)/.075,0,1)]]);
   for(const [bone,w] of [...mix])mix.set(bone,w*(support?1-onShoulder:1));
   if(support)for(let k=0;k<4;k++)mix.set(support.indices[k],(mix.get(support.indices[k])||0)+support.weights[k]*onShoulder);
   const pairs=[...mix].filter(([,w])=>w>1e-6).sort((a,b)=>b[1]-a[1]).slice(0,4);
   const total=pairs.reduce((sum,[,w])=>sum+w,0)||1;
   for(let k=0;k<4;k++){si.push(pairs[k]?.[0]||0);sw.push((pairs[k]?.[1]||0)/total);}
  }
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const k=j*(cols+1)+i;idx.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));
  g.setAttribute('attachmentSkinIndex',new T.Uint16BufferAttribute(si,4));
  g.setAttribute('attachmentSkinWeight',new T.Float32BufferAttribute(sw,4));
  g.setIndex(idx);g.computeVertexNormals();
  add(g,coat,'Chest',null,true,(x,y,z,i)=>({color:coat.clone().multiplyScalar(tones[i]),surface:[.87,0,0,1]}));
 }
 if(a.quilted)for(let i=0;i<7;i++)for(const s of [-1,1])panel(s*(.026+i*.017),1.16,.0008,.22,tint(.92));
 if(layered){
  // An open garment is a garment, sampled round the body ring by ring the way
  // the coat skirts below already are — not a set of flat rectangles projected
  // onto the chest along one axis. Those came out as stepped, jagged stickers:
  // a beige strip for the shirt, grey slabs for the fronts, a pale square for
  // each pocket, and the fronts never turned the corner round the ribs. This is
  // one shell from the waist seam up over the shoulders, open down the front,
  // standing off the body by the thickness of the cloth, carrying the skin
  // weights of the body under each point. Its front edge is the boundary of the
  // shirt that shows through, so that boundary is as clean as the shell.
  const stand=JACKET_STAND[a.outfit],base=JACKET_OPEN[a.outfit],neckOpen=JACKET_NECK[a.outfit];
  const bottom=a.outfit==='vest'?.935:1.008,top=1.447;
  const openingAt=y=>base+(neckOpen-base)*T.MathUtils.smoothstep(y,1.10,1.40);
  // A radial sample is only support if it is on the side of the body the ray
  // came in from. High on the chest the front has no supported triangles, and
  // the ray used to sail straight through and come back with a point on the
  // shoulder blade — so the top of every open jacket was built inside the body.
  const nearSide=(support,angle)=>support&&support.point.x*Math.sin(angle)+(support.point.z-.010)*Math.cos(angle)>0?support:null;
  // The fallback surface includes the arms, and cloth on the front of the chest
  // should follow the chest. It keeps a trace of the arm — the skin under it does
  // too — but no more than a collar or yoke is allowed.
  const ARM=new Set(['UpperArmL','UpperArmR','ForearmL','ForearmR','HandL','HandR','FingersL','FingersR','FingerTipsL','FingerTipsR'].map(n=>binding(n)[0]));
  const lightArm=support=>{
   if(!support)return null;
   let arm=0;for(let k=0;k<4;k++)if(ARM.has(support.indices[k]))arm+=support.weights[k];
   if(arm<=.08)return support;
   const scale=.08/arm,rest=(1-.08)/Math.max(1e-6,1-arm);
   return {...support,weights:support.weights.map((w,k)=>w*(ARM.has(support.indices[k])?scale:rest))};
  };
  const chestAt=(angle,y)=>nearSide(surface.sample(Math.sin(angle),y,Math.cos(angle),'radial'),angle)
   ||(Math.abs(angle)<.95?lightArm(nearSide(surface.full?.sample(Math.sin(angle),y,Math.cos(angle),'radial'),angle)):null);
  const rows=26,cols=24;
  for(const sign of [-1,1]){
   const p=[],idx=[],si=[],sw=[],grid=[];
   // A waistcoat is cut away under the arm; the others carry on round the back.
   const reach=a.outfit==='vest'?Math.PI*.98:Math.PI;
   // Over the shoulder the chest stops offering support — its triangles follow
   // the arm, and arms are kept out of the garment surface — so above the
   // armpit the shell is swept across the front panel only, out to a smooth
   // curve that stays on the chest, and the cloth thins into the body along
   // that curve. The shoulders above it are the garment's own cloth already.
   // Letting every column run up until its own support failed instead gave a
   // sawtooth edge across the upper chest, one tooth per column.
   const edgeMax=y=>reach+(.72-reach)*T.MathUtils.smoothstep(y,1.27,1.35)-.03*T.MathUtils.smoothstep(y,1.38,1.44);
   const previous=[];
   for(let j=0;j<=rows;j++){
    const y=bottom+(top-bottom)*j/rows,open=openingAt(y),far=Math.max(open+.10,edgeMax(y));
    for(let i=0;i<=cols;i++){
     const u=i/cols,angle=sign*(open+(far-open)*u);
     let support=chestAt(angle,y)||previous[i];
     if(!support)throw Error('Missing jacket support');
     previous[i]=support;grid.push(support);
     // Cloth stands furthest off the body over the ribs and least over the
     // shoulder, where the weight of the garment hangs from; across the top of
     // the chest it thins out towards the curve where the panel meets the body.
     // Round the sides the cloth has already settled onto the body by the time
     // the panel narrows, so the narrowing leaves no lip across the chest.
     const outer=T.MathUtils.smoothstep(Math.abs(angle),.66,.92)*T.MathUtils.smoothstep(y,1.18,1.29);
     const lift=Math.max(.0022,stand*(1-.6*T.MathUtils.smoothstep(y,1.31,1.447))*(1-outer));
     const point=support.point.clone().addScaledVector(support.normal,lift);
     p.push(point.x,point.y,point.z);
     for(let q=0;q<4;q++){si.push(support.indices[q]);sw.push(support.weights[q]);}
    }
   }
   for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const k=j*(cols+1)+i;
    if(sign>0)idx.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);else idx.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);
   }
   // The front edge has the thickness of the cloth: a narrow facing turns from
   // the edge of the shell back to the shirt beneath it, so a resident seen
   // three-quarter on shows the edge of a garment, not the edge of a sheet.
   const facing=p.length/3;
   for(let j=0;j<=rows;j++){
    const support=grid[j*(cols+1)],point=support.point.clone().addScaledVector(support.normal,.0012);
    p.push(point.x,point.y,point.z);
    for(let k=0;k<4;k++){si.push(support.indices[k]);sw.push(support.weights[k]);}
   }
   for(let j=0;j<rows;j++){
    const a0=j*(cols+1),a1=(j+1)*(cols+1),b0=facing+j,b1=facing+j+1;
    if(sign>0)idx.push(a0,b0,a1,a1,b0,b1);else idx.push(a0,a1,b0,a1,b1,b0);
   }
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));
   g.setAttribute('attachmentSkinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('attachmentSkinWeight',new T.Float32BufferAttribute(sw,4));
   g.setIndex(idx);g.computeVertexNormals();
   const facingShade=a.outfit==='cardigan'?.86:.92;
   add(g,coat,'Chest',null,true,(x,y,z,i)=>({color:tint(i>=facing?facingShade:.98+.02*Math.sin(y*61+x*37)),surface:[.88,0,0,1]}));
  }
  if(['cardigan','vest'].includes(a.outfit))for(let i=0;i<4;i++){
   const y=1.035+i*.046,angle=-(openingAt(y)+.05),support=chestAt(angle,y);
   if(!support)continue;
   const g=new T.CircleGeometry(.0042,14),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),support.normal);
   g.applyQuaternion(q);const at=support.point.clone().addScaledVector(support.normal,stand+.0025);g.translate(at.x,at.y,at.z);
   const count=g.attributes.position.count,bsi=[],bsw=[];for(let v=0;v<count;v++)for(let k=0;k<4;k++){bsi.push(support.indices[k]);bsw.push(support.weights[k]);}
   g.setAttribute('attachmentSkinIndex',new T.Uint16BufferAttribute(bsi,4));g.setAttribute('attachmentSkinWeight',new T.Float32BufferAttribute(bsw,4));
   add(g,dark,'Chest');
  }
 }
 // A sewn waistband follows the real waist circumference and its blend weights.
 if(!['knit','cardigan','robe','medical','coat'].includes(a.outfit)){
  const p=[],si=[],sw=[],idx=[],cols=64,rows=3;
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
   const angle=i/cols*TAU,y=.955+(j/rows-.5)*.022,sample=surface.sample(Math.sin(angle),y,Math.cos(angle),'radial');
   if(!sample)throw Error('Missing waist support');const point=sample.point.addScaledVector(sample.normal,.0022);p.push(...point.toArray());si.push(...sample.indices);sw.push(...sample.weights);
  }
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const k=j*(cols+1)+i;idx.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('attachmentSkinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('attachmentSkinWeight',new T.Float32BufferAttribute(sw,4));g.setIndex(idx);g.computeVertexNormals();add(g,dark,'Hips');
  panel(0,.955,.033,.024,new T.Color(0x99855c),.0048);
 }
 if(a.outfit==='uniform'){
  const g=new T.CircleGeometry(.015,24);g.scale(1,1.22,1);g.translate(.080*wide,1.29,0);surface.fit(g,{smooth:true,offset:.0036});add(g,new T.Color(0xbca16a),'Chest');
 }
 // A small rounded leather pouch replaces the old protruding hip box.
 if(['work','uniform'].includes(a.outfit)){
  const g=new T.BoxGeometry(.026,.087,.054,5,7,5),p=g.attributes.position,r=.004;
  for(let i=0;i<p.count;i++){
   const v=new T.Vector3().fromBufferAttribute(p,i),inner=new T.Vector3(clamp(v.x,-.013+r,.013-r),clamp(v.y,-.0435+r,.0435-r),clamp(v.z,-.027+r,.027-r));
   v.sub(inner).normalize().multiplyScalar(r).add(inner);p.setXYZ(i,v.x,v.y+.926,v.z+.014);
  }
  surface.fit(g,{axis:'x',side:-1,offset:.016});add(g,a.outfit==='work'?new T.Color(0x594936):dark,'Hips');
 }
 // Smooth coat panels, with the waist sewn to the body and a soft leg blend
 // below it. Extra vertical rings prevent the former three-ring boxy skirt.
 if(['coat','cardigan','medical','robe'].includes(a.outfit))for(const [side,sign] of [['L',1],['R',-1]]){
  const hem=a.coatLength??(a.outfit==='robe'?.34:a.outfit==='cardigan'?.86:a.outfit==='medical'?.68:.59),rows=18,cols=30,p=[],idx=[],si=[],sw=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
   const t=j/rows,y=1.008+(hem-1.008)*t,opening=JACKET_OPEN[a.outfit]??.16,angle=sign*(opening+i/cols*(Math.PI-opening));
   const support=surface.sample(Math.sin(angle),Math.max(y,.85),Math.cos(angle),'radial');
   if(!support)throw Error('Missing coat support');
   const flare=(a.outfit==='robe'?.047:a.outfit==='cardigan'?.004:.018)*Math.sin(t*Math.PI/2),fold=.0035*Math.sin(angle*10+.7)*Math.pow(t,1.3);
   const anchor=support.point.clone().addScaledVector(support.normal,(JACKET_STAND[a.outfit]??.0018)+.004*T.MathUtils.smoothstep(1.008-y,0,.15));
   p.push(anchor.x+Math.sin(angle)*(flare+fold)*wide,y,anchor.z+Math.cos(angle)*(flare+fold)*.73);
   const coatWeight=T.MathUtils.smoothstep(t,0,1)*.025;
   const leg=(1-T.MathUtils.smoothstep(y,.80,1.008))*(1-coatWeight),shin=a.outfit==='robe'?(1-T.MathUtils.smoothstep(y,.30,.58))*.65:0,hips=1-leg-coatWeight;
   const hb=binding('Hips'),tb=binding('Thigh'+side),sb=binding('Shin'+side),cb=binding('Coat'+side),blend=1-T.MathUtils.smoothstep(y,.72,.85),weights=new Map();
   for(let k=0;k<4;k++)weights.set(support.indices[k],(weights.get(support.indices[k])||0)+support.weights[k]*(1-blend));
   for(const [bone,w] of [[hb[0],hips],[tb[0],leg*(1-shin)],[sb[0],leg*shin],[cb[0],coatWeight]])weights.set(bone,(weights.get(bone)||0)+w*blend);
   const pairs=[...weights].filter(([,w])=>w>1e-6).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=pairs.reduce((s,[,w])=>s+w,0);for(let k=0;k<4;k++){si.push(pairs[k]?.[0]||0);sw.push((pairs[k]?.[1]||0)/sum);}
  }
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const k=j*(cols+1)+i;idx.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('attachmentSkinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('attachmentSkinWeight',new T.Float32BufferAttribute(sw,4));g.setIndex(idx);g.computeVertexNormals();add(g,coat,'Hips',null,true);
 }
 // Continuous rounded crew-neck trim and sleeve cuffs distinguish knitwear.
 if(a.outfit==='knit'){
  const g=new T.TorusGeometry(1,.045,8,64),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);p.setXYZ(i,x*.066*wide,1.454+z*.066-.007*y,.010+y*.060);}
  g.computeVertexNormals();add(g,tint(.80),y=>binding('Neck','Chest',clamp((y-1.45)/.085,0,1)),null,true);
 }
 if(a.trouserFit==='cargo')for(const sign of [-1,1]){
  const g=new T.PlaneGeometry(.068,.100,8,10);g.rotateY(sign*Math.PI/2);g.translate(0,.70,.010);surface.fit(g,{axis:'x',side:sign,offset:.003});add(g,new T.Color(a.pants??0x454d43),'Thigh'+(sign>0?'L':'R'),null,true);
 }
 if(a.chain){
  for(let i=0;i<21;i++){const t=i/20*Math.PI;button(Math.cos(t)*.075*wide,1.373-Math.sin(t)*.106,.0048,new T.Color(0xa98c52));}
  const g=new T.CircleGeometry(.019,24);g.scale(1,1.25,1);g.translate(0,1.258,0);surface.fit(g,{smooth:true,offset:.006});add(g,new T.Color(0xb6a167),'Chest');
 }
 if(a.outfit==='medical'){
  for(const s of [-1,1])for(let i=0;i<15;i++){const t=i/14;button(s*(.030+.039*t)*wide,1.411-.189*t,.0025,dark);}
  button(.069*wide,1.22,.012,dark);
 }
}
