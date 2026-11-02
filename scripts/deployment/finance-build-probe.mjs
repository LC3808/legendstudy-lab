/** Secret-state probe with no secret writes. Never prints values; build exits73.
 * Temporarily changes ONLY the build command; restores it in finally.
 */
import fs from 'node:fs';
const evidence=process.argv[2];
if(!evidence||!process.env.CLOUDFLARE_API_TOKEN)throw Error('Private evidence path and Cloudflare token required');
fs.mkdirSync(evidence,{recursive:true,mode:0o700});
const base='https://api.cloudflare.com/client/v4/accounts/b9d221b20fdf8b9a9a8df0971a6b2347/pages/projects/legendstudy-lab';
async function api(suffix='',init={}){
 const r=await fetch(base+suffix,{...init,headers:{...init.headers,Authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN}});
 const b=await r.json();if(!r.ok||b.success!==true)throw Error('Cloudflare HTTP '+r.status);return b.result;
}
const before=await api();
if(before.canonical_deployment.id!=='88a28465-0c5f-46ad-b76c-9323b3dfd606')throw Error('Canonical deployment drift');
const original=before.build_config.build_command;
const code='const names=["PAYMENT_FINANCE_TOKEN","PAYMENT_REVIEW_SUBJECTS"];console.log("TASK17_FINANCE_BUILD_PROBE "+JSON.stringify(names.map(name=>({name,present:Object.hasOwn(process.env,name),isString:typeof process.env[name]==="string",empty:process.env[name]===""}))));process.exit(73)';
const command="node -e '"+code+"'; exit 73";
const patch=build_command=>api('',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({build_config:{build_command}})});
let deployment;
try{
 await patch(command);
 const configured=await api();
 if(configured.build_config.build_command!==command||configured.canonical_deployment.id!==before.canonical_deployment.id)throw Error('Build configuration drift');
 if(JSON.stringify(configured.deployment_configs)!==JSON.stringify(before.deployment_configs))throw Error('Environment unexpectedly changed');
 const form=new FormData();form.set('branch','main');const serialized=new Response(form);
 deployment=await api('/deployments',{method:'POST',headers:{'Content-Type':serialized.headers.get('content-type')},body:new Uint8Array(await serialized.arrayBuffer())});
 if(deployment.environment!=='production'||deployment.build_config.build_command!==command)throw Error('Probe deployment snapshot mismatch');
}finally{
 await patch(original);
 const after=await api();
 if(after.build_config.build_command!==original)throw Error('Build command restoration failed');
 if(JSON.stringify(after.deployment_configs)!==JSON.stringify(before.deployment_configs))throw Error('Unexpected environment drift');
 fs.writeFileSync(evidence+'/probe.json',JSON.stringify({deployment:deployment?.id,canonical:after.canonical_deployment.id,buildCommandRestored:true,environmentConfigurationUnchanged:true,expectedExit:73}),{mode:0o600});
}
console.log({deployment:deployment.id,buildCommandRestored:true,expectedExit:73});
