import * as T from '../vendor/three.module.js';

// Shared by the skin, eye sockets, eyes, glasses and scalp. Local, smooth
// deformations preserve the neck seam and avoid floating facial accessories.
export const FACE_CONTROLS=Object.freeze({
 faceWidth:{label:'Face width',min:.88,max:1.12,default:1},
 faceLength:{label:'Face length',min:.92,max:1.08,default:1},
 jawWidth:{label:'Jaw width',min:.78,max:1.22,default:1},
 chinLength:{label:'Chin length',min:-1,max:1,default:0},
 cheekbones:{label:'Cheekbone definition',min:-1,max:1,default:0},
 noseWidth:{label:'Nose width',min:.75,max:1.25,default:1},
 noseProjection:{label:'Nose profile',min:-1,max:1,default:0},
 eyeSpacing:{label:'Eye spacing',min:.85,max:1.15,default:1},
 eyeSize:{label:'Eye size',min:.88,max:1.12,default:1},
 browHeight:{label:'Brow height',min:-1,max:1,default:0},
 mouthWidth:{label:'Mouth width',min:.78,max:1.22,default:1},
 lipFullness:{label:'Lip fullness',min:-1,max:1,default:0}
});
export const FACE_PRESETS=Object.freeze({
 balanced:{label:'Balanced',values:{}},
 angular:{label:'Angular',values:{faceWidth:.97,jawWidth:1.18,cheekbones:.7,chinLength:.2,noseProjection:.25}},
 round:{label:'Round',values:{faceWidth:1.08,faceLength:.96,jawWidth:1.07,cheekbones:-.65,chinLength:-.4,noseWidth:1.08}},
 oval:{label:'Oval',values:{faceWidth:.96,faceLength:1.06,jawWidth:.88,chinLength:.3,cheekbones:.15}},
 heart:{label:'Heart',values:{faceWidth:1.04,jawWidth:.80,cheekbones:.45,chinLength:.1,eyeSpacing:1.05}},
 broad:{label:'Broad',values:{faceWidth:1.10,jawWidth:1.13,faceLength:.98,noseWidth:1.18,mouthWidth:1.12,lipFullness:.35}}
});
export const faceDefaults=()=>Object.fromEntries(Object.entries(FACE_CONTROLS).map(([k,c])=>[k,c.default]));
const gaussian=(x,c,r)=>Math.exp(-(((x-c)/r)**2)),smooth=T.MathUtils.smoothstep;
export function shapeFace(x,y,z,a){
 const v=k=>a[k]??FACE_CONTROLS[k].default,front=smooth(z,.015,.065),aboveNeck=smooth(y,1.525,1.56);
 let nx=x,ny=y,nz=z;
 const jaw=gaussian(y,1.551,.029)*aboveNeck;
 nx*=1+(v('jawWidth')-1)*jaw;
 ny-=v('chinLength')*.011*gaussian(y,1.530,.019)*front*gaussian(x,0,.047);
 const cheek=gaussian(y,1.592,.021)*gaussian(Math.abs(x),.045,.031)*front;
 nx+=Math.sign(x)*v('cheekbones')*.0045*cheek;nz+=v('cheekbones')*.005*cheek;
 const nose=gaussian(x,0,.018)*gaussian(y,1.592,.026)*front;
 nx+=x*(v('noseWidth')-1)*nose*1.6;nz+=v('noseProjection')*.009*nose;
 const eyeSide=x<0?-1:1,eyeX=eyeSide*.03385;
 const eye=gaussian(x,eyeX,.021)*gaussian(y,1.6183,.017)*front;
 nx+=eyeSide*.03385*(v('eyeSpacing')-1)*eye+(x-eyeX)*(v('eyeSize')-1)*eye;
 ny+=(y-1.6183)*(v('eyeSize')-1)*eye+v('browHeight')*.0045*gaussian(y,1.637,.022)*front;
 const mouth=gaussian(y,1.560,.014)*gaussian(x,0,.040)*front;
 nx+=x*(v('mouthWidth')-1)*mouth;
 nz+=v('lipFullness')*.0035*mouth;ny+=(y-1.560)*v('lipFullness')*.20*mouth;
 nx*=v('faceWidth')*(a.female?.96:1);
 ny+=(y-1.610)*(v('faceLength')-1)*aboveNeck*(1-smooth(y,1.685,1.728));
 const seam=smooth(y,1.52,1.54);
 return new T.Vector3(x+(nx-x)*seam,y+(ny-y)*seam,z+(nz-z)*seam);
}

// Stable, modest differences for existing residents. Explicit creator values
// take priority, and identities never change when streamed back onto a floor.
export function residentAppearance(definition){
 const a={...definition.appearance};if(definition.custom)return a;
 let seed=2166136261;for(const c of definition.id)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(const [key,c] of Object.entries(FACE_CONTROLS))if(a[key]==null)a[key]=c.default+(random()-.5)*(c.max-c.min)*.52;
 return a;
}
