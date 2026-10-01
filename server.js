const http=require('http'),fs=require('fs'),path=require('path');
const port=process.env.PORT||3000;
const roots=[__dirname,process.cwd(),'/app'];
function findIndex(){for(const root of roots){const f=path.join(root,'index.html');if(fs.existsSync(f)&&fs.statSync(f).isFile())return f;}return null;}
http.createServer((req,res)=>{
  let requestPath=req.url.split('?')[0];
  if(requestPath==='/'||requestPath==='') requestPath='/index.html';
  // Friendly routes for the private administration page.
  if(requestPath==='/admin'||requestPath==='/admin/'||requestPath==='/dashboard'||requestPath==='/dashboard/') requestPath='/admin.html';
  let f=null;
  for(const root of roots){const candidate=path.resolve(root,'.'+requestPath);if(candidate.startsWith(path.resolve(root))&&fs.existsSync(candidate)&&fs.statSync(candidate).isFile()){f=candidate;break;}}
  if(!f&&requestPath==='/index.html') f=findIndex();
  if(!f){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Not found');}
  const ext=path.extname(f).toLowerCase();
  const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json'};
  res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(f).pipe(res);
}).listen(port,'0.0.0.0',()=>console.log('Foundation website listening on '+port+'; index='+findIndex()));
// Railway deployment trigger: serve the verified foundation homepage from the repository root.

// Keep the connected Railway service synchronized with the latest main branch.
