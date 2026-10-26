import {onRequestGet as publicStatus} from './public-service-status';
import {type MathEnvironment} from '../../../src/lib/math-release/server/transport';
type Env=MathEnvironment & {ESSAY_EXAM_RUNTIME_ENABLED?:string;ESSAY_PUBLIC_EXAMS?:string;ESSAY_REGISTRY_WORKER_JWT?:string};
/** Native compatibility projection of the same server-approved discovery as WEB.
 * Does not initialize an evaluation Worker for every registered exam. Actual
 * quote/submit still use the independent server admission and settlement gates. */
export async function onRequestGet(context:{request:Request;env:Env}){
 const result=await publicStatus(context);
 const data=await result.json() as {checked?:boolean;exams?:{examId:string;questionIds:string[]}[]};
 return Response.json({version:'essay-service-status-v1',checked:result.ok&&data.checked===true,
  exams:result.ok&&data.checked===true?(data.exams??[]).map(({examId,questionIds})=>({examId,questionIds})):[]},
 {status:result.status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization','X-Content-Type-Options':'nosniff'}});
}
