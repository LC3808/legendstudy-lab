import {serverTransport,type MathEnvironment} from '../../../src/lib/math-release/server/transport';
import {reviewedWorkerBinding,type WorkerEnvironment} from '../../../src/lib/essay-runtime/server/worker-binding';
import {registryWorkerCredential} from '../../../src/lib/essay-runtime/server/registry-credential';
/** Allowlisted, HOLD-only connection probe. No submit/reservation/provider path. */
export async function onRequestPost({request,env}:{request:Request;env:MathEnvironment&WorkerEnvironment&{ESSAY_EXAM_RUNTIME_ENABLED?:string;ESSAY_REGISTRY_WORKER_JWT?:string}}){
 const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization, Origin'}});
 if(env.ESSAY_EXAM_RUNTIME_ENABLED==='true')return reply({code:'PROBE_DISABLED'},409);
 if(request.headers.get('origin')&&request.headers.get('origin')!==env.MATH_ORIGIN)return reply({code:'ACCESS_DENIED'},403);
 const token=request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
 if(!token)return reply({code:'LOGIN_REQUIRED'},401);
 const t=serverTransport(env);
 let subject:string;
 try{subject=await t.subject(token);}catch{return reply({code:'USER_AUTH_DENIED'},403);}
 const credential=registryWorkerCredential(env.ESSAY_REGISTRY_WORKER_JWT);
 if(!credential)return reply({code:'PAGES_WORKER_JWT_INVALID'},503);
 let count:number;
 try{const rows=await t.rpcRaw('essay_registered_questions',{p_subject:subject},credential);count=Array.isArray(rows)?rows.length:0;}catch{return reply({code:'PAGES_REGISTRY_DENIED'},503);}
 const worker=reviewedWorkerBinding(env);
 if(!worker)return reply({code:'SERVICE_BINDING_OR_TOKEN_MISSING',pages_registry:count},503);
 try{
  const response=await worker.fetch(new Request('https://essay-worker.internal/connection-check',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({probe_id:crypto.randomUUID()}),signal:AbortSignal.timeout(90000)}));
  return reply({pages_registry:count,worker_http:response.status,worker:await response.json()},response.ok?200:503);
 }catch{return reply({code:'WORKER_CONNECTION_FAILED',pages_registry:count},503);}
}
