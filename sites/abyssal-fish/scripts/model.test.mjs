import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AnimationMixer,Box3} from 'three';
test('exported GLB loads with geometry, animation, and independent fins',async()=>{
  const bytes=await readFile(new URL('../dist/goldeneye.glb',import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  assert.equal(gltf.animations.length,1);assert.equal(gltf.animations[0].name,'Swim');assert.equal(gltf.animations[0].tracks.length,4);
  for(const name of ['Body','Tail','Dorsal_fin','Pectoral_-1','Pectoral_1','Accessory_socket'])assert.ok(gltf.scene.getObjectByName(name),name);
  const tail=gltf.scene.getObjectByName('Tail');const before=tail.quaternion.clone();const mixer=new AnimationMixer(gltf.scene);mixer.clipAction(gltf.animations[0]).play();mixer.update(.25);assert.ok(before.angleTo(tail.quaternion)>.1);
  assert.ok(!new Box3().setFromObject(gltf.scene).isEmpty());
});
