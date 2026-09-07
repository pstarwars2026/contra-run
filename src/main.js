"use strict";
// ============================ MAIN LOOP ============================
let acc=0, lastT=performance.now();
function stepGame(){
  game.t++;
  if(game.state==='title'){ if(K.start()){ game.state='play'; audio(); Music.set(stageMusicKey()); resetStage(); rebuildWorld(); } }
  else if(game.state==='play'){
    if(pauseTap){
      pauseTap=false; paused=!paused; clearInputSources();
      if(paused)Music.suspend(); else Music.resume();
    }
    if(!paused){
      updatePlayer(); updateEnemies(); updateBridge(); updateBoss(); updateBullets(); updatePickups(); updateCam(); updateParts();
      if(game.comboT>0){ game.comboT--; if(game.comboT===0)game.combo=0; }
      if(score>=next1up){ lives++; next1up+=50000; sfx('1up'); flashMsg('1UP!'); }
    } else pauseTap=false;
  }
  else if(game.state==='victory'){ updateParts();
    if(game.t%14===0){ const fx=camX+30+Math.random()*196, fy=36+Math.random()*90;
      for(let i=0;i<16;i++){ const a2=i/16*Math.PI*2, sp=0.9+Math.random()*0.8;
        parts.push({x:fx,y:fy,vx:Math.cos(a2)*sp,vy:Math.sin(a2)*sp,t:0,life:34,spark:true,grav:0.02}); }
      sfx('hit'); }
    if(K.start()){
      game.finished++;
      game.stage=(game.stage+1)%STAGE_META.length;
      if(game.stage===0)game.campaignClears++;
      lives=3; score=0; next1up=20000; game.state='play'; resetStage(); Music.set(stageMusicKey()); rebuildWorld();
    } }
  else if(game.state==='gameover'){ updateParts();
    if(K.start()){ lives=3; score=0; next1up=20000; game.state='play'; resetStage(); Music.set(stageMusicKey()); rebuildWorld(); } }
}
function tick(){
  const now=performance.now(); acc+=Math.min(120, now-lastT); lastT=now;
  const STEP=1000/60;
  let steps=0;
  while(acc>=STEP&&steps<4){ stepGame(); acc-=STEP; steps++; }
  if(steps===4) acc=0; // don't spiral if render is very slow
  sync3D();
  syncHUD();
  composer.render();
  requestAnimationFrame(tick);
}
function applyStageLook(){
  const looks=[
    {fog:0x77abc1,density:.00120,sky:0x86c8ea,skyTint:0xffffff,cloud:0xffffff,cloudA:.88,sunDisc:0xfff4c0,sunGlow:0xffe8a0,hemi:0xd4efff,ground:0x1d2e1b,sun:0xffe8bd,rim:0x5a8dff,exposure:1.22,hemiI:1.10,sunI:1.65,rimI:.38,bloom:.64,radius:.40,threshold:.80},
    {fog:0x648e99,density:.00185,sky:0x78b9c7,skyTint:0xfff4df,cloud:0xe2eff0,cloudA:.66,sunDisc:0xffe0a8,sunGlow:0xf4c783,hemi:0xc8e2e2,ground:0x1e322d,sun:0xffd6a0,rim:0x53a7bb,exposure:1.13,hemiI:.98,sunI:1.28,rimI:.62,bloom:.74,radius:.52,threshold:.71},
    {fog:0x5b6975,density:.00165,sky:0x718291,skyTint:0xe8d8ce,cloud:0xc4c9ce,cloudA:.46,sunDisc:0xffcf92,sunGlow:0xff984f,hemi:0xcbd6dc,ground:0x232927,sun:0xffc88c,rim:0x6f8fce,exposure:1.06,hemiI:.84,sunI:1.16,rimI:.80,bloom:.92,radius:.58,threshold:.61},
  ];
  const l=looks[game.stage]||looks[0];
  paintSkyGradient(game.stage);
  scene.background.setHex(l.sky); scene.fog.color.setHex(l.fog); scene.fog.density=l.density;
  hemi.color.setHex(l.hemi); hemi.groundColor.setHex(l.ground); hemi.intensity=l.hemiI;
  sun.color.setHex(l.sun); sun.intensity=l.sunI; rim.color.setHex(l.rim); rim.intensity=l.rimI;
  renderer.toneMappingExposure=l.exposure;
  bloom.strength=l.bloom; bloom.radius=l.radius; bloom.threshold=l.threshold;
  if(skyBackdrop)skyBackdrop.material.color.setHex(l.skyTint);
  if(sunDisc)sunDisc.material.color.setHex(l.sunDisc);
  if(sunHalo){ sunHalo.material.color.setHex(l.sunGlow); sunHalo.material.opacity=game.stage===2?.42:.32; }
  if(cloudMat){ cloudMat.color.setHex(l.cloud); cloudMat.opacity=l.cloudA; }
}
function rebuildWorld(){ applyStageLook(); buildTerrain(); buildWater(); buildBG(); buildStageDressing(); buildAtmosphere(); buildBoss(); }
resetStage(); rebuildWorld();
tick();
// expose test API on window (module scope is isolated)
window.__api={ get game(){return game;}, get player(){return player;}, get boss(){return boss;},
  get bullets(){return bullets;}, get ebullets(){return ebullets;}, get enemies(){return enemies;},
  get pickups(){return pickups;}, get parts(){return parts;}, get map(){return map;}, get MAPW(){return MAPW;},
  get camX(){return camX;}, get lives(){return lives;}, set lives(v){lives=v;}, get score(){return score;}, set score(v){score=v;},
  get GROUND(){return GROUND;}, get ROWS(){return ROWS;}, get enemyVisualCount(){return enemyVisuals.children.length;},
  get musicState(){return Music.state;}, get muted(){return muted;}, get paused(){return paused;}, stageMusicKey, tileAt, isSolid, bossPodHit,
  get inputState(){return {...held};}, get inputSourceCount(){return inputSources.size;}, get inputBuffer(){return {...actionBuffer};},
  start:()=>{ startTap=true; },
  pressKey:k=>{ setInputSource('api:'+k,controlFor(k,''),true,true); },
  releaseKey:k=>{ setInputSource('api:'+k,controlFor(k,''),false,false); } };
