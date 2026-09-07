"use strict";
// ============================ 3D RENDERER (new) ============================
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.22;
if(THREE.SRGBColorSpace)renderer.outputColorSpace=THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x86c8ea);
scene.fog=new THREE.FogExp2(0x77abc1,0.00135);
// sky gradient backdrop + sun + clouds (spans whole level, z=-360..-375)
const skyGroup=new THREE.Group(); scene.add(skyGroup);
let skyBackdrop=null, sunDisc=null, sunHalo=null, cloudMat=null, skyCanvas=null, skyContext=null, skyTexture=null;
const SKY_GRADIENTS=[
  [[0,'#0b376f'],[0.40,'#2f92cb'],[0.75,'#91d9e8'],[1,'#e7f6e8']],
  [[0,'#173f4b'],[0.40,'#377c79'],[0.75,'#8eada0'],[1,'#e4c18c']],
  [[0,'#20262e'],[0.40,'#3c4853'],[0.75,'#776d68'],[1,'#c4865e']],
];
function paintSkyGradient(stage){
  if(!skyCanvas||!skyContext)return;
  const stops=SKY_GRADIENTS[stage]||SKY_GRADIENTS[0];
  const gr=skyContext.createLinearGradient(0,0,0,skyCanvas.height);
  for(const [at,color] of stops)gr.addColorStop(at,color);
  skyContext.fillStyle=gr; skyContext.fillRect(0,0,skyCanvas.width,skyCanvas.height);
  if(skyTexture)skyTexture.needsUpdate=true;
}
{
  skyCanvas=document.createElement('canvas'); skyCanvas.width=32; skyCanvas.height=256; skyContext=skyCanvas.getContext('2d');
  paintSkyGradient(0);
  skyTexture=new THREE.CanvasTexture(skyCanvas);
  skyBackdrop=new THREE.Mesh(new THREE.PlaneGeometry(2600,430),new THREE.MeshBasicMaterial({map:skyTexture,color:0xffffff,fog:false}));
  skyBackdrop.position.set(1056,120,-375); skyGroup.add(skyBackdrop);
  sunDisc=new THREE.Mesh(new THREE.SphereGeometry(17,16,12),new THREE.MeshBasicMaterial({color:0xfff4c0,fog:false}));
  sunDisc.position.set(1780,235,-370); skyGroup.add(sunDisc);
  sunHalo=new THREE.Mesh(new THREE.SphereGeometry(24,16,12),new THREE.MeshBasicMaterial({color:0xffe8a0,transparent:true,opacity:0.35,fog:false}));
  sunHalo.position.copy(sunDisc.position); skyGroup.add(sunHalo);
  cloudMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.88,fog:false});
  let cs=5; const crnd=()=>{ cs=Math.sin(cs*127.1)*43758.5; return cs-Math.floor(cs); };
  for(let i=0;i<9;i++){ const cl=new THREE.Group();
    for(let j=0;j<4;j++){ const puff=new THREE.Mesh(new THREE.SphereGeometry(7+((i*7+j*13)%8),8,6),cloudMat);
      puff.position.set(j*9-13,((j*5)%3)*2,0); puff.scale.y=0.55; cl.add(puff); }
    cl.position.set(crnd()*2300-60,150+((i*53)%80),-365+((i*29)%8)); skyGroup.add(cl); }
}
const VIEW_H=272; // world units visible vertically (240 stage + margin)
const camera=new THREE.OrthographicCamera(-172,172,VIEW_H/2,-VIEW_H/2,0.1,800);
const hemi=new THREE.HemisphereLight(0xd4efff,0x1d2e1b,1.05); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe8bd,1.55); sun.position.set(60,120,150); scene.add(sun);
const rim=new THREE.DirectionalLight(0x5a8dff,0.42); rim.position.set(-80,60,-40); scene.add(rim);
// bloom composer
const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(window.innerWidth,window.innerHeight),0.72,0.46,0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());
window.addEventListener('resize',()=>{
  renderer.setSize(window.innerWidth,window.innerHeight);
  composer.setSize(window.innerWidth,window.innerHeight);
});
// ---- procedural textures (NES-flavored detail)
function noiseTex(base,spec,n){ const cv=document.createElement('canvas'); cv.width=32;cv.height=32;
  const g=cv.getContext('2d'); g.fillStyle=base; g.fillRect(0,0,32,32);
  let s=n||7; const rnd=()=>{ s=Math.sin(s*127.1)*43758.5; return s-Math.floor(s); };
  g.fillStyle=spec;
  for(let i=0;i<170;i++){ g.globalAlpha=0.2+rnd()*0.5; g.fillRect((rnd()*32)|0,(rnd()*32)|0,1+((rnd()*2)|0),1+((rnd()*2)|0)); }
  g.globalAlpha=1;
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.magFilter=THREE.NearestFilter; return t; }
function brickTex(base,mortar){ const cv=document.createElement('canvas'); cv.width=32;cv.height=32;
  const g=cv.getContext('2d'); g.fillStyle=mortar; g.fillRect(0,0,32,32);
  for(let r=0;r<4;r++){ const off=(r%2)*8;
    for(let cx=-1;cx<3;cx++){ g.fillStyle=base; g.fillRect(cx*16+off+1,r*8+1,14,6); } }
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.magFilter=THREE.NearestFilter; return t; }
function plankTex(base,dark){ const cv=document.createElement('canvas'); cv.width=32;cv.height=32; const g=cv.getContext('2d');
  g.fillStyle=base; g.fillRect(0,0,32,32); g.fillStyle=dark;
  for(let i=0;i<4;i++) g.fillRect(i*8,0,1,32);
  let s=3; const rnd=()=>{ s=Math.sin(s*127.1)*43758.5; return s-Math.floor(s); };
  g.globalAlpha=0.3; for(let i=0;i<40;i++) g.fillRect((rnd()*32)|0,(rnd()*32)|0,4,1);
  g.globalAlpha=1; const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.magFilter=THREE.NearestFilter; return t; }
function plateTex(base,rivet){ const cv=document.createElement('canvas'); cv.width=32;cv.height=32; const g=cv.getContext('2d');
  g.fillStyle=base; g.fillRect(0,0,32,32); g.fillStyle=rivet;
  [[3,3],[28,3],[3,28],[28,28],[15,15]].forEach(p=>{ g.beginPath(); g.arc(p[0],p[1],2,0,7); g.fill(); });
  g.strokeStyle=rivet; g.globalAlpha=0.5; g.strokeRect(4,4,24,24); g.globalAlpha=1;
  const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.magFilter=THREE.NearestFilter; return t; }
