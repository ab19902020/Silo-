// Things you can feel.
//
// Two very different devices behind one call. A DualSense or DualShock reports
// a `vibrationActuator` through the Gamepad API and takes a duration with two
// magnitudes — the low-frequency motor you feel as a thump and the
// high-frequency one you feel as a buzz. A phone has `navigator.vibrate` and
// one setting: on. So every effect here is written as the pad wants it and
// flattened to a duration for the phone.
//
// It has no imports and touches nothing but the two browser APIs, so the
// patterns can be checked without a pad, a phone or a renderer.

// duration ms, strong (low-frequency rumble), weak (high-frequency buzz).
// Kept deliberately short: a controller that is always buzzing stops meaning
// anything, and on a phone it is the difference between feedback and an
// annoyance you turn off.
export const EFFECTS=Object.freeze({
  tick:      {duration: 28, strong:.00, weak:.30},  // a prompt you can act on
  use:       {duration: 45, strong:.18, weak:.45},  // a door, a lever, a panel
  pickup:    {duration:110, strong:.42, weak:.65},  // something is now yours
  inspect:   {duration: 55, strong:.12, weak:.50},  // turning a relic over
  deny:      {duration: 70, strong:.55, weak:.10},  // locked, sealed, refused
  shot:      {duration: 90, strong:.95, weak:.55},
  reload:    {duration: 50, strong:.25, weak:.35},
  land:      {duration: 75, strong:.70, weak:.15},  // scaled by the impact
  hit:       {duration:220, strong:1.0, weak:.80},  // the drone got you
  bell:      {duration:140, strong:.30, weak:.22},  // the shift bell
});

const clamp01=v=>v<0?0:v>1?1:v;

export class Haptics{
  constructor({enabled=true}={}){
    this.enabled=enabled!==false;
    this.last=0;
    // Nothing shorter than this between effects. Walking past a row of doors
    // would otherwise fire the prompt tick once a frame.
    this.gap=55;
    this.padIndex=null;
  }
  set(enabled){this.enabled=enabled!==false;if(!this.enabled)this.stop();}

  // The pad this session is playing on, handed in by whoever is already
  // polling navigator.getGamepads so this module does not poll a second time.
  attach(gamepad){this.pad=gamepad||null;}

  actuator(){
    const pad=this.pad;
    if(!pad||!pad.connected)return null;
    // Chrome exposes `vibrationActuator`; older builds exposed an array of
    // `hapticActuators`. Either is fine, neither is guaranteed.
    const single=pad.vibrationActuator;
    if(single&&typeof single.playEffect==='function')return single;
    const list=pad.hapticActuators;
    if(list?.length&&typeof list[0].playEffect==='function')return list[0];
    return null;
  }

  // scale lets one effect cover a range — a heavy landing against a light one
  // — without inventing a second entry in the table.
  play(name,scale=1){
    if(!this.enabled)return false;
    const effect=EFFECTS[name];
    if(!effect)return false;
    const now=Date.now();
    if(now-this.last<this.gap)return false;
    this.last=now;
    const strong=clamp01(effect.strong*scale),weak=clamp01(effect.weak*scale);
    const duration=Math.max(10,Math.round(effect.duration*Math.min(1.6,Math.max(.35,scale))));
    const actuator=this.actuator();
    if(actuator){
      // A rejected promise here is a pad that went away mid-effect, which is
      // not worth telling anybody about.
      try{actuator.playEffect('dual-rumble',{startDelay:0,duration,strongMagnitude:strong,weakMagnitude:weak})?.catch?.(()=>{});return true;}
      catch{/* fall through to the phone */}
    }
    if(typeof navigator!=='undefined'&&typeof navigator.vibrate==='function'){
      // One motor and no magnitude, so the strength has to become length.
      // Below about 12 ms a phone motor does not have time to spin up at all.
      const felt=Math.round(duration*(.45+.55*Math.max(strong,weak)));
      try{return navigator.vibrate(Math.max(12,felt));}catch{return false;}
    }
    return false;
  }
  stop(){
    const actuator=this.actuator();
    try{actuator?.reset?.();}catch{/* nothing to reset */}
    try{navigator.vibrate?.(0);}catch{/* nothing to stop */}
  }
}
