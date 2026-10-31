import * as T from '../vendor/three.module.js';

// Cloth has thickness.
//
// Up to this point a resident's shirt and trousers were the bare anatomy with a
// colour on it: the garment zones are per-vertex tones painted onto the body
// mesh, and the only relief is a fraction of a millimetre of fold noise. That
// reads as body paint rather than clothing — a navel, a kneecap, a calf and a
// groin all come straight through the cloth, and the silhouette is the
// silhouette of a naked person.
//
// So the covered part of the body is pushed out along its own normals into the
// shape of the garment and then relaxed. Inflating the body in place rather than
// laying a second shell over it costs no extra vertices, keeps every skin weight
// exactly as it was — so the cloth cannot swim against the body it hangs on —
// and leaves the panels, collars, waistband and coat skirts that fit to this
// surface landing on the clothes instead of inside them.
//
// Where cloth meets skin the lift ramps to nothing over a couple of centimetres.
// That ramp is the cuff: a ring of near-horizontal triangles where the sleeve
// stops and the wrist begins, which is what you see on a real sleeve and what
// the painted version had no way to show.

// How thick the cloth is over each part of the body, in metres on a 1.78 m
// frame. A shirt is thin, a work coverall is canvas, knitwear is thick, and a
// cleaning suit is a pressure garment.
const WEIGHT={work:.0105,uniform:.0085,shirt:.0070,knit:.0145,cardigan:.0120,
              vest:.0080,coat:.0105,medical:.0095,robe:.0115};

