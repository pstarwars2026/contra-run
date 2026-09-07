"use strict";
// ============================ INPUT ============================
const held={left:false,right:false,up:false,down:false,fire:false,jump:false,dash:false};
const heldCounts={left:0,right:0,up:0,down:0,fire:0,jump:0,dash:0};
const inputSources=new Map();
const actionBuffer={jump:0,fire:0,dash:0};
const ACTION_BUFFER_FRAMES={jump:8,fire:6,dash:6};
let konamiBuf=[], startTap=false, pauseTap=false, focusLost=false;
const controlButtons=[...document.querySelectorAll('#touch button[data-key]')];
const CODE_CONTROL={
  ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',
  ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',
  KeyZ:'fire',KeyJ:'fire',ControlLeft:'fire',ControlRight:'fire',
  KeyX:'jump',KeyK:'jump',Space:'jump',ShiftLeft:'dash',ShiftRight:'dash',KeyC:'dash',
};
const KEY_CODES={
  ArrowLeft:['ArrowLeft'],a:['KeyA'],ArrowRight:['ArrowRight'],d:['KeyD'],
  ArrowUp:['ArrowUp'],w:['KeyW'],ArrowDown:['ArrowDown'],s:['KeyS'],
  z:['KeyZ'],j:['KeyJ'],Control:['ControlLeft','ControlRight'],
  x:['KeyX'],k:['KeyK'],' ':['Space'],Shift:['ShiftLeft','ShiftRight'],c:['KeyC'],
};
function normalizedKey(key){ return (key||'').length===1?key.toLowerCase():(key||''); }
function controlFor(key,code){
  // A physical Space must stay Jump even when modifiers/layouts alter `key`.
  if(code&&code!=='Unidentified')return CODE_CONTROL[code]||null;
  return CODE_CONTROL[(KEY_CODES[normalizedKey(key)]||[])[0]]||null;
}
function syncControlFeedback(){
  for(const btn of controlButtons){
    const active=!!held[controlFor(btn.dataset.key,'')];
    btn.classList.toggle('held',active);
    btn.setAttribute('aria-pressed',String(active));
  }
}
function setInputSource(source,control,down,queueEdge=true){
  if(!control||!source)return;
  if(down){
    if(inputSources.get(source)===control)return;
    const old=inputSources.get(source);
    if(old){ heldCounts[old]=Math.max(0,heldCounts[old]-1); held[old]=heldCounts[old]>0; }
    inputSources.set(source,control); heldCounts[control]++; held[control]=true;
    // Each fresh physical press is an action edge, even while another source
    // holds the same button. Auto-repeat still cannot queue a second edge.
    if(queueEdge&&ACTION_BUFFER_FRAMES[control]) actionBuffer[control]=ACTION_BUFFER_FRAMES[control];
  } else {
    const old=inputSources.get(source)||control;
    if(!inputSources.has(source))return;
    inputSources.delete(source); heldCounts[old]=Math.max(0,heldCounts[old]-1); held[old]=heldCounts[old]>0;
  }
  syncControlFeedback();
}
function keyboardSource(e){
  const code=e.code||'';
  if(code&&code!=='Unidentified')return 'kbd:'+code;
  const key=normalizedKey(e.key);
  return key?'kbd:key:'+key:'';
}
const controlModifierSources=['kbd:ControlLeft','kbd:ControlRight','kbd:key:Control','kbd:modifier:Control'];
function reconcileControlModifier(e){
  if(e.key==='Control'||e.code==='ControlLeft'||e.code==='ControlRight')return;
  // The browser supplies a modifier snapshot on Space even if the page missed
  // Control's own down/up event. Recover only Control ownership, never Z/J or
  // pointer Fire, and retain a quick chord's edge until the simulation sees it.
  if(e.ctrlKey){
    if(!controlModifierSources.some(id=>inputSources.has(id)))
      setInputSource('kbd:modifier:Control','fire',true,e.type==='keydown'&&!e.repeat);
  } else {
    for(const id of controlModifierSources)setInputSource(id,'fire',false,false);
  }
}
function releaseKeyboardEvent(e){
  const control=controlFor(e.key,e.code);
  if(control&&!isUtilityTarget(e))e.preventDefault();
  reconcileControlModifier(e);
  if(!control)return;
  const source=keyboardSource(e);
  setInputSource(source,control,false,false);
  const key=normalizedKey(e.key);
  setInputSource('kbd:key:'+key,control,false,false);
  // Missing-code releases match the physical key, not every owner of its
  // action: releasing D must not cancel an independently held Right arrow.
  if(!e.code||e.code==='Unidentified')
    for(const code of KEY_CODES[key]||[])setInputSource('kbd:'+code,control,false,false);
  if(e.key==='Control'||e.code==='ControlLeft'||e.code==='ControlRight')
    setInputSource('kbd:modifier:Control','fire',false,false);
}
function clearInputSources(){
  inputSources.clear();
  for(const k of Object.keys(held)){ held[k]=false; heldCounts[k]=0; }
  actionBuffer.jump=actionBuffer.fire=actionBuffer.dash=0;
  startTap=pauseTap=false;
  syncControlFeedback();
}
function isUtilityTarget(e){ return !!e.target?.closest?.('input,select,textarea,#utility button,#pausePanel button'); }
window.addEventListener('keydown',e=>{
  if(e.isComposing||e.metaKey||e.altKey)return;
  const k=normalizedKey(e.key);
  if(k==='Escape'&&game.state==='play'&&!e.repeat){ e.preventDefault(); pauseTap=true; return; }
  if(isUtilityTarget(e))return;
  const control=controlFor(e.key,e.code);
  if(control)e.preventDefault();
  const source=keyboardSource(e);
  // After pause/focus clearing, repeats belong to the old press. Require a
  // fresh down before movement or action can start again.
  if(e.repeat&&!inputSources.has(source))return;
  if(!AC){ audio(); if(game.state==='title')Music.set('title'); }
  if(!e.ctrlKey){
    if(k==='Enter'&&!e.repeat){e.preventDefault();startTap=true;}
    if(k==='p'&&!e.repeat&&game.state==='play'){e.preventDefault();pauseTap=true;}
    if(k==='m'&&!e.repeat){e.preventDefault();Music.toggleMute();}
  }
  if(!paused&&!focusLost){
    reconcileControlModifier(e);
    setInputSource(source,control,true,!e.repeat);
  }
  const seq=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  if(!e.repeat){
    konamiBuf.push(k); if(konamiBuf.length>10)konamiBuf.shift();
    if(seq.every((v,i)=>konamiBuf[i]===v)){ lives=30; sfx('1up'); flashMsg('30 LIVES!'); konamiBuf=[]; }
  }
},true);
window.addEventListener('keyup',e=>{
  if(paused||focusLost){ if(controlFor(e.key,e.code)&&!isUtilityTarget(e))e.preventDefault(); return; }
  releaseKeyboardEvent(e);
},true);
function loseFocus(){
  focusLost=true;
  clearInputSources();
  if(game.state==='play')setPaused(true);
  Music.suspend();
}
window.addEventListener('blur',loseFocus);
window.addEventListener('pagehide',loseFocus);
window.addEventListener('focus',()=>{ focusLost=false; Music.resume(); });
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)loseFocus();
  else { focusLost=false; Music.resume(); }
});
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
for(const btn of controlButtons){
  const key=btn.dataset.key;
  btn.addEventListener('pointerdown',e=>{
    if(paused||focusLost||(e.pointerType==='mouse'&&e.button!==0))return;
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
document.getElementById('pauseButton').addEventListener('click',()=>setPaused(!paused));
document.getElementById('resumeButton').addEventListener('click',()=>setPaused(false));
document.getElementById('muteButton').addEventListener('click',()=>{audio();Music.toggleMute();});
document.getElementById('musicVolume').addEventListener('input',e=>Music.setVolume(Number(e.target.value)/100));
// Mouse/touch utility clicks should not leave a focused button stealing Space.
for(const btn of document.querySelectorAll('#utility button,#pausePanel button'))
  btn.addEventListener('pointerdown',e=>e.preventDefault());
