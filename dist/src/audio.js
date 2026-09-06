export class SiloAudio {
  constructor(){this.context=null;this.enabled=true;this.lastStep=0;}
  start(){
    if(!this.context){
      const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return;
      this.context=new C();this.master=this.context.createGain();this.master.gain.value=.035;this.master.connect(this.context.destination);
      this.hum=this.context.createOscillator();this.hum.type='sine';this.hum.frequency.value=50;this.hum.connect(this.master);this.hum.start();
      const buffer=this.context.createBuffer(1,this.context.sampleRate*3,this.context.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.03)/1.03;data[i]=last*3;}this.wind=this.context.createBufferSource();this.wind.buffer=buffer;this.wind.loop=true;this.windGain=this.context.createGain();this.windGain.gain.value=0;const filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=700;this.wind.connect(filter).connect(this.windGain).connect(this.context.destination);this.wind.start();
      const harmonic=this.context.createOscillator();harmonic.frequency.value=100;const gain=this.context.createGain();gain.gain.value=.15;harmonic.connect(gain).connect(this.master);harmonic.start();
    }
    this.context.resume().catch(()=>{});
  }
  setEnabled(value){this.enabled=value;if(this.windGain&&!value)this.windGain.gain.setTargetAtTime(0,this.context.currentTime,.2);if(this.master)this.master.gain.setTargetAtTime(value?.035:0,this.context.currentTime,.3);}
  setLocation(type){if(!this.master)return;if(this.windGain)this.windGain.gain.setTargetAtTime(this.enabled&&type==='surface'?.09:0,this.context.currentTime,.6);this.master.gain.setTargetAtTime(this.enabled?(type==='surface'?.002:type==='generator'?.065:type==='excavator'?.026:.025):0,this.context.currentTime,1);}
  step(distance,speed){
    if(!this.context||!this.enabled||speed<.4||distance-this.lastStep<(speed>4?1.05:.72))return;
    this.lastStep=distance;const c=this.context,t=c.currentTime,osc=c.createOscillator(),gain=c.createGain();osc.type='triangle';osc.frequency.setValueAtTime(120,t);osc.frequency.exponentialRampToValueAtTime(48,t+.06);gain.gain.setValueAtTime(.035,t);gain.gain.exponentialRampToValueAtTime(.001,t+.09);osc.connect(gain).connect(c.destination);osc.start(t);osc.stop(t+.1);
  }
  click(){if(!this.context||!this.enabled)return;const c=this.context,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.frequency.value=210;o.type='triangle';g.gain.setValueAtTime(.04,t);g.gain.exponentialRampToValueAtTime(.001,t+.08);o.connect(g).connect(c.destination);o.start();o.stop(t+.1);}
}