// ---- materials
const M={
  skin:new THREE.MeshStandardMaterial({color:0xd89860,roughness:0.75}),
  skinD:new THREE.MeshStandardMaterial({color:0xb07040,roughness:0.75}),
  bandana:new THREE.MeshStandardMaterial({color:0xd83020,roughness:0.6,emissive:0x400800}),
  pants:new THREE.MeshStandardMaterial({color:0x3a5ad0,roughness:0.8}),
  pantsD:new THREE.MeshStandardMaterial({color:0x24347a,roughness:0.8}),
  boot:new THREE.MeshStandardMaterial({color:0x5a3a1c,roughness:0.9}),
  gun:new THREE.MeshStandardMaterial({color:0x99a0ac,metalness:0.7,roughness:0.35}),
  gunD:new THREE.MeshStandardMaterial({color:0x505860,metalness:0.8,roughness:0.3}),
  olive:new THREE.MeshStandardMaterial({color:0x6a7a30,roughness:0.85}),
  oliveD:new THREE.MeshStandardMaterial({color:0x404a18,roughness:0.85}),
  blue:new THREE.MeshStandardMaterial({color:0x3a5acc,roughness:0.8}),
  blueD:new THREE.MeshStandardMaterial({color:0x20307c,roughness:0.8}),
  grass:new THREE.MeshStandardMaterial({color:0x2e9a1e,roughness:0.95,map:noiseTex('#2e9a1e','#55c83a',3)}),
  grassD:new THREE.MeshStandardMaterial({color:0x4ac830,roughness:0.95,map:noiseTex('#4ac830','#1e7a12',5)}),
  dirt:new THREE.MeshStandardMaterial({color:0x7a4a18,roughness:1,map:noiseTex('#7a4a18','#9a6a2a',11)}),
  dirtD:new THREE.MeshStandardMaterial({color:0x5a3810,roughness:1,map:noiseTex('#5a3810','#7a4a18',13)}),
  wood:new THREE.MeshStandardMaterial({color:0x9a6a34,roughness:0.9,map:plankTex('#9a6a34','#6a4520')}),
  woodD:new THREE.MeshStandardMaterial({color:0x6a4520,roughness:0.9,map:plankTex('#6a4520','#4a2c10')}),
  metal:new THREE.MeshStandardMaterial({color:0x8a94a4,metalness:0.75,roughness:0.4,map:plateTex('#8a94a4','#5a6474')}),
  metalD:new THREE.MeshStandardMaterial({color:0x4a5464,metalness:0.75,roughness:0.5,map:plateTex('#4a5464','#2a3038')}),
  stone:new THREE.MeshStandardMaterial({color:0x6a6a7e,roughness:0.95,map:brickTex('#6a6a7e','#44444f')}),
  water:new THREE.MeshStandardMaterial({color:0x2050d8,transparent:true,opacity:0.85,roughness:0.15,metalness:0.3}),
  red:new THREE.MeshStandardMaterial({color:0xe83020,roughness:0.5,emissive:0x701000}),
  core:new THREE.MeshStandardMaterial({color:0xff3020,emissive:0xff2010,emissiveIntensity:1.4,roughness:0.3}),
  glass:new THREE.MeshStandardMaterial({color:0xd8ecff,roughness:0.05,metalness:0.2,transparent:true,opacity:0.35}),
};
const box=(w,h,d,mat)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
const foliageMat=new THREE.MeshStandardMaterial({color:0x1b6f2c,roughness:0.96,side:THREE.DoubleSide});
const foliageLightMat=new THREE.MeshStandardMaterial({color:0x39a443,roughness:0.94,side:THREE.DoubleSide});
const rockMat=new THREE.MeshStandardMaterial({color:0x59635d,roughness:1,flatShading:true});
const mistMat=new THREE.MeshBasicMaterial({color:0xc8edf1,transparent:true,opacity:0.12,depthWrite:false,fog:false});
function fern(x,y,z,s=1,bright=false){
  const g=new THREE.Group(), mat=bright?foliageLightMat:foliageMat;
  for(let i=0;i<6;i++){
    const blade=box(1.2,10*s,0.8,mat); blade.position.y=5*s;
    blade.rotation.z=(-0.86+i*0.34); blade.position.x=(i-2.5)*0.9*s;
    g.add(blade);
  }
  g.position.set(x,y,z); return g;
}
function rockPile(x,y,z,s=1){
  const g=new THREE.Group();
  for(let i=0;i<3;i++){
    const r=new THREE.Mesh(new THREE.DodecahedronGeometry((2.3+i*.35)*s,0),rockMat);
    r.scale.set(1.35,0.65+0.1*i,0.9); r.position.set((i-1)*2.6*s,(1+i*.4)*s,(i%2)*1.4*s); g.add(r);
  }
  g.position.set(x,y,z); return g;
}
// ---- world group: everything static goes here; x offset = -camX (world scrolls)
const world=new THREE.Group(); scene.add(world);
// Dynamic actor visuals live in their own group so a zone reset cannot leave
// meshes from the previous stage visible in the next one.
const enemyVisuals=new THREE.Group(); scene.add(enemyVisuals);
function clearEnemyVisuals(){
  while(enemyVisuals.children.length)enemyVisuals.remove(enemyVisuals.children[0]);
}
// build static geometry from map
const terrain=new THREE.Group(); world.add(terrain);
const bridgeVisuals=new Map();
function buildTerrain(){
  while(terrain.children.length)terrain.remove(terrain.children[0]);
  bridgeVisuals.clear();
  const grassCells=new Set(), dirtCells=new Set(), platCells=new Set(), bridgeCells=new Set();
  for(let c=0;c<MAPW;c++)for(let r=0;r<ROWS;r++){
    const ch=map[c][r]; if(ch==='.')continue;
    if(ch==='G')grassCells.add(c+'_'+r);
    else if(ch==='D')dirtCells.add(c+'_'+r);
    else if(ch==='P')platCells.add(c+'_'+r);
    else if(ch==='B')bridgeCells.add(c+'_'+r);
  }
  // y-flip: 3D_y = 240 - 2D_y ; tile top edge = 240-16r
  for(const k of grassCells.keys()){ const [c,r]=k.split('_').map(Number);
    const top=240-16*r;
    // Keep decorative lips physically separated from the terrain shell. The
    // older build put them on the same visible plane, producing z-fighting.
    const b=box(16,6.5,30,M.grass); b.position.set(c*16+8,top-3.25,0); terrain.add(b);
    const b2=box(16,2.4,30.8,M.grassD); b2.position.set(c*16+8,top+1.2,.45); terrain.add(b2);
    if((c*7+r*3)%5===0&&c<113) terrain.add(fern(c*16+5,top+1,9,0.55+(c%3)*0.08,c%2===0));
    if((c*11+r)%13===0) terrain.add(rockPile(c*16+12,top+0.4,-7,0.72));
  }
  for(const k of dirtCells.keys()){ const [c,r]=k.split('_').map(Number);
    const top=240-16*r;
    const b=box(16,16,30,M.dirt); b.position.set(c*16+8,top-8,0); terrain.add(b);
    if((c+r)%3===0){ const d=box(13,2.2,1.2,M.dirtD); d.position.set(c*16+8,top-11.5,15.35); terrain.add(d); } }
  for(const k of platCells.keys()){ const [c,r]=k.split('_').map(Number);
    const top=240-16*r;
    const b=box(16,5,24,M.wood); b.position.set(c*16+8,top-2.5,0); terrain.add(b);
    const b2=box(15.4,.9,24.8,M.woodD); b2.position.set(c*16+8,top+.45,.45); terrain.add(b2);
    if(c%3===1){ const lh=(top-5)-80; if(lh>2){ const leg=box(2.5,lh,4,M.woodD); leg.position.set(c*16+8,80+lh/2,8); terrain.add(leg); } } }
  for(const k of bridgeCells.keys()){ const [c,r]=k.split('_').map(Number);
    const top=240-16*r;
    const vg=new THREE.Group();
    const b=box(15.2,4,18,M.metal); b.position.set(c*16+8,top-2,0); vg.add(b);
    const seam=box(14.5,.75,19.4,new THREE.MeshStandardMaterial({color:0xc5b36a,metalness:.65,roughness:.48}));
    seam.position.set(c*16+8,top+.42,.35); vg.add(seam);
    if(c%2===0){ const leg=box(2.5,36,3,M.metalD); leg.position.set(c*16+8,top-22,0); vg.add(leg); }
    terrain.add(vg); bridgeVisuals.set(c,vg); }
  // water volumes (boxes so they're visible from the side)
  for(let c=0;c<MAPW;c++){ if(map[c][12]==='W'&&map[c][11]!=='W'&&map[c][11]==='.'){
    const w=box(16,48,44,M.water); w.position.set(c*16+8,24,0); terrain.add(w); } }
}
// ---- background layers (3D)
const bgGroup=new THREE.Group(); scene.add(bgGroup);
function palm(x,y,z,s){ const g=new THREE.Group();
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.8*s,1.2*s,26*s,6),new THREE.MeshStandardMaterial({color:0x6a4a28,roughness:1}));
  trunk.position.y=13*s; g.add(trunk);
  const leafMat=new THREE.MeshStandardMaterial({color:0x1e6a2e,roughness:0.9,side:THREE.DoubleSide});
  for(let i=0;i<7;i++){ const leaf=new THREE.Mesh(new THREE.SphereGeometry(3.4*s,6,4,0,Math.PI*2,0,Math.PI/2),leafMat);
    leaf.scale.set(1,0.35,0.6); leaf.position.set(Math.cos(i/7*Math.PI*2)*5.5*s,26*s+ (i%2)*1.2*s,Math.sin(i/7*Math.PI*2)*5.5*s); g.add(leaf); }
  g.position.set(x,y,z); return g; }
