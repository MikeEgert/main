import * as THREE from './vendor/three.module.js';

// Local axes: nose -X, dorsal +Y, eyes ±Z. One unit is one body radius.
export function createFish() {
  const root = new THREE.Group(); root.name = 'Goldeneye';
  const charcoal = new THREE.MeshPhysicalMaterial({ color: 0x202827, roughness: .4, metalness: .08, clearcoat: .35, clearcoatRoughness: .35 });
  const finMaterial = new THREE.MeshStandardMaterial({ color: 0x273432, roughness: .65, side: THREE.DoubleSide });
  const rimMaterial = new THREE.MeshStandardMaterial({ color: 0x94a193, roughness: .65 });
  const yellow = new THREE.MeshBasicMaterial({ color: 0xffda24, toneMapped: false, fog: false });
  const gold = new THREE.MeshBasicMaterial({ color: 0xe5af13, toneMapped: false, fog: false });
  const black = new THREE.MeshStandardMaterial({ color: 0x020604, roughness: .12 });
  const white = new THREE.MeshBasicMaterial({ color: 0xfffce2 });
  const sphere = new THREE.SphereGeometry(1, 48, 32);
  function ellipsoid(parent, name, mat, xyz, scale) {
    const mesh = new THREE.Mesh(sphere, mat); mesh.name = name;
    mesh.position.set(...xyz); mesh.scale.set(...scale); parent.add(mesh); return mesh;
  }
  ellipsoid(root, 'Body', charcoal, [0,0,0], [1.25,.91,.49]);
  const silhouette=new THREE.Mesh(sphere,new THREE.MeshBasicMaterial({color:0x08191e,side:THREE.BackSide}));
  silhouette.name='Ink_silhouette';silhouette.scale.set(1.265,.925,.505);root.add(silhouette);
  // Fine silhouette lines retain the pencil-like outline of the reference.
  function tube(parent, name, points, radius=.009, closed=false) {
    const path = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)), closed, 'centripetal');
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, Math.max(24,points.length*3), radius, 5, closed), rimMaterial);
    mesh.name=name; parent.add(mesh); return mesh;
  }
  const contour = Array.from({length:64},(_,i)=>{const a=i/64*Math.PI*2;return [1.253*Math.cos(a),.913*Math.sin(a),0];});
  tube(root,'Body_outline',contour,.008,true);
  function fin(parent, name, vertices, pivot=[0,0,0]) {
    const group=new THREE.Group(); group.name=name; group.position.set(...pivot); parent.add(group);
    const shape=new THREE.Shape(); vertices.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y)); shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:true,bevelThickness:.018,bevelSize:.016,bevelSegments:2,steps:1});
    geometry.translate(0,0,-.0275);
    const mesh=new THREE.Mesh(geometry,finMaterial); mesh.name=name+'_surface'; group.add(mesh);
    tube(group,name+'_edge',vertices.map(([x,y])=>[x,y,.028]),.009,true); return group;
  }
  const dorsal=fin(root,'Dorsal_fin',[[-.51,0],[-.12,.88],[.38,-.04]],[.38,.81,0]);
  const tail=fin(root,'Tail',[[0,.24],[.93,1.16],[.64,.22],[.63,-.23],[.93,-1.03],[0,-.23]],[1.12,.02,0]);
  const fins=[];
  for(const side of [-1,1]) {
    const z=side*.405;
    // Raised charcoal eye socket, bright yellow iris, deep black pupil.
    ellipsoid(root,`Eye_socket_${side}`,charcoal,[-.56,.12,z],[.55,.55,.19]);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.516,.012,6,64),rimMaterial); ring.name=`Eye_rim_${side}`;ring.position.set(-.56,.12,z+side*.11);root.add(ring);
    ellipsoid(root,`Iris_${side}`,yellow,[-.59,.12,z+side*.16],[.385,.385,.095]);
    const inner=new THREE.Mesh(new THREE.TorusGeometry(.31,.009,6,64),gold);inner.position.set(-.59,.12,z+side*.244);root.add(inner);
    ellipsoid(root,`Pupil_${side}`,black,[-.62,.135,z+side*.249],[.17,.18,.052]);
    ellipsoid(root,`Eye_glint_${side}`,white,[-.68,.215,z+side*.292],[.047,.05,.012]);
    ellipsoid(root,`Eye_glint_small_${side}`,white,[-.55,.075,z+side*.296],[.018,.02,.009]);
    const p=fin(root,`Pectoral_${side}`,[[0,0],[-.47,-.62],[.32,-.19]],[-.62,-.45,side*.4]);
    p.rotation.y=side*.15;fins.push(p);
  }
  fin(root,'Lips',[[0,.10],[-.18,0],[0,-.07]],[-1.21,-.05,0]);
  const accessory=new THREE.Group();accessory.name='Accessory_socket';accessory.position.set(-.25,.85,0);root.add(accessory);
  function sway(part, axis, amount) {
    const base=part.quaternion.clone(), vector=new THREE.Vector3(...axis);
    const values=[0,amount,0,-amount,0].flatMap(angle=>base.clone().multiply(new THREE.Quaternion().setFromAxisAngle(vector,angle)).toArray());
    return new THREE.QuaternionKeyframeTrack(`${part.name}.quaternion`,[0,.25,.5,.75,1],values);
  }
  const clips=[new THREE.AnimationClip('Swim',1,[
    sway(tail,[0,1,0],.30),
    ...fins.map((p,i)=>sway(p,[1,0,0],.22*(i?1:-1))),
    sway(dorsal,[1,0,0],.04)
  ])];
  root.animations=clips;
  return {root,tail,fins,dorsal,accessory,clips};
}

export function setHat(fish, id) {
  for(const child of [...fish.accessory.children]) { fish.accessory.remove(child); child.traverse(o=>{o.geometry?.dispose(); if(o.material) o.material.dispose();}); }
  if(id==='none')return;
  const mat=new THREE.MeshStandardMaterial({color:id==='crown'?0xf5c542:id==='sailor'?0xf0eadd:0xd95748,roughness:.5,metalness:id==='crown'?.55:0});
  function mesh(g,x,y,z, material=mat){const m=new THREE.Mesh(g,material);m.position.set(x,y,z);fish.accessory.add(m);return m;}
  if(id==='crown') {
    mesh(new THREE.CylinderGeometry(.34,.29,.22,8,1,true),0,.12,0);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;mesh(new THREE.ConeGeometry(.09,.26,4),Math.cos(a)*.29,.31,Math.sin(a)*.29);}
  } else if(id==='sailor') {
    mesh(new THREE.CylinderGeometry(.43,.4,.09,32),0,.07,0);
    mesh(new THREE.CylinderGeometry(.29,.36,.23,32),0,.2,0);
    mesh(new THREE.CylinderGeometry(.363,.363,.055,32),0,.12,0,new THREE.MeshStandardMaterial({color:0x173a60}));
  } else {
    mesh(new THREE.SphereGeometry(.36,24,16,0,Math.PI*2,0,Math.PI/2),0,.03,0);
    mesh(new THREE.SphereGeometry(.09,12,8),0,.43,0);
    mesh(new THREE.CylinderGeometry(.37,.37,.11,32),0,.04,0);
  }
}
