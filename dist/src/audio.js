export class SiloAudio {
  constructor(){this.context=null;this.enabled=true;this.lastStep=0;}
  start(){
    if(!this.context){
      const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return;
      this.context=new C();this.master=this.context.createGain();this.master.gain.value=.035;this.master.connect(this.context.destination);
      this.hum=this.context.createOscillator();this.hum.type='sine';this.hum.frequency.value=50;this.hum.connect(this.master);this.hum.start();
      const harmonic=this.context.createOscillator();harmonic.frequency.value=100;const gain=this.context.createGain();gain.gain.value=.15;harmonic.connect(gain).connect(this.master);harmonic.start();
    }
    this.context.resume().catch(()=>{});
  }
  setEnabled(value){this.enabled=value;if(this.master)this.master.gain.setTargetAtTime(value?.035:0,this.context.currentTime,.3);}
  setLocation(type){if(!this.master)return;this.master.gain.setTargetAtTime(this.enabled?(type==='generator'?.065:type==='excavator'?.026:.025):0,this.context.currentTime,1);}
  step(distance,speed){
    if(!this.context||!this.enabled||speed<.4||distance-this.lastStep<(speed>4?1.05:.72))return;
    this.lastStep=distance;const c=this.context,t=c.currentTime,osc=c.createOscillator(),gain=c.createGain();osc.type='triangle';osc.frequency.setValueAtTime(120,t);osc.frequency.exponentialRampToValueAtTime(48,t+.06);gain.gain.setValueAtTime(.035,t);gain.gain.exponentialRampToValueAtTime(.001,t+.09);osc.connect(gain).connect(c.destination);osc.start(t);osc.stop(t+.1);
  }
  click(){if(!this.context||!this.enabled)return;const c=this.context,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.frequency.value=210;o.type='triangle';g.gain.setValueAtTime(.04,t);g.gain.exponentialRampToValueAtTime(.001,t+.08);o.connect(g).connect(c.destination);o.start();o.stop(t+.1);}
}