function jungleTree(x,y,z,s){
  const g=new THREE.Group();
  const trunkMat=new THREE.MeshStandardMaterial({color:0x493b24,roughness:1});
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(2.3*s,3.6*s,54*s,7),trunkMat);
  trunk.position.y=27*s; trunk.rotation.z=(Math.sin(x*.07))*0.04; g.add(trunk);
  for(let i=0;i<6;i++){
    const crown=new THREE.Mesh(new THREE.IcosahedronGeometry((8+i%2*2)*s,1),i%3===0?foliageLightMat:foliageMat);
    crown.scale.set(1.35,0.72,0.8); crown.position.set((i-2.5)*4*s,50*s+(i%2)*5*s,(i%3-1)*3*s); g.add(crown);
  }
  for(let i=0;i<2;i++){
    const vine=box(.7,24*s,.7,new THREE.MeshStandardMaterial({color:0x356a2f,roughness:1}));
    vine.position.set((i?8:-7)*s,34*s,(i?2:-2)*s); vine.rotation.z=(i?-.08:.1); g.add(vine);
  }
  g.position.set(x,y,z); return g;
}
function buildBG(){
  while(bgGroup.children.length)bgGroup.remove(bgGroup.children[0]);
  const stage=game.stage||0, delta=stage===1, iron=stage===2;
  // soft atmospheric bands separate the jungle layers without obscuring play
  for(let i=0;i<5;i++){
    const mist=new THREE.Mesh(new THREE.PlaneGeometry(620,32+i*4),mistMat.clone());
    mist.material.opacity=(delta?0.075:iron?0.035:0.045)+i*(delta?0.02:0.016);
    mist.position.set(180+i*470,105+(i%2)*17,-245+i*25); bgGroup.add(mist);
  }
  // far mountains rising from behind the tree line
  const mtnMat=new THREE.MeshStandardMaterial({color:delta?0x416d78:iron?0x586777:0x4a7a8c,roughness:1,flatShading:true});
  for(let i=0;i<16;i++){ const h=90+((i*53)%70);
    const m=new THREE.Mesh(new THREE.ConeGeometry(52+((i*37)%46),h,5),mtnMat);
    m.position.set(i*150+((i*31)%60), 20+h/2, -260-((i*17)%90)); bgGroup.add(m); }
  const mtnMat2=new THREE.MeshStandardMaterial({color:delta?0x315a63:iron?0x3f4d5b:0x356070,roughness:1,flatShading:true});
  for(let i=0;i<14;i++){ const h=70+((i*43)%50);
    const m=new THREE.Mesh(new THREE.ConeGeometry(46+((i*29)%36),h,5),mtnMat2);
    m.position.set(i*160+((i*23)%70), 12+h/2, -170-((i*13)%60)); bgGroup.add(m); }
  // Stage-specific canopy density: open/wet delta, then a militarized jungle.
  const pz=[-95,-72,-52];
  let s=9; const rnd=()=>{ s=Math.sin(s*127.1)*43758.5; return s-Math.floor(s); };
  const palmCount=iron?15:delta?32:46;
  for(let i=0;i<palmCount;i++){ bgGroup.add(palm(rnd()*2200-40, 56+rnd()*10, pz[i%3]+rnd()*10, 1.5+rnd()*0.9)); }
  // chunky mid-canopy trees create readable depth silhouettes behind actors
  const treeCount=iron?11:delta?16:22;
  for(let i=0;i<treeCount;i++){
    const x=i*(iron?190:delta?140:104)+((i*41)%65)-25;
    bgGroup.add(jungleTree(x,54+((i*17)%9),-42-((i*13)%26),1.05+((i*7)%6)*0.08));
  }
  // undergrowth slabs
  const slab=box(2500,30,150,new THREE.MeshStandardMaterial({color:delta?0x21494a:iron?0x263832:0x1c4226,roughness:1}));
  slab.position.set(1056,44,-100); bgGroup.add(slab);
  const slab2=box(2500,14,70,new THREE.MeshStandardMaterial({color:delta?0x183d3f:iron?0x1d2b2b:0x173618,roughness:1}));
  slab2.position.set(1056,70,-36); bgGroup.add(slab2);
  if(delta){
    // Floodline Delta: reed beds, mangrove stakes, and low navigation lights.
    const reedMat=new THREE.MeshStandardMaterial({color:0x5b8248,roughness:1});
    const postMat=new THREE.MeshStandardMaterial({color:0x4a3825,roughness:1});
    for(let i=0;i<24;i++){
      const rg=new THREE.Group();
      for(let j=0;j<5;j++){
        const reed=box(.8,10+((i+j)%5)*2,.8,reedMat);
        reed.position.set((j-2)*2,(10+((i+j)%5)*2)/2,0); reed.rotation.z=(j-2)*.06; rg.add(reed);
      }
      rg.position.set(i*94+18,76,-24-(i%3)*5); bgGroup.add(rg);
    }
    for(let i=0;i<10;i++){
      const post=box(4,28,4,postMat); post.position.set(90+i*215,90,-34); post.rotation.z=i%2?.06:-.05; bgGroup.add(post);
      const lamp=new THREE.Mesh(new THREE.SphereGeometry(1.8,7,5),new THREE.MeshStandardMaterial({color:0xffd36b,emissive:0xffa51c,emissiveIntensity:1.8}));
      lamp.position.set(post.position.x,105,-33); bgGroup.add(lamp);
    }
  }
  if(iron){
    // Iron Canopy: distant fortified gantries and pipework telegraph the final
    // zone before the player reaches the boss installation.
    const steel=new THREE.MeshStandardMaterial({color:0x49545e,metalness:.62,roughness:.55});
    const darkSteel=new THREE.MeshStandardMaterial({color:0x293139,metalness:.7,roughness:.5});
    for(let i=0;i<9;i++){
      const x=80+i*255;
      const mast=box(8,96,8,steel); mast.position.set(x,124,-48); bgGroup.add(mast);
      const beam=box(92,6,8,darkSteel); beam.position.set(x+40,148,-48); beam.rotation.z=i%2?.04:-.04; bgGroup.add(beam);
      const brace=box(5,70,6,darkSteel); brace.position.set(x+27,116,-47); brace.rotation.z=.72; bgGroup.add(brace);
    }
    for(const yy of [94,177]){
      const pipe=box(2350,5,7,steel); pipe.position.set(1070,yy,-58); bgGroup.add(pipe);
    }
  }
  // broken foreground canopy rhythm; gaps keep enemies and pickups legible
  const fernCount=iron?24:34;
  for(let i=0;i<fernCount;i++){
    if(i%6===2||i%6===3)continue;
    const g=fern(i*68+24,77,-22,1.15+(i%3)*.12,i%4===0);
    g.rotation.z=(i%2?-.08:.1); bgGroup.add(g);
  }
}

// ---- authored stage dressing, kept behind the collision/actor plane
// These pieces are intentionally world-locked (unlike the parallax canopy),
// so they reinforce traversal landmarks without changing gameplay collision.
const dressGroup=new THREE.Group(); scene.add(dressGroup);
const animatedDress=[];
function addFieldStation(x,variant=0){
  const g=new THREE.Group();
  const timber=new THREE.MeshStandardMaterial({color:variant?0x506055:0x66513a,roughness:.95});
  const canvas=new THREE.MeshStandardMaterial({color:variant?0x526f62:0x697a4b,roughness:.9,side:THREE.DoubleSide});
  const dark=new THREE.MeshStandardMaterial({color:0x253028,roughness:.92});
  for(const sx of [-18,18]){
    const post=box(3.3,44,3.3,timber); post.position.set(sx,22,0); g.add(post);
  }
  const floor=box(44,4,18,timber); floor.position.set(0,7,0); g.add(floor);
  const roof=box(50,3,24,canvas); roof.position.set(0,47,0); roof.rotation.z=variant?.06:-.06; g.add(roof);
  const crate=box(12,10,10,dark); crate.position.set(-10,14,3); g.add(crate);
  const antenna=box(1.2,33,1.2,M.metal); antenna.position.set(16,61,0); g.add(antenna);
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(2.2,7,5),new THREE.MeshStandardMaterial({color:0xffd56b,emissive:0xffa31a,emissiveIntensity:1.7}));
  lamp.position.set(15,43,5); g.add(lamp); g.userData.lamp=lamp;
  g.position.set(x,75,-31); dressGroup.add(g); animatedDress.push(g);
}
function addDeltaDock(x,variant=0){
  const g=new THREE.Group();
  const wood=new THREE.MeshStandardMaterial({color:0x5b4832,roughness:.96});
  const steel=new THREE.MeshStandardMaterial({color:0x65747a,metalness:.52,roughness:.58});
  const deck=box(66,5,22,wood); deck.position.set(0,18,0); g.add(deck);
  for(const sx of [-28,-9,12,29]){
    const pile=box(3.2,52+(sx%2?8:0),3.2,wood); pile.position.set(sx,-4,0); pile.rotation.z=sx%2?.03:-.04; g.add(pile);
  }
  const craneMast=box(4.5,54,4.5,steel); craneMast.position.set(variant?22:-21,48,0); g.add(craneMast);
  const craneArm=box(40,3.2,3.2,steel); craneArm.position.set(variant?5:-4,73,0); craneArm.rotation.z=variant?-.12:.1; g.add(craneArm);
  const cable=box(.7,24,.7,new THREE.MeshBasicMaterial({color:0x20292b})); cable.position.set(variant?-11:11,58,1); g.add(cable);
  const nav=new THREE.Mesh(new THREE.SphereGeometry(2.2,7,5),new THREE.MeshStandardMaterial({color:0x7ee8ff,emissive:0x22a8d8,emissiveIntensity:2.2}));
  nav.position.set(variant?-28:28,25,5); g.add(nav); g.userData.lamp=nav;
  g.position.set(x,62,-32); dressGroup.add(g); animatedDress.push(g);
}
function addIronEmplacement(x,variant=0){
  const g=new THREE.Group();
  const steel=new THREE.MeshStandardMaterial({color:0x47515d,metalness:.65,roughness:.48});
  const armor=new THREE.MeshStandardMaterial({color:0x2a3138,metalness:.58,roughness:.56});
  const hazard=new THREE.MeshStandardMaterial({color:0xd9ad2f,roughness:.68});
  const wall=box(64,42,18,armor); wall.position.set(0,21,0); g.add(wall);
  for(let i=-2;i<=2;i++){
    const rib=box(4,46,21,steel); rib.position.set(i*13,22,0); g.add(rib);
  }
  const cap=box(72,5,22,hazard); cap.position.set(0,44,0); g.add(cap);
  const mast=box(5,64,5,steel); mast.position.set(variant?25:-25,74,0); g.add(mast);
  const dish=new THREE.Mesh(new THREE.CylinderGeometry(10,3,3,14),steel);
  dish.rotation.x=Math.PI/2; dish.rotation.z=variant?.45:-.45; dish.position.set(variant?25:-25,107,0); g.add(dish); g.userData.rotor=dish;
  const beacon=new THREE.Mesh(new THREE.SphereGeometry(2.4,8,6),new THREE.MeshStandardMaterial({color:0xff4938,emissive:0xff2418,emissiveIntensity:2.8}));
  beacon.position.set(variant?25:-25,112,2); g.add(beacon); g.userData.lamp=beacon;
  g.position.set(x,77,-34); dressGroup.add(g); animatedDress.push(g);
}
function buildStageDressing(){
  while(dressGroup.children.length)dressGroup.remove(dressGroup.children[0]);
  animatedDress.length=0;
  const stage=game.stage||0;
  if(stage===0){
    [210,620,1080,1510,1910].forEach((x,i)=>addFieldStation(x,i%2));
  } else if(stage===1){
    [250,710,1160,1600,1990].forEach((x,i)=>addDeltaDock(x,i%2));
  } else {
    [230,650,1060,1460,1840].forEach((x,i)=>addIronEmplacement(x,i%2));
  }
}

