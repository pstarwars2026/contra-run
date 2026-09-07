"use strict";
// ============================ INPUT ============================
const held={left:false,right:false,up:false,down:false,fire:false,jump:false,dash:false};
const heldCounts={left:0,right:0,up:0,down:0,fire:0,jump:0,dash:0};
const inputSources=new Map();
const actionBuffer={jump:0,fire:0,dash:0};
const ACTION_BUFFER_FRAMES={jump:8,fire:6,dash:6};
let konamiBuf=[], startTap=false, pauseTap=false;
function controlFor(key,code){
  const k=(key||'').length===1?(key||'').toLowerCase():(key||'');
  const c=code||'';
  if(c==='ArrowLeft'||c==='KeyA'||k==='ArrowLeft'||k==='a')return 'left';
  if(c==='ArrowRight'||c==='KeyD'||k==='ArrowRight'||k==='d')return 'right';
  if(c==='ArrowUp'||c==='KeyW'||k==='ArrowUp'||k==='w')return 'up';
  if(c==='ArrowDown'||c==='KeyS'||k==='ArrowDown'||k==='s')return 'down';
  if(c==='KeyZ'||c==='KeyJ'||c==='ControlLeft'||c==='ControlRight'||k==='z'||k==='j'||k==='Control')return 'fire';
  if(c==='KeyX'||c==='KeyK'||c==='Space'||k==='x'||k==='k'||k===' ')return 'jump';
  if(c==='ShiftLeft'||c==='ShiftRight'||c==='KeyC'||k==='Shift'||k==='c')return 'dash';
  return null;
}
function setInputSource(source,control,down,queueEdge=true){
  if(!control)return;
  if(down){
    if(inputSources.get(source)===control)return;
    const old=inputSources.get(source);
    if(old){ heldCounts[old]=Math.max(0,heldCounts[old]-1); held[old]=heldCounts[old]>0; }
    const wasHeld=heldCounts[control]>0;
    inputSources.set(source,control); heldCounts[control]++; held[control]=true;
    if(queueEdge&&!wasHeld&&ACTION_BUFFER_FRAMES[control]) actionBuffer[control]=ACTION_BUFFER_FRAMES[control];
  } else {
    const old=inputSources.get(source)||control;
    if(!inputSources.has(source))return;
    inputSources.delete(source); heldCounts[old]=Math.max(0,heldCounts[old]-1); held[old]=heldCounts[old]>0;
  }
}
function keyboardSource(e){
  const code=e.code||'';
  if(code)return 'kbd:'+code;
  const key=(e.key||'').length===1?(e.key||'').toLowerCase():(e.key||'');
  return key?'kbd:key:'+key:'';
}
function releaseKeyboardEvent(e){
  const control=controlFor(e.key,e.code);
  if(!control)return;
  const source=keyboardSource(e);
  if(source&&inputSources.has(source)){
    setInputSource(source,control,false,false);
    return;
  }
  // Browsers can report a different key identity on release after focus,
  // modifier, or layout changes. Fall back to releasing keyboard sources for
  // the same logical control so a missed identity cannot leave a key stuck.
  for(const [id,mapped] of [...inputSources]){
    if(id.startsWith('kbd:')&&mapped===control) setInputSource(id,control,false,false);
  }
}
function clearInputSources(){
  inputSources.clear();
  for(const k of Object.keys(held)){ held[k]=false; heldCounts[k]=0; }
  actionBuffer.jump=actionBuffer.fire=actionBuffer.dash=0;
}
window.addEventListener('keydown',e=>{
  const control=controlFor(e.key,e.code);
  if(control)e.preventDefault();
  setInputSource(keyboardSource(e),control,true,!e.repeat);
  const k=e.key.length===1?e.key.toLowerCase():e.key;
  if(k==='Enter'&&!e.repeat)startTap=true;
  if(k==='p'&&!e.repeat)pauseTap=true;
  if(k==='m'&&!e.repeat&&AC)Music.toggleMute();
  if(!AC){ audio(); if(game.state==='title')Music.set('title'); }
  const seq=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  if(!e.repeat){
    konamiBuf.push(k); if(konamiBuf.length>10)konamiBuf.shift();
    if(seq.every((v,i)=>konamiBuf[i]===v)){ lives=30; sfx('1up'); flashMsg('30 LIVES!'); konamiBuf=[]; }
  }
});
window.addEventListener('keyup',releaseKeyboardEvent);
window.addEventListener('blur',clearInputSources);
window.addEventListener('pagehide',clearInputSources);
document.addEventListener('visibilitychange',()=>{ if(document.hidden)clearInputSources(); });
const K={
  left:()=>held.left,
  right:()=>held.right,
  up:()=>held.up,
  down:()=>held.down,
  fire:()=>held.fire,
  jump:()=>held.jump,
  dash:()=>held.dash,
  start:()=>{ const t=startTap; startTap=false; return t; },
};
// Pointer controls (mouse, pen, and touch) are input adapters only; gameplay
// consumes the same key-state API as keyboard input. Each physical source owns
// its logical control independently, so holding FIRE with the mouse while
// moving/jumping on the keyboard cannot cancel either source.
function releasePointer(pointerId){
  const prefix=`pointer:${pointerId}:`;
  for(const [source,control] of [...inputSources]){
    if(source.startsWith(prefix)) setInputSource(source,control,false,false);
  }
}
for(const btn of document.querySelectorAll('#touch button[data-key]')){
  const key=btn.dataset.key;
  btn.addEventListener('pointerdown',e=>{
    e.preventDefault(); setInputSource(`pointer:${e.pointerId}:${key}`,controlFor(key,''),true,true);
    try{ btn.setPointerCapture?.(e.pointerId); }catch(_err){}
    if(!AC)audio();
  });
  const release=e=>{ e.preventDefault(); releasePointer(e.pointerId); };
  btn.addEventListener('pointerup',release);
  btn.addEventListener('pointercancel',release);
}
window.addEventListener('pointerup',e=>releasePointer(e.pointerId),true);
window.addEventListener('pointercancel',e=>releasePointer(e.pointerId),true);
document.addEventListener('lostpointercapture',e=>releasePointer(e.pointerId),true);
document.getElementById('ov').addEventListener('pointerdown',e=>{
  if(e.target.closest('.ctl'))return;
  startTap=true; if(!AC)audio();
});
