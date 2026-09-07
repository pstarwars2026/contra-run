"use strict";
// ============================ AUDIO v3 (unchanged engine) ============================
let AC=null, muted=false, P50=null, P25=null;
function audio(){ if(!AC){ AC=new (window.AudioContext||window.webkitAudioContext)(); }
  if(AC.state==='suspended')AC.resume();
  if(!P50){ const mk=d=>{ const n=32, re=new Float32Array(n), im=new Float32Array(n);
      for(let i=1;i<n;i++) re[i]=(2/(i*Math.PI))*Math.sin(i*Math.PI*d);
      return AC.createPeriodicWave(re,im); };
    P50=mk(0.5); P25=mk(0.25); }
  return AC; }
function midi(n){ return 440*Math.pow(2,(n-69)/12); }
function tone(freq,dur,wave,vol,slide,at,vib){ if(muted||!AC)return;
  const t=at||AC.currentTime; const o=AC.createOscillator(), g=AC.createGain();
  if(wave&&wave.real){ o.setPeriodicWave(wave); } else o.type=wave||'square';
  o.frequency.setValueAtTime(freq,t);
  if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+dur);
  if(vib){ const v=AC.createOscillator(), vg=AC.createGain(); v.frequency.value=vib; vg.gain.value=freq*0.011;
    v.connect(vg); vg.connect(o.frequency); v.start(t); v.stop(t+dur); }
  g.gain.setValueAtTime(vol||0.08,t); g.gain.exponentialRampToValueAtTime(0.0008,t+dur);
  o.connect(g); g.connect(AC.destination); o.start(); o.stop(t+dur+0.03); }
function noise(dur,vol,low,at){ if(muted||!AC)return;
  const t=at||AC.currentTime, n=(AC.sampleRate*dur)|0; const b=AC.createBuffer(1,n,AC.sampleRate); const d=b.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
  const s=AC.createBufferSource(); s.buffer=b; const g=AC.createGain(); g.gain.value=vol||0.15;
  const f=AC.createBiquadFilter(); f.type=low?'lowpass':'highpass'; f.frequency.value=low?500:1400;
  s.connect(f); f.connect(g); g.connect(AC.destination); s.start(t); }