export function clotheBody({geometry,data,neighbours,a,wide,suit,hem,pinned,forearmWeight}){
  const p=geometry.attributes.position,n=geometry.attributes.normal,count=p.count;
  const smoothstep=T.MathUtils.smoothstep,clamp=T.MathUtils.clamp;
  const body=WEIGHT[a.outfit]??.0090,heavy=suit?.0150:body;

  // How much of each vertex is cloth, from 1 under the garment to 0 on bare
  // skin. It mirrors the rule that decides the garment's colour, so the cloth
  // ends exactly where the cloth colour ends rather than a centimetre off it.
  const covered=new Float32Array(count);
  const lift=new Float32Array(count);
  for(let i=0;i<count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),tone=data.tones[i];
    if(tone===2){covered[i]=0;continue;}                      // hands are never cloth
    let cloth=1;
    if(!suit&&a.shortSleeves){
      // A rolled sleeve stops partway down the forearm. Ramping over two
      // centimetres leaves a cuff rather than a cliff.
      // Same rule as the colour: bare where the vertex follows the forearm.
      const onArm=forearmWeight?smoothstep(forearmWeight[i],.35,.65):0;
      cloth*=1-onArm*smoothstep(1.125,1.085,y);
    }
    // The sewn neckline is the collar's own edge and must not move, or the
    // collar panels that are fitted to it lift off the shoulders.
    cloth*=1-smoothstep(y,1.418,1.462);
    // Trousers break over the boot instead of swelling down into it.
    if(tone===1)cloth*=smoothstep(y,.135,.205);
    covered[i]=cloth;
    let thickness=tone===1?heavy*1.05:heavy;
    if(tone===1){
      // The seat carries the most cloth and the ankle the least. The first pass
      // tapered from the knee down, which left the calves painted on; a trouser
      // leg is loose over the calf and only narrows where it breaks on the boot.
      // A little more over the seat and thigh than at the shin. The first pass
      // nearly doubled the cloth over the seat and gave everybody a pumpkin.
      thickness*=1+.35*Math.exp(-(((y-.84)/.10)**2))+.12*Math.exp(-(((y-.42)/.14)**2))-.45*smoothstep(.26,.16,y);
    }else{
      // No blousing at the waist: adding cloth there turned every resident's
      // middle into a pot belly. The shirt lies closer across the chest.
      thickness*=1-.18*Math.exp(-(((y-1.30)/.10)**2))-.20*Math.exp(-(((y-1.06)/.08)**2));
      // A sleeve carries less cloth than the body of the garment. Giving the
      // arms the same thickness as the chest turned them into sausages, which
      // is the opposite of the problem this is here to fix.
      thickness*=1-.42*smoothstep(Math.abs(x),.112*wide,.168*wide);
    }
    lift[i]=thickness*cloth;
  }

  // Push the cloth out along the surface it hangs on.
  const source=p.array.slice();
  const moved=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    moved[i*3]=p.getX(i)+n.getX(i)*lift[i];
    moved[i*3+1]=p.getY(i)+n.getY(i)*lift[i];
    moved[i*3+2]=p.getZ(i)+n.getZ(i)*lift[i];
  }
  p.array.set(moved);

  // The pelvis is where a painted garment gives itself away. The anatomy there
  // is a bulge with a fork under it, and cloth is neither: a pair of trousers
  // hangs flat across the front and the fork survives only as a shallow seam.
  // Offsetting along the normal cannot do that — the normal of a notch points
  // into the notch, and the normal of a bulge points out of it.
  //
  // So the front of the hip is measured, far enough out to be past both, and the
  // pelvic band is drawn towards a smooth curve through it: hollows forward, the
  // bulge back. The first attempt only filled hollows, which left exactly the
  // shape it was meant to remove. The move is capped and fades out at the edges
  // of the band, because dragging the hips around loses the coat skirts that
  // sample this surface for support.
  {
    const band=[.790,.965],inner=.085*wide,outer=.140*wide,reach=.165*wide;
    let hipFront=0,hipCount=0;
    for(let i=0;i<count;i++){
      const x=Math.abs(p.getX(i)),y=p.getY(i),z=p.getZ(i);
      if(data.tones[i]!==1||z<=0||y<band[0]||y>band[1]||x<inner||x>outer)continue;
      hipFront+=z;hipCount++;
    }
    if(hipCount>8){
      hipFront/=hipCount;
      const middle=(band[0]+band[1])/2;
      for(let i=0;i<count;i++){
        const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
        if(data.tones[i]!==1||z<=0||!covered[i])continue;
        // One at the midline, falling away to nothing at the hips. Written the
        // other way round this returns zero exactly where the work is needed,
        // which is why the first two passes at this changed almost nothing.
        const across=1-smoothstep(Math.abs(x),inner*.45,outer);
        const along=Math.exp(-(((y-middle)/((band[1]-band[0])*.46))**2));
        const pull=across*along;
        if(pull<.02)continue;
        // Trousers are a little rounded across the front, not a flat board.
        const round=Math.max(0,1-(x/reach)**2);
        const target=hipFront+.0065*round*wide;
        p.setZ(i,z+clamp(target-z,-.026,.022)*pull);
      }
    }
  }

  // Two rings are sewn seams rather than free cloth and may not be moved: the
  // neckline the collar is stitched to, and the waist ring the waistband is
  // sampled from. Both are looked for at an exact height by the panels fitted
  // to them, so a millimetre of drift loses the support they ride on.
  for(const i of pinned||[])p.setXYZ(i,source[i*3],source[i*3+1],source[i*3+2]);

  // Relax the cloth. A garment is smoother than the body inside it — that is
  // most of what tells you something is being worn — and the relaxation is also
  // what closes the fork above into a seat.
  const held=new Set(pinned||[]);
  const weightFor=i=>covered[i]*(data.tones[i]===1?1:.75);
  for(let pass=0;pass<5;pass++){
    const next=p.array.slice();
    for(let i=0;i<count;i++){
      const w=weightFor(i);if(w<.02||held.has(i))continue;
      const near=neighbours[i];if(!near||!near.size)continue;
      const amount=.34*w;
      for(let k=0;k<3;k++){
        let mean=0;for(const j of near)mean+=p.array[j*3+k];
        next[i*3+k]=p.array[i*3+k]*(1-amount)+mean/near.size*amount;
      }
    }
    p.array.set(next);
  }
  // Relaxation shrinks a closed surface, so give back what it took along the
  // way: without this the trousers end up tighter than the legs they replaced.
  geometry.computeVertexNormals();
  for(let i=0;i<count;i++){
    const give=held.has(i)?0:lift[i]*.42;if(give<1e-5)continue;
    p.setXYZ(i,p.getX(i)+n.getX(i)*give,p.getY(i)+n.getY(i)*give,p.getZ(i)+n.getZ(i)*give);
  }
  // The waist seam travels outward with the cloth but keeps its height, so the
  // waistband still finds it and the shirt does not pinch in where it meets the
  // trousers.
  if(Number.isFinite(hem))for(let i=0;i<count;i++)
    if(Math.abs(source[i*3+1]-hem)<1e-6)p.setY(i,hem);
  geometry.computeVertexNormals();
  return {covered,lift};
}
