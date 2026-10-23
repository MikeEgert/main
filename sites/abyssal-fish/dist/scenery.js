import * as THREE from './vendor/three.module.js';

// A small illustrated reef: shared geometry, bounded particle pools, no image downloads.
export function createScenery(scene) {
  const root=new THREE.Group();root.name='Illustrated_reef';scene.add(root);
  const animated=[],background=new THREE.Group();root.add(background);
  const water=new THREE.ShaderMaterial({depthWrite:false,uniforms:{time:{value:0},intro:{value:1}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`
    varying vec2 vUv;uniform float time;uniform float intro;
    void main(){
      vec2 p=vUv;float top=smoothstep(.13,.9,p.y);
      vec3 color=mix(vec3(.018,.065,.095),vec3(.055,.29,.33),top);
      float glow=exp(-length((p-vec2(.62,1.03))*vec2(3.,1.9))*3.2);
      color+=vec3(.045,.14,.13)*glow;
      float rays=pow(max(0.,sin((p.x+p.y*.19)*96.+sin(time*.18+p.y*3.)*.5)),18.);
      color+=vec3(.045,.11,.105)*rays*smoothstep(.15,1.,p.y)*.6;
      float surface=pow(max(0.,sin(p.x*135.+time*.2+sin(p.x*45.-time*.3))),9.);
      color+=vec3(.08,.16,.15)*surface*exp(-abs(p.y-.82)*110.);
      color*=mix(1.,mix(.32,.85,smoothstep(.39,.59,p.x)),intro);
      gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(70,24),water);plane.position.set(0,0,-19);background.add(plane);
  const sphere=new THREE.SphereGeometry(1,16,12),rock=new THREE.IcosahedronGeometry(1,1);
  const ink=new THREE.MeshBasicMaterial({color:0x102c35,side:THREE.BackSide});
  const material=(color,roughness=.85)=>new THREE.MeshStandardMaterial({color,roughness,flatShading:true});
  const rockMats=[material(0x3e7374),material(0x4c8983),material(0x285d69)];
  const coralMats=[material(0xde8671),material(0xc49ac4),material(0xe6b47f)];
  const leafMats=[material(0x368d80),material(0x55a68d),material(0x246e70)];
  function add(parent,geo,mat,pos,scale,outline=false){
    const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.scale.set(...scale);parent.add(m);
    if(outline){const edge=new THREE.Mesh(geo,ink);edge.scale.setScalar(1.025);m.add(edge);}return m;
  }
  function branch(parent,a,b,r,mat){const delta=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const m=new THREE.Mesh(new THREE.CylinderGeometry(r*.7,r,delta.length(),7),mat);m.position.copy(new THREE.Vector3(...a).addScaledVector(delta,.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());parent.add(m);return m;}
  // Layered dunes give a clear foreground and distant seafloor.
  for(let layer=0;layer<3;layer++){
    const shape=new THREE.Shape();shape.moveTo(-35,-12);
    for(let i=0;i<=70;i++){const x=i-35;shape.lineTo(x,-7.3+layer*.32+Math.sin(x*.38+layer*2)*.45+Math.cos(x*.8)*.13);}
    shape.lineTo(35,-12);shape.closePath();const m=new THREE.Mesh(new THREE.ShapeGeometry(shape),material([0x21454c,0x235a60,0x1a4248][layer]));m.position.z=-2-layer*3;root.add(m);
  }
  for(let i=0;i<18;i++){
    const x=(i-8.5)*2.1,z=i%3===0?1:-2;
    add(root,rock,rockMats[i%3],[x,-7.4+(i%3)*.12,z],[.7+(i%4)*.18,.38+(i%3)*.17,.5],true).rotation.z=i*.7;
  }
  // Long leaves sway from their base rather than spinning around their center.
  for(let i=0;i<19;i++){
    const x=(i-9)*1.9,group=new THREE.Group();group.position.set(x,-7.4,-1.5-(i%3));root.add(group);
    const height=1.1+(Math.sin(i*7.2)+1)*1.1;
    for(let j=0;j<3;j++){
      const h=height*(.7+j*.15),path=new THREE.CatmullRomCurve3([new THREE.Vector3(j*.11,0,0),new THREE.Vector3(.23-j*.12,h*.55,0),new THREE.Vector3(.18+j*.1,h,0)]);
      const leaf=new THREE.Mesh(new THREE.TubeGeometry(path,10,.075+j*.015,4),leafMats[(i+j)%3]);group.add(leaf);
      for(let k=1;k<4;k++){const m=add(group,sphere,leafMats[(i+j)%3],[j*.12+(k%2?.16:-.15),h*k/4,0],[.12,.32,.045]);m.rotation.z=k%2?-.65:.65;}
    }
    animated.push({group,phase:i*1.7});
  }
  for(let i=0;i<10;i++){
    const g=new THREE.Group();g.position.set((i-4.5)*3.7,-7.1,(i%2)*1.3);root.add(g);const mat=coralMats[i%3];
    for(let j=0;j<4;j++){
      const x=(j-1.5)*.2,h=.55+((i+j)%3)*.28;branch(g,[0,0,0],[x,h,0],.07,mat);
      branch(g,[x*.6,h*.6,0],[x-.25,h*.95,.03],.047,mat);
      add(g,sphere,mat,[x,h,0],[.073,.08,.073]);add(g,sphere,mat,[x-.25,h*.95,.03],[.052,.06,.052]);
    }
  }
  // A few shells and stars bring personality without obscuring the swim lane.
  const shellMat=material(0xd8c3ac),starMat=material(0xe7a073);
  for(let i=0;i<6;i++){
    const x=(i-2.5)*5.1;const shell=add(root,sphere,shellMat,[x,-6.95,1.1],[.35,.18,.13]);shell.rotation.z=.2;
    for(let j=0;j<5;j++){const a=j*Math.PI*2/5;const arm=add(root,new THREE.ConeGeometry(.12,.42,5),starMat,[x+.8+Math.cos(a)*.13,-7.03+Math.sin(a)*.13,1.5],[1,1,.4]);arm.rotation.z=a-Math.PI/2;}
  }
  // A single instanced mesh draws all drifting bubbles.
  const bubbleMaterial=new THREE.MeshBasicMaterial({color:0x9adbd6,transparent:true,opacity:.32,depthWrite:false});
  const bubbleGeometry=new THREE.TorusGeometry(1,.055,4,14),bubbles=new THREE.InstancedMesh(bubbleGeometry,bubbleMaterial,36);root.add(bubbles);
  const bubbleData=Array.from({length:36},(_,i)=>({x:Math.sin(i*13.7)*24,y:(i/36)*18-9,z:-5-(i%4),r:.025+(i%4)*.018,speed:.15+(i%3)*.07}));const dummy=new THREE.Object3D();
  let sceneryTime=0;
  return {root,update(dt,active=true,isIntro=false){
    if(active)sceneryTime+=dt;water.uniforms.time.value=sceneryTime;water.uniforms.intro.value=isIntro?1:0;
    for(const {group,phase} of animated)group.rotation.z=Math.sin(sceneryTime*.65+phase)*.06;
    bubbleData.forEach((b,i)=>{if(active){b.y+=dt*b.speed;if(b.y>9)b.y=-9;}dummy.position.set(b.x+Math.sin(sceneryTime*.4+i)*.16,b.y,b.z);dummy.scale.setScalar(b.r);dummy.updateMatrix();bubbles.setMatrixAt(i,dummy.matrix);});bubbles.instanceMatrix.needsUpdate=true;
  }};
}

export function createCatchEffects(scene){
  const capacity=96,geometry=new THREE.SphereGeometry(1,6,4),material=new THREE.MeshBasicMaterial({color:0xdaf9c4,transparent:true,opacity:.85,depthWrite:false});
  const dots=new THREE.InstancedMesh(geometry,material,capacity);dots.frustumCulled=false;scene.add(dots);
  const particles=Array.from({length:capacity},()=>({life:0,x:0,y:0,vx:0,vy:0,size:0}));let cursor=0;const dummy=new THREE.Object3D();
  return {burst(position,color=0xf4d56c,count=12){for(let i=0;i<count;i++){const p=particles[cursor],a=i/count*Math.PI*2;p.life=.65;p.x=position.x;p.y=position.y;p.vx=Math.cos(a)*(1+i%3*.25);p.vy=Math.sin(a)*1.2+.4;p.size=.035+(i%3)*.017;dots.setColorAt(cursor,new THREE.Color(color));cursor=(cursor+1)%capacity;}if(dots.instanceColor)dots.instanceColor.needsUpdate=true;},update(dt,visible=true){dots.visible=visible;for(let i=0;i<capacity;i++){const p=particles[i];p.life=Math.max(0,p.life-dt);p.x+=p.vx*dt;p.y+=p.vy*dt;dummy.position.set(p.x,p.y,2);dummy.scale.setScalar(p.life>0?p.size*Math.min(1,p.life*4):0);dummy.updateMatrix();dots.setMatrixAt(i,dummy.matrix);}dots.instanceMatrix.needsUpdate=true;}};
}
