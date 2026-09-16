import * as THREE from '../vendor/three.module.js';

// A small green mark over the head of the one person the objective wants.
//
// The brief was "nothing too overpowering", and that is most of the design.
// What this is NOT: a floating arrow, a name plate, an outline around the
// body, a beam of light, or anything that moves fast enough to pull the eye
// away from the room. What it is: a soft dot the size of a coin, a little way
// above the head, breathing slowly.
//
// Three rules keep it quiet:
//   1. Only one, ever. objective-target.js decides who.
//   2. It is depth-tested, so it does not shine through walls and floors. If
//      the person is in the next room you get nothing, which is correct — the
//      objective text is what tells you where to go. The dot answers a
//      different question: which of these five similar people is the one.
//   3. It fades out as you reach them. Standing in front of somebody with the
//      prompt on screen, you do not need a dot as well, so by 2 m it is gone.

const NEAR_FADE=[1.4,2.6];   // fully faded under 1.4 m, full strength past 2.6
const FAR_FADE=[14,19];      // and gone again past 19
// Both of these were wrong on the first look at it in the game, and wrong in
// the same direction. At .30 m up and .115 across, the dot sat in the air
// roughly between two people standing near each other, small enough to read as
// a speck of screen dirt, and it did not say which of them it meant. Proximity
// is what ties a mark to its owner: closer to the crown is less "floating
// nearby" and more "this one". Bigger, because the whole job is being seen.
const HEAD_GAP=.17;          // above the crown
const SIZE=.17;

// A soft disc with a slightly brighter rim. Drawn once into a canvas rather
// than shipped as a file: it is 64 pixels of green and does not deserve a
// request.
function dotTexture(){
  const s=64,canvas=document.createElement('canvas');canvas.width=canvas.height=s;
  const ctx=canvas.getContext('2d'),r=s/2;
  const glow=ctx.createRadialGradient(r,r,0,r,r,r);
  glow.addColorStop(0,'rgba(178,240,168,0.95)');
  glow.addColorStop(.42,'rgba(120,206,116,0.80)');
  glow.addColorStop(.72,'rgba(86,168,88,0.22)');
  glow.addColorStop(1,'rgba(86,168,88,0)');
  ctx.fillStyle=glow;ctx.beginPath();ctx.arc(r,r,r,0,Math.PI*2);ctx.fill();
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}

export class StoryMarker{
  constructor(scene){
    this.sprite=new THREE.Sprite(new THREE.SpriteMaterial({
      map:dotTexture(),transparent:true,opacity:0,depthTest:true,depthWrite:false,
      // Additive would bloom into a headlamp in the dark stairwells. Normal
      // blending keeps it a mark on the air rather than a light source.
      blending:THREE.NormalBlending,
    }));
    this.sprite.name='objective-marker';
    this.sprite.scale.setScalar(SIZE);
    this.sprite.visible=false;
    this.sprite.renderOrder=9;
    this.sprite.frustumCulled=false;
    scene.add(this.sprite);
    this.time=0;
    this.shown=0;          // eased, so appearing and leaving are not a pop
    this.targetId=null;
  }
  // `at` is the world point of the person's head, or null when there is
  // nobody to mark. `eye` is the camera position, for the two fades.
  update(dt,at,eye){
    this.time+=dt;
    const want=at?1:0;
    this.shown+=(want-this.shown)*(1-Math.exp(-7*dt));
    if(this.shown<.01||!at){this.sprite.visible=false;return;}
    const distance=at.distanceTo(eye);
    const near=THREE.MathUtils.smoothstep(distance,NEAR_FADE[0],NEAR_FADE[1]);
    const far=1-THREE.MathUtils.smoothstep(distance,FAR_FADE[0],FAR_FADE[1]);
    // Slow breath. A full second and a half per cycle and only a fifth of the
    // brightness moves, which reads as alive without reading as an alarm.
    const breath=.88+.12*Math.sin(this.time*4.2);
    // .78 rather than full: the brief was "nothing too overpowering", and at
    // 11 cm across this is about twenty pixels on a 720p screen at four
    // metres. Enough to pick one person out of a room dressed identically,
    // not enough to be the thing you are looking at.
    const opacity=this.shown*near*far*breath*.78;
    if(opacity<=.012){this.sprite.visible=false;return;}
    this.sprite.visible=true;
    this.sprite.material.opacity=opacity;
    this.sprite.position.copy(at);
    this.sprite.position.y+=HEAD_GAP+Math.sin(this.time*2.1)*.012;
    // Hold its size on screen a little as it recedes, or at fifteen metres it
    // is two pixels and the whole point is lost.
    this.sprite.scale.setScalar(SIZE*(1+THREE.MathUtils.clamp((distance-4)/11,0,1)*.55));
  }
  dispose(){
    this.sprite.material.map?.dispose();
    this.sprite.material.dispose();
    this.sprite.removeFromParent();
  }
}
