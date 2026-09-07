"use strict";
// ============================ CORE (ported 2D physics — the tested gameplay) ============================
const THREE = window.__THREE;
const EffectComposer = window.__FX.EffectComposer;
const RenderPass = window.__FX.RenderPass;
const UnrealBloomPass = window.__FX.UnrealBloomPass;
const OutputPass = window.__FX.OutputPass;

const TUNE = {
  W:256, H:240, TILE:16, SCALE:3, FPS:60,
  runSpeed:1.24, airAccel:0.19, jumpV:4.0, grav:0.125, maxFall:4.5,
  dashSpeed:3.75, runnerSpeed:1.08, cameraFollowSpeed:0.85,
  pBulletSpeed:4.5, eBulletSpeed:2.1,
  fireRates:{rifle:10, M:6, S:14, L:24, F:18},
  respawnInvuln:110, respawnFrames:60,
};

// Preferences stay on this browser. Storage restrictions must never block play.
const PREFERENCES_KEY='contrarun.preferences.v1';
const preferences={musicVolume:0.65,muted:false,reducedEffects:window.matchMedia('(prefers-reduced-motion: reduce)').matches};
try{
  const saved=JSON.parse(localStorage.getItem(PREFERENCES_KEY)||'null');
  if(saved&&typeof saved==='object'){
    if(typeof saved.musicVolume==='number'&&Number.isFinite(saved.musicVolume))preferences.musicVolume=Math.max(0,Math.min(1,saved.musicVolume));
    for(const key of ['muted','reducedEffects'])if(typeof saved[key]==='boolean')preferences[key]=saved[key];
  }
}catch(_err){}
function savePreferences(){
  document.documentElement.classList.toggle('reduced-effects',preferences.reducedEffects);
  try{localStorage.setItem(PREFERENCES_KEY,JSON.stringify(preferences));}catch(_err){}
}
document.documentElement.classList.toggle('reduced-effects',preferences.reducedEffects);
