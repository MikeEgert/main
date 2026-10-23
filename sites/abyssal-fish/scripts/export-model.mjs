import {writeFile,mkdir} from 'node:fs/promises';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createFish} from '../dist/fish-model.js';
// GLTFExporter needs FileReader in Node; no textures or DOM are required.
globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(data=>{this.result=data;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(data=>{this.result=`data:${blob.type};base64,${Buffer.from(data).toString('base64')}`;this.onloadend?.();});}
};
const fish=createFish();fish.root.updateMatrixWorld(true);
const binary=await new GLTFExporter().parseAsync(fish.root,{binary:true,animations:fish.clips,onlyVisible:true});
await writeFile(new URL('../dist/goldeneye.glb',import.meta.url),Buffer.from(binary));
console.log(`Exported goldeneye.glb: ${binary.byteLength} bytes; ${fish.clips.length} animation clip.`);
