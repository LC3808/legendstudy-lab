import {registryWorkerCredential} from '../../../src/lib/essay-runtime/server/registry-credential';
import {reviewedWorkerBinding,type WorkerEnvironment} from '../../../src/lib/essay-runtime/server/worker-binding';
import {serverTransport,type MathEnvironment} from '../../../src/lib/math-release/server/transport';
import {boundedBody} from '../../../src/lib/math-release/server/request';
type Env=MathEnvironment&WorkerEnvironment&{ESSAY_EXAM_RUNTIME_ENABLED?:string;ESSAY_CONTINUOUS_CYCLES_ENABLED?:string;ESSAY_E2E_SCOPE?:string;ESSAY_PUBLIC_EXAMS?:string;ESSAY_REGISTRY_WORKER_JWT?:string};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
/** Shared Native/Web gateway. Disabled until DB/host/content/E2E authorization. */
export async function onRequestPost({request,env}:{request:Request;env:Env}){
 const headers={'Cache-Control':'private, no-store','Vary':'Authorization, Origin'};
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
 if(env.ESSAY_EXAM_RUNTIME_ENABLED!=='true')return reply({code:'EVALUATION_UNAVAILABLE'},503);
 const origin=request.headers.get('origin');if(origin&&origin!==env.MATH_ORIGIN)return reply({code:'ACCESS_DENIED'},403);
 const token=request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];if(!token)return reply({code:'LOGIN_REQUIRED'},401);
 let run:string|undefined;
 try{
  const input=JSON.parse(new TextDecoder().decode(await boundedBody(request,1048576))) as Record<string,unknown>;
  const publicExams=(env.ESSAY_PUBLIC_EXAMS??'').split(',').map(id=>id.trim());
  const publicRelease=publicExams.length<=128&&publicExams.every(uuid)&&uuid(input.examId)&&publicExams.includes(input.examId);
  const transport=serverTransport(env),subject=await transport.subject(token,publicRelease);
  // Optional server-only single-submission scope for explicitly approved operating E2E.
  const scope=env.ESSAY_E2E_SCOPE?JSON.parse(env.ESSAY_E2E_SCOPE) as {subject:string;exam:string;requestKey:string;parentId?:string;previousPaidRunId?:string}:null;
  if(scope&&(!uuid(scope.subject)||!uuid(scope.exam)||!uuid(scope.requestKey)||subject!==scope.subject||input.examId!==scope.exam||(scope.parentId!==undefined&&!uuid(scope.parentId))||(scope.previousPaidRunId!==undefined&&!uuid(scope.previousPaidRunId))||(scope.parentId!==undefined&&scope.previousPaidRunId!==undefined)||(['submit','quote'].includes(String(input.action))&&((input.parentId??null)!==(scope.parentId??null)||(input.previousPaidRunId??null)!==(scope.previousPaidRunId??null)))))return reply({code:'ACCESS_DENIED'},403);
  const worker=reviewedWorkerBinding(env),credential=registryWorkerCredential(env.ESSAY_REGISTRY_WORKER_JWT);
  if(!worker||!credential)return reply({code:'WORKER_UNAVAILABLE'},503);
  const dispatch=async(path:string,payload:unknown)=>worker.fetch(new Request('https://essay-worker.internal'+path,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(90000)}));
  if(input.action==='availability'&&uuid(input.examId)){
   const ready=await dispatch('/exam-admission',{exam_id:input.examId});
   if(ready.status>=500||ready.status===429)return reply({code:'ADMISSION_UNAVAILABLE'},503);
   if(ready.status===401)return reply({code:'LOGIN_REQUIRED'},401);
   const admission=ready.ok?await ready.json() as {ready?:boolean;question_ids?:unknown}:null;
   return reply({ready:admission?.ready===true,questionIds:admission?.ready===true&&Array.isArray(admission.question_ids)?admission.question_ids.filter(uuid):[]});
  }
  // Verify both deployed Worker and additive DB session contract before reserving.
  async function sessionReady(){
   const response=await dispatch('/exam-admission',{exam_id:input.examId});
   if(!response.ok)return false;
   const admission=await response.json() as {ready?:boolean;session_version?:string};
   return admission.ready===true&&admission.session_version==='exam-session-v1';
  }
  if(input.action==='retry'&&uuid(input.examId)&&uuid(input.runId)&&uuid(input.key)){
   if(scope||!await sessionReady())return reply({code:'EXAM_SESSION_CONTRACT_PENDING'},409);
   const retried=await transport.request('/rest/v1/rpc/essay_exam_retry',credential,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_subject:subject,p_run:input.runId,p_key:input.key,p_exam:input.examId})});
   if(!retried.ok)return reply({code:'RETRY_NOT_AVAILABLE'},409);
   run=input.runId;
   await dispatch('/exam-evaluate',{run_id:run});
   return reply({runId:run,code:'STATUS_CHECK_REQUIRED'},202);
  }
  if(input.action==='quote'&&Array.isArray(input.questionIds)&&input.questionIds.length>1&&!await sessionReady())return reply({code:'EXAM_SESSION_CONTRACT_PENDING'},409);
  if(input.previousPaidRunId!=null&&(env.ESSAY_CONTINUOUS_CYCLES_ENABLED!=='true'||!uuid(input.previousPaidRunId)||input.parentId!=null))return reply({code:'ADDITIONAL_CYCLE_UNAVAILABLE'},422);
  if(input.action==='quote'&&uuid(input.examId)&&Array.isArray(input.questionIds)&&input.questionIds.length>0&&input.questionIds.every(uuid)&&!(input.parentId!=null&&!uuid(input.parentId))){
   const quoted=await transport.request('/rest/v1/rpc/essay_exam_quote',credential,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_subject:subject,p_exam:input.examId,p_questions:input.questionIds,p_parent:input.parentId??null,p_previous:input.previousPaidRunId??null})});
   if(!quoted.ok)return reply({code:'QUOTE_UNAVAILABLE'},422);
   return reply(await quoted.json());
  }
  if(input.action!=='submit'||!uuid(input.examId)||!uuid(input.key)||!Array.isArray(input.answers)||input.answers.length<1||input.answers.length>100||!(input.parentId==null||uuid(input.parentId)))return reply({code:'INVALID_REQUEST'},422);
  if(input.answers.some(a=>!a||typeof a!=='object'||!uuid(a.questionId)||typeof a.body!=='string'||!a.body.trim()||a.body.length>30000||!Number.isSafeInteger(a.revision)||a.revision<0||Object.keys(a).some(k=>!['questionId','body','revision'].includes(k))))return reply({code:'INVALID_ANSWERS'},422);
  if(!await sessionReady())return reply({code:'EXAM_SESSION_CONTRACT_PENDING'},409);
  const reserved=await transport.request(input.previousPaidRunId?'/rest/v1/rpc/essay_exam_submit_cycle':'/rest/v1/rpc/essay_exam_submit',credential,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_subject:subject,p_exam:input.examId,p_key:scope?.requestKey??input.key,p_answers:input.answers,p_parent:input.parentId??null,...(input.previousPaidRunId?{p_previous:input.previousPaidRunId}:{})})});
  const value=JSON.parse(new TextDecoder().decode(await boundedBody(reserved,16384)));
  if(!reserved.ok){const reason=typeof value?.message==='string'?value.message:'';return reply({code:reason==='INSUFFICIENT_CREDIT'?'INSUFFICIENT_CREDIT':'SUBMISSION_REJECTED'},reason==='INSUFFICIENT_CREDIT'?402:422);}
  if(!uuid(value))throw Error('INVALID_RESERVATION');run=value;
  // Uncertain dispatch/finalization never refunds or creates another reservation.
  await dispatch('/exam-evaluate',{run_id:run});
  return reply({runId:run,code:'STATUS_CHECK_REQUIRED'},202);
 }catch{return reply({code:run?'STATUS_CHECK_REQUIRED':'REQUEST_UNAVAILABLE',...(run?{runId:run}:{})},run?202:503);}
}
