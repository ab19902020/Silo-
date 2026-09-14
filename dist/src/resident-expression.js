import * as T from '../vendor/three.module.js';

// Thin eyelids follow the same eye dimensions as each sculpted face. Their
// closing offsets become one shared GPU morph target on the resident mesh.
export function eyelidGeometry(eye,r,upper){
 const p=[],delta=[],indices=[],columns=20,rows=3,sign=upper?1:-1;
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
  const t=j/rows,angle=i/columns*Math.PI,s=Math.sin(angle),x=Math.cos(angle)*r*.99;
  const outer=sign*r*1.12*s,inner=sign*r*.49*s,y=T.MathUtils.lerp(outer,inner,t),closed=T.MathUtils.lerp(outer,-r*.05*s,t);
  const z=Math.sqrt(Math.max(0,(r+.0014)**2-x*x-y*y)),cz=Math.sqrt(Math.max(0,(r+.0014)**2-x*x-closed*closed));
  p.push(eye.x+x,eye.y+y,eye.z+z);delta.push(0,closed-y,cz-z);
 }
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const k=j*(columns+1)+i;indices.push(k,k+columns+1,k+1,k+1,k+columns+1,k+columns+2);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('blinkOffset',new T.Float32BufferAttribute(delta,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function blinkAmount(time,seed=0){
 const interval=3.1+(seed%17)*.11,phase=((time+seed*.37)%interval+interval)%interval;
 if(phase>.19)return 0;const t=phase/.19;return Math.sin(Math.PI*t)**2;
}
export function updateResidentExpression(actor,time){
 if(!actor.expressionMeshes){actor.expressionMeshes=[];actor.model.traverse(o=>{if(o.isSkinnedMesh&&o.morphTargetInfluences?.length)actor.expressionMeshes.push(o);});actor.expressionSeed=[...actor.definition.id].reduce((n,c)=>n+c.charCodeAt(0),0);}
 const blink=blinkAmount(time,actor.expressionSeed);for(const mesh of actor.expressionMeshes)mesh.morphTargetInfluences[0]=blink;
}
