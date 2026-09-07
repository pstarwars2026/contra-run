"use strict";
// ============================ ORIGINAL MIDI-STYLE AUDIO ============================
let AC=null, muted=preferences.muted, P50=null, P25=null, musicBus=null, musicVolume=preferences.musicVolume;
function audio(){ if(!AC){ AC=new (window.AudioContext||window.webkitAudioContext)(); }
  if(!musicBus){musicBus=AC.createGain();musicBus.gain.value=musicVolume;musicBus.connect(AC.destination);}
  Music.syncState();
  if(!P50){ const mk=d=>{ const n=32, re=new Float32Array(n), im=new Float32Array(n);
      for(let i=1;i<n;i++) re[i]=(2/(i*Math.PI))*Math.sin(i*Math.PI*d);
      return AC.createPeriodicWave(re,im); };
    P50=mk(0.5); P25=mk(0.25); }
  return AC; }
function midi(n){ return 440*Math.pow(2,(n-69)/12); }
function tone(freq,dur,wave,vol,slide,at,vib,output){ if(muted||paused||focusLost||!AC)return;
  const t=at||AC.currentTime; const o=AC.createOscillator(), g=AC.createGain();
  if(wave&&wave.real){ o.setPeriodicWave(wave); } else o.type=wave||'square';
  o.frequency.setValueAtTime(freq,t);
  if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+dur);
  if(vib){ const v=AC.createOscillator(), vg=AC.createGain(); v.frequency.value=vib; vg.gain.value=freq*0.011;
    v.connect(vg); vg.connect(o.frequency); v.start(t); v.stop(t+dur); }
  g.gain.setValueAtTime(vol||0.08,t); g.gain.exponentialRampToValueAtTime(0.0008,t+dur);
  o.connect(g); g.connect(output||AC.destination); o.start(t); o.stop(t+dur+0.03); }
function noise(dur,vol,low,at,output){ if(muted||paused||focusLost||!AC)return;
  const t=at||AC.currentTime, n=(AC.sampleRate*dur)|0; const b=AC.createBuffer(1,n,AC.sampleRate); const d=b.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
  const s=AC.createBufferSource(); s.buffer=b; const g=AC.createGain(); g.gain.value=vol||0.15;
  const f=AC.createBiquadFilter(); f.type=low?'lowpass':'highpass'; f.frequency.value=low?500:1400;
  s.connect(f); f.connect(g); g.connect(output||AC.destination); s.start(t); }
