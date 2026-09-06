import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root=path.resolve('dist');
const files=[];async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else files.push(p);}}await walk(root);
const html=await fs.readFile(path.join(root,'index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g))await fs.access(path.resolve(root,match[1]));
let errors=0;
for(const file of files.filter(f=>f.endsWith('.js'))){const code=await fs.readFile(file,'utf8');const check=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(check.status!==0){console.error(check.stderr);errors++;}
 for(const match of code.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){try{await fs.access(path.resolve(path.dirname(file),match[1]));}catch{console.error('Missing import:',file,match[1]);errors++;}}
}
const manifest=JSON.parse(await fs.readFile('.openai/hosting.json','utf8'));if(manifest.static?.directory!=='dist')throw Error('Static output must be dist');
const stats=await Promise.all(files.map(f=>fs.stat(f)));console.log(`${files.length} runtime files; ${(stats.reduce((a,s)=>a+s.size,0)/1048576).toFixed(2)} MiB. Local entrypoints, module imports and syntax checked.`);
if(errors)process.exit(1);
