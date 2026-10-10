import {boundedBody} from '../../math-release/server/request';
import {essayRequestId} from '../client';
/** Internal binding to the existing reviewed worker. Never a URL supplied by the browser. */
export interface ReviewedWorkerBinding {fetch(request:Request):Promise<Response>}
export interface EssayGatewayPorts {
 enabled:boolean;origin:string;authenticate(token:string):Promise<boolean>;
 ownedAttempt(token:string,id:string):Promise<{questionId:string;metadataVersion:string}|null>;
 releasedFailure(token:string,attempt:string,evaluation:string):Promise<boolean>;
 requestEvaluation(token:string,args:Record<string,unknown>):Promise<unknown>;
 worker:ReviewedWorkerBinding;
}
const id=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const reply=(status:number,code:string,evaluation_id?:string)=>Response.json({code,...(evaluation_id?{evaluation_id}:{})},{status,headers:{'Cache-Control':'no-store'}});
export async function readReviewedAdmission(worker:ReviewedWorkerBinding,owned:{questionId:string;metadataVersion:string}){
  const admitted=await worker.fetch(new Request('https://essay-worker.internal/admission',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(owned),signal:AbortSignal.timeout(15000)}));
  if(!admitted.ok)return null;
  const permit=JSON.parse(new TextDecoder().decode(await boundedBody(admitted,4096)));
  // Deployment adapter must check canonical provider binding, rights, reviewed cache, reviewer
  // and durable finalization before returning this readiness projection. No client model choice.
  if(permit.version!=='essay-worker-admission-v1'||permit.ready!==true||permit.questionId!==owned.questionId||permit.metadataVersion!==owned.metadataVersion||
    typeof permit.regime!=='string'||!/^essay-v1\.3\/policy\/[a-f0-9]{64}$/.test(permit.regime)||!Number.isSafeInteger(permit.expiresAt)||permit.expiresAt<=Date.now()||permit.expiresAt>Date.now()+120000)return null;
  return {regime:permit.regime as string};
}
export function essayEvaluationGateway(ports:EssayGatewayPorts){return async(request:Request)=>{
 if(!ports.enabled)return reply(503,'EVALUATION_UNAVAILABLE');
 if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(!ports.origin||request.headers.get('origin')!==ports.origin)return reply(403,'ACCESS_DENIED');
 const token=request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];if(!token)return reply(401,'LOGIN_REQUIRED');
 let evaluation:string|undefined;
 try{
  if(!await ports.authenticate(token))return reply(403,'ACCESS_DENIED');
  const body=JSON.parse(new TextDecoder().decode(await boundedBody(request,300)));
  if(!body||Array.isArray(body)||Object.keys(body).some(k=>!['attempt_id','retry_evaluation_id'].includes(k))||!id(body.attempt_id)||(body.retry_evaluation_id!==undefined&&!id(body.retry_evaluation_id)))return reply(400,'INVALID_REQUEST');
  const owned=await ports.ownedAttempt(token,body.attempt_id);if(!owned)return reply(403,'ACCESS_DENIED');
  if(body.retry_evaluation_id&&!await ports.releasedFailure(token,body.attempt_id,body.retry_evaluation_id))return reply(409,'RETRY_NOT_CONFIRMED');
  const permit=await readReviewedAdmission(ports.worker,owned);if(!permit)return reply(503,'EVALUATION_UNAVAILABLE');
  const key=await essayRequestId(`${body.attempt_id}/${permit.regime}${body.retry_evaluation_id?`/retry/${body.retry_evaluation_id}`:""}`);
  const created=await ports.requestEvaluation(token,{p_attempt:body.attempt_id,p_key:key,p_regime:permit.regime});
  if(!id(created))throw Error('INVALID_RESPONSE');evaluation=created;
  // The worker repeats canonical owner/status/snapshot/reviewer gates. Unknown dispatch is
  // resumable; do not reserve a new job, declare failure, or release Credit in this gateway.
  const processed=await ports.worker.fetch(new Request('https://essay-worker.internal/evaluate',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({evaluation_id:evaluation}),signal:AbortSignal.timeout(45000)}));
  if(!processed.ok)return reply(202,'STATUS_CHECK_REQUIRED',evaluation);
  return reply(202,'STATUS_CHECK_REQUIRED',evaluation); // Completion is read from canonical DB, never worker prose.
 }catch{return reply(evaluation?202:409,evaluation?'STATUS_CHECK_REQUIRED':'RETRY_STATUS_CHECK',evaluation);}
};}
