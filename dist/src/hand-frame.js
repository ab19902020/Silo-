import * as T from '../vendor/three.module.js';

// Fit a palm plane from the supplied hand surface. Its width can exceed its
// length, so use the forearm projected into that plane for finger direction.
export function fitHandFrame(points,forearm,side){
 const center=new T.Vector3();for(const p of points)center.add(p);center.divideScalar(points.length);
 const a=Array.from({length:3},()=>[0,0,0]),v=[[1,0,0],[0,1,0],[0,0,1]];
 for(const p of points){const d=p.clone().sub(center).toArray();for(let i=0;i<3;i++)for(let j=0;j<3;j++)a[i][j]+=d[i]*d[j];}
 for(let sweep=0;sweep<16;sweep++){
  let p=0,q=1;for(const [i,j] of [[0,2],[1,2]])if(Math.abs(a[i][j])>Math.abs(a[p][q])){p=i;q=j;}
  if(Math.abs(a[p][q])<1e-12)break;const angle=.5*Math.atan2(2*a[p][q],a[q][q]-a[p][p]),c=Math.cos(angle),s=Math.sin(angle);
  const app=a[p][p],aqq=a[q][q],apq=a[p][q];a[p][p]=c*c*app-2*s*c*apq+s*s*aqq;a[q][q]=s*s*app+2*s*c*apq+c*c*aqq;a[p][q]=a[q][p]=0;
  for(let k=0;k<3;k++){if(k!==p&&k!==q){const x=a[k][p],y=a[k][q];a[k][p]=a[p][k]=c*x-s*y;a[k][q]=a[q][k]=s*x+c*y;}const x=v[k][p],y=v[k][q];v[k][p]=c*x-s*y;v[k][q]=s*x+c*y;}
 }
 const k=[0,1,2].sort((i,j)=>a[i][i]-a[j][j])[0],normal=new T.Vector3(v[0][k],v[1][k],v[2][k]).normalize();if(normal.x*side<0)normal.negate();
 const along=forearm.clone().addScaledVector(normal,-forearm.dot(normal)).normalize(),across=along.clone().cross(normal).normalize();normal.crossVectors(across,along).normalize();
 const distances=points.map(p=>p.clone().sub(center).dot(along)).sort((a,b)=>a-b),proximal=distances[Math.floor(distances.length*.08)]-.012;
 return {pivot:center.clone().addScaledVector(along,proximal),along,normal,quaternion:new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(across,along,normal))};
}
