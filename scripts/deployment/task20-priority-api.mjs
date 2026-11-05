/** Approved six-question API release; retain every deployed static asset. */
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {isDeepStrictEqual as eq} from 'node:util';
const [backup,workerPath,routesPath,mode='plan']=process.argv.slice(2);if(!backup||!['plan','apply'].includes(mode))throw Error('Invalid arguments');
const read=n=>JSON.parse(fs.readFileSync(path.join(backup,n),'utf8')),save=(n,v)=>fs.writeFileSync(path.join(backup,n),JSON.stringify(v,null,2));
const old=read('project.json'),files=read('files').result,routes=JSON.parse(read('functions').result.config),built=JSON.parse(fs.readFileSync(routesPath));
if(old.name!=='legendstudy-lab'||files.id!==old.canonical_deployment.id||!eq(routes,built))throw Error('Baseline or routing mismatch');
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const changes=execFileSync('git',['diff','--name-only',old.canonical_deployment.deployment_trigger.metadata.commit_hash,'--','functions','cloudflare','src'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
const allowed=['src/data/essay-beta-expansion.json','src/lib/essay-runtime/beta-expansion.test.ts','src/lib/essay-runtime/task20-priority.test.ts'];if(changes.some(p=>!allowed.includes(p)))throw Error('Unexpected code changes');
const additions=read('../web-expansion-additions.json').exams,env=old.deployment_configs.production.env_vars;
function decode(v){if(!v.startsWith('uuid64:'))return v.split(',').filter(Boolean);const b=Buffer.from(v.slice(7),'base64');if(b.length%16)throw Error('Invalid scope');return Array.from({length:b.length/16},(_,i)=>{const h=b.subarray(i*16,(i+1)*16).toString('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;});}
const newLeaves=Object.values(additions.flatMap(e=>Object.values(e.mathQuestions))).filter(v=>!decode(env.MATH_PUBLIC_LEAVES.value).includes(v));if(new Set(newLeaves).size!==6)throw Error('Expected exactly six new leaves');
const names=['ESSAY_PUBLIC_EXAMS','ESSAY_BETA_EXPANSION_EXAMS','MATH_PUBLIC_LEAVES'];const patch={},counts={};
for(const name of names){const before=decode(env[name].value),after=[...new Set([...before,...(name==='MATH_PUBLIC_LEAVES'?newLeaves:additions.map(e=>e.examId))])];patch[name]={type:'plain_text',value:name==='ESSAY_PUBLIC_EXAMS'?'uuid64:'+Buffer.concat(after.map(id=>Buffer.from(id.replaceAll('-',''),'hex'))).toString('base64'):after.join(',')};counts[name]=[before.length,after.length];}
const worker=fs.readFileSync(workerPath);for(const id of newLeaves)if(!worker.includes(Buffer.from(id)))throw Error('Worker missing leaf');
save('release-plan.json',{source,previous:files.id,changedStaticAssets:0,staticAssets:Object.keys(files.files).length,counts,changes});console.log({source,counts,staticAssets:Object.keys(files.files).length});if(mode==='plan')process.exit(0);
const token=process.env.CLOUDFLARE_API_TOKEN;if(!token)throw Error('Auth required');const base='https://api.cloudflare.com/client/v4/accounts/b9d221b20fdf8b9a9a8df0971a6b2347/pages/projects/legendstudy-lab';
async function api(s='',init={}){const r=await fetch(base+s,{...init,headers:{...init.headers,Authorization:'Bearer '+token}});const j=await r.json();if(!r.ok||!j.success)throw Error(JSON.stringify({status:r.status,errors:j.errors}));return j.result;}
const current=await api();if(current.canonical_deployment.id!==files.id||!eq(current.deployment_configs,old.deployment_configs))throw Error('Production drift');
await api('',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({deployment_configs:{production:{env_vars:patch}}})});
const configured=await api(),expected=structuredClone(old.deployment_configs);Object.assign(expected.production.env_vars,patch);if(!eq(configured.deployment_configs,expected)||configured.canonical_deployment.id!==files.id)throw Error('Unexpected configuration drift');save('configured-project.json',configured);
const bundle=new FormData();bundle.set('metadata',JSON.stringify({main_module:'index.js'}));bundle.set('index.js',new File([worker],'index.js',{type:'application/javascript+module'}));
const form=new FormData();form.set('manifest',JSON.stringify(files.files));form.set('branch','main');form.set('commit_hash',source);form.set('commit_message','TASK20 approved Konkuk four / Kyunghee three; existing assets and ledgers preserved');form.set('commit_dirty','false');
for(const name of ['_headers','_redirects','_routes.json'])form.set(name,new File([fs.readFileSync('public/'+name)],name));form.set('_worker.bundle',new File([await new Response(bundle).blob()],'_worker.bundle'));form.set('functions-filepath-routing-config.json',new File([JSON.stringify(routes)],'functions-filepath-routing-config.json'));
const final=await api();if(final.canonical_deployment.id!==files.id||!eq(final.deployment_configs,expected))throw Error('Concurrent deployment drift');
const deployed=await api('/deployments',{method:'POST',body:form});save('deployment.json',deployed);if(deployed.environment!=='production')throw Error('Wrong environment');console.log({deployment:deployed.id,url:deployed.url,source});