// ---- lightweight stage atmosphere (render-only and deterministic)
const atmosphereGroup=new THREE.Group(); scene.add(atmosphereGroup);
const atmosphere=[];
function buildAtmosphere(){
  while(atmosphereGroup.children.length)atmosphereGroup.remove(atmosphereGroup.children[0]);
  atmosphere.length=0;
  const stage=game.stage||0;
  const count=stage===1?48:stage===2?40:34;
  for(let i=0;i<count;i++){
    let mesh;
    if(stage===0){
      mesh=new THREE.Mesh(new THREE.OctahedronGeometry(.65,0),new THREE.MeshBasicMaterial({color:i%3?0xc9ee75:0xf4e98b,transparent:true,opacity:.38,depthWrite:false}));
      mesh.scale.set(1.6,.55,.45);
    } else if(stage===1){
      mesh=box(.28,5.5,.28,new THREE.MeshBasicMaterial({color:0xd9f5ff,transparent:true,opacity:.38,depthWrite:false}));
      mesh.rotation.z=-.12;
    } else {
      mesh=new THREE.Mesh(new THREE.TetrahedronGeometry(.62,0),new THREE.MeshBasicMaterial({color:i%3===0?0xffd45d:0xff7040,transparent:true,opacity:.48,depthWrite:false}));
    }
    const seed=(i*73+stage*41)%997;
    const x=(seed*23)%2250-30, y=72+((seed*19)%120), z=-12-((seed*11)%10);
    mesh.position.set(x,y,z); mesh.userData={seed,baseX:x,baseY:y};
    atmosphereGroup.add(mesh); atmosphere.push(mesh);
  }
}
function syncAtmosphere(t){
  const stage=game.stage||0;
  for(let i=0;i<atmosphere.length;i++){
    const m=atmosphere[i], s=m.userData.seed;
    if(stage===0){
      m.position.x=m.userData.baseX+Math.sin((t+s)*.014)*9;
      m.position.y=m.userData.baseY+Math.sin((t+s)*.023)*6;
      m.rotation.z+=(i%2?.004:-.004);
    } else if(stage===1){
      const span=170;
      m.position.x=m.userData.baseX+((t*.38+s)%24);
      m.position.y=58+((m.userData.baseY-58-(t*1.55+s)%span+span)%span);
    } else {
      m.position.x=m.userData.baseX+Math.sin((t+s)*.025)*5;
      m.position.y=64+((m.userData.baseY-64+(t*.34+s)%148)%148);
      m.rotation.z+=(i%2?.015:-.012);
    }
  }
  for(let i=0;i<animatedDress.length;i++){
    const g=animatedDress[i];
    if(g.userData.lamp){ const pulse=.68+.32*Math.sin(t*.08+i*1.7); g.userData.lamp.scale.setScalar(.88+pulse*.22); }
    if(g.userData.rotor)g.userData.rotor.rotation.y=t*.006*(i%2?1:-1);
  }
}
// ---- water animated surface
const waterSurf=[], waterFoam=[];
const waterSurfaceMat=new THREE.MeshStandardMaterial({color:0x4d9cff,transparent:true,opacity:0.9,roughness:0.1,metalness:0.45,emissive:0x103a74,emissiveIntensity:.7});
const foamMat=new THREE.MeshBasicMaterial({color:0xc8f4ff,transparent:true,opacity:.58,depthWrite:false});
function buildWater(){
  for(const w of waterSurf) world.remove(w); waterSurf.length=0;
  for(const f of waterFoam) world.remove(f); waterFoam.length=0;
  for(let c=0;c<MAPW;c++){ if(map[c][12]==='W'&&map[c][11]!=='W'&&map[c][11]==='.'){
    const w=box(16.2,1.8,44,waterSurfaceMat);
    w.position.set(c*16+8,47,0); waterSurf.push(w); world.add(w);
    if(c%2===0){
      const f=box(11,0.65,45,foamMat); f.position.set(c*16+8,48.1,0);
      waterFoam.push(f); world.add(f);
    }
  } }
}
// ---- player model (articulated)
function buildCommando(){
  const g=new THREE.Group();
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(3.65,4.25,8,8),M.skin); torso.position.y=13.1; g.add(torso);
  const chest=box(7.4,2.3,5.1,M.skinD); chest.position.y=15.1; chest.rotation.z=-.05; g.add(chest);
  const belt=box(7.7,1.45,5.1,M.boot); belt.position.y=9.6; g.add(belt);
  const buckle=box(1.45,1.15,5.5,M.gun); buckle.position.set(.2,9.55,.1); g.add(buckle);
  const harness=box(1.05,8.4,5.35,M.boot); harness.position.set(-.7,13.1,0); harness.rotation.z=.5; g.add(harness);
  const harness2=harness.clone(); harness2.rotation.z=-.5; harness2.position.x=.7; g.add(harness2);
  const shoulder=box(4.1,2.0,6.7,M.pantsD); shoulder.position.set(0,16.35,0); g.add(shoulder);
  const pack=box(4.8,6.2,2.1,M.pantsD); pack.position.set(-1.15,12.6,-3.1); pack.rotation.z=.08; g.add(pack);
  const head=new THREE.Group(); head.position.y=18.5;
  const skull=new THREE.Mesh(new THREE.SphereGeometry(2.55,10,8),M.skin); skull.scale.set(1,.96,.92); head.add(skull);
  const band=new THREE.Mesh(new THREE.TorusGeometry(2.48,.42,6,18),M.bandana); band.rotation.x=Math.PI/2; band.position.y=1.15; head.add(band);
  const brow=box(4.7,.55,4.35,M.bandana); brow.position.y=.95; head.add(brow);
  const tail=box(3.1,.75,.8,M.bandana); tail.position.set(-3.2,.55,-.3); tail.rotation.z=-.2; head.add(tail);
  const tail2=box(2.5,.6,.7,M.bandana); tail2.position.set(-2.9,.1,.55); tail2.rotation.z=.24; head.add(tail2);
  const faceMat=new THREE.MeshStandardMaterial({color:0x15202a,roughness:.45});
  const eye=box(.65,.65,.35,faceMat); eye.position.set(2.05,.15,1.15); head.add(eye);
  const eye2=eye.clone(); eye2.position.z=-1.15; head.add(eye2);
  const jaw=box(1.15,.55,2.4,M.skinD); jaw.position.set(2.05,-1.45,0); head.add(jaw);
  g.add(head); g.userData.head=head; g.userData.tail=tail; g.userData.tail2=tail2;
  const armL=new THREE.Group(); armL.position.set(0,16,2.6);
  const armLa=new THREE.Mesh(new THREE.CylinderGeometry(.82,1.02,5.7,7),M.skin); armLa.position.y=-2.7; armL.add(armLa);
  const handL=new THREE.Mesh(new THREE.SphereGeometry(1.08,7,6),M.skinD); handL.position.y=-5.75; armL.add(handL);
  const padL=new THREE.Mesh(new THREE.SphereGeometry(1.45,7,5),M.pantsD); padL.scale.set(1.2,.65,1); padL.position.set(0,-.1,0); armL.add(padL);
  g.add(armL); g.userData.armL=armL;
  const armR=new THREE.Group(); armR.position.set(0,16,-2.6);
  const armRa=new THREE.Mesh(new THREE.CylinderGeometry(.82,1.02,5.7,7),M.skin); armRa.position.y=-2.7; armR.add(armRa);
  const handR=new THREE.Mesh(new THREE.SphereGeometry(1.08,7,6),M.skinD); handR.position.y=-5.75; armR.add(handR);
  const padR=new THREE.Mesh(new THREE.SphereGeometry(1.45,7,5),M.pantsD); padR.scale.set(1.2,.65,1); padR.position.set(0,-.1,0); armR.add(padR);
  g.add(armR); g.userData.armR=armR;
  const legL=new THREE.Group(); legL.position.set(0,9.5,2);
  const thighL=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.35,4.8,7),M.pants); thighL.position.y=-2.25; legL.add(thighL);
  const shinL=new THREE.Mesh(new THREE.CylinderGeometry(1,1.18,4.8,7),M.pantsD); shinL.position.y=-6.55; legL.add(shinL);
  const bootL=box(3.4,2.3,2.75,M.boot); bootL.position.set(.45,-9.45,0); legL.add(bootL);
  g.add(legL); g.userData.legL=legL;
  const legR=new THREE.Group(); legR.position.set(0,9.5,-2);
  const thighR=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.35,4.8,7),M.pants); thighR.position.y=-2.25; legR.add(thighR);
  const shinR=new THREE.Mesh(new THREE.CylinderGeometry(1,1.18,4.8,7),M.pantsD); shinR.position.y=-6.55; legR.add(shinR);
  const bootR=box(3.4,2.3,2.75,M.boot); bootR.position.set(.45,-9.45,0); legR.add(bootR);
  g.add(legR); g.userData.legR=legR;
  const gun=new THREE.Group();
  const body=box(7.4,1.75,1.85,M.gun); body.position.x=3.25; gun.add(body);
  const stock=box(3.1,2.15,1.75,M.gunD); stock.position.set(-1.35,-.2,0); stock.rotation.z=-.18; gun.add(stock);
  const mag=box(1.7,3,1.65,M.gunD); mag.position.set(1.7,-1.9,0); mag.rotation.z=.15; gun.add(mag);
  const barrel=box(4.2,.9,.9,M.gunD); barrel.position.x=8.25; gun.add(barrel);
  const sight=box(1.5,.55,.65,M.gunD); sight.position.set(4.2,1.25,0); gun.add(sight);
  const muzzle=new THREE.Mesh(new THREE.SphereGeometry(2.3,6,5),new THREE.MeshBasicMaterial({color:0xfff1a8,transparent:true,opacity:.96}));
  muzzle.scale.set(1.8,.75,.75); muzzle.position.x=10.2; muzzle.visible=false; gun.add(muzzle); gun.userData.muzzle=muzzle;
  const muzzleLight=new THREE.PointLight(0xffc45c,0,62,2); muzzleLight.position.set(10.4,0,0); gun.add(muzzleLight); gun.userData.muzzleLight=muzzleLight;
  gun.position.set(1.5,12.5,4.2); g.add(gun); g.userData.gun=gun;
  return g;
}
const playerModel=buildCommando(); scene.add(playerModel);
playerModel.scale.setScalar(1.12);
const playerShadow=new THREE.Mesh(new THREE.CircleGeometry(7.5,20),new THREE.MeshBasicMaterial({color:0x06120c,transparent:true,opacity:.34,depthWrite:false}));
playerShadow.scale.y=.28; playerShadow.position.z=-3; scene.add(playerShadow);
// ---- enemy models
function buildSoldier(pal,hatType){
  const g=new THREE.Group();
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(3.25,3.8,7.5,7),pal.o); torso.position.y=13; g.add(torso);
  const vest=box(6.9,4.4,5,pal.oD); vest.position.set(.2,13.7,0); g.add(vest);
  const belt=box(7,1.25,5,pal.b); belt.position.y=9.6; g.add(belt);
  const head=new THREE.Group(); head.position.y=18.5;
  const skull=new THREE.Mesh(new THREE.SphereGeometry(2.35,9,7),pal.s); head.add(skull);
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(2.7,9,6,0,Math.PI*2,0,Math.PI/2),pal.h); helmet.position.y=.2; head.add(helmet);
  const brim=box(5.4,.65,5.2,pal.h); brim.position.set(.4,.3,0); head.add(brim);
  const eye=box(.62,.62,.32,new THREE.MeshStandardMaterial({color:0x101018})); eye.position.set(1.95,-.05,1.1); head.add(eye);
  g.add(head); g.userData.head=head;
  const alert=new THREE.Mesh(new THREE.RingGeometry(1.5,2.4,12),new THREE.MeshBasicMaterial({color:0xff5b3d,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}));
  alert.position.set(0,24,3.4); alert.visible=false; g.add(alert); g.userData.alert=alert;
  const legL=new THREE.Group(); legL.position.set(0,9.5,1.9);
  const thL=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.25,4.8,6),pal.oD); thL.position.y=-2.2; legL.add(thL);
  const shL=new THREE.Mesh(new THREE.CylinderGeometry(.95,1.08,4.8,6),pal.oD); shL.position.y=-6.55; legL.add(shL);
  const btL=box(3.1,2.15,2.6,pal.b); btL.position.set(.35,-9.45,0); legL.add(btL);
  g.add(legL); g.userData.legL=legL;
  const legR=legL.clone(); legR.position.z=-1.9; g.add(legR); g.userData.legR=legR;
  const armR=new THREE.Group(); armR.position.set(0,16,-2.4);
  const aR=new THREE.Mesh(new THREE.CylinderGeometry(.82,.98,5.2,6),pal.o); aR.position.y=-2.35; armR.add(aR);
  g.add(armR); g.userData.armR=armR;
  const armL=armR.clone(); armL.position.z=2.4; armL.rotation.z=.16; g.add(armL); g.userData.armL=armL;
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(6.4,16),new THREE.MeshBasicMaterial({color:0x07100c,transparent:true,opacity:.2,depthWrite:false}));
  shadow.rotation.x=0; shadow.scale.y=.24; shadow.position.set(0,-.2,-3.2); g.add(shadow);
  if(hatType==='sniper'){
    const rifle=box(8,1,1,M.gunD); rifle.position.set(3,0,0);
    const scope=box(1.8,1,1,new THREE.MeshStandardMaterial({color:0x203040})); scope.position.set(3,1,0);
    armR.add(rifle); armR.add(scope); g.userData.rifle=armR; }
  return g;
}
const SOLDIER_PAL={o:M.olive,oD:M.oliveD,s:M.skin,h:M.oliveD,b:M.boot};
const SNIPER_PAL={o:M.blue,oD:M.blueD,s:M.skin,h:M.blueD,b:M.boot};
// ---- turret model
function buildTurret(){
  const g=new THREE.Group();
  const base=box(13,4,13,M.metalD); base.position.y=2; g.add(base);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(6.4,12,8,0,Math.PI*2,0,Math.PI/2),M.metal);
  dome.position.y=4; g.add(dome);
  const head=new THREE.Group(); head.position.y=7;
  const hood=box(6,2.6,6,M.metal); head.add(hood);
  const barrel=box(5.5,1.2,1.2,M.gunD); barrel.position.x=3.4; head.add(barrel);
  const warn=new THREE.Mesh(new THREE.SphereGeometry(1.35,7,5),new THREE.MeshBasicMaterial({color:0xff5034,transparent:true,opacity:.95,depthWrite:false}));
  warn.position.set(6.2,0,0); warn.visible=false; head.add(warn); g.userData.warn=warn;
  g.add(head); g.userData.head=head;
  return g;
}
// ---- capsule model
function buildCapsule(){
  const g=new THREE.Group();
  const shell=new THREE.Mesh(new THREE.SphereGeometry(3.6,10,8),new THREE.MeshStandardMaterial({color:0xe83020,roughness:0.4,emissive:0x801000,emissiveIntensity:0.6}));
  g.add(shell);
  const band=box(6.5,1.6,6.5,M.gunD); band.position.y=0; g.add(band);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(5.6,.45,7,20),new THREE.MeshBasicMaterial({color:0xffc84a,transparent:true,opacity:.72}));
  halo.rotation.x=Math.PI/2; g.add(halo); g.userData.halo=halo;
  const finL=box(2.2,1.2,5.6,M.metalD); finL.position.x=-4.6; finL.rotation.z=.34; g.add(finL);
  const finR=finL.clone(); finR.position.x=4.6; finR.rotation.z=-.34; g.add(finR);
  return g;
}
// ---- bullet meshes (pool)
const bulletPool=[], ebulletPool=[];
function getBullet(kind){ let b=bulletPool.find(x=>!x.inUse&&x.kind===kind);
  if(!b){ const g=new THREE.Group();
    let m;
    if(kind==='L'){ m=box(10,1.4,1.4,new THREE.MeshStandardMaterial({color:0xc060ff,emissive:0xc060ff,emissiveIntensity:2.2})); }
    else if(kind==='S'){ m=new THREE.Mesh(new THREE.SphereGeometry(1.5,6,6),new THREE.MeshStandardMaterial({color:0xffd060,emissive:0xffb040,emissiveIntensity:1.8})); }
    else if(kind==='F'){ m=new THREE.Mesh(new THREE.SphereGeometry(2.2,8,6),new THREE.MeshStandardMaterial({color:0xff8020,emissive:0xff6010,emissiveIntensity:2})); }
    else { m=box(4,1.6,1.6,new THREE.MeshStandardMaterial({color:0xffe080,emissive:0xffd060,emissiveIntensity:1.6})); }
    g.add(m); scene.add(g); b={mesh:g,inUse:false,kind}; bulletPool.push(b); }
  b.inUse=true; return b; }
