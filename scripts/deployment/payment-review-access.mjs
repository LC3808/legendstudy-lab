/** TASK17: rebind REVIEW permission without replacing any page or API code.
 * Run with an existing private TASK17 snapshot and the preserved WEB baseline.
 * CLOUDFLARE_API_TOKEN stays in process memory. No credential is printed.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const [snapshot, baseline, evidence, subject] = process.argv.slice(2);
if (!snapshot || !baseline || !evidence || !/^[0-9a-f-]{36}$/.test(subject ?? '')) throw Error('Usage: payment-review-access.mjs SNAPSHOT BASELINE PRIVATE_EVIDENCE SUBJECT [--apply]');
const expected='2b5b0656-5b53-49e3-bad4-94fc4699bb15';
const target='/accounts/b9d221b20fdf8b9a9a8df0971a6b2347/pages/projects/legendstudy-lab';
const token=process.env.CLOUDFLARE_API_TOKEN;
if (!token) throw Error('Cloudflare token required');
fs.mkdirSync(evidence,{recursive:true,mode:0o700});
const save=(name,data)=>fs.writeFileSync(path.join(evidence,name),JSON.stringify(data,null,2),{mode:0o600});
async function api(suffix='',init={}) {
 const response=await fetch('https://api.cloudflare.com/client/v4'+target+suffix,{...init,headers:{...init.headers,Authorization:'Bearer '+token}});
 const body=await response.json();
 if (!response.ok || body.success!==true) throw Error('Cloudflare request failed: '+response.status);
 return body.result;
}
const before=await api();
if(before.canonical_deployment.id!==expected) throw Error('Production deployment drift; stop');
const config=before.deployment_configs.production;
const env=config.env_vars;
if(env.PAYMENT_MODE?.value!=='REVIEW'||env.PAYMENT_ENABLED?.value!=='true'||env.PAYMENT_ORIGIN?.value!=='https://lab.legendstudy.com'||env.PAYMENT_SUPABASE_URL?.value!=='https://stlhijzpjfgwwdgunlsd.supabase.co') throw Error('Unexpected REVIEW environment');
const files=await api('/deployments/'+expected+'/files');
const savedManifest=JSON.parse(fs.readFileSync(path.join(snapshot,'manifest.json'),'utf8'));
if(JSON.stringify(Object.entries(files.files).sort())!==JSON.stringify(Object.entries(savedManifest).sort())) throw Error('Asset manifest drift');
const prior=JSON.parse(fs.readFileSync(path.join(snapshot,'new-deployment.json'),'utf8'));
if(prior.id!==expected)throw Error('Wrong preserved worker snapshot');
const routeConfig=JSON.parse(fs.readFileSync(path.join(snapshot,'route-config.json'),'utf8'));
if(routeConfig.routes.length!==21)throw Error('Routing drift');
const headers=fs.readFileSync(path.join(baseline,'public/_headers'),'utf8')+'\n/admin/*\n  Cache-Control: private, no-store\n  X-Robots-Tag: noindex, nofollow\n\n/owner-review/*\n  Cache-Control: private, no-store\n  X-Robots-Tag: noindex, nofollow\n  Referrer-Policy: no-referrer\n';
const redirects=fs.readFileSync(path.join(baseline,'public/_redirects'),'utf8');
const routes=JSON.parse(fs.readFileSync(path.join(baseline,'public/_routes.json'),'utf8'));routes.include.push('/api/owner-review/essay');
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
save('before-project.json',before);save('before-files.json',files);
const plan={previous:expected,source:sha,subject,permission:'payment_review via PAYMENT_REVIEW_SUBJECTS',assets:Object.keys(files.files).length,changedAssets:0,changedWorker:false,changedEnvironmentNames:['PAYMENT_REVIEW_SUBJECTS']};
save('plan.json',plan);console.log(plan);
if(!process.argv.includes('--apply'))process.exit(0);
// PATCH only the named variable. Never round-trip redacted secret values.
await api('',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({deployment_configs:{production:{env_vars:{PAYMENT_REVIEW_SUBJECTS:{type:'secret_text',value:subject}}}}})});
const configured=await api();
const omitPermission=c=>{const copy=structuredClone(c);delete copy.env_vars.PAYMENT_REVIEW_SUBJECTS;return copy;};
if(JSON.stringify(omitPermission(configured.deployment_configs.production))!==JSON.stringify(omitPermission(config)))throw Error('Unexpected configuration change; stop before deployment');
if(configured.canonical_deployment.id!==expected)throw Error('Deployment changed during configuration');
save('configured-project.json',configured);
const worker=new FormData();worker.set('metadata',JSON.stringify({main_module:'index.js'}));
worker.set('index.js',new File([fs.readFileSync(path.join(snapshot,'compiled/index.js'))],'index.js',{type:'application/javascript+module'}));
const bundle=await new Response(worker).blob();
const form=new FormData();form.set('manifest',JSON.stringify(files.files));form.set('branch','main');form.set('commit_hash',sha);form.set('commit_message','TASK17 payment_review permission only; all existing assets and APIs preserved');form.set('commit_dirty','false');
form.set('_headers',new File([headers],'_headers'));form.set('_redirects',new File([redirects],'_redirects'));form.set('_routes.json',new File([JSON.stringify(routes)],'_routes.json'));
form.set('_worker.bundle',new File([bundle],'_worker.bundle'));form.set('functions-filepath-routing-config.json',new File([JSON.stringify(routeConfig)],'functions-filepath-routing-config.json'));
const serialized=new Response(form);
const deployed=await api('/deployments',{method:'POST',headers:{'Content-Type':serialized.headers.get('content-type')},body:new Uint8Array(await serialized.arrayBuffer())});
save('deployment.json',deployed);
if(deployed.environment!=='production')throw Error('Wrong deployment environment');
console.log({deployment:deployed.id,source:sha,changedAssets:0,changedWorker:false});
