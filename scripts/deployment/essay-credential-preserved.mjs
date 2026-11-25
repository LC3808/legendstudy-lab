/** Publish Essay LAB routes; preserve unrelated assets, settings, and API contracts. */
import {isDeepStrictEqual} from 'node:util';import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';import crypto from 'node:crypto';
const [backup,mode='plan']=process.argv.slice(2);if(!backup||!['plan','production'].includes(mode))throw Error('PRIVATE_BACKUP [plan|production] required');
const read=n=>JSON.parse(fs.readFileSync(path.join(backup,n),'utf8'));
const project=read('project.private.json'),previous=read('files.private.json').result;
if(previous.id!==project.canonical_deployment.id||project.name!=='legendstudy-lab')throw Error('Invalid baseline');
const require=createRequire(import.meta.url);const {hash}=require(process.env.WRANGLER_MODULE_ROOT+'/blake3-wasm');
const manifest={...previous.files},assets=new Map(),changed=[];
const scoped=()=>false;
const apiChanges=execFileSync('git',['diff','--name-only',project.canonical_deployment.deployment_trigger.metadata.commit_hash,'--','functions','cloudflare','pnpm-lock.yaml'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);if(apiChanges.some(p=>!['functions/api/essay/exam.ts','functions/api/essay/public-service-status.ts'].includes(p)))throw Error('Unexpected API change');
const routes=read('route-config.json'),deployedRoutes=JSON.parse(read('functions.private.json').result.config);if(!isDeepStrictEqual(routes,deployedRoutes))throw Error('Function routing drift');
const worker=fs.readFileSync(path.join(backup,'compiled/index.js'));const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const env=project.deployment_configs.production.env_vars;const counts={};
const plan={sha,counts,preservedStaticAssets:Object.keys(previous.files).filter(u=>!scoped(u)).length,previous:previous.id,scope:'Credential failure diagnostics only; all static assets and settings preserved',changed,api_source:sha,worker_sha256:crypto.createHash('sha256').update(worker).digest('hex'),settings_unchanged:true};fs.writeFileSync(path.join(backup,'plan.json'),JSON.stringify(plan,null,2));fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify(manifest));console.log({...plan,changed:changed.length});if(mode==='plan')process.exit(0);
if(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim())throw Error('Commit source before production');
const token=process.env.CLOUDFLARE_API_TOKEN;if(!token)throw Error('Missing token');const base='https://api.cloudflare.com/client/v4',p='/accounts/b9d221b20fdf8b9a9a8df0971a6b2347/pages/projects/legendstudy-lab';
async function api(route,init={},bearer=token){const r=await fetch(base+route,{...init,headers:{...init.headers,Authorization:'Bearer '+bearer}});const j=await r.json();if(!r.ok||!j.success)throw Error(JSON.stringify({status:r.status,errors:j.errors}));return j.result;}
const current=await api(p);if(current.canonical_deployment.id!==previous.id||JSON.stringify(current.deployment_configs.production)!==JSON.stringify(project.deployment_configs.production))throw Error('Production drift');
const {jwt}=await api(p+'/upload-token');const list=[...assets.values()];for(let i=0;i<list.length;i+=30)await api('/pages/assets/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(list.slice(i,i+30))},jwt);
await api('/pages/assets/upsert-hashes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hashes:list.map(x=>x.key)})},jwt);
const missing=await api('/pages/assets/check-missing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hashes:[...new Set(Object.values(manifest))]})},jwt);if(missing.length)throw Error('Baseline assets unavailable');
const final=await api(p);if(final.canonical_deployment.id!==previous.id||!isDeepStrictEqual(final.deployment_configs,project.deployment_configs))throw Error('Production drift before config');
const expected=project.deployment_configs;
const bundle=new FormData();bundle.set('metadata',JSON.stringify({main_module:'index.js'}));bundle.set('index.js',new File([worker],'index.js',{type:'application/javascript+module'}));
const form=new FormData();form.set('manifest',JSON.stringify(manifest));form.set('branch',mode==='production'?'main':'task20-availability');form.set('commit_hash',sha);form.set('commit_message','Essay credential failure diagnostics');form.set('commit_dirty','false');for(const n of ['_headers','_redirects','_routes.json'])form.set(n,new File([fs.readFileSync('public/'+n)],n));form.set('_worker.bundle',new File([await new Response(bundle).blob()],'_worker.bundle'));form.set('functions-filepath-routing-config.json',new File([JSON.stringify(routes)],'functions-filepath-routing-config.json'));
const configuredAgain=await api(p);if(configuredAgain.canonical_deployment.id!==previous.id||!isDeepStrictEqual(configuredAgain.deployment_configs,expected))throw Error('Concurrent deployment drift');
const deployed=await api(p+'/deployments',{method:'POST',body:form});fs.writeFileSync(path.join(backup,mode+'-deployment.json'),JSON.stringify(deployed,null,2));console.log({deployment:deployed.id,url:deployed.url,sha});
