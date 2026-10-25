import {onRequestPost as examAvailability} from './exam';
import {onRequestGet as mathAvailability} from './availability';
import {type MathEnvironment} from '../../../src/lib/math-release/server/transport';
import type {WorkerEnvironment} from '../../../src/lib/essay-runtime/server/worker-binding';
import {legendStudySupabaseUrl} from '../../../src/lib/auth-config';
type Env=MathEnvironment & WorkerEnvironment & {ESSAY_EXAM_RUNTIME_ENABLED?:string;ESSAY_PUBLIC_EXAMS?:string;ESSAY_REGISTRY_WORKER_JWT?:string};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
/** Read-only projection of existing admission handlers. No submission, quote, provider or ledger operation. */
export async function onRequestGet({request,env}:{request:Request;env:Env}){
 const headers={'Cache-Control':'private, no-store','Vary':'Authorization','X-Content-Type-Options':'nosniff'};
 const empty=(checked=false)=>Response.json({version:'essay-service-status-v1',checked,exams:[]},{headers});
 const token=request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
 if(!token||env.MATH_ORIGIN!==new URL(request.url).origin||env.MATH_SUPABASE_URL!==legendStudySupabaseUrl)return empty();
 const scope=(env.ESSAY_PUBLIC_EXAMS??'').split(',').map(v=>v.trim());
 const ids=scope.length<=42&&scope.every(uuid)?scope:[];
 try{
  const admitted:{examId:string;questionIds:string[]}[]=[];
  // Avoid overlapping Python Worker initialization within this catalog request.
  // Each exam still uses the existing authentication and admission policy.
  for(const examId of ids){
    const result=await examAvailability({env,request:new Request(new URL('/api/essay/exam',request.url),{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'availability',examId})})});
    const data=await result.json() as {ready?:boolean;questionIds?:unknown};
    if(!result.ok||typeof data.ready!=='boolean')throw Error('ADMISSION_UNVERIFIED');
    if(data.ready===true&&Array.isArray(data.questionIds)&&data.questionIds.length&&data.questionIds.every(uuid))admitted.push({examId,questionIds:data.questionIds});
  }
  const mathResponse=await mathAvailability({request,env});
  const math=await mathResponse.json() as {checked?:boolean;types?:{math?:boolean};mathQuestions?:{examId:string;questionId:string}[]};
  if(!mathResponse.ok||math.checked===false)throw Error('MATH_UNVERIFIED');
  if(math.types?.math===true&&Array.isArray(math.mathQuestions))for(const q of math.mathQuestions){
   if(uuid(q.examId)&&uuid(q.questionId)){const found=admitted.find(e=>e.examId===q.examId);if(found)found.questionIds=[...new Set([...found.questionIds,q.questionId])];else admitted.push({examId:q.examId,questionIds:[q.questionId]});}
  }
  if(!admitted.length)return empty(true);
  return Response.json({version:'essay-service-status-v1',checked:true,exams:admitted},{headers});
 }catch{return empty();}
}
