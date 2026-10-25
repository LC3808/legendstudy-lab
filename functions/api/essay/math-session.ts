/** Internal child evaluator. Only the existing Essay queue can call this route.
 * Context comes from the existing parent lease, never from HTTP student content.
 * This endpoint has no financial submit/reserve/settle operation.
 */
import {serverTransport,type MathEnvironment} from '../../../src/lib/math-release/server/transport';
import {boundedBody} from '../../../src/lib/math-release/server/request';
import {registryWorkerCredential} from '../../../src/lib/essay-runtime/server/registry-credential';
import {evaluateExamMath} from '../../../src/lib/math-release/server/exam-bridge';
import {openAiCandidate} from '../../../src/lib/math-release/server/provider';
type Env=MathEnvironment&{ESSAY_WORKER_SERVICE_TOKEN?:string;ESSAY_REGISTRY_WORKER_JWT?:string;ESSAY_MIXED_SESSION_ENABLED?:string};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
async function evaluationId(run:string,question:string){
 const namespace='bfbc9384f407440daa9e45e2f485a849';
 const name=new TextEncoder().encode(`evaluation/${run}/${question}`),bytes=new Uint8Array(16+name.length);
 for(let i=0;i<16;i++)bytes[i]=parseInt(namespace.slice(i*2,i*2+2),16);bytes.set(name,16);
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-1',bytes)).slice(0,16);hash[6]=(hash[6]&15)|80;hash[8]=(hash[8]&63)|128;
 const h=Array.from(hash,b=>b.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
async function sameSecret(a:string,b:string){
 const enc=new TextEncoder();const [x,y]=await Promise.all([a,b].map(s=>crypto.subtle.digest('SHA-256',enc.encode(s))));
 let diff=0;const p=new Uint8Array(x),q=new Uint8Array(y);for(let i=0;i<p.length;i++)diff|=p[i]^q[i];return diff===0;
}
export async function onRequestPost({request,env}:{request:Request;env:Env}){
 const headers={'Cache-Control':'no-store'};
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
 try{
  const secret=env.ESSAY_WORKER_SERVICE_TOKEN,provided=request.headers.get('X-Essay-Service-Token');
  if(!secret||secret.length<32||!provided||provided.length>4096||!await sameSecret(secret,provided))return reply({code:'ACCESS_DENIED'},403);
  const credential=registryWorkerCredential(env.ESSAY_REGISTRY_WORKER_JWT);
  if(env.ESSAY_MIXED_SESSION_ENABLED!=='true'||env.MATH_ENABLED!=='true'||env.MATH_PROVIDER_CALLS_ENABLED!=='true'||
   env.MATH_PROVIDER!=='OPENAI'||!env.MATH_PRIMARY_MODEL||!env.MATH_PROVIDER_API_KEY||!credential)throw Error('CONFIGURATION_REQUIRED');
  const input=JSON.parse(new TextDecoder().decode(await boundedBody(request,4096)));
  if(input.action==='availability'&&Object.keys(input).length===1)return reply({ready:true,contract:'essay-math-child-v1',model:env.MATH_PRIMARY_MODEL,provider_called:false});
  if(input.action!=='evaluate'||Object.keys(input).sort().join(',')!=='action,evaluationId,questionId,runId,subjectId,token'||
   ![input.evaluationId,input.questionId,input.runId,input.subjectId,input.token].every(uuid))return reply({code:'INVALID_REQUEST'},422);
  const transport=serverTransport(env);
  const response=await transport.request('/rest/v1/rpc/essay_exam_math_context',credential,{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({p_subject:input.subjectId,p_run:input.runId,p_token:input.token,p_question:input.questionId})});
  if(!response.ok)return reply({code:'CONTEXT_UNAVAILABLE'},409);
  const data=JSON.parse(new TextDecoder().decode(await boundedBody(response,20000000)));
  if(data.run_id!==input.runId||data.question_id!==input.questionId||data.entry?.evaluation_engine!=='math'||
   data.entry.math_context?.provider_binding?.model!==env.MATH_PRIMARY_MODEL)throw Error('CONTEXT_MISMATCH');
  if(input.evaluationId!==await evaluationId(input.runId,input.questionId))throw Error('EVALUATION_ID_MISMATCH');
  const context=structuredClone(data.entry.math_context);
  context.attempt={attempt_id:input.evaluationId,typed_answer:data.answer.body,kind:data.parent_id?'FULL_RESOLVE':'INITIAL',
   prior_evaluation_id:data.parent_id?await evaluationId(data.parent_id,input.questionId):null};
  context.confirmed_input=data.answer.input??null;
  context.previous_evaluation=data.previous?.evaluation??null;
  context.extraction=[];
  let usage:Record<string,number>|undefined;
  const started=Date.now();
  const evaluation=await evaluateExamMath({evaluation_id:input.evaluationId,selected_extraction_id:null,context},openAiCandidate({
   enabled:true,model:env.MATH_PRIMARY_MODEL,key:env.MATH_PROVIDER_API_KEY,onUsage:value=>{usage=value;}}));
  if(!usage)throw Error('USAGE_REQUIRED');
  return reply({evaluation,usage:{...usage,latency_ms:Date.now()-started,cost_amount:null,currency:'USD'}});
 }catch{return reply({code:'MATH_CHILD_UNAVAILABLE'},503);}
}
