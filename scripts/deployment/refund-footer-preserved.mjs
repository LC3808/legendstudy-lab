/** TASK14-C: verified live footer HTML/RSC-only overlay. Dry-run by default. */
import fs from 'node:fs';
import {refineFooter} from './refund-footer-transform.mjs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const [backup,baseline]=process.argv.slice(2);
if(!backup||!baseline)throw Error('Usage: refund-footer-preserved.mjs PRIVATE_BACKUP BASELINE_SOURCE [--apply]');
const require=createRequire(import.meta.url);
const {fetch,FormData,Response}=require(require.resolve('undici',{paths:[process.env.WRANGLER_MODULE_ROOT??process.cwd()]}));
const {hash}=require(require.resolve('blake3-wasm',{paths:[process.env.WRANGLER_MODULE_ROOT??process.cwd()]}));
const read=p=>JSON.parse(fs.readFileSync(path.join(backup,p),'utf8'));
const snapshot=read('project.json'),previous=read('files.json');
if(snapshot.name!=='legendstudy-lab'||previous.id!==snapshot.canonical_deployment.id)throw Error('Baseline mismatch');
const manifest={...previous.files},assets=new Map(),changed=[];
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
function add(file,url){
 const bytes=fs.readFileSync(file),extension=path.extname(file).slice(1);
 const key=hash(bytes.toString('base64')+extension).toString('hex').slice(0,32);
 if(url.startsWith('/_next/')&&manifest[url]&&manifest[url]!==key)throw Error('Shared asset collision: '+url);
 if(manifest[url]===key)return;
 manifest[url]=key;changed.push(url);
 const contentType=({html:'text/html; charset=utf-8',txt:'text/plain; charset=utf-8',js:'application/javascript',css:'text/css',woff2:'font/woff2',png:'image/png',svg:'image/svg+xml',json:'application/json'})[extension]??'application/octet-stream';
 assets.set(key,{key,value:bytes.toString('base64'),metadata:{contentType},base64:true});
}
const inScope=u=>/\.(html|txt)$/.test(u);
for(const f of walk(path.join(backup,'patched'))){
 const u='/'+path.relative(path.join(backup,'patched'),f).split(path.sep).join('/');
 const before=fs.readFileSync(path.join(backup,'original',u),'utf8');
 const beforeHash=hash(Buffer.from(before).toString('base64')+path.extname(u).slice(1)).toString('hex').slice(0,32);
 if(beforeHash!==previous.files[u])throw Error('Downloaded baseline hash mismatch: '+u);
 const after=fs.readFileSync(f,'utf8');
 if(refineFooter(before)!==after)throw Error('Unexpected content change: '+u);
 add(f,u);
}

for(const [u,key] of Object.entries(previous.files))if(!inScope(u)&&manifest[u]!==key)throw Error('Out-of-scope baseline changed: '+u);
for(const f of walk(path.join(baseline,'functions'))){
 const copied=path.join(backup,'api-source',path.relative(baseline,f));
 if(!fs.readFileSync(f).equals(fs.readFileSync(copied)))throw Error('Existing API changed: '+f);
}
const compiled=read('route-config.json');
const added=compiled.routes.filter(r=>r.routePath==='/api/owner-review/essay');
if(added.length!==1||compiled.routes.length!==21)throw Error('Unexpected Functions routing');
const headers=fs.readFileSync(path.join(baseline,'public/_headers'),'utf8')+'\n/admin/*\n  Cache-Control: private, no-store\n  X-Robots-Tag: noindex, nofollow\n\n/owner-review/*\n  Cache-Control: private, no-store\n  X-Robots-Tag: noindex, nofollow\n  Referrer-Policy: no-referrer\n';
const redirects=fs.readFileSync(path.join(baseline,'public/_redirects'),'utf8');
const routes=JSON.parse(fs.readFileSync(path.join(baseline,'public/_routes.json'),'utf8'));routes.include.push('/api/owner-review/essay');
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const plan={previous:previous.id,source:sha,scope:'footer refund-link removal only; original HTML/RSC and APIs preserved',oldAssets:Object.keys(previous.files).length,assets:Object.keys(manifest).length,changedEssay:changed.filter(p=>p.startsWith('/essay-lab')).length,addedAssets:assets.size,preservedOtherPages:true,existingFunctionsPreserved:true,changed};
fs.writeFileSync(path.join(backup,'deployment-plan.json'),JSON.stringify(plan,null,2));
fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify(manifest));
if(!changed.length)throw Error('No footer changes');
console.log({...plan,changed:undefined});
if(!process.argv.includes('--apply'))process.exit(0);
const token=process.env.CLOUDFLARE_API_TOKEN;if(!token)throw Error('Cloudflare token required outside repository');
const base='https://api.cloudflare.com/client/v4',project='/accounts/b9d221b20fdf8b9a9a8df0971a6b2347/pages/projects/legendstudy-lab';
async function api(p,init={},bearer=token){const r=await fetch(base+p,{...init,headers:{...init.headers,Authorization:'Bearer '+bearer}});const j=await r.json();if(!r.ok||j.success!==true)throw Error('Cloudflare '+r.status+' '+JSON.stringify(j.errors));return j.result;}
const current=await api(project);
if(current.canonical_deployment.id!==previous.id||JSON.stringify(current.deployment_configs.production)!==JSON.stringify(snapshot.deployment_configs.production))throw Error('Production drift: stop');
const actual=await api(project+'/deployments/'+previous.id+'/files');
if(JSON.stringify(actual.files)!==JSON.stringify(previous.files))throw Error('Manifest drift: stop');
const {jwt}=await api(project+'/upload-token');
const list=[...assets.values()];
for(let i=0;i<list.length;i+=30)await api('/pages/assets/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(list.slice(i,i+30))},jwt);
await api('/pages/assets/upsert-hashes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hashes:list.map(a=>a.key)})},jwt);
const missing=await api('/pages/assets/check-missing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hashes:[...new Set(Object.values(manifest))]})},jwt);
if(missing.length)throw Error('Missing baseline assets; abort');
const worker=new FormData();worker.set('metadata',JSON.stringify({main_module:'index.js'}));worker.set('index.js',new File([fs.readFileSync(path.join(backup,'compiled/index.js'))],'index.js',{type:'application/javascript+module'}));
const bundle=await new Response(worker).blob();
const form=new FormData();form.set('manifest',JSON.stringify(manifest));form.set('branch','main');form.set('commit_hash',sha);form.set('commit_message','TASK14-C refund footer navigation; policy and APIs preserved');form.set('commit_dirty','false');
form.set('_headers',new File([headers],'_headers'));form.set('_redirects',new File([redirects],'_redirects'));form.set('_routes.json',new File([JSON.stringify(routes)],'_routes.json'));form.set('_worker.bundle',new File([bundle],'_worker.bundle'));form.set('functions-filepath-routing-config.json',new File([JSON.stringify(compiled)],'functions-filepath-routing-config.json'));
const deployed=await api(project+'/deployments',{method:'POST',body:form});fs.writeFileSync(path.join(backup,'new-deployment.json'),JSON.stringify(deployed,null,2));console.log({deployment:deployed.id,url:deployed.url,sha});
