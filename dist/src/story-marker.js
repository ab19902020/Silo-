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
//   2. It has two forms, near and far, and that is the whole of how it guides.
//      FAR: beyond nine metres, or with a wall in the way, it is a faint dot
//      drawn through the geometry. That is "over there" — and it is the part
//      the first version did not have. Travelling to Supply drops you at the
//      stair landing forty-five metres from the counter, and a mark that is
//      depth-tested and dies at nineteen metres tells you nothing at all from
//      there. It has to carry the width of a floor or it is not guidance.
//      NEAR: inside nine metres with a clear line to them, it is solid and sits
//      on their head. That is "this one, the third from the left".
//   3. It fades out as you reach them. Standing in front of somebody with the
//      prompt on screen, you do not need a dot as well, so by 2 m it is gone.

const NEAR_FADE=[1.4,2.6];   // fully faded under 1.4 m, full strength past 2.6
const FAR_FADE=[44,60];      // and gone again past the far side of a floor
// Beyond this, or with something in the way, the mark switches to its far form.
const CLOSE_ENOUGH=9;
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
  // `at` is the world point to mark — somebody's head, or the thing itself —
  // or null when there is nothing. `eye` is the camera. `blocked` says whether
  // anything solid stands between the two, which the caller works out because
  // it is the world that knows about walls.
  update(dt,at,eye,blocked=false){
    this.time+=dt;
    const want=at?1:0;
    this.shown+=(want-this.shown)*(1-Math.exp(-7*dt));
    if(this.shown<.01||!at){this.sprite.visible=false;return;}
    const distance=at.distanceTo(eye);
    // Which form. Through a wall or across the room is the far one.
    const away=distance>CLOSE_ENOUGH||blocked;
    if(this.sprite.material.depthTest===away){
      this.sprite.material.depthTest=!away;
      this.sprite.material.needsUpdate=true;
    }
    const near=THREE.MathUtils.smoothstep(distance,NEAR_FADE[0],NEAR_FADE[1]);
    const far=1-THREE.MathUtils.smoothstep(distance,FAR_FADE[0],FAR_FADE[1]);
    // Slow breath. A full second and a half per cycle and only a fifth of the
    // brightness moves, which reads as alive without reading as an alarm.
    const breath=.88+.12*Math.sin(this.time*4.2);
    // .78 near, and dimmer far: the far one is on screen for as long as it
    // takes to cross a floor, and a bright dot hanging through a wall for a
    // minute is exactly the overpowering thing this is trying not to be. It is
    // a direction, read once and then ignored until you arrive.
    const opacity=this.shown*near*far*breath*(away?.42:.78);
    if(opacity<=.012){this.sprite.visible=false;return;}
    this.sprite.visible=true;
    this.sprite.material.opacity=opacity;
    this.sprite.position.copy(at);
    this.sprite.position.y+=HEAD_GAP+Math.sin(this.time*2.1)*.012;
    // Hold its size on screen as it recedes, or across a floor it is one pixel
    // and the whole point is lost. It still shrinks with distance — this only
    // slows that down, so far away it reads as a mark rather than as dirt.
    this.sprite.scale.setScalar(SIZE*(1+THREE.MathUtils.clamp((distance-4)/26,0,1)*2.6));
  }
  dispose(){
    this.sprite.material.map?.dispose();
    this.sprite.material.dispose();
    this.sprite.removeFromParent();
  }
}
