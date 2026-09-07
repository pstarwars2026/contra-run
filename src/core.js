"use strict";
// ============================ CORE (ported 2D physics — the tested gameplay) ============================
const THREE = window.__THREE;
const EffectComposer = window.__FX.EffectComposer;
const RenderPass = window.__FX.RenderPass;
const UnrealBloomPass = window.__FX.UnrealBloomPass;
const OutputPass = window.__FX.OutputPass;

const TUNE = {
  W:256, H:240, TILE:16, SCALE:3, FPS:60,
  runSpeed:1.38, airAccel:0.19, jumpV:4.0, grav:0.125, maxFall:4.5,
  dashSpeed:3.75, runnerSpeed:1.08, cameraFollowSpeed:0.85,
  pBulletSpeed:4.5, eBulletSpeed:2.1,
  fireRates:{rifle:10, M:6, S:14, L:24, F:18},
  respawnInvuln:110, respawnFrames:60,
};
