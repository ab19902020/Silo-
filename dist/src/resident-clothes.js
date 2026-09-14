import * as T from '../vendor/three.module.js';

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
 // Turned-down collar: a subdivided cloth panel, folded onto the shoulder.
 if(['work','uniform','shirt'].includes(a.outfit))for(const sign of [-1,1]){
  const corners=[[.028,1.427],[.058,1.422],[.086,1.375],[.022,1.395]],p=[],idx=[],n=6;
  for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){
   const u=i/n,v=j/n,top=new T.Vector2(...corners[0]).lerp(new T.Vector2(...corners[1]),u),bottom=new T.Vector2(...corners[3]).lerp(new T.Vector2(...corners[2]),u),point=top.lerp(bottom,v);
   p.push(sign*point.x*wide,point.y,.0008*Math.sin(Math.PI*v));
  }
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const k=j*(n+1)+i;idx.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();surface.fit(g,{smooth:true,offset:.0018});add(g,shirt,'Chest',null,true);
 }
 if(a.quilted)for(let i=0;i<7;i++)for(const s of [-1,1])panel(s*(.026+i*.017),1.16,.0008,.22,tint(.92));
 if(layered){
  // A separate shirt insert has a sewn contour. Interpolating vertex colours
  // across the original chest triangles produced the old jagged V-neck.
  {
   const p=[],idx=[],rows=22,cols=12;
   for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
    const y=1.427-j/rows*.435,half=.028+.034*T.MathUtils.smoothstep(y,1.16,1.427);
    p.push((i/cols*2-1)*half*wide,y,0);
   }
   for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const k=j*(cols+1)+i;idx.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);surface.fit(g,{smooth:true,offset:.004});add(g,shirt,'Chest',null,true);
  }
  if(a.outfit==='vest'){
   const p=[],idx=[],rows=20,cols=12;
   for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
    const y=1.405-j/rows*.413,half=.127-.057*T.MathUtils.smoothstep(y,1.34,1.405);p.push((i/cols*2-1)*half*wide,y,0);
   }
   for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const k=j*(cols+1)+i;idx.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);surface.fit(g,{smooth:true,side:-1,offset:.002});add(g,coat,'Chest',null,true);
  }
  // The opening is bounded by actual fitted cloth, rather than a differently
  // coloured stripe. Front panels follow the chest's full blend weights.
  for(const sign of [-1,1]){
   const p=[],idx=[],rows=18,cols=8;
   for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
    const y=1.405-j/rows*.413,neck=T.MathUtils.smoothstep(y,1.15,1.405);
    const inner=.025+neck*(a.outfit==='vest'?.040:a.outfit==='cardigan'?.038:.035);
    p.push(sign*(inner+(.127-.057*T.MathUtils.smoothstep(y,1.34,1.405)-inner)*i/cols)*wide,y,.002);
   }
   for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const k=j*(cols+1)+i;idx.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);surface.fit(g,{smooth:true,offset:.008});add(g,coat,'Chest',null,true);
   if(['coat','medical'].includes(a.outfit)){
    // Long folded lapels, with a small lifted ridge and a tailored point.
    const p=[],idx=[],n=18;
    for(let j=0;j<=n;j++){
     const t=j/n,y=1.404-t*.222,inner=(.030+.030*(1-t))*wide,width=.014*Math.sin(Math.PI*t);
     p.push(sign*inner,y,.006,sign*(inner+width),y,.009);
    }
    for(let j=0;j<n;j++){const k=j*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);surface.fit(g,{smooth:true,offset:.008});add(g,tint(.89),'Chest',null,true);
   }
   patch(sign*.092*wide,1.078,.061,.066);
  }
  if(['cardigan','vest'].includes(a.outfit))for(let i=0;i<4;i++)button(.035*wide,1.035+i*.046,.0035,dark);
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
   const t=j/rows,y=1.008+(hem-1.008)*t,opening=a.outfit==='robe'?.015:a.outfit==='cardigan'?.20:.16,angle=sign*(opening+i/cols*(Math.PI-opening));
   const support=surface.sample(Math.sin(angle),Math.max(y,.85),Math.cos(angle),'radial');
   if(!support)throw Error('Missing coat support');
   const flare=(a.outfit==='robe'?.047:a.outfit==='cardigan'?.004:.018)*Math.sin(t*Math.PI/2),fold=.0035*Math.sin(angle*10+.7)*Math.pow(t,1.3);
   const anchor=support.point.clone().addScaledVector(support.normal,.0018+.004*T.MathUtils.smoothstep(1.008-y,0,.15));
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