function sfx(name){ if(muted)return; switch(name){
  case 'shot': tone(950,0.05,P50,0.045,260); noise(0.02,0.05); break;
  case 'spread': tone(760,0.05,P50,0.05,300); setTimeout(()=>tone(640,0.05,P50,0.045,240),28); setTimeout(()=>tone(520,0.06,P50,0.04,200),56); break;
  case 'laser': tone(1900,0.16,'sawtooth',0.05,160); tone(950,0.1,P25,0.03,90); break;
  case 'fireball': tone(300,0.16,'triangle',0.08,80); noise(0.08,0.06,true); break;
  case 'hit': noise(0.04,0.09); break;
  case 'kill': noise(0.13,0.15,true); tone(130,0.14,'triangle',0.10,40); tone(1300,0.04,P25,0.04,900); break;
  case 'boom': noise(0.42,0.28,true); tone(58,0.38,'sine',0.24,26); tone(880,0.10,'sawtooth',0.045,180); break;
  case 'die': [420,330,250,160].forEach((f,i)=>setTimeout(()=>tone(f,0.09,'square',0.09,f*0.6),i*65)); noise(0.25,0.14,true); break;
  case 'pickup': [660,880,1180].forEach((f,i)=>setTimeout(()=>tone(f,0.06,P50,0.06),i*45)); break;
  case '1up': [523,659,784,1000,1318].forEach((f,i)=>setTimeout(()=>{tone(f,0.10,P50,0.06); tone(f/2,0.10,'triangle',0.05);},i*75)); break;
  case 'alarm': [0,260,520].forEach(d=>setTimeout(()=>{tone(430,0.22,'square',0.08,640);},d)); break;
  case 'splash': noise(0.24,0.13,true); [0,70,140].forEach((d,i)=>setTimeout(()=>tone(1200-i*260,0.03,P25,0.03),d)); break;
}}
const SONGS={
 title:{ bpm:108, leadW:'P50', harmW:'P25', seq:[
  { bass:[48,0,0,0,0,0,55,0, 48,0,0,0,0,0,52,0], lead:[72,0,76,0,79,0,76,0, 72,0,76,0,79,0,84,0], harm:[0,0,64,0,0,0,67,0, 0,0,64,0,0,0,67,0], drums:[ 'k',0,'h',0,'s',0,'h',0, 'k',0,'h',0,'s',0,'h',0] },
  { bass:[45,0,0,0,0,0,52,0, 45,0,0,0,0,0,52,0], lead:[72,0,76,0,79,0,76,0, 72,0,76,0,79,0,0,0], harm:[0,0,60,0,0,0,64,0, 0,0,60,0,0,0,64,0], drums:[ 'k',0,'h',0,'s',0,'h',0, 'k',0,'h',0,'s',0,'h',0] },
  { bass:[41,0,0,0,0,0,48,0, 43,0,0,0,0,0,50,0], lead:[77,0,81,0,84,0,81,0, 79,0,83,0,86,0,83,0], harm:[0,0,65,0,0,0,67,0, 0,0,62,0,0,0,67,0], drums:[ 'k',0,'h',0,'s',0,'h',0, 'k',0,'h',0,'s',0,'h',0] },
  { bass:[48,0,0,0,52,0,0,0, 55,0,0,0,0,0,0,0], lead:[84,0,0,0,83,0,0,0, 79,0,0,0,76,0,0,0], harm:[0,0,64,0,0,0,60,0, 0,0,55,0,0,0,52,0], drums:[ 'k',0,'h',0,'s',0,'h','h', 's',0,'h',0,'s',0,'h',0] },
 ]},
 stage1:{ bpm:152, leadW:'P50', harmW:'P25', seq:[
  { bass:[45,0,57,0,45,0,57,0, 45,0,57,0,45,0,52,0], lead:[69,0,0,72,0,0,74,0, 76,0,0,72,0,0,69,0], harm:[0,0,64,0,0,0,60,0, 0,0,64,0,0,0,60,0], drums:[ 'k',0,'h',0,'s',0,'h','h', 'k',0,'h',0,'s',0,'h',0] },
  { bass:[45,0,57,0,45,0,57,0, 48,0,60,0,48,0,60,0], lead:[0,0,69,0,72,0,0,76, 0,0,79,0,76,0,72,0], harm:[0,0,67,0,0,0,64,0, 0,0,67,0,0,0,64,0], drums:[ 'k',0,'h',0,'s',0,'h','h', 'k',0,'h',0,'s',0,'h',0] },
  { bass:[41,0,53,0,41,0,53,0, 43,0,55,0,43,0,55,0], lead:[77,0,0,76,0,0,74,0, 72,0,0,69,0,0,67,0], harm:[0,0,65,0,0,0,62,0, 0,0,67,0,0,0,62,0], drums:[ 'k',0,'h',0,'s' ,0,'h','h', 'k',0,'h',0,'s',0,'h',0] },
  { bass:[43,0,55,0,43,0,55,0, 40,0,52,0,47,0,50,0], lead:[69,0,0,0,71,0,72,0, 74,0,76,0,79,0,0,0], harm:[0,0,67,0,0,0,64,0, 0,0,64,0,0,0,59,0], drums:[ 'k',0,'h',0,'s',0,'h','k', 's',0,'h',0,'s',0,'s','s'] },
 ]},
 stage2:{ bpm:154, leadW:'P25', harmW:'P50', seq:[
  { bass:[43,0,55,43,0,55,43,0, 46,0,58,46,0,58,46,0], lead:[67,0,70,0,74,0,77,0, 75,0,72,0,70,0,67,0], harm:[0,62,0,0,65,0,0,62, 0,65,0,0,67,0,0,65], drums:['k','h','h',0,'s','h','h','h', 'k','h','h',0,'s','h','s','h'] },
  { bass:[41,0,53,41,0,53,41,0, 48,0,60,48,0,60,48,0], lead:[0,72,0,75,0,79,0,82, 0,79,0,75,0,72,70,0], harm:[65,0,0,60,0,0,65,0, 67,0,0,64,0,0,67,0], drums:['k',0,'h','k','s',0,'h','h', 'k',0,'h','k','s','h','h','h'] },
  { bass:[38,0,50,38,0,50,41,0, 43,0,55,43,0,55,46,0], lead:[74,0,72,0,70,0,67,0, 69,0,70,0,74,0,77,0], harm:[0,58,0,0,62,0,0,60, 0,62,0,0,65,0,0,62], drums:['k','h','h',0,'s','h','h','h', 'k','h','h',0,'s','h','s','s'] },
  { bass:[43,43,0,55,43,0,50,0, 46,46,0,58,53,0,50,0], lead:[79,0,77,0,74,72,70,0, 75,0,74,0,70,67,65,0], harm:[67,0,0,62,0,0,65,0, 70,0,0,65,0,0,67,0], drums:['k',0,'h','k','s','h','h',0, 'k','h','h','k','s',0,'s','s'] },
 ]},
 stage3:{ bpm:158, leadW:'P50', harmW:'P25', seq:[
  { bass:[40,40,52,0,40,40,55,0, 43,43,55,0,43,43,58,0], lead:[76,0,79,0,83,0,79,76, 0,74,0,76,0,79,81,0], harm:[0,64,0,67,0,64,0,0, 0,62,0,64,0,67,0,0], drums:['k','h','h','k','s','h','h','h', 'k','h','h','k','s','h','s','h'] },
  { bass:[38,38,50,0,38,38,53,0, 45,45,57,0,45,45,52,0], lead:[74,0,77,0,81,0,84,81, 0,79,0,77,0,74,72,0], harm:[0,62,0,65,0,62,0,0, 0,69,0,65,0,64,0,0], drums:['k','h','h','k','s',0,'h','h', 'k','h','h','k','s','h','s','s'] },
  { bass:[40,0,52,40,0,55,40,0, 47,0,59,47,0,55,52,0], lead:[76,77,79,0,83,81,79,0, 86,0,83,81,79,76,74,0], harm:[64,0,0,67,0,0,64,0, 71,0,0,67,0,0,64,0], drums:['k',0,'h','k','s','h','h','h', 'k','h','h',0,'s','h','s','h'] },
  { bass:[43,43,55,43,0,50,52,0, 40,40,52,47,0,45,43,0], lead:[79,0,83,0,86,84,81,0, 76,0,79,0,83,81,79,0], harm:[67,0,0,71,0,0,69,0, 64,0,0,67,0,0,64,0], drums:['k','h','h','k','s','h','h','h', 'k','h','s','k','s','h','s','s'] },
 ]},
 boss:{ bpm:164, leadW:'P25', harmW:'P50', seq:[
  { bass:[40,40,0,40,40,0,40,0, 40,40,0,40,40,0,43,0], lead:[76,0,0,76,0,75,0,76, 0,0,79,0,76,0,75,0], harm:[0,0,0,64,0,0,0,64, 0,0,0,64,0,0,67,0], drums:[ 'k',0,'h','k','s',0,'h',0, 'k',0,'h','k','s',0,'h','h'] },
  { bass:[40,40,0,40,40,0,40,0, 47,0,46,0,45,0,44,0], lead:[76,0,0,76,0,75,0,76, 0,0,83,0,79,0,76,0], harm:[0,0,0,64,0,0,0,64, 0,0,0,71,0,0,68,0], drums:[ 'k',0,'h','k','s',0,'h',0, 'k',0,'h','k','s',0,'s','s'] },
 ]},
};
const Music={ state:null, step:0, nextT:0, timer:null,
 set(s){ if(!AC)audio(); if(!AC)return; this.stop(); this.state=s; this.step=0; this.nextT=AC.currentTime+0.06;
   if(s==='victory'||s==='over'){ this.jingle(s); this.state=null; return; }
   this.timer=setInterval(()=>this.pump(),25); this.pump(); },
 stop(){ if(this.timer){clearInterval(this.timer); this.timer=null;} this.state=null; },
 suspend(){ if(AC)AC.suspend(); }, resume(){ if(AC)AC.resume(); },
 toggleMute(){ muted=!muted; if(muted){ if(AC)AC.suspend(); } else if(AC)AC.resume(); },
 jingle(s){ const t=AC.currentTime+0.05;
   if(s==='victory'){ const ns=[72,76,79,84,79,84,88];
     ns.forEach((n,i)=>{ tone(midi(n),0.13,'square',0.06,null,t+i*0.11); tone(midi(n-12),0.13,'triangle',0.05,null,t+i*0.11); });
     [60,64,67,72].forEach(n=>tone(midi(n),1.0,'triangle',0.045,null,t+ns.length*0.11));
   } else { const ns=[64,60,57,52];
     ns.forEach((n,i)=>tone(midi(n),0.3,'square',0.06,null,t+i*0.22));
     tone(midi(40),1.3,'triangle',0.08,null,t+ns.length*0.22); } },
 pump(){ const ac=AC; if(!ac||!this.state||muted)return;
   const sg=SONGS[this.state]; if(!sg)return;
   const stepDur=60/sg.bpm/4, LW=sg.leadW==='P25'?P25:P50, HW=sg.harmW==='P25'?P25:P50;
   while(this.nextT<ac.currentTime+0.18){
     const bar=(this.step/16|0)%sg.seq.length, st=this.step%16, B=sg.seq[bar];
     if(B.lead[st]) tone(midi(B.lead[st]),stepDur*1.7,LW,0.042,null,this.nextT,6);
     if(B.harm[st]) tone(midi(B.harm[st]),stepDur*1.4,HW,0.024,null,this.nextT);
     if(B.bass[st]) tone(midi(B.bass[st]),stepDur*1.7,'triangle',0.085,null,this.nextT);
     if((st&3)===2){
       let an=0;
       for(let back=0;back<4&&!an;back++) an=B.harm[(st-back+16)%16]||B.bass[(st-back+16)%16];
       if(an) tone(midi(an+(an<60?12:0)),stepDur*.82,'sine',0.012,null,this.nextT);
     }
     const d=B.drums[st];
     if(d==='k'){ tone(120,0.06,'sine',0.2,45,this.nextT); noise(0.05,0.14,true,this.nextT); }
     else if(d==='s'){ noise(0.07,0.1,false,this.nextT); }
     else if(d==='h'){ noise(0.018,0.03,false,this.nextT); }
   this.step=(this.step+1)%(sg.seq.length*16); this.nextT+=stepDur;
   } } };
function stageMusicKey(){ return 'stage'+((game.stage||0)+1); }
