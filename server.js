const http=require('http'),fs=require('fs'),path=require('path');
const port=process.env.PORT||3000;
const roots=[__dirname,process.cwd(),'/app'];
const SITE_VERSION='foundation-main-latest';
function findIndex(){for(const root of roots){const f=path.join(root,'index.html');if(fs.existsSync(f)&&fs.statSync(f).isFile())return f;}return null;}
http.createServer((req,res)=>{
  let requestPath=req.url.split('?')[0];
  if(requestPath==='/'||requestPath==='') requestPath='/index.html';
  let f=null;
  for(const root of roots){const candidate=path.resolve(root,'.'+requestPath);if(candidate.startsWith(path.resolve(root))&&fs.existsSync(candidate)&&fs.statSync(candidate).isFile()){f=candidate;break;}}
  if(!f&&requestPath==='/index.html') f=findIndex();
  if(!f){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});return res.end('Not found');}
  const ext=path.extname(f).toLowerCase();
  const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json'};
  const headers={'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0','Pragma':'no-cache','Expires':'0','X-Foundation-Version':SITE_VERSION};
  res.writeHead(200,headers);fs.createReadStream(f).pipe(res);
}).listen(port,'0.0.0.0',()=>console.log('Foundation website listening on '+port+'; index='+findIndex()+'; version='+SITE_VERSION));
// Keep the connected Railway service synchronized with the latest main branch.\n