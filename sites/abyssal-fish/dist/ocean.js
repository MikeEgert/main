import * as THREE from './vendor/three.module.js';
import {createFish,setHat} from './fish-model.js';
import {createScenery,createCatchEffects} from './scenery.js';
import {LEVELS,SPECIES,HATS,initialState,restore,canEat,eat,grow,equip} from './rules.js';

const $=id=>document.getElementById(id);
const SAVE='abyssal-goldeneye-v1';
let state=initialState(),storageAvailable=true;
try {state=restore(localStorage.getItem(SAVE));} catch {storageAvailable=false;}
let mode='intro',previousMode='intro',time=0,toastUntil=0,blockedUntil=0;
let fish,renderer,scene,camera,mixer,world,scenery,effects;
let bitePulse=0,growthPulse=0,hoveredFish=false,modelPose=null;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),scoreLabels=[];
const actors=[],keys=new Set(),target=new THREE.Vector2();
let pointerActive=false,drag=null,viewAngle=.15,viewPitch=0,zoom=1,heading=0;
let halfWidth=12,halfHeight=8;
const canvas=$('ocean'),container=canvas.parentElement;
const iconPaths={
  plankton:'<circle cx="16" cy="16" r="6"/><path d="M16 3v4m0 18v4M3 16h4m18 0h4M7 7l3 3m12 12 3 3M7 25l3-3M22 10l3-3"/>',
  shrimp:'<path d="M26 21c-7 5-20 0-19-8 0-6 10-7 13-2 3 4-1 6-4 4m-7-5L4 6m8 3L9 3M11 21l-2 4m8-2-1 4m7-5 1 3"/>',
  sardine:'<path d="M4 16c5-9 15-9 20 0-5 9-15 9-20 0Zm20 0 6-6v12Z"/><circle cx="10" cy="15" r="1"/>',
  jelly:'<path d="M5 17a11 11 0 0 1 22 0Zm3 1c-4 5 4 5 0 10m8-10c-4 5 4 5 0 10m8-10c-4 5 4 5 0 10"/>',
  ray:'<path d="m3 16 10-9 3 5 3-5 10 9-10 3-3 6-3-6Z"/>',
  tuna:'<path d="M3 16c7-10 16-10 21 0-5 10-14 10-21 0Zm21 0 6-6v12ZM12 9l5-5 2 6"/><circle cx="9" cy="15" r="1"/>'
};
const icons=Object.fromEntries(Object.entries(iconPaths).map(([id,path])=>[id,`<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`]));
function save(){try{localStorage.setItem(SAVE,JSON.stringify(state));}catch{storageAvailable=false;} $('save-status').textContent=storageAvailable?'Saved on this device':'Progress is session-only';}
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');toastUntil=time+2.6;}
function renderUI(){
  const level=LEVELS[state.level];
  $('points').replaceChildren(document.createTextNode(state.points),Object.assign(document.createElement('span'),{textContent:'◉'}));
  $('hud-points').textContent=state.points;$('size').textContent=level.size.toFixed(1);$('level').textContent=level.name;$('level-number').textContent=`0${state.level+1} / 05`;$('eaten').textContent=state.eaten;
  $('growth-progress').max=level.cost??1;$('growth-progress').value=level.cost===null?1:Math.min(state.points,level.cost);
  $('growth-cost').textContent=level.cost===null?'MAX':`${state.points} / ${level.cost}`;
  $('growth-description').textContent=level.cost===null?'The ocean is your oyster.':'Your next chapter is a little bigger.';
  $('grow').disabled=level.cost===null||state.points<level.cost;
  $('grow').replaceChildren(document.createTextNode(level.cost===null?'Fully grown':'Grow bigger'),Object.assign(document.createElement('span'),{textContent:level.cost===null?'✓':`${level.cost} ◉`}));
  $('prey-list').replaceChildren(...SPECIES.map(prey=>{
    const ok=canEat(state.level,prey);const row=document.createElement('div');row.className=`prey${ok?'':' locked'}`;
    row.innerHTML=`<span class="creature-icon icon-${prey.id}">${icons[prey.id]}</span><span class="prey-info">${prey.name}<small>${ok?'On the menu':`Grow beyond ${prey.size.toFixed(1)}×`}</small></span><span class="prey-value">${ok?`+${prey.points} ◉`:'⌑'}</span>`;return row;
  }));
  $('hat-list').replaceChildren(...HATS.map(hat=>{
    const row=document.createElement('div');row.className='hat';const owned=state.owned.includes(hat.id),selected=state.hat===hat.id;
    row.innerHTML=`<span class="creature-icon">${{none:'◉',beanie:'◠',sailor:'⚓',crown:'♛'}[hat.id]}</span><span class="prey-info">${hat.name}<small>${owned?'In your collection':`${hat.cost} pearls`}</small></span>`;
    const button=document.createElement('button');button.textContent=selected?'Equipped':owned?'Wear':`${hat.cost} ◉`;button.setAttribute('aria-label',`${owned?'Wear':'Buy'} ${hat.name}`);button.setAttribute('aria-pressed',String(selected));button.disabled=selected||(!owned&&state.points<hat.cost);
    button.onclick=()=>{const next=equip(state,hat.id);if(next===state)return;state=next;setHat(fish,state.hat);save();renderUI();toast(`${hat.name} equipped`);};row.append(button);return row;
  }));
}
function changeMode(next){
  const from=mode;
  mode=next;keys.clear();pointerActive=false;
  $('intro').hidden=next!=='intro';$('play-hud').hidden=next!=='playing';$('paused').hidden=next!=='paused';$('model-caption').hidden=next!=='model';
  $('model-button').textContent=next==='model'?'Return to ocean ↙':'Explore the model ↗';
  $('controls').textContent=next==='model'?'DRAG TO ROTATE · SCROLL TO ZOOM':next==='playing'?'POINTER / TOUCH / WASD / ARROWS TO SWIM · P TO PAUSE':'MOVE YOUR POINTER TO SWIM · WASD / ARROWS';
  if(world)world.visible=next!=='model';
  for(const actor of actors)actor.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=next==='intro'?.24:o.material.userData.originalOpacity??1;}});
  if(next==='playing') {if(from==='intro'){fish.root.position.set(0,0,0);target.set(0,0);}canvas.focus({preventScroll:true});}
}
function toggleModel(){if(mode==='model'){changeMode(previousMode);if(modelPose){fish.root.position.copy(modelPose.position);fish.root.quaternion.copy(modelPose.quaternion);fish.root.scale.copy(modelPose.scale);}}else {modelPose={position:fish.root.position.clone(),quaternion:fish.root.quaternion.clone(),scale:fish.root.scale.clone()};previousMode=mode==='playing'?'paused':mode;viewAngle=.15;viewPitch=0;zoom=1;changeMode('model');}}
$('model-button').onclick=toggleModel;$('return').onclick=toggleModel;
$('start').onclick=()=>{changeMode('playing');toast('Catch plankton and shrimp to earn your first pearls.');};
$('pause').onclick=()=>changeMode('paused');$('resume').onclick=()=>changeMode('playing');
$('grow').onclick=()=>{const next=grow(state);if(next===state)return;state=next;growthPulse=1;effects?.burst(fish.root.position,0xffdb71,28);save();renderUI();toast(`You grew! ${LEVELS[state.level].name} · ${LEVELS[state.level].size}×`);};
function selectTab(hats){$('food-panel').hidden=hats;$('hat-panel').hidden=!hats;for(const [id,selected] of [['food-tab',!hats],['hat-tab',hats]]){$(id).setAttribute('aria-selected',String(selected));$(id).tabIndex=selected?0:-1;}}
$('food-tab').onclick=()=>selectTab(false);$('hat-tab').onclick=()=>selectTab(true);
for(const id of ['food-tab','hat-tab'])$(id).addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const hats=e.key==='End'||(e.key!=='Home'&&id==='food-tab');selectTab(hats);$(hats?'hat-tab':'food-tab').focus();}});
function mat(color,options={}){return new THREE.MeshStandardMaterial({color,roughness:.6,...options});}
function mesh(group,geometry,material,pos,scale){const m=new THREE.Mesh(geometry,material);if(pos)m.position.set(...pos);if(scale)m.scale.set(...scale);group.add(m);return m;}
const sphere=new THREE.SphereGeometry(1,20,12);
function makeCreature(species){
  const g=new THREE.Group(),body=mat(species.color,{roughness:.42}),dark=mat(0x07222c),glow=mat(species.color,{emissive:species.color,emissiveIntensity:.4});
  const fins=[];
  if(species.id==='plankton'){
    mesh(g,new THREE.IcosahedronGeometry(.18,1),glow);for(let i=0;i<5;i++){const a=i/5*Math.PI*2;mesh(g,sphere,glow,[Math.cos(a)*.26,Math.sin(a)*.26,0],[.045,.045,.045]);}
  }else if(species.id==='jelly'){
    mesh(g,new THREE.SphereGeometry(.7,24,12,0,Math.PI*2,0,Math.PI*.56),mat(species.color,{transparent:true,opacity:.72,emissive:species.color,emissiveIntensity:.12}));
    for(let i=0;i<5;i++){const x=(i-2)*.21;const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,0,0),new THREE.Vector3(x+.1,-.5,0),new THREE.Vector3(x-.07,-1,0)]);fins.push(mesh(g,new THREE.TubeGeometry(curve,12,.023,5,false),body));}
  }else if(species.id==='ray'){
    mesh(g,sphere,body,[0,0,0],[.9,.23,.25]);const shape=new THREE.Shape();shape.moveTo(-.3,.1);shape.lineTo(.3,1);shape.lineTo(.7,.1);shape.lineTo(.4,-.2);shape.lineTo(.3,-1);shape.lineTo(-.3,-.1);shape.closePath();mesh(g,new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:species.color,side:THREE.DoubleSide}));mesh(g,new THREE.ConeGeometry(.07,1.5,6),body,[1,0,0]).rotation.z=-Math.PI/2;
  }else if(species.id==='shrimp'){
    for(let i=0;i<5;i++)mesh(g,sphere,body,[(i-2)*.12,-i*i*.012,0],[.14,.18-i*.018,.12]);
    for(let i=0;i<3;i++){const leg=mesh(g,new THREE.CylinderGeometry(.014,.014,.28,4),body,[i*.13-.15,-.23,0]);leg.rotation.z=-.6;}
    mesh(g,sphere,dark,[-.29,.05,.11],[.035,.035,.035]);
    const feeler=new THREE.CatmullRomCurve3([new THREE.Vector3(-.3,.1,0),new THREE.Vector3(-.5,.3,0),new THREE.Vector3(-.7,.26,0)]);mesh(g,new THREE.TubeGeometry(feeler,8,.008,4,false),body);
  }else {
    mesh(g,sphere,body,[0,0,0],[.68,.27,.18]);const tail=mesh(g,new THREE.ConeGeometry(.35,.4,3),body,[.7,0,0]);tail.rotation.z=Math.PI/2;fins.push(tail);
    for(const side of [-1,1]){mesh(g,sphere,dark,[-.4,.07,side*.16],[.06,.06,.035]);mesh(g,sphere,new THREE.MeshBasicMaterial({color:0xf8fff4}),[-.42,.09,side*.19],[.018,.018,.008]);}
    mesh(g,new THREE.ConeGeometry(.17,.28,3),body,[.05,.28,0]);
  }
  const outlined=[];g.traverse(o=>{if(o.isMesh&&o.geometry===sphere&&o.scale.x>.3)outlined.push(o);});
  for(const m of outlined){const outline=new THREE.Mesh(m.geometry,new THREE.MeshBasicMaterial({color:0x17323b,side:THREE.BackSide}));outline.scale.setScalar(1.035);m.add(outline);}
  // Geometric footprint and collision radius use the same size scale.
  const base=species.id==='plankton'?1:species.size*.62;g.scale.setScalar(base);
  g.userData={species,fins,speed:.4+Math.random()*.6,phase:Math.random()*Math.PI*2,direction:Math.random()>.5?1:-1};
  return g;
}
function respawn(actor,initial=false){const d=actor.userData;d.direction=Math.random()>.5?1:-1;actor.position.set(initial?(Math.random()*2-1)*halfWidth:-d.direction*(halfWidth+2), (Math.random()*2-1)*(halfHeight-1.8),.1);actor.rotation.y=d.direction>0?Math.PI:0;d.baseY=actor.position.y;}
function environment(){
  world=new THREE.Group();scene.add(world);scenery=createScenery(scene);world.add(scenery.root);effects=createCatchEffects(scene);
  for(let i=0;i<32;i++){
    const species=SPECIES[i<12?0:i<20?1:2+(i%4)],actor=makeCreature(species);
    actor.traverse(o=>{if(o.material){o.material.userData.originalOpacity??=o.material.opacity;o.material.transparent=true;o.material.opacity=.25;}});
    world.add(actor);actors.push(actor);respawn(actor,true);
  }
}
function scorePop(points,position){
  if(scoreLabels.length>=8){const old=scoreLabels.shift();old.el.remove();}
  const el=document.createElement('span');el.className='catch-score';el.textContent=`+${points} ◉`;el.setAttribute('aria-hidden','true');container.append(el);
  scoreLabels.push({el,position:position.clone(),life:1.1});
}
function updateLabels(dt){
  for(let i=scoreLabels.length-1;i>=0;i--){const label=scoreLabels[i];label.life-=dt;if(label.life<=0){label.el.remove();scoreLabels.splice(i,1);continue;}
    const p=label.position.clone();p.y+=(1.1-label.life)*1.1;p.project(camera);
    label.el.style.left=`${(p.x*.5+.5)*100}%`;label.el.style.top=`${(-p.y*.5+.5)*100}%`;label.el.style.opacity=String(Math.min(1,label.life*3));label.el.hidden=mode!=='playing';
  }
}
function resize(){const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height,false);halfHeight=8;halfWidth=halfHeight*width/height;camera.left=-halfWidth;camera.right=halfWidth;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();}
function steer(event){if(mode==='intro'){const r=canvas.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);hoveredFish=raycaster.intersectObject(fish.root,true).length>0;canvas.classList.toggle('fish-hover',hoveredFish);return;}if(mode==='model'){if(drag){viewAngle+=(event.clientX-drag.x)*.008;viewPitch=THREE.MathUtils.clamp(viewPitch+(event.clientY-drag.y)*.006,-.75,.75);drag={x:event.clientX,y:event.clientY};}return;}if(mode!=='playing')return;const r=canvas.getBoundingClientRect();target.set(((event.clientX-r.left)/r.width*2-1)*halfWidth,-((event.clientY-r.top)/r.height*2-1)*halfHeight);pointerActive=true;}
canvas.addEventListener('pointermove',steer);canvas.addEventListener('pointerdown',e=>{if(mode==='intro'){steer(e);if(hoveredFish){$('start').click();hoveredFish=false;canvas.classList.remove('fish-hover');}return;}canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});if(mode==='model')drag={x:e.clientX,y:e.clientY};steer(e);});
canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>{drag=null;pointerActive=false;});canvas.addEventListener('pointerleave',()=>{if(!drag)pointerActive=false;});
canvas.addEventListener('wheel',e=>{if(mode==='model'){e.preventDefault();zoom=THREE.MathUtils.clamp(zoom-e.deltaY*.001,.65,1.5);}},{passive:false});
window.addEventListener('keydown',e=>{
  if(e.target instanceof HTMLElement&&e.target.closest('button,a,input,select,textarea'))return;
  const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key)&&mode==='playing'){e.preventDefault();keys.add(key);pointerActive=false;}
  if(!e.repeat&&(key==='p'||key==='escape')){if(mode==='playing')changeMode('paused');else if(mode==='paused')changeMode('playing');else if(mode==='model')toggleModel();}
});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();if(mode==='playing')changeMode('paused');});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')changeMode('paused');});
function updatePlayer(dt){
  const size=LEVELS[state.level].size,scale=.77*size;
  fish.root.scale.setScalar(scale);
  let dx=0,dy=0;
  if(keys.size){dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));dy=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'));}
  else if(pointerActive){dx=target.x-fish.root.position.x;dy=target.y-fish.root.position.y;}
  const length=Math.hypot(dx,dy),speed=5.4;
  if(length>.06){const step=Math.min(length,speed*dt);fish.root.position.x+=dx/length*step;fish.root.position.y+=dy/length*step;if(Math.abs(dx)>.04)heading=dx>0?Math.PI:0;}
  // Both eyes are modeled, so turning shows a real opposite side.
  fish.root.rotation.y=THREE.MathUtils.damp(fish.root.rotation.y,heading,9,dt);fish.root.rotation.x=0;fish.root.rotation.z=THREE.MathUtils.damp(fish.root.rotation.z,length>.06?-dy/length*.12:0,5,dt);
  const margin=Math.min(scale*1.35,halfWidth*.4);fish.root.position.x=THREE.MathUtils.clamp(fish.root.position.x,-halfWidth+margin,halfWidth-margin);fish.root.position.y=THREE.MathUtils.clamp(fish.root.position.y,-halfHeight+scale*1.2,halfHeight-scale*1.7);
  for(const actor of actors){const d=actor.userData,prey=d.species;const distance=actor.position.distanceTo(fish.root.position);const radius=scale*.75+prey.size*.22;
    if(distance<radius){if(canEat(state.level,prey)){state=eat(state,prey.id);bitePulse=1;effects.burst(actor.position,prey.color);scorePop(prey.points,actor.position);save();renderUI();toast(`+${prey.points} pearls · ${prey.name}`);respawn(actor);}else{if(time>blockedUntil){toast(`${prey.name} is too big. Grow beyond ${prey.size}×.`);blockedUntil=time+3;}const away=new THREE.Vector2(actor.position.x-fish.root.position.x,actor.position.y-fish.root.position.y);if(away.lengthSq()<.001)away.set(1,0);away.normalize();actor.position.x+=away.x*dt*3;}}
  }
}
let last=performance.now();
function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;time+=dt;
  if(mode!=='paused')mixer.update(dt*(mode==='playing'?1.5:1));
  if(mode==='playing')updatePlayer(dt);
  else if(mode==='intro') {const mobile=halfWidth<6;fish.root.position.set(halfWidth*(mobile?.42:.49),mobile?-2:-.2,1);fish.root.scale.setScalar(mobile?1.28:1.95);fish.root.rotation.set(0,.18+Math.sin(time*.4)*.08+(hoveredFish?.08:0),Math.sin(time*.65)*.025);fish.root.position.y+=Math.sin(time*.7)*.12;}
  else if(mode==='model'){fish.root.position.set(halfWidth<6?.5:1.6,-.55,1);fish.root.scale.setScalar(Math.min(halfWidth*.39,2.5)*zoom);fish.root.rotation.set(viewPitch,viewAngle,0);}
  if(mode!=='paused'){
    for(const actor of actors){const d=actor.userData;actor.position.x+=d.direction*d.speed*dt;actor.position.y=d.baseY+Math.sin(time*.8+d.phase)*.3;for(const fin of d.fins)fin.rotation.y=Math.sin(time*5+d.phase)*.22;if(Math.abs(actor.position.x)>halfWidth+3)respawn(actor);}

  }
  if(time>toastUntil)$('toast').classList.remove('visible');
  const active=mode!=='paused';scenery.update(dt,active&&!reducedMotion,mode==='intro');effects.update(active?dt:0,mode==='playing');updateLabels(active?dt:0);
  if(active){bitePulse=Math.max(0,bitePulse-dt*5);growthPulse=Math.max(0,growthPulse-dt*1.6);}
  if(mode==='playing'&&!reducedMotion){fish.root.scale.x*=1+Math.sin(bitePulse*Math.PI)*.08;fish.root.scale.y*=1-Math.sin(bitePulse*Math.PI)*.045;fish.root.scale.multiplyScalar(1+Math.sin(growthPulse*Math.PI)*.08);}
  renderer.render(scene,camera);requestAnimationFrame(frame);
}
try {
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x0b2936);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  scene=new THREE.Scene();scene.fog=new THREE.Fog(0x16444b,34,65);camera=new THREE.OrthographicCamera(-12,12,8,-8,.1,100);camera.position.set(0,0,30);camera.lookAt(0,0,0);
  scene.add(new THREE.HemisphereLight(0xd6f5eb,0x253c48,2.4));const key=new THREE.DirectionalLight(0xffedc6,3.2);key.position.set(-5,10,12);scene.add(key);const rim=new THREE.DirectionalLight(0x70bacf,2);rim.position.set(7,4,-8);scene.add(rim);
  fish=createFish();scene.add(fish.root);setHat(fish,state.hat);mixer=new THREE.AnimationMixer(fish.root);mixer.clipAction(fish.clips[0]).play();resize();environment();new ResizeObserver(resize).observe(container);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();changeMode('paused');$('fallback').hidden=false;});canvas.addEventListener('webglcontextrestored',()=>location.reload());
  $('start').disabled=false;$('start').textContent='Dive in →';renderUI();save();requestAnimationFrame(frame);
} catch(error){console.error('Ocean initialization failed:',error);$('intro').hidden=true;$('fallback').hidden=false;$('model-button').disabled=true;renderUI();}
