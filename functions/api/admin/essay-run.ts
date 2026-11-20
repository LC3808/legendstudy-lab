import {serverTransport,type MathEnvironment} from '../../../src/lib/math-release/server/transport';
import {boundedBody} from '../../../src/lib/math-release/server/request';
import {reviewedWorkerBinding,type WorkerEnvironment} from '../../../src/lib/essay-runtime/server/worker-binding';
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function onRequestPost({request,env}:{request:Request;env:MathEnvironment&WorkerEnvironment}){
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization, Origin'}});
 if(request.headers.get('origin')&&request.headers.get('origin')!==env.MATH_ORIGIN)return reply({code:'ACCESS_DENIED'},403);
 const token=request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];if(!token)return reply({code:'LOGIN_REQUIRED'},401);
 try{
  const body=JSON.parse(new TextDecoder().decode(await boundedBody(request,1024)));
  if(!body||Object.keys(body).sort().join(',')!=='key,run_id'||!uuid(body.run_id)||!uuid(body.key))return reply({code:'INVALID_REQUEST'},422);
  const transport=serverTransport(env);
  // Caller JWT at both boundaries. No subject override / Worker-token promotion.
  const check=await transport.request('/rest/v1/rpc/admin_lab_run_capabilities',token,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_run:body.run_id})});
  if(!check.ok)return reply({code:check.status===404?'ADMIN_CONTRACT_PENDING':'ACCESS_DENIED'},check.status===404?503:403);
  const worker=reviewedWorkerBinding(env);if(!worker)return reply({code:'WORKER_UNAVAILABLE'},503);
  const result=await worker.fetch(new Request('https://essay-worker.internal/admin-exam-retry',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)}));
  const value=JSON.parse(new TextDecoder().decode(await boundedBody(result,16384)));
  return reply(value,result.status);
 }catch{return reply({code:'REQUEST_UNCERTAIN'},503);}
}