function getEbullet(){ let b=ebulletPool.find(x=>!x.inUse);
  if(!b){ const m=new THREE.Mesh(new THREE.SphereGeometry(1.6,6,6),new THREE.MeshStandardMaterial({color:0xff4030,emissive:0xff3010,emissiveIntensity:2.4}));
    const g=new THREE.Group(); g.add(m); scene.add(g); b={mesh:g,inUse:false}; ebulletPool.push(b); }
  b.inUse=true; return b; }
// ---- pickups meshes
const pickupMeshes=new Map();
function getPickupMesh(letter){ if(!pickupMeshes.has(letter)){
    const g=new THREE.Group();
    const shell=new THREE.Mesh(new THREE.SphereGeometry(4,10,8),new THREE.MeshStandardMaterial({color:0xf8f8f8,roughness:0.3,emissive:0x606060}));
    g.add(shell);
    const l=new THREE.Mesh(new THREE.BoxGeometry(2.6,2.6,2.6),new THREE.MeshStandardMaterial({color:letter==='S'?0xe83020:letter==='M'?0x28a0d0:letter==='L'?0xc050ff:letter==='F'?0xf08000:0x40b040,emissive:letter==='S'?0x801000:0x103040,emissiveIntensity:0.8}));
    l.position.set(0,0,3.2); g.add(l);
    const halo=new THREE.Mesh(new THREE.TorusGeometry(5.2,0.5,8,24),new THREE.MeshStandardMaterial({color:0xffe080,emissive:0xffc040,emissiveIntensity:1.2}));
    g.add(halo); g.userData.halo=halo;
    scene.add(g); pickupMeshes.set(letter,g); }
  return pickupMeshes.get(letter); }
