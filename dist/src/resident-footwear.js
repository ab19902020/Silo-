import * as T from '../vendor/three.module.js';

// Rounded horizontal sections: the sole follows the shoe's footprint instead
// of being a rectangular plate underneath an ellipsoid.
export function shoeGeometry(x,{sole=false,style='work'}={}){
  const rings=sole?[[.010,.051,-.073,.193],[.014,.060,-.078,.201],[.030,.060,-.078,.201],[.037,.056,-.074,.195]]
    :[[.033,.054,-.071,.191],[.060,.058,-.071,.193],[.089,.055,-.067,.174],[.117,.048,-.057,.124],[.144,.040,-.043,.062],[.170,.038,-.039,.049]];
  if(!sole&&style==='boots')rings.push([.215,.041,-.043,.052],[.267,.043,-.045,.053]);
  if(!sole&&style==='slipon'){rings[4]=[.127,.039,-.044,.058];rings[5]=[.141,.037,-.040,.047];}
  const p=[],idx=[],segments=40;
  for(const [y,width,back,front]of rings)for(let j=0;j<segments;j++){
    const a=j/segments*Math.PI*2,z=(front+back)/2+Math.cos(a)*(front-back)/2;
    // A narrower heel and gentle instep keep the last recognisably shoe shaped.
    const heel=T.MathUtils.lerp(.80,1,T.MathUtils.smoothstep(z,-.055,.055));
    p.push(x+Math.sin(a)*width*heel,y,z);
  }
  for(let row=0;row<rings.length-1;row++)for(let j=0;j<segments;j++){
    const a=row*segments+j,b=row*segments+(j+1)%segments,c=a+segments,d=b+segments;idx.push(a,b,c,b,d,c);
  }
  for(const row of [0,rings.length-1]){
    const mid=p.length/3,[y,,back,front]=rings[row];p.push(x,y,(back+front)/2);
    for(let j=0;j<segments;j++){const a=row*segments+j,b=row*segments+(j+1)%segments;idx.push(...(row===0?[mid,b,a]:[mid,a,b]));}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;
}

