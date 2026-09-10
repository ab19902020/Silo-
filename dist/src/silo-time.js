// The silo keeps time. Not for the player's benefit — for its own.
//
// Nothing in the show is lit like an office at three in the afternoon all day
// long. The lamps come down at night, the galleries empty, the cafeteria fills
// and empties three times, and a bell moves ten thousand people between
// shifts. This module is the only place that knows what hour it is: lighting,
// crowd, ambience and the view out of the great screen all read the same
// schedule from here, so they cannot disagree about whether it is the middle
// of the night.
//
// It deliberately has no imports. It is arithmetic over a table, so it can be
// checked without a renderer, a browser or a scene.

export const DAY_LENGTH=2400;                       // real seconds in one silo day
export const SHIFT_BELLS=Object.freeze([6,14,22]);  // the three shift changes

const lerp=(a,b,t)=>a+(b-a)*t;
export const wrapHour=h=>((h%24)+24)%24;
// Silo clocks are read out loud as four digits, so 6.5 is "0630".
export const formatClock=h=>{const m=Math.round(wrapHour(h)*60)%1440;return `${String(Math.floor(m/60)).padStart(2,'0')}${String(m%60).padStart(2,'0')}`;};

// Keyframes around the clock; everything between them is interpolated. Putting
// all six curves in one table is the point — a change here moves the lamps, the
// people, the noise and the sky together instead of one system at a time and a
// silo that is dark at noon.
//
//        hour  lamp  warmth crowd  meal bustle daylight  label
const KEYS=[
  [    0,  .30,  1.00,  .04,  .00,  .10,  .00, 'NIGHT CYCLE'],
  [    5,  .34,   .98,  .10,  .00,  .16,  .02, 'NIGHT CYCLE'],
  [    6,  .78,   .60,  .55,  .30,  .68,  .18, 'FIRST SHIFT'],
  [    7, 1.00,   .34,  .80,  .95,  .92,  .52, 'FIRST SHIFT'],
  [    9, 1.00,   .26,  .72,  .15,  .80,  .78, 'FIRST SHIFT'],
  [   11, 1.00,   .25,  .78,  .10,  .88,  .92, 'FIRST SHIFT'],
  [   12, 1.00,   .24,  .86,  .95,  .95,  .95, 'MIDDAY'],
  [ 13.5, 1.00,   .26,  .74,  .25,  .82,  .92, 'SECOND SHIFT'],
  [   15, 1.00,   .30,  .70,  .05,  .78,  .82, 'SECOND SHIFT'],
  [   17,  .98,   .40,  .76,  .10,  .84,  .62, 'SECOND SHIFT'],
  [   18,  .94,   .48,  .82,  .70,  .90,  .46, 'SECOND SHIFT'],
  [ 19.5,  .88,   .62,  .78,  .95,  .92,  .16, 'EVENING'],
  [   21,  .74,   .78,  .52,  .20,  .66,  .02, 'EVENING'],
  [   22,  .58,   .90,  .28,  .05,  .40,  .00, 'THIRD SHIFT'],
  [ 23.5,  .34,   .99,  .08,  .00,  .14,  .00, 'NIGHT CYCLE'],
  [   24,  .30,  1.00,  .04,  .00,  .10,  .00, 'NIGHT CYCLE'],
];

// What the silo is doing at a given hour.
//
//   lamp     interior fixture brightness, 0-1
//   warmth   0 is the cold white of the working day, 1 the amber night cycle
//   crowd    how much of the population is out of its rooms
//   meal     cafeteria and gallery seating pressure
//   bustle   how often the place makes a noise you did not make
//   daylight what the outside looks like, for the sky and the great screen
export function siloSchedule(hour){
  const h=wrapHour(hour);
  let i=0;while(i<KEYS.length-2&&KEYS[i+1][0]<=h)i++;
  const a=KEYS[i],b=KEYS[i+1],span=b[0]-a[0],t=span>0?(h-a[0])/span:0;
  const at=n=>lerp(a[n],b[n],t);
  const lamp=at(1);
  return {hour:h,clock:formatClock(h),label:a[7],
    lamp,warmth:at(2),crowd:at(3),meal:at(4),bustle:at(5),daylight:at(6),
    lightsOut:lamp<.5,night:lamp<.5};
}

// The clock itself. It runs while the game runs and can be stopped, so the
// ninety seconds of the cleaning are not also ninety seconds of the sun moving.
export class SiloClock{
  constructor({dayLength=DAY_LENGTH,hour=6.6,running=true}={}){
    this.dayLength=dayLength>0?dayLength:DAY_LENGTH;
    this.hour=wrapHour(Number.isFinite(hour)?hour:6.6);
    this.running=running!==false;this.days=0;
  }
  get schedule(){return siloSchedule(this.hour);}
  setHour(hour){this.hour=wrapHour(Number.isFinite(hour)?hour:this.hour);}
  // Returns the bells crossed by this step, so a caller can ring them without
  // polling for equality against a moment it will usually miss between frames.
  update(dt){
    if(!this.running||!Number.isFinite(dt)||dt<=0)return [];
    const advance=dt*(24/this.dayLength);
    // A frame long enough to cross a whole day would ring every bell twice and
    // tell nobody anything. Past a day the schedule is simply re-entered.
    if(advance>=24){this.hour=wrapHour(this.hour+advance);this.days++;return [];}
    const before=this.hour,after=before+advance;
    this.hour=wrapHour(after);
    if(after>=24)this.days++;
    const rung=[];
    for(const bell of SHIFT_BELLS){
      // Test the bell in the un-wrapped window, and again a day later, so a
      // step that crosses midnight still catches the ones before dawn.
      for(const at of [bell,bell+24])if(at>before&&at<=after)rung.push(bell);
    }
    return rung;
  }
  save(){return {hour:this.hour,days:this.days};}
  static load(saved){
    const hour=saved&&Number.isFinite(saved.hour)?saved.hour:6.6;
    const clock=new SiloClock({hour});
    clock.days=saved&&Number.isFinite(saved.days)&&saved.days>=0?Math.floor(saved.days):0;
    return clock;
  }
}
