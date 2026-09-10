// Dependency-free static preview of the authored dist/ tree.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const args=process.argv.slice(2),option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const root=path.resolve('dist'),types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav'};
const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://preview'),requested=decodeURIComponent(url.pathname),file=path.resolve(root,'.'+(requested==='/'?'/index.html':requested));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const actual=await fs.realpath(file);if(!actual.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const data=await fs.readFile(actual);res.writeHead(200,{'Content-Type':types[path.extname(actual)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
}catch{res.writeHead(404).end('Not found');}});
server.listen(Number(option('--port','4173')),option('--host','0.0.0.0'));
