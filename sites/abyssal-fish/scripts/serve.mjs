import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../../..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.glb':'model/gltf-binary','.svg':'image/svg+xml','.png':'image/png'};
http.createServer(async(req,res)=>{try{let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let f=path.resolve(root,'.'+p);if(!f.startsWith(root+path.sep)&&f!==root)throw Error();if(p.split('/').some(s=>s.startsWith('.')||s==='node_modules')||/\/(server\.js|package.*\.json)$/.test(p))throw Error();if((await stat(f)).isDirectory())f=path.join(f,'index.html');res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'");res.end(await readFile(f));}catch{res.writeHead(404);res.end('Not found');}}).listen(8090,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:8090'));
