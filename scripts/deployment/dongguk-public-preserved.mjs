/** Publish Essay LAB routes; preserve unrelated assets, settings, and API contracts. */
import {isDeepStrictEqual} from 'node:util';import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';import crypto from 'node:crypto';
const [backup,mode='plan']=process.argv.slice(2);if(!backup||!['plan','production'].includes(mode))throw Error('PRIVATE_BACKUP [plan|preview|production] required');
const read=n=>JSON.parse(fs.readFileSync(path.join(backup,n),'utf8'));
const project=read('project.private.json'),previous=read('files.private.json').result;
if(previous.id!==project.canonical_deployment.id||project.name!=='legendstudy-lab')throw Error('Invalid baseline');
const require=createRequire(import.meta.url);const {hash}=require(process.env.WRANGLER_MODULE_ROOT+'/blake3-wasm');
const manifest={...previous.files},assets=new Map(),changed=[];
const scoped=u=>u.startsWith('/essay-lab/')||u==='/essay-lab.txt';
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
for(const f of walk('out')){const u='/'+path.relative('out',f).split(path.sep).join('/');if(!scoped(u)&&!u.startsWith('/_next/static/'))continue;const b=fs.readFileSync(f),ext=path.extname(f).slice(1),key=hash(b.toString('base64')+ext).toString('hex').slice(0,32);if(u.startsWith('/_next/')&&manifest[u]&&manifest[u]!==key)throw Error('Shared asset collision '+u);if(manifest[u]===key)continue;manifest[u]=key;changed.push(u);assets.set(key,{key,value:b.toString('base64'),metadata:{contentType:({html:'text/html; charset=utf-8',txt:'text/plain; charset=utf-8',js:'application/javascript',css:'text/css',woff2:'font/woff2'})[ext]??'application/octet-stream'},base64:true});}
for(const [u,h] of Object.entries(previous.files))if(!scoped(u)&&manifest[u]!==h)throw Error('Preservation failure '+u);
const apiChanges=execFileSync('git',['diff','--name-only',project.canonical_deployment.deployment_trigger.metadata.commit_hash,'--','functions','cloudflare','pnpm-lock.yaml'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);if(apiChanges.length)throw Error('Unexpected API change');
const routes=read('route-config.json'),deployedRoutes=JSON.parse(read('functions.private.json').result.config);if(!isDeepStrictEqual(routes,deployedRoutes))throw Error('Function routing drift');
const worker=fs.readFileSync(path.join(backup,'compiled/index.js'));const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const additions=JSON.parse(fs.readFileSync('scripts/deployment/dongguk-public-scope.json','utf8')).exams;
if(additions.length!==7||new Set(additions.flatMap(e=>Object.values(e.mathQuestions))).size!==20)throw Error('Exact seven exams / twenty leaves required');
function decode(v){if(!v.startsWith('uuid64:'))return v.split(',').filter(Boolean);const b=Buffer.from(v.slice(7),'base64');if(b.length%16)throw Error('Invalid scope');return Array.from({length:b.length/16},(_,i)=>{const h=b.subarray(i*16,(i+1)*16).toString('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;});}
const env=project.deployment_configs.production.env_vars,patch={},counts={};
for(const name of ['ESSAY_PUBLIC_EXAMS','ESSAY_BETA_EXPANSION_EXAMS','MATH_PUBLIC_LEAVES']){
 if(env[name]?.type!=='plain_text')throw Error('Scope must be plaintext');
 const before=decode(env[name].value),extra=name==='MATH_PUBLIC_LEAVES'?additions.flatMap(e=>Object.values(e.mathQuestions)):additions.map(e=>e.examId);
 if(extra.some(id=>before.includes(id)))throw Error('Already applied or scope drift');
 const after=[...before,...extra];if(after.length>512||new Set(after).size!==after.length)throw Error('Invalid expanded scope');
 patch[name]={type:'plain_text',value:name==='ESSAY_PUBLIC_EXAMS'?'uuid64:'+Buffer.concat(after.map(id=>Buffer.from(id.replaceAll('-',''),'hex'))).toString('base64'):after.join(',')};counts[name]=[before.length,after.length];
}
for(const id of additions.flatMap(e=>Object.values(e.mathQuestions)))if(!worker.includes(Buffer.from(id)))throw Error('Compiled Worker missing leaf');
const staticJs=walk('out/_next').filter(p=>p.endsWith('.js')).map(p=>fs.readFileSync(p,'utf8'));
for(const name of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'])if(!staticJs.some(s=>s.includes(env[name].value)))throw Error('Missing production public Auth build config');
const plan={sha,counts,preservedStaticAssets:Object.keys(previous.files).filter(u=>!scoped(u)).length,previous:previous.id,scope:'Dongguk seven exams / twenty leaves; existing static assets, APIs and private bindings preserved',changed,api_source:sha,worker_sha256:crypto.createHash('sha256').update(worker).digest('hex'),only_three_plaintext_scopes_changed:true};fs.writeFileSync(path.join(backup,'plan.json'),JSON.stringify(plan,null,2));fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify(manifest));console.log({...plan,changed:changed.length});if(mode==='plan')process.exit(0);
if(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim())throw Error('Commit source before production');
const token=process.env.CLOUDFLARE_API_TOKEN;if(!token)throw Error('Missing token');const base='https://api.cloudflare.com/client/v4',p='/accounts/b9d221b20fdf8b9a9a8df0971a6b2347/pages/projects/legendstudy-lab';
async function api(route,init={},bearer=token){const r=await fetch(base+route,{...init,headers:{...init.headers,Authorization:'Bearer '+bearer}});const j=await r.json();if(!r.ok||!j.success)throw Error(JSON.stringify({status:r.status,errors:j.errors}));return j.result;}
const current=await api(p);if(current.canonical_deployment.id!==previous.id||JSON.stringify(current.deployment_configs.production)!==JSON.stringify(project.deployment_configs.production))throw Error('Production drift');
const {jwt}=await api(p+'/upload-token');const list=[...assets.values()];for(let i=0;i<list.length;i+=30)await api('/pages/assets/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(list.slice(i,i+30))},jwt);
await api('/pages/assets/upsert-hashes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hashes:list.map(x=>x.key)})},jwt);
const missing=await api('/pages/assets/check-missing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hashes:[...new Set(Object.values(manifest))]})},jwt);if(missing.length)throw Error('Baseline assets unavailable');
const final=await api(p);if(final.canonical_deployment.id!==previous.id||!isDeepStrictEqual(final.deployment_configs,project.deployment_configs))throw Error('Production drift before config');
await api(p,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({deployment_configs:{production:{env_vars:patch}}})});
const configured=await api(p),expected=structuredClone(project.deployment_configs);Object.assign(expected.production.env_vars,patch);
if(!isDeepStrictEqual(configured.deployment_configs,expected)||configured.canonical_deployment.id!==previous.id)throw Error('Unexpected config change; stop and restore only scoped fields');
fs.writeFileSync(path.join(backup,'configured-project.private.json'),JSON.stringify(configured));
const bundle=new FormData();bundle.set('metadata',JSON.stringify({main_module:'index.js'}));bundle.set('index.js',new File([worker],'index.js',{type:'application/javascript+module'}));
const form=new FormData();form.set('manifest',JSON.stringify(manifest));form.set('branch',mode==='production'?'main':'task20-availability');form.set('commit_hash',sha);form.set('commit_message','Publish Dongguk seven exams / twenty questions; preserve existing public services');form.set('commit_dirty','false');for(const n of ['_headers','_redirects','_routes.json'])form.set(n,new File([fs.readFileSync('public/'+n)],n));form.set('_worker.bundle',new File([await new Response(bundle).blob()],'_worker.bundle'));form.set('functions-filepath-routing-config.json',new File([JSON.stringify(routes)],'functions-filepath-routing-config.json'));
const configuredAgain=await api(p);if(configuredAgain.canonical_deployment.id!==previous.id||!isDeepStrictEqual(configuredAgain.deployment_configs,expected))throw Error('Concurrent deployment drift');
const deployed=await api(p+'/deployments',{method:'POST',body:form});fs.writeFileSync(path.join(backup,mode+'-deployment.json'),JSON.stringify(deployed,null,2));console.log({deployment:deployed.id,url:deployed.url,sha});
