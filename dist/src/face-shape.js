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
 lipFullness:{label:'Lip fullness',min:-1,max:1,default:0},
 // The second six. Twelve sliders made faces that differed and did not differ
 // interestingly: everything was the width of something. These are the ones
 // you actually notice on a person — the shelf of the brow, where the jaw
 // hinges, which way the eyes sit.
 browRidge:{label:'Brow ridge',min:-1,max:1,default:0},
 noseBridge:{label:'Nose bridge',min:-1,max:1,default:0},
 eyeTilt:{label:'Eye tilt',min:-1,max:1,default:0},
 cheekFullness:{label:'Cheek fullness',min:-1,max:1,default:0},
 chinWidth:{label:'Chin width',min:.82,max:1.18,default:1},
 jawAngle:{label:'Jaw angle',min:-1,max:1,default:0}
});
// Twenty faces to start from, because six was not a choice — it was three
// shapes and their opposites, and a creator whose first screen offers six
// faces is telling you what the game thinks of your character.
//
// Each of these is a whole face rather than a nudge to one feature: a brow, a
// jaw hinge and an eye tilt together are what make two people recognisably
// different across a room, which is the problem this game actually has. They
// are named for the shape, not for a person, so nobody has to know the cast to
// pick one.
export const FACE_PRESETS=Object.freeze({
 balanced:{label:'Balanced',values:{}},
 angular:{label:'Angular',values:{faceWidth:.97,jawWidth:1.18,cheekbones:.7,chinLength:.2,noseProjection:.25,jawAngle:.5,cheekFullness:-.4}},
 round:{label:'Round',values:{faceWidth:1.08,faceLength:.96,jawWidth:1.07,cheekbones:-.65,chinLength:-.4,noseWidth:1.08,cheekFullness:.75,chinWidth:1.10}},
 oval:{label:'Oval',values:{faceWidth:.96,faceLength:1.06,jawWidth:.88,chinLength:.3,cheekbones:.15,chinWidth:.90}},
 heart:{label:'Heart',values:{faceWidth:1.04,jawWidth:.80,cheekbones:.45,chinLength:.1,eyeSpacing:1.05,chinWidth:.85,jawAngle:-.45}},
 broad:{label:'Broad',values:{faceWidth:1.10,jawWidth:1.13,faceLength:.98,noseWidth:1.18,mouthWidth:1.12,lipFullness:.35,jawAngle:.6}},
 square:{label:'Square',values:{faceWidth:1.05,faceLength:.97,jawWidth:1.20,chinWidth:1.16,jawAngle:.8,cheekbones:.3,browRidge:.45}},
 long:{label:'Long',values:{faceWidth:.92,faceLength:1.08,jawWidth:.90,chinLength:.45,noseProjection:.3,cheekFullness:-.5}},
 soft:{label:'Soft',values:{faceWidth:1.06,faceLength:.97,jawWidth:.94,chinWidth:1.08,cheekbones:-.8,cheekFullness:.9,lipFullness:.6,browRidge:-.7,browHeight:.35,chinLength:-.45,noseWidth:1.06,jawAngle:-.3}},
 sharp:{label:'Sharp',values:{faceWidth:.94,jawWidth:1.05,cheekbones:.9,cheekFullness:-.75,noseProjection:.45,chinLength:.35,chinWidth:.86}},
 heavyBrow:{label:'Heavy brow',values:{browRidge:.85,browHeight:-.5,eyeSize:.94,faceWidth:1.04,jawWidth:1.10,noseBridge:.4}},
 fineBoned:{label:'Fine-boned',values:{faceWidth:.91,jawWidth:.84,chinWidth:.86,noseWidth:.84,mouthWidth:.88,browRidge:-.55,cheekbones:.35}},
 wideSet:{label:'Wide-set eyes',values:{eyeSpacing:1.15,eyeSize:1.08,faceWidth:1.09,faceLength:.95,noseBridge:-.35,noseWidth:1.04,browHeight:.5,browRidge:-.35,jawWidth:1.09,cheekFullness:.45,mouthWidth:1.06}},
 closeSet:{label:'Close-set eyes',values:{eyeSpacing:.86,eyeSize:.93,noseBridge:.7,noseWidth:.88,faceWidth:.94,faceLength:1.05,browHeight:-.4,browRidge:.4,cheekbones:.45,jawWidth:.92}},
 aquiline:{label:'Aquiline',values:{noseProjection:.85,noseWidth:.86,noseBridge:.6,faceLength:1.04,jawWidth:.93,chinLength:.3}},
 flatBridge:{label:'Flat bridge',values:{noseBridge:-.9,noseWidth:1.22,noseProjection:-.7,faceWidth:1.04,faceLength:1.02,cheekbones:.6,cheekFullness:-.3,eyeSpacing:1.02,browRidge:.3,mouthWidth:1.10,lipFullness:.3,jawAngle:.35}},
 upturnedEyes:{label:'Upturned eyes',values:{eyeTilt:.95,eyeSize:1.10,eyeSpacing:1.07,cheekbones:.8,cheekFullness:.4,faceWidth:1.02,faceLength:.96,jawWidth:.89,chinWidth:.88,mouthWidth:1.08,browHeight:.4}},
 downturnedEyes:{label:'Downturned eyes',values:{eyeTilt:-.9,eyeSize:.95,browHeight:.55,browRidge:-.45,lipFullness:-.5,mouthWidth:.90,faceLength:1.07,faceWidth:.93,jawWidth:1.02,jawAngle:-.5,chinLength:.3}},
 fullMouth:{label:'Full mouth',values:{lipFullness:1,mouthWidth:1.22,chinLength:.2,chinWidth:.88,cheekFullness:-.2,cheekbones:.5,noseWidth:.92,noseProjection:.2,faceWidth:.95,faceLength:1.04,jawWidth:.87,jawAngle:-.4,eyeSize:1.04}},
 weathered:{label:'Weathered',values:{cheekbones:.75,cheekFullness:-.8,jawWidth:1.08,jawAngle:.4,browRidge:.5,lipFullness:-.45,faceLength:1.04}}
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
 // The brow as a shelf over the eyes rather than a flat forehead.
 const brow=gaussian(y,1.637,.020)*front;
 nz+=v('browRidge')*.0052*brow;
 // The bridge between the eyes: narrow and high, or broad and flat.
 const bridge=gaussian(y,1.607,.018)*gaussian(x,0,.015)*front;
 nx+=x*v('noseBridge')*.30*bridge;nz+=v('noseBridge')*.0040*bridge;
 // Canthal tilt. The outer corner rises and the inner drops, or the reverse,
 // which is most of why two faces with identical eyes still read differently.
 const outer=T.MathUtils.clamp((Math.abs(x)-.0339)/.018,-1,1);
 ny+=v('eyeTilt')*.0040*eye*outer;
 // Soft tissue low on the cheek, which is not the same thing as the bone
 // above it: cheekbones give you edges, this gives you a full or a hollow face.
 const jowl=gaussian(y,1.570,.026)*gaussian(Math.abs(x),.050,.030)*front;
 nx+=Math.sign(x)*v('cheekFullness')*.0050*jowl;nz+=v('cheekFullness')*.0030*jowl;
 // A pointed chin against a square one, independent of how long it is.
 nx*=1+(v('chinWidth')-1)*gaussian(y,1.532,.018)*front;
 // Where the jaw hinges: forward for a heavy square jaw, back for a tapered one.
 nz+=v('jawAngle')*.0060*gaussian(y,1.556,.024)*gaussian(Math.abs(x),.058,.026);
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
