/** Shared university news API only; retain all deployed assets and settings. */
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {isDeepStrictEqual as eq} from 'node:util';
const [backup,workerPath,routesPath,mode='plan']=process.argv.slice(2);if(!backup||!['plan','apply'].includes(mode))throw Error('Invalid arguments');
const read=n=>JSON.parse(fs.readFileSync(path.join(backup,n),'utf8')),save=(n,v)=>fs.writeFileSync(path.join(backup,n),JSON.stringify(v,null,2));
const old=read('project.json'),files=read('files').result,routes=JSON.parse(read('functions').result.config),built=JSON.parse(fs.readFileSync(routesPath));
if(old.name!=='legendstudy-lab'||files.id!==old.canonical_deployment.id||!eq(routes,built))throw Error('Baseline or routing mismatch');
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const changes=execFileSync('git',['diff','--name-only',old.canonical_deployment.deployment_trigger.metadata.commit_hash,'--','functions','cloudflare','src'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
const allowed=['functions/api/essay/catalog.ts','src/lib/essay-runtime/university-news-catalog.ts','src/lib/essay-runtime/university-news-catalog.test.ts'];if(changes.some(p=>!allowed.includes(p)))throw Error('Unexpected code changes');
const worker=fs.readFileSync(workerPath);if(!worker.includes(Buffer.from('university-news-catalog-v1')))throw Error('Missing news contract');
save('release-plan.json',{source,previous:files.id,changedStaticAssets:0,staticAssets:Object.keys(files.files).length,changes});if(mode==='plan')process.exit(0);
const token=process.env.CLOUDFLARE_API_TOKEN;if(!token)throw Error('Auth required');const base='https://api.cloudflare.com/client/v4/accounts/b9d221b20fdf8b9a9a8df0971a6b2347/pages/projects/legendstudy-lab';
async function api(s='',init={}){const r=await fetch(base+s,{...init,headers:{...init.headers,Authorization:'Bearer '+token}});const j=await r.json();if(!r.ok||!j.success)throw Error(JSON.stringify({status:r.status,errors:j.errors}));return j.result;}
const current=await api();if(current.canonical_deployment.id!==files.id||!eq(current.deployment_configs,old.deployment_configs))throw Error('Production drift');
const expected=old.deployment_configs;
const bundle=new FormData();bundle.set('metadata',JSON.stringify({main_module:'index.js'}));bundle.set('index.js',new File([worker],'index.js',{type:'application/javascript+module'}));
const form=new FormData();form.set('manifest',JSON.stringify(files.files));form.set('branch','main');form.set('commit_hash',source);form.set('commit_message','University news catalog fields; preserve static assets and all settings');form.set('commit_dirty','false');
for(const name of ['_headers','_redirects','_routes.json'])form.set(name,new File([fs.readFileSync('public/'+name)],name));form.set('_worker.bundle',new File([await new Response(bundle).blob()],'_worker.bundle'));form.set('functions-filepath-routing-config.json',new File([JSON.stringify(routes)],'functions-filepath-routing-config.json'));
const final=await api();if(final.canonical_deployment.id!==files.id||!eq(final.deployment_configs,expected))throw Error('Concurrent deployment drift');
const deployed=await api('/deployments',{method:'POST',body:form});save('deployment.json',deployed);if(deployed.environment!=='production')throw Error('Wrong environment');console.log({deployment:deployed.id,url:deployed.url,source});
