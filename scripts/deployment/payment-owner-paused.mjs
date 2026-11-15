/** PAUSED-only deployment. Credentials/config values remain in memory; no settings PATCH. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {isDeepStrictEqual} from 'node:util';
const output='/tmp/payment-owner-paused-release';
const baseline='9105e9e8-3606-472d-976e-2b2ab493438e';
const require=createRequire(import.meta.url);
const {hash}=require('/Users/woojinchang/.npm/_npx/bee3f078cdcfba08/node_modules/blake3-wasm');
const auth=fs.readFileSync('/Users/woojinchang/Library/Preferences/.wrangler/config/default.toml','utf8');
const token=auth.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if(!token)throw Error('Existing Cloudflare authorization unavailable');
const base='https://api.cloudflare.com/client/v4';
const projectPath='/accounts/b9d221b20fdf8b9a9a8df0971a6b2347/pages/projects/legendstudy-lab';
async function api(route,init={},credential=token){
 const r=await fetch(base+route,{...init,headers:{...init.headers,Authorization:'Bearer '+credential}});
 const b=await r.json();if(!r.ok||!b.success)throw Error('Cloudflare request failed: HTTP '+r.status);return b.result;
}
const project=await api(projectPath);
const env=project.deployment_configs.production.env_vars;
if(project.canonical_deployment.id!==baseline||env.PAYMENT_MODE?.value!=='LIVE'||env.PAYMENT_ENABLED?.value!=='false')throw Error('PAUSED baseline drift');
if(process.argv.includes('--build')) {
 const publicEnv=Object.fromEntries(Object.entries(env).filter(([name,value])=>name.startsWith('NEXT_PUBLIC_')&&value.type==='plain_text'&&typeof value.value==='string').map(([name,value])=>[name,value.value]));
 const log=fs.openSync(output+'/production-public-build.log','w');
 try {execFileSync(process.execPath,['node_modules/next/dist/bin/next','build','--webpack'],{env:{...process.env,...publicEnv,NODE_ENV:'production'},stdio:['ignore',log,log]});}finally{fs.closeSync(log);}
}

const previous=await api(projectPath+'/deployments/'+baseline+'/files');
const routing=await api(projectPath+'/deployments/'+baseline+'/functions');
const routes=JSON.parse(fs.readFileSync(output+'/route-config.json'));
if(!isDeepStrictEqual(routes,JSON.parse(routing.config)))throw Error('Functions routes changed');
const baseSha=project.canonical_deployment.deployment_trigger.metadata.commit_hash;
const changed=execFileSync('git',['diff','--name-only',baseSha,'--','cloudflare','functions','public/_headers','public/_redirects','public/_routes.json','pnpm-lock.yaml'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
const approved=new Set(['cloudflare/payments.ts','cloudflare/payments.test.ts','cloudflare/payment-qa.ts','cloudflare/payment-diagnostics.ts','cloudflare/payment-diagnostics.test.ts']);
if(changed.some(x=>!approved.has(x)))throw Error('Unreviewed API source changes');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const scope=u=>['/pricing/','/payments/','/admin/payment/'].some(p=>u.startsWith(p))||['/pricing.txt','/payments.txt','/admin/payment.txt'].includes(u);
const manifest={...previous.files},assets=new Map(),changedPaths=[];
const scripts=[];
for(const f of walk('out')){
 const u='/'+path.relative('out',f).split(path.sep).join('/');if(!scope(u)&&!u.startsWith('/_next/static/'))continue;
 const b=fs.readFileSync(f),ext=path.extname(f).slice(1),key=hash(b.toString('base64')+ext).toString('hex').slice(0,32);
 if(ext==='js')scripts.push(b.toString());
 if(u.startsWith('/_next/')&&manifest[u]&&manifest[u]!==key)throw Error('Shared asset collision');
 if(manifest[u]===key)continue;
 manifest[u]=key;changedPaths.push(u);
 assets.set(key,{key,value:b.toString('base64'),metadata:{contentType:({html:'text/html; charset=utf-8',txt:'text/plain; charset=utf-8',js:'application/javascript',css:'text/css',woff2:'font/woff2'})[ext]??'application/octet-stream'},base64:true});
}
for(const n of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'])if(!env[n]?.value||!scripts.some(s=>s.includes(env[n].value)))throw Error('Production public client config missing');
for(const [u,h] of Object.entries(previous.files))if(!scope(u)&&manifest[u]!==h)throw Error('Existing nonpayment static path modified');
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const worker=fs.readFileSync(output+'/compiled/index.js');
const receipt={sha,baseline,baseSha,paused:true,settingsChanges:0,sqlApplied:false,staticPathsPreserved:Object.keys(previous.files).filter(u=>!scope(u)).length,changedPages:changedPaths.filter(u=>!u.startsWith('/_next/')),addedAssets:assets.size,workerSha256:crypto.createHash('sha256').update(worker).digest('hex')};
fs.writeFileSync(output+'/plan.json',JSON.stringify(receipt,null,2));
fs.writeFileSync(output+'/baseline-manifest.json',JSON.stringify(previous.files));
console.log(receipt);
if(!process.argv.includes('--apply'))process.exit(0);
if(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim())throw Error('Commit reviewed source first');
const current=await api(projectPath);
if(current.canonical_deployment.id!==baseline||!isDeepStrictEqual(current.deployment_configs,project.deployment_configs))throw Error('Deployment/configuration drift');
const {jwt}=await api(projectPath+'/upload-token');
const items=[...assets.values()];
for(let i=0;i<items.length;i+=30)await api('/pages/assets/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(items.slice(i,i+30))},jwt);
await api('/pages/assets/upsert-hashes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hashes:items.map(x=>x.key)})},jwt);
const missing=await api('/pages/assets/check-missing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hashes:[...new Set(Object.values(manifest))]})},jwt);
if(missing.length)throw Error('Missing baseline assets');
const final=await api(projectPath);
if(final.canonical_deployment.id!==baseline||!isDeepStrictEqual(final.deployment_configs,project.deployment_configs))throw Error('Final deployment drift');
const bundle=new FormData();bundle.set('metadata',JSON.stringify({main_module:'index.js'}));bundle.set('index.js',new File([worker],'index.js',{type:'application/javascript+module'}));
const form=new FormData();form.set('manifest',JSON.stringify(manifest));form.set('branch','main');form.set('commit_hash',sha);form.set('commit_message','Owner QA fence and read diagnostics; PAUSED unchanged; SQL not applied');form.set('commit_dirty','false');
for(const n of ['_headers','_redirects','_routes.json'])form.set(n,new File([fs.readFileSync('public/'+n)],n));
form.set('_worker.bundle',new File([await new Response(bundle).blob()],'_worker.bundle'));form.set('functions-filepath-routing-config.json',new File([JSON.stringify(routes)],'functions-filepath-routing-config.json'));
const deployed=await api(projectPath+'/deployments',{method:'POST',body:form});
const safe={...receipt,deployment:deployed.id,url:deployed.url};
fs.writeFileSync(output+'/receipt.json',JSON.stringify(safe,null,2));console.log({deployment:deployed.id,url:deployed.url});
