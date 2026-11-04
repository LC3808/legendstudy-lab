/** Approved support overlay on a freshly verified production deployment.
 * Dry run by default. Existing API inputs must be identical to the live source.
 * No project configuration writes, source inquiries, or customer notifications.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const [backup]=process.argv.slice(2);
if(!backup)throw Error('Usage: support-preserved.mjs PRIVATE_SNAPSHOT [--apply]');
const require=createRequire(import.meta.url);
const {hash}=require(require.resolve('blake3-wasm',{paths:[process.env.WRANGLER_MODULE_ROOT??process.cwd()]}));
const read=p=>JSON.parse(fs.readFileSync(path.join(backup,p),'utf8'));
const snapshot=read('project.json'),previous=read('files.json');
if(snapshot.name!=='legendstudy-lab'||previous.id!==snapshot.canonical_deployment.id)throw Error('Baseline mismatch');
const baseSha=snapshot.canonical_deployment.deployment_trigger.metadata.commit_hash;
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const changedSource=execFileSync('git',['diff','--name-only',baseSha],{encoding:'utf8'}).trim().split('\n');
const meta=read('bundle-meta.json');
for(const input of Object.keys(meta.inputs)) {
 const relative=path.relative(process.cwd(),path.resolve(input));
 if(relative.startsWith('node_modules/')||relative.startsWith('.wrangler/'))continue;
 if(changedSource.includes(relative))throw Error('Existing API input changed: '+relative);
}
for(const f of ['public/_headers','public/_redirects','public/_routes.json']) {
 const original=execFileSync('git',['show',baseSha+':'+f]);
 if(!original.equals(fs.readFileSync(f)))throw Error('Routing/header changed: '+f);
}
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const manifest={...previous.files},assets=new Map(),changed=[];
const inScope=u=>u.startsWith('/admin/')||u==='/admin.txt'||u.startsWith('/support/')||u==='/support.txt'||u.startsWith('/_next/static/');
for(const file of walk('out')) {
 const u='/'+path.relative('out',file).split(path.sep).join('/');if(!inScope(u))continue;
 const bytes=fs.readFileSync(file),ext=path.extname(file).slice(1),key=hash(bytes.toString('base64')+ext).toString('hex').slice(0,32);
 if(u.startsWith('/_next/')&&manifest[u]&&manifest[u]!==key)throw Error('Shared asset collision: '+u);
 if(manifest[u]===key)continue;
 manifest[u]=key;changed.push(u);
 const contentType=({html:'text/html; charset=utf-8',txt:'text/plain; charset=utf-8',js:'application/javascript',css:'text/css',woff2:'font/woff2',json:'application/json'})[ext]??'application/octet-stream';
 assets.set(key,{key,value:bytes.toString('base64'),metadata:{contentType},base64:true});
}
for(const [u,key] of Object.entries(previous.files))if(!inScope(u)&&manifest[u]!==key)throw Error('Out-of-scope asset changed: '+u);
const pub=snapshot.deployment_configs.production.env_vars;
const scripts=walk('out/_next').filter(f=>f.endsWith('.js')).map(f=>fs.readFileSync(f,'utf8'));
for(const k of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'])if(!pub[k]?.value||!scripts.some(s=>s.includes(pub[k].value)))throw Error('Missing existing public client config: '+k);
const compiled=read('route-config.json');
const plan={previous:previous.id,baseSha,sha,scope:'admin/support pages and additive hashed assets',changedPages:changed.filter(u=>!u.startsWith('/_next/')).length,addedAssets:assets.size,existingPaths:Object.keys(previous.files).length,allOtherPathsPreserved:true,apiSourceInputsUnchanged:Object.keys(meta.inputs).length,projectConfigurationWrites:0,changed};
fs.writeFileSync(path.join(backup,'deployment-plan.json'),JSON.stringify(plan,null,2));
fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify(manifest));
console.log({...plan,changed:undefined});
if(!process.argv.includes('--apply'))process.exit(0);
const token=process.env.CLOUDFLARE_API_TOKEN;if(!token)throw Error('Existing Cloudflare auth required');
const base='https://api.cloudflare.com/client/v4',project='/accounts/b9d221b20fdf8b9a9a8df0971a6b2347/pages/projects/legendstudy-lab';
async function api(p,init={},bearer=token){const r=await fetch(base+p,{...init,headers:{...init.headers,Authorization:'Bearer '+bearer}});const j=await r.json();if(!r.ok||!j.success)throw Error('Cloudflare request failed: '+r.status);return j.result;}
const current=await api(project);
if(current.canonical_deployment.id!==previous.id||JSON.stringify(current.deployment_configs)!==JSON.stringify(snapshot.deployment_configs))throw Error('Production drift: stop');
const actual=await api(project+'/deployments/'+previous.id+'/files');
if(JSON.stringify(actual.files)!==JSON.stringify(previous.files))throw Error('Manifest drift: stop');
const {jwt}=await api(project+'/upload-token');
const list=[...assets.values()];
for(let i=0;i<list.length;i+=30)await api('/pages/assets/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(list.slice(i,i+30))},jwt);
await api('/pages/assets/upsert-hashes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hashes:list.map(a=>a.key)})},jwt);
const missing=await api('/pages/assets/check-missing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hashes:[...new Set(Object.values(manifest))]})},jwt);if(missing.length)throw Error('Missing baseline assets');
const worker=new FormData();worker.set('metadata',JSON.stringify({main_module:'index.js'}));worker.set('index.js',new File([fs.readFileSync(path.join(backup,'compiled/index.js'))],'index.js',{type:'application/javascript+module'}));
const form=new FormData();form.set('manifest',JSON.stringify(manifest));form.set('branch','main');form.set('commit_hash',sha);form.set('commit_message','APP/WEB unified support inbox; existing APIs and other pages preserved');form.set('commit_dirty','false');
for(const f of ['_headers','_redirects','_routes.json'])form.set(f,new File([fs.readFileSync('public/'+f)],f));
form.set('_worker.bundle',new File([await new Response(worker).blob()],'_worker.bundle'));form.set('functions-filepath-routing-config.json',new File([JSON.stringify(compiled)],'functions-filepath-routing-config.json'));
const finalGuard=await api(project);
if(finalGuard.canonical_deployment.id!==previous.id||JSON.stringify(finalGuard.deployment_configs)!==JSON.stringify(snapshot.deployment_configs))throw Error('Production changed during upload: stop');
const deployed=await api(project+'/deployments',{method:'POST',body:form});
fs.writeFileSync(path.join(backup,'new-deployment.json'),JSON.stringify(deployed,null,2));
if(deployed.environment!=='production')throw Error('Unexpected deployment environment');
console.log({deployment:deployed.id,url:deployed.url,sha});