function musicVoice(note,dur,kind,vol,at){ if(muted||paused||focusLost||!AC||!note)return;
  const t=at||AC.currentTime, end=t+dur, out=AC.createGain(), filter=AC.createBiquadFilter();
  const profile={
    lead:{attack:0.018,cut:3100,voices:[['triangle',0,0.72],['sine',12,0.16]]},
    harmony:{attack:0.035,cut:2300,voices:[['sine',0,0.72],['triangle',12,0.12]]},
    bass:{attack:0.012,cut:1100,voices:[['triangle',0,0.85],['sine',-12,0.18]]},
    bell:{attack:0.006,cut:3600,voices:[['sine',0,0.65],['sine',12,0.22],['sine',19,0.08]]},
  }[kind]||{attack:0.02,cut:2400,voices:[['sine',0,1]]};
  filter.type='lowpass'; filter.frequency.setValueAtTime(profile.cut,t); filter.Q.value=0.35;
  out.gain.setValueAtTime(0.0001,t);
  out.gain.linearRampToValueAtTime(vol,t+profile.attack);
  out.gain.setValueAtTime(vol*0.72,Math.max(t+profile.attack,end-0.06));
  out.gain.exponentialRampToValueAtTime(0.0003,end);
  filter.connect(out); out.connect(musicBus);
  for(const [wave,semi,level] of profile.voices){
    const o=AC.createOscillator(), mix=AC.createGain();
    o.type=wave; o.frequency.setValueAtTime(midi(note+semi),t); mix.gain.value=level;
    o.connect(mix); mix.connect(filter); o.start(t); o.stop(end+0.04);
  }
}
function musicDrum(kind,at){ if(muted||!AC)return;
  if(kind==='k'){ tone(92,0.075,'sine',0.075,46,at,0,musicBus); }
  else if(kind==='s'){ noise(0.055,0.032,false,at,musicBus); tone(190,0.035,'triangle',0.018,125,at,0,musicBus); }
  else if(kind==='h'){ noise(0.014,0.008,false,at,musicBus); }
}
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
// Original MIDI-note arrangements. The browser renders them through soft
// Web Audio voices, avoiding an external soundtrack file and keeping the music
// tuneful without the harsher square-wave lead used in the earlier mix.
const SONGS={
 title:{ bpm:96, seq:[
  { bass:[48,0,0,0,55,0,0,0,48,0,0,0,55,0,0,0], lead:[64,0,67,0,69,0,67,0,64,0,62,0,64,0,67,0], harm:[60,0,0,0,64,0,0,0,67,0,0,0,64,0,0,0], drums:['k',0,'h',0,0,0,'h',0,'k',0,'h',0,0,0,'h',0] },
  { bass:[45,0,0,0,52,0,0,0,45,0,0,0,52,0,0,0], lead:[64,0,69,0,72,0,69,0,67,0,64,0,62,0,64,0], harm:[57,0,0,0,60,0,0,0,64,0,0,0,60,0,0,0], drums:['k',0,'h',0,0,0,'h',0,'k',0,'h',0,0,0,'h',0] },
  { bass:[41,0,0,0,48,0,0,0,43,0,0,0,50,0,0,0], lead:[65,0,69,0,72,0,69,0,67,0,71,0,74,0,71,0], harm:[57,0,0,0,60,0,0,0,59,0,0,0,62,0,0,0], drums:['k',0,'h',0,0,0,'h',0,'k',0,'h',0,0,0,'h',0] },
  { bass:[48,0,0,0,43,0,0,0,45,0,0,0,43,0,0,0], lead:[72,0,71,0,69,0,67,0,64,0,67,0,62,0,64,0], harm:[60,0,0,0,59,0,0,0,57,0,0,0,59,0,0,0], drums:['k',0,'h',0,0,0,'h',0,'k',0,'h',0,0,0,'h',0] },
 ]},
 stage1:{ bpm:128, seq:[
  { bass:[45,0,0,0,52,0,0,0,45,0,0,0,52,0,0,0], lead:[69,0,72,0,71,0,69,0,64,0,67,0,69,0,72,0], harm:[57,0,0,0,60,0,0,0,64,0,0,0,60,0,0,0], drums:['k',0,'h',0,'s',0,'h',0,'k',0,'h',0,'s',0,'h',0] },
  { bass:[48,0,0,0,55,0,0,0,48,0,0,0,55,0,0,0], lead:[72,0,74,0,76,0,72,0,69,0,67,0,64,0,67,0], harm:[60,0,0,0,64,0,0,0,67,0,0,0,64,0,0,0], drums:['k',0,'h',0,'s',0,'h',0,'k',0,'h',0,'s',0,'h',0] },
  { bass:[41,0,0,0,48,0,0,0,43,0,0,0,50,0,0,0], lead:[69,0,67,0,65,0,64,0,65,0,69,0,72,0,69,0], harm:[57,0,0,0,60,0,0,0,59,0,0,0,62,0,0,0], drums:['k',0,'h',0,'s',0,'h',0,'k',0,'h',0,'s',0,'h',0] },
  { bass:[43,0,0,0,50,0,0,0,45,0,0,0,52,0,0,0], lead:[67,0,71,0,74,0,71,0,69,0,72,0,76,0,72,0], harm:[59,0,0,0,62,0,0,0,57,0,0,0,64,0,0,0], drums:['k',0,'h',0,'s',0,'h',0,'k',0,'h',0,'s',0,'h','h'] },
 ]},
 stage2:{ bpm:124, seq:[
  { bass:[38,0,0,0,45,0,0,0,38,0,0,0,45,0,0,0], lead:[65,0,69,0,72,0,69,0,67,0,65,0,62,0,65,0], harm:[53,0,0,0,57,0,0,0,60,0,0,0,57,0,0,0], drums:['k',0,'h',0,'s',0,'h',0,'k',0,'h',0,'s',0,'h',0] },
  { bass:[41,0,0,0,48,0,0,0,41,0,0,0,48,0,0,0], lead:[69,0,72,0,74,0,72,0,69,0,67,0,65,0,67,0], harm:[57,0,0,0,60,0,0,0,65,0,0,0,60,0,0,0], drums:['k',0,'h',0,'s',0,'h',0,'k',0,'h',0,'s',0,'h',0] },
  { bass:[43,0,0,0,50,0,0,0,38,0,0,0,45,0,0,0], lead:[67,0,70,0,74,0,70,0,69,0,67,0,65,0,62,0], harm:[55,0,0,0,58,0,0,0,53,0,0,0,57,0,0,0], drums:['k',0,'h',0,'s',0,'h',0,'k',0,'h',0,'s',0,'h',0] },
  { bass:[38,0,0,0,45,0,0,0,41,0,0,0,43,0,0,0], lead:[65,0,69,0,72,0,74,0,72,0,69,0,67,0,65,0], harm:[53,0,0,0,57,0,0,0,60,0,0,0,59,0,0,0], drums:['k',0,'h',0,'s',0,'h',0,'k',0,'h',0,'s',0,'h','h'] },
 ]},
 stage3:{ bpm:132, seq:[
  { bass:[40,0,0,0,47,0,0,0,40,0,0,0,47,0,0,0], lead:[67,0,71,0,74,0,71,0,67,0,69,0,71,0,74,0], harm:[55,0,0,0,59,0,0,0,62,0,0,0,59,0,0,0], drums:['k',0,'h',0,'s',0,'h',0,'k',0,'h',0,'s',0,'h',0] },
  { bass:[43,0,0,0,50,0,0,0,43,0,0,0,50,0,0,0], lead:[71,0,74,0,76,0,74,0,71,0,69,0,67,0,69,0], harm:[59,0,0,0,62,0,0,0,67,0,0,0,62,0,0,0], drums:['k',0,'h',0,'s',0,'h',0,'k',0,'h',0,'s',0,'h',0] },
  { bass:[45,0,0,0,52,0,0,0,40,0,0,0,47,0,0,0], lead:[72,0,76,0,74,0,72,0,71,0,69,0,67,0,64,0], harm:[60,0,0,0,64,0,0,0,55,0,0,0,59,0,0,0], drums:['k',0,'h',0,'s',0,'h',0,'k',0,'h',0,'s',0,'h',0] },
  { bass:[40,0,0,0,47,0,0,0,43,0,0,0,45,0,0,0], lead:[67,0,71,0,74,0,76,0,74,0,71,0,69,0,67,0], harm:[55,0,0,0,59,0,0,0,62,0,0,0,60,0,0,0], drums:['k',0,'h',0,'s',0,'h',0,'k',0,'h',0,'s',0,'h','h'] },
 ]},
 boss:{ bpm:140, seq:[
  { bass:[40,0,40,0,47,0,40,0,43,0,43,0,50,0,43,0], lead:[64,0,0,67,0,0,71,0,69,0,0,67,0,0,64,0], harm:[52,0,0,0,55,0,0,0,50,0,0,0,55,0,0,0], drums:['k',0,'h',0,'s',0,'h',0,'k',0,'h',0,'s',0,'h','h'] },
  { bass:[38,0,38,0,45,0,38,0,40,0,40,0,47,0,43,0], lead:[62,0,0,65,0,0,69,0,67,0,0,64,0,0,62,0], harm:[50,0,0,0,53,0,0,0,52,0,0,0,55,0,0,0], drums:['k',0,'h',0,'s',0,'h',0,'k',0,'h',0,'s',0,'h','h'] },
 ]},
};
// Four passes form a longer arc: melody, bell response, quiet interlude,
// then a return. Rests and voicing changes retain each zone's original harmony.
function musicArrangement(song,step){
  const st=step%16, bar=Math.floor(step/16)%song.seq.length;
  const phrase=Math.floor(step/(song.seq.length*16))%4, B=song.seq[bar];
  const quiet=phrase===2;
  let lead=B.lead[st];
  if((phrase===1&&st%4!==0)||(quiet&&st%8!==0)||(phrase===3&&bar===song.seq.length-1&&st>=12))lead=0;
  if(quiet&&lead)lead-=12;
  let drum=B.drums[st];
  if((quiet&&drum!=='k')||(phrase===1&&drum==='h'))drum=0;
  return {lead,harm:B.harm[st],bass:B.bass[st],drum,phrase,quiet,
    kind:quiet?'harmony':phrase===1?'bell':'lead',bar,st};
}
function scheduleMusicStep(sg,step,at){
  const stepDur=60/sg.bpm/4;
     const a=musicArrangement(sg,step), st=a.st, B=sg.seq[a.bar];
     if(a.lead)musicVoice(a.lead,stepDur*(a.quiet?5.5:2.8),a.kind,a.phrase===1?0.020:0.025,at);
     if(a.harm)musicVoice(a.harm,stepDur*3.8,'harmony',a.quiet?0.021:0.015,at);
     if(a.bass)musicVoice(a.bass,stepDur*3.2,'bass',a.quiet?0.035:0.043,at);
     if((a.phrase===0||a.phrase===3)&&(st&7)===6){
       let an=0;
       for(let back=0;back<8&&!an;back++) an=B.harm[(st-back+16)%16];
       if(an) musicVoice(an+12,stepDur*1.8,'bell',0.007,at);
     }
     musicDrum(a.drum,at);
}
const Music={ state:null, step:0, nextT:0, timer:null,
 set(s){ if(!AC)audio(); if(!AC)return; this.stop(); this.state=s; this.step=0; this.nextT=AC.currentTime+0.06;
   if(s==='victory'||s==='over'){ this.jingle(s); this.state=null; return; }
   this.timer=setInterval(()=>this.pump(),25); this.pump(); },
 stop(){ if(this.timer){clearInterval(this.timer); this.timer=null;} this.state=null; },
 syncState(){
   if(!AC)return;
   // Pause, focus loss and mute are independent reasons to stay silent.
   // Always issue the desired operation: an earlier async suspend may still
   // be pending even while AudioContext.state reports 'running'.
   const silent=paused||muted||focusLost;
   return AC[silent?'suspend':'resume']().catch(err=>console.warn('Audio state:',err.message));
 },
 suspend(){ return this.syncState(); }, resume(){ return this.syncState(); },
 toggleMute(){
   muted=!muted; preferences.muted=muted; savePreferences(); this.syncState(); this.updateControls();
 },
 setVolume(value){
   if(!Number.isFinite(value))return;
   musicVolume=Math.max(0,Math.min(1,value));
   if(musicBus)musicBus.gain.setTargetAtTime(musicVolume,AC.currentTime,0.025);
   preferences.musicVolume=musicVolume; savePreferences(); this.updateControls();
 },
 updateControls(){
   document.getElementById('musicVolumeValue').textContent=Math.round(musicVolume*100)+'%';
   document.getElementById('musicVolume').value=String(Math.round(musicVolume*100));
   document.getElementById('reducedEffects').checked=preferences.reducedEffects;
   const button=document.getElementById('muteButton');
   button.textContent=muted?'Unmute':'Mute'; button.setAttribute('aria-pressed',String(muted));
 },
 jingle(s){ const t=AC.currentTime+0.05;
   if(s==='victory'){ const ns=[72,76,79,84,79,84,88];
     ns.forEach((n,i)=>{ musicVoice(n,0.18,'bell',0.04,t+i*0.12); musicVoice(n-12,0.2,'harmony',0.025,t+i*0.12); });
     [60,64,67,72].forEach(n=>musicVoice(n,1.05,'harmony',0.026,t+ns.length*0.12));
   } else { const ns=[64,60,57,52];
     ns.forEach((n,i)=>musicVoice(n,0.32,'harmony',0.032,t+i*0.24));
     musicVoice(40,1.35,'bass',0.045,t+ns.length*0.24); } },
 pump(){ const ac=AC; if(!ac||!this.state||muted||paused||focusLost||ac.state!=='running')return;
   const sg=SONGS[this.state]; if(!sg)return;
   const stepDur=60/sg.bpm/4;
   if(this.nextT<ac.currentTime)this.nextT=ac.currentTime+0.02;
   while(this.nextT<ac.currentTime+0.18){
     scheduleMusicStep(sg,this.step,this.nextT);
   this.step=(this.step+1)%(sg.seq.length*16*4); this.nextT+=stepDur;
   } } };
function stageMusicKey(){ return 'stage'+((game.stage||0)+1); }

Music.updateControls();
