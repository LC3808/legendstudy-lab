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
  const diagnostic=body?.action==='check_recovery';
  const recovery=body?.action==='recover'||diagnostic;
  if(!body||typeof body!=='object'||Object.keys(body).sort().join(',')!==(diagnostic?'action,run_id':recovery?(body.allow_uncertain===true?'action,allow_uncertain,diagnosis_token,key,run_id':'action,diagnosis_token,key,run_id'):'key,run_id')||!uuid(body.run_id)||(!diagnostic&&!uuid(body.key))||(!diagnostic&&recovery)&&(typeof body.diagnosis_token!=='string'||!/^[a-f0-9]{64}$/.test(body.diagnosis_token)))return reply({code:'INVALID_REQUEST'},422);
  const transport=serverTransport(env);
  // Caller JWT at both boundaries. No subject override / Worker-token promotion.
  const check=await transport.request('/rest/v1/rpc/'+(recovery?'admin_lab_run_recovery':'admin_lab_run_capabilities'),token,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_run:body.run_id})});
  if(!check.ok){
   let failure:{code?:string;message?:string}={};
   try{failure=JSON.parse(new TextDecoder().decode(await boundedBody(check,4096)));}catch{/* Never expose backend messages. */}
   if(failure?.code==='PGRST202')return reply({code:'ADMIN_CONTRACT_PENDING'},503);
   if(failure?.code==='PT404'||failure?.message==='RUN_NOT_FOUND')return reply({code:'RUN_NOT_FOUND'},404);
   return reply({code:check.status===401?'LOGIN_REQUIRED':check.status===403?'ACCESS_DENIED':'DIAGNOSIS_UNAVAILABLE'},check.status===401?401:check.status===403?403:503);
  }
  const worker=reviewedWorkerBinding(env);if(!worker)return reply({code:'WORKER_UNAVAILABLE'},503);
  // DB/Worker revalidate the diagnosis under their existing locks. Do not reject
  // a same-key replay using a newer UI diagnosis or guess a completion result.
  const command=diagnostic?{run_id:body.run_id}:recovery?{run_id:body.run_id,key:body.key,diagnosis_token:body.diagnosis_token,...(body.allow_uncertain===true?{allow_uncertain:true}:{})}:body;
  const result=await worker.fetch(new Request('https://essay-worker.internal/'+(diagnostic?'admin-exam-recovery-check':recovery?'admin-exam-recover':'admin-exam-retry'),{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(90000)}));
  const value=JSON.parse(new TextDecoder().decode(await boundedBody(result,16384)));
  return reply(value,result.status);
 }catch{return reply({code:'REQUEST_UNCERTAIN'},503);}
}