// ---- boss models
const bossGroup=new THREE.Group(); scene.add(bossGroup);
let bossWall=null, bossPods=[], bossCore=null, bossLamp=null, bossShield=null, bossCoreRings=[], bossBeacons=[];
function buildBoss(){
  while(bossGroup.children.length)bossGroup.remove(bossGroup.children[0]);
  bossPods=[]; bossCoreRings=[]; bossBeacons=[];
  const BX=BOSS_COL*16; // wall face plane; wall body extends +x (right, off-screen)
  bossWall=box(80,190,26,new THREE.MeshStandardMaterial({color:0x303742,metalness:.38,roughness:0.72,map:plateTex('#303742','#1c222b')}));
  bossWall.position.set(BX+40,145,0); bossGroup.add(bossWall);
  bossWall.userData.faceX=BX;
  const plinth=box(80,10,30,new THREE.MeshStandardMaterial({color:0x22222c,roughness:0.95}));
  plinth.position.set(BX+40,75,0); bossGroup.add(plinth);
  const stripe=box(80,6,27,new THREE.MeshStandardMaterial({color:0xd8b028,roughness:0.7}));
  stripe.position.set(BX+40,148,0); bossGroup.add(stripe);
  for(let i=0;i<6;i++){ const seg=box(4,6,29,new THREE.MeshStandardMaterial({color:0x181820}));
    seg.position.set(BX-2+i*13,148,0); bossGroup.add(seg); }
  const door=box(34,64,6,new THREE.MeshStandardMaterial({color:0x14141c,roughness:0.9}));
  door.position.set(BX+1,112,2); bossGroup.add(door);
  // layered blast-door framing and industrial greebles make the arena read as
  // a fortified jungle installation instead of a single flat wall.
  const frameMat=new THREE.MeshStandardMaterial({color:0x596474,metalness:.72,roughness:.38});
  const edgeL=box(5,78,9,frameMat); edgeL.position.set(BX-14,112,4); bossGroup.add(edgeL);
  const edgeR=box(5,78,9,frameMat); edgeR.position.set(BX+16,112,4); bossGroup.add(edgeR);
  const lintel=box(35,6,9,frameMat); lintel.position.set(BX+1,151,4); bossGroup.add(lintel);
  for(let i=0;i<5;i++){
    const rib=box(4,28,8,M.metalD); rib.position.set(BX+4+i*12,184+(i%2)*4,9); bossGroup.add(rib);
    const bolt=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,2.5,8),M.gun);
    bolt.rotation.x=Math.PI/2; bolt.position.set(BX-15,84+i*16,9); bossGroup.add(bolt);
  }
  for(let i=0;i<7;i++){
    const hazard=box(5,3.5,10,new THREE.MeshStandardMaterial({color:i%2?0x22242a:0xe5b92f,roughness:.65}));
    hazard.position.set(BX-15,79+i*11,9.5); hazard.rotation.z=i%2?.35:-.35; bossGroup.add(hazard);
  }
  const pipeMat=new THREE.MeshStandardMaterial({color:0x68737d,metalness:.72,roughness:.42});
  for(const yy of [175,205]){
    const pipe=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.2,70,10),pipeMat);
    pipe.rotation.z=Math.PI/2; pipe.position.set(BX+28,yy,10); bossGroup.add(pipe);
  }
  bossShield=new THREE.Mesh(new THREE.BoxGeometry(30,62,34),new THREE.MeshStandardMaterial({color:0x9a70ff,transparent:true,opacity:0.16,roughness:0.1}));
  bossShield.position.set(BX+1,112,0); bossGroup.add(bossShield);
  bossCore=new THREE.Mesh(new THREE.SphereGeometry(9,14,12),M.core);
  bossCore.position.set(BX+1,96,4); bossGroup.add(bossCore);
  for(let i=0;i<3;i++){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(12+i*3,.65,8,28),new THREE.MeshStandardMaterial({color:i===1?0xffb335:0xff4a32,emissive:i===1?0x9a4a00:0x7a1008,emissiveIntensity:1.8,metalness:.35,roughness:.28}));
    ring.position.set(BX+1,96,5+i*.35); ring.scale.y=.82; bossGroup.add(ring); bossCoreRings.push(ring);
  }
  bossLamp=box(6,4,4,new THREE.MeshStandardMaterial({color:0xff4030,emissive:0xff2010,emissiveIntensity:2}));
  bossLamp.position.set(BX-3,152,12); bossGroup.add(bossLamp);
  for(const yy of [168,219]){
    const beacon=new THREE.Mesh(new THREE.SphereGeometry(2.4,8,6),new THREE.MeshStandardMaterial({color:0xff4938,emissive:0xff2418,emissiveIntensity:2.6}));
    beacon.position.set(BX-10,yy,11); bossGroup.add(beacon); bossBeacons.push(beacon);
  }
  for(const pod of boss.pods){
    const pg=new THREE.Group();
    const arm=box(34,4,4,M.metalD); arm.position.x=-17; pg.add(arm);
    const podBody=box(16,16,16,M.metal); pg.add(podBody);
    const podFace=box(12,12,4,M.metalD); podFace.position.z=8; pg.add(podFace);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(3.4,8,8),new THREE.MeshStandardMaterial({color:0xff3020,emissive:0xff2010,emissiveIntensity:2}));
    pg.add(eye); pg.userData.eye=eye;
    const barrel=box(10,2,2,M.gunD); barrel.position.x=9; pg.add(barrel);
    const rail=box(8,1,8,new THREE.MeshStandardMaterial({color:0xe4b732,metalness:.5,roughness:.45})); rail.position.set(0,8,0); pg.add(rail);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(10,.7,7,22),new THREE.MeshBasicMaterial({color:0xff5a42,transparent:true,opacity:.54}));
    ring.position.z=2; pg.add(ring); pg.userData.ring=ring;
    bossGroup.add(pg); pod.mesh=pg;
    bossPods.push(pod);
  }
}
// ---- particle meshes (pooled)
const partPool=new Map();
function partMesh(kind){
  let arr=partPool.get(kind);
  if(!arr){ arr=[]; partPool.set(kind,arr); }
  let m=arr.find(x=>!x.visible);
  if(!m){
    if(kind==='smoke'){ m=new THREE.Mesh(new THREE.SphereGeometry(1,6,5),new THREE.MeshStandardMaterial({color:0x787882,transparent:true,opacity:0.5,roughness:1})); }
    else if(kind==='dust'){ m=new THREE.Mesh(new THREE.SphereGeometry(0.9,5,4),new THREE.MeshStandardMaterial({color:0xcab894,transparent:true,opacity:0.6,roughness:1})); }
    else if(kind==='debris'){ m=box(1.6,1.6,1.6,M.metalD); }
    else if(kind==='drop'){ m=new THREE.Mesh(new THREE.SphereGeometry(0.8,5,4),new THREE.MeshStandardMaterial({color:0xb8d8ff,transparent:true,opacity:0.9})); }
    else if(kind==='spark'){ m=box(1.4,1.4,1.4,new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:2})); }
    else if(kind==='boom'){ m=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),new THREE.MeshStandardMaterial({color:0xff8020,emissive:0xff5010,emissiveIntensity:1.6,transparent:true,opacity:0.95})); }
    else if(kind==='ring'){ m=new THREE.Mesh(new THREE.TorusGeometry(1,0.4,6,20),new THREE.MeshStandardMaterial({color:0xfff0d2,transparent:true,opacity:0.8})); }
    else if(kind==='bubble'){ m=new THREE.Mesh(new THREE.SphereGeometry(1,6,6),new THREE.MeshStandardMaterial({color:0xbcd8ff,transparent:true,opacity:0.55,roughness:0.1})); }
    else if(kind==='dash'){ m=new THREE.Mesh(new THREE.PlaneGeometry(16,20),new THREE.MeshBasicMaterial({color:0x63e6ff,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide})); }
    scene.add(m); arr.push(m); }
  m.visible=true; return m;
}
// ============================ RENDER SYNC ============================
let titlePivot=0;
function sync3D(){
  const t=game.t;
  // Reset pooled transient visuals before assigning this frame's live objects.
  // This must happen before the bullet/particle loops; resetting at the end
  // hides every effect immediately before composer.render().
  for(const b of bulletPool){ b.inUse=false; b.mesh.visible=false; }
  for(const b of ebulletPool){ b.inUse=false; b.mesh.visible=false; }
  for(const arr of partPool.values()){ for(const m of arr){ m.visible=false; } }
  // camera moves; bg trails at 0.58 parallax (stays in view all level long)
  bgGroup.position.x=camX*0.58;
  syncAtmosphere(t);
  // camera shake
  let sx=0,sy=0;
  if(game.shake>0){ sx=(Math.random()*2-1)*game.shake; sy=(Math.random()*2-1)*game.shake; game.shake*=0.85; if(game.shake<0.3)game.shake=0; }
  camera.position.x=camX+128+sx; camera.position.y=136+sy; camera.position.z=220;
  camera.updateProjectionMatrix();
  // player
  const p=player;
  if(p){
    playerModel.visible=game.state!=='title'&&!((p.invuln>0)&&((t/3|0)%2===0));
    playerModel.position.set(p.x, p.inWater? 41.5 : 241.5-p.y, 0);
    playerShadow.visible=playerModel.visible&&!p.dead;
    playerShadow.position.set(p.x,p.inWater?40.2:241-p.y,-3);
    const airborne=!p.onGround&&!p.inWater;
    const shadowScale=airborne?.68:1;
    playerShadow.scale.x=(p.inWater?.68:1)*shadowScale;
    playerShadow.scale.y=(p.inWater?.12:.28)*shadowScale;
    playerShadow.material.opacity=p.inWater?.2:(airborne?.2:.34);
    playerModel.rotation.y = p.face>0?0.42:-0.42;
    // Strong, readable poses: prone, dash lean, and a classic run-and-gun somersault.
    playerModel.rotation.x=0;
    if(p.dead){ playerModel.rotation.z=p.deadT*0.14*(p.face||1); }
    else if(p.prone){ playerModel.rotation.z=p.face>0?-1.28:1.28; playerModel.position.y+=2; }
    else if(p.dashT>0){ playerModel.rotation.z=-p.face*0.16; }
    else if(!p.onGround&&!p.inWater){
      playerModel.rotation.z=p.jumping?(-p.face*(Math.min(p.jumpT,22)/22)*Math.PI*2):(-p.face*0.18);
    } else playerModel.rotation.z=0;
    // limbs
    const ud=playerModel.userData;
    const run=Math.abs(p.vx)>0.1&&p.onGround;
    const cyc=run?(p.runT*0.24):0;
    const tailWave=Math.sin(t*.34+p.runT*.12)*.16+(run?Math.sin(cyc)*.08:0);
    ud.tail.rotation.z=-.2+tailWave; ud.tail.rotation.y=Math.sin(t*.21)*.14;
    ud.tail2.rotation.z=.24-tailWave*.72; ud.tail2.rotation.y=-Math.sin(t*.18)*.11;
    if(run){ playerModel.position.y+=Math.abs(Math.sin(cyc))*0.65; ud.legL.rotation.x=Math.sin(cyc)*0.9; ud.legR.rotation.x=-Math.sin(cyc)*0.9;
      ud.armL.rotation.x=-Math.sin(cyc)*0.5; }
    else if(!p.onGround){ ud.legL.rotation.x=p.jumping?1.2:0.7; ud.legR.rotation.x=p.jumping?-0.85:-0.35; ud.armL.rotation.x=p.jumping?-0.65:0; }
    else { ud.legL.rotation.x=0; ud.legR.rotation.x=0; ud.armL.rotation.x=0; }
    // aim: point gun
    const aimA={right:0,ur:0.79,up:1.57,ul:2.36,left:3.14,dl:2.36,dr:-0.79,down:-1.57}[p.aim]||0;
    ud.gun.rotation.z=aimA;
    ud.armR.rotation.z=aimA*0.55; ud.armR.rotation.x=0;
    ud.gun.position.y = p.prone?7:12.5;
    ud.gun.position.x = p.shootT>0?.6:1.5;
    // muzzle flash + compact recoil pulse; render-only, so aim physics remain deterministic
    if(p.shootT>0){
      ud.gun.scale.setScalar(1.08);
      ud.gun.userData.muzzle.visible=true;
      ud.gun.userData.muzzle.scale.set(1.5+Math.sin(t*2)*.35,.65,.65);
      ud.gun.userData.muzzleLight.intensity=2.2;
    } else { ud.gun.scale.setScalar(1); ud.gun.userData.muzzle.visible=false; ud.gun.userData.muzzleLight.intensity=0; }
  } else playerShadow.visible=false;
  // enemies
  for(const e of enemies){
    if(!e.mesh){ 
      if(e.type==='runner'){ e.mesh=buildSoldier(SOLDIER_PAL); enemyVisuals.add(e.mesh); }
      else if(e.type==='sniper'){ e.mesh=buildSoldier(SNIPER_PAL,'sniper'); enemyVisuals.add(e.mesh); }
      else if(e.type==='turret'){ e.mesh=buildTurret(); enemyVisuals.add(e.mesh); }
      else if(e.type==='capsule'){ e.mesh=buildCapsule(); enemyVisuals.add(e.mesh); }
      e.mesh.userData._t=0;
      e.mesh.scale.setScalar(e.type==='capsule'?1.18:e.type==='turret'?1.08:1.06);
    }
    const m=e.mesh; m.visible=true;
    const flip=(e.type==='runner'&&e.vx<0)||(e.type==='sniper'&&e.x>player.x);
    m.position.set(e.x,241.2-e.y,0);
    m.rotation.y = flip? -0.42 : 0.42;
    if(e.flyback){ m.rotation.z=e.flyT*0.22*(e.vx>0?1:-1); }
    else m.rotation.z=0;
    if(e.type==='runner'){ const ud=m.userData; const cyc=e.t*0.28;
      ud.legL.rotation.x=Math.sin(cyc)*0.85; ud.legR.rotation.x=-Math.sin(cyc)*0.85; }
    if(e.type==='sniper'){
      m.rotation.x=-0.15;
      if(m.userData.alert){
        m.userData.alert.visible=e.tele>0;
        if(e.tele>0){ const pulse=.8+Math.sin(t*.8)*.25; m.userData.alert.scale.setScalar(pulse); m.userData.alert.material.opacity=.62+.3*Math.sin(t*.55); }
      }
    } else if(m.userData.alert)m.userData.alert.visible=false;
    if(e.type==='turret'){ const open=(e.cycle>40&&e.cycle<130);
      m.userData.head.rotation.y = open? Math.max(-0.9,Math.min(0.9,(player.x-e.x)/140)) : 0;
      m.userData.head.position.y = open? 7.4+Math.sin(e.t*0.12)*0.5 : 5.2;
      if(m.userData.warn){
        const charging=open&&Number.isFinite(e.cd)&&e.cd<22;
        m.userData.warn.visible=charging;
        if(charging){ const s=1+Math.sin(t*.95)*.45; m.userData.warn.scale.setScalar(s); }
      }
    }
    if(e.type==='capsule'){
      m.rotation.y+=0.06;
      m.position.y+=Math.sin(e.t*0.05)*6;
      if(m.userData.halo){ m.userData.halo.rotation.z+=.08; m.userData.halo.material.opacity=.5+Math.sin(e.t*.12)*.18; }
    }
  }
  // hide meshes of dead enemies
  for(const e of enemies){ if(e.mesh) e.mesh.visible=e.alive; }
  // bullets: one pooled mesh per live bullet (index-matched)
  for(let i=0;i<bullets.length;i++){ const b=bullets[i];
    if(!b._bm||!b._bm.inUse){ b._bm=getBullet(b.kind); }
    b._bm.inUse=true; b._bm.mesh.visible=true;
    b._bm.mesh.position.set(b.x,240-b.y,4);
    if(b.kind==='L'){ b._bm.mesh.rotation.z=-b.ang; } }
  for(let i=0;i<ebullets.length;i++){ const b=ebullets[i];
    if(!b._bm||!b._bm.inUse){ b._bm=getEbullet(); }
    b._bm.inUse=true; b._bm.mesh.visible=true;
    b._bm.mesh.position.set(b.x,240-b.y,4); }
  // particles
  for(const p of parts){
    const kind = p.dash?'dash':p.smoke?'smoke':p.dust?'dust':p.debris?'debris':p.drop?'drop':p.spark?'spark':p.ring?'ring':p.bubble?'bubble':'boom';
    const m=partMesh(kind); p.mesh=m;
    const f=p.t/p.life;
    if(kind==='boom'){ const R=(p.big?14:7)*(0.3+f)*0.9;
      m.scale.setScalar(Math.max(0.2,R*0.35)); m.material.opacity=0.95*(1-f);
      m.material.color.setHex([0xffffff,0xffee00,0xff8800,0xdd2200][(p.t/3|0)%4]); }
    else if(kind==='ring'){ m.scale.setScalar(1+f*22); m.material.opacity=0.8*(1-f); }
    else if(kind==='smoke'){ m.scale.setScalar(0.5+f*2.4); m.material.opacity=0.5*(1-f); }
    else if(kind==='spark'){ m.scale.setScalar(1); m.material.emissiveIntensity=2*(1-f); }
    else if(kind==='dash'){ m.scale.set(1+f*.8,1-f*.15,1); m.material.opacity=.24*(1-f); }
    m.position.set(p.x,240-p.y,(kind==='smoke'?4:5));
  }
  // pickups
  for(const k of pickups){ const m=getPickupMesh(k.letter);
    m.visible=true; m.position.set(k.x,240-k.y,3); m.userData.halo.rotation.z+=0.05;
    m.position.y+=Math.sin(k.t*0.12)*1.2; }
  for(const [L,m] of pickupMeshes) if(!pickups.some(k=>k.letter===L)) m.visible=false;
  // water surface
  for(const w of waterSurf){ w.position.y=47+Math.sin(t*0.06+w.position.x*0.05)*0.7; }
  for(let i=0;i<waterFoam.length;i++){
    const f=waterFoam[i]; f.position.y=48.2+Math.sin(t*.085+i*.8)*.8;
    f.scale.x=.72+Math.sin(t*.055+i)*.18; f.material.opacity=.42+Math.sin(t*.07+i)*.14;
  }
  for(const [c,g] of bridgeVisuals) g.visible=map[c]&&map[c][GROUND]==='B';
  // boss
  if(boss){
    bossGroup.visible=(boss.x-camX)<430;
    if(bossLamp){ bossLamp.visible=boss.active; bossLamp.material.emissiveIntensity=(t/18|0)%2?2.4:0.2; }
    if(bossShield) bossShield.visible=boss.active&&!boss.core.dead&&boss.pods.some(p=>!p.dead);
    if(bossShield&&bossShield.visible){ bossShield.rotation.y+=0.04; }
    if(bossCore){ bossCore.visible=boss.active&&!boss.core.dead; if(bossCore.visible){ bossCore.scale.setScalar(1+Math.sin(t*0.18)*0.06); } }
    for(let i=0;i<bossCoreRings.length;i++){
      const ring=bossCoreRings[i]; ring.visible=boss.active&&!boss.core.dead;
      if(ring.visible){ ring.rotation.z+=(i%2?-.012:.018)*(i+1); ring.scale.x=1+Math.sin(t*.08+i)*.035; }
    }
    for(let i=0;i<bossBeacons.length;i++){
      const b=bossBeacons[i]; b.visible=boss.active;
      b.material.emissiveIntensity=((t/9+i*2)|0)%2?3.4:.55;
    }
    for(const pod of boss.pods){ if(!pod.mesh)continue;
      pod.mesh.visible=boss.active&&!pod.dead;
      const gy=GROUND*16-14+pod.oy;
      pod.mesh.position.set(boss.x+pod.ox+16, 240-gy, 6);
      const podRatio=Math.max(0,Math.min(1,pod.hp/(pod.maxHp||1)));
      pod.mesh.userData.eye.material.emissiveIntensity=((t/10|0)%2?2.2:1.2)+(1-podRatio)*1.7;
      if(pod.mesh.userData.ring){
        pod.mesh.userData.ring.rotation.z+=.035;
        pod.mesh.userData.ring.material.opacity=.38+(1-podRatio)*.42+Math.sin(t*.09)*.06;
      }
      const ang=Math.atan2((player.y-10)-gy, player.x-(boss.x+pod.ox));
      pod.mesh.rotation.z=-ang;
    }
  }
}
// ---- DOM HUD
const hudEl=document.getElementById('hud'), msgEl=document.getElementById('msg'), ovEl=document.getElementById('ov'), warnEl=document.getElementById('warn');
const bossHudEl=document.getElementById('bossHud'), bossFillEl=document.getElementById('bossFill'), bossPctEl=document.getElementById('bossPct'), bossLabelEl=document.getElementById('bossLabel');
function syncHUD(){
  document.getElementById('pauseButton').disabled=game.state!=='play';
  let lv=''; for(let i=0;i<Math.min(lives,9);i++) lv+='▲';
  const wl={rifle:'RIFLE',M:'MACHINE GUN',S:'SPREAD',L:'LASER',F:'FIREBALL'}[player?player.weapon:'rifle'];
  const combo=game.combo>=2?(' &nbsp; <span style="color:#8ff">COMBO ×'+game.combo+'</span>'):'';
  const dashReady=player&&player.dashCd<=0?'READY':Math.ceil((player?.dashCd||0)/60*10)/10+'s';
  hudEl.innerHTML='<span style="color:#ff6">'+lv+'</span> &nbsp; SCORE <b>'+String(score).padStart(7,'0')+'</b> &nbsp; <span style="color:#8cf">WPN '+wl+'</span>'+combo+' &nbsp; <span style="color:#9ef">DASH '+dashReady+'</span>';
  if(boss&&boss.active&&!boss.core.dead){
    const livePods=boss.pods.filter(p=>!p.dead);
    let cur,max;
    if(livePods.length){
      cur=livePods.reduce((n,p)=>n+Math.max(0,p.hp),0);
      max=boss.pods.reduce((n,p)=>n+(p.maxHp||1),0);
      bossLabelEl.textContent='SHIELD NODES';
    } else {
      cur=Math.max(0,boss.core.hp); max=boss.core.maxHp||1;
      bossLabelEl.textContent='FORTRESS CORE';
    }
    const pct=Math.max(0,Math.min(1,cur/max));
    bossHudEl.style.opacity='1'; bossFillEl.style.transform='scaleX('+pct+')'; bossPctEl.textContent=Math.round(pct*100)+'%';
  } else bossHudEl.style.opacity='0';
  if(game.msgT>0){ game.msgT--; msgEl.textContent=game.msg; msgEl.style.opacity=(game.msgT>90?(game.msgT/6|0)%2:1); }
  else msgEl.style.opacity=0;
  ovEl.style.display=(game.state==='title'||game.state==='gameover'||game.state==='victory')?'flex':'none';
  if(game.state==='title'){ ovEl.querySelector('h1').textContent='CONTRARUN';
    ovEl.querySelector('h2').textContent='OPERATION COBALT // 2.5D ASSAULT'; }
  if(game.state==='gameover'){ ovEl.querySelector('h1').textContent='GAME OVER';
    ovEl.querySelector('h2').textContent='SCORE '+score+' — ENTER TO CONTINUE'; }
  if(game.state==='victory'){
    const finalZone=game.stage===STAGE_META.length-1;
    ovEl.querySelector('h1').textContent=finalZone?'CAMPAIGN CLEAR!':'ZONE SECURED!';
    ovEl.querySelector('h2').textContent='SCORE '+score+' — ENTER = '+(finalZone?'NEW GAME+':'NEXT ZONE');
  }
  if(game.warnT>0){ game.warnT--; warnEl.style.opacity=(game.t/5|0)%2?0.95:0; } else warnEl.style.opacity=0;
  if(game.introT>0){ game.introT--;
    const sm=STAGE_META[game.stage]||STAGE_META[0];
    msgEl.textContent=sm.short+' // '+sm.name; msgEl.style.opacity=game.introT>140?((game.introT/8|0)%2):1;
    if(game.introT<=0) msgEl.style.opacity=0; }
  if(paused&&game.state==='play'){ msgEl.textContent='PAUSED'; msgEl.style.opacity=1; }
}
