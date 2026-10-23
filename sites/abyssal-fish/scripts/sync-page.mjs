import {readFile,writeFile} from 'node:fs/promises';
const page=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
await writeFile(new URL('../../../ocean.html',import.meta.url),page.replace('<head>','<head><base href="./sites/abyssal-fish/dist/">').replaceAll('href="https://mikkmaide.com/"','href="/"'));
