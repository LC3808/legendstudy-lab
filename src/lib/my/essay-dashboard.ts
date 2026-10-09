import type {SupabaseClient} from '@supabase/supabase-js';
import {assertOwner, readEssays} from './data';
export type Attempt={id:string;session_id:string;attempt_no:number;submitted_at:string};
export type RecordItem={id:string;source:'essay'|'math';question:string;university:string|null;at:string;rewrite:boolean;evaluations:{id:string;status:string;at:string;completedAt:string|null;valid:boolean}[];sessionId?:string};
function checked<T>(value:{data:T;error:unknown}){if(value.error)throw Error('READ_FAILED');return value.data;}
export async function readEssayDashboard(client:SupabaseClient,owner:string):Promise<RecordItem[]>{
 const sessions=await readEssays(client,owner);
 if(!sessions.length)return [];
 const attempts=checked(await client.from('essay_attempts').select('id,session_id,attempt_no,submitted_at').in('session_id',sessions.map(s=>s.id)).order('submitted_at',{ascending:false}).limit(501)) as Attempt[];
 if(attempts.length>500)throw Error('HISTORY_LIMIT');
 await assertOwner(client,owner);
 return attempts.map(a=>{
  const s=sessions.find(s=>s.id===a.session_id)!;
  return {id:a.id,sessionId:s.id,source:'essay',question:s.essay_questions?.label??'논술 문제',university:s.essay_questions?.essay_exams?.universities?.name??null,at:a.submitted_at,rewrite:a.attempt_no>1,
   evaluations:s.evaluations.filter(e=>e.attempt_id===a.id).map(e=>({id:e.id,status:e.status,at:e.requested_at,completedAt:e.completed_at,valid:!e.invalidated_at}))};
 });
}
export async function mathRead(client:SupabaseClient,owner:string,action:string,payload:Record<string,unknown>){
 await assertOwner(client,owner);
 const data=checked(await client.rpc('math_input',{p_request:{dto_version:'math-input-v1',action,payload}}));
 await assertOwner(client,owner);
 if(data?.dto_version!=='math-input-v1'||data?.action!==action||!data.result)throw Error('INVALID_RESPONSE');
 return data.result;
}
export async function readMathDashboard(client:SupabaseClient,owner:string):Promise<RecordItem[]>{
 const data=await mathRead(client,owner,'history',{limit:50});
 if(!Array.isArray(data.attempts))throw Error('INVALID_RESPONSE');
 return data.attempts.map((a:{attempt_id:string;created_at:string;predecessor_id:string|null;evaluations:{evaluation_id:string;state:string;requested_at:string}[]})=>({id:a.attempt_id,source:'math',question:'수리논술',university:null,at:a.created_at,rewrite:!!a.predecessor_id,evaluations:a.evaluations.map(e=>({id:e.evaluation_id,status:e.state,at:e.requested_at,completedAt:null,valid:true}))}));
}
export function summarizeRecords(rows:RecordItem[]){
 const done=(r:RecordItem)=>r.evaluations.filter(e=>e.valid&&e.status.toLowerCase()==='completed');
 const dates=rows.flatMap(r=>done(r).flatMap(e=>e.completedAt?[e.completedAt]:[])).sort();
 return {evaluated:rows.filter(r=>done(r).length).length,rewritten:rows.filter(r=>r.rewrite).length,reevaluated:rows.filter(r=>r.rewrite&&done(r).length).length,latest:dates.at(-1)??null};
}
export type EssayDetail={attempts:{id:string;attempt_no:number;body:string}[];evaluations:{id:string;attempt_id:string;overall_summary:string|null;strengths:string[];rewrite_checklist:string[];essay_evaluation_dimensions:{display_order:number;level_1_to_5:number|null;explanation:string}[]}[]};
export async function readEssayDetail(client:SupabaseClient,owner:string,row:RecordItem):Promise<EssayDetail>{
 await assertOwner(client,owner);
 const session=checked(await client.from('essay_practice_sessions').select('id').eq('id',row.sessionId!).eq('user_id',owner).single());
 if(!session)throw Error('NOT_FOUND');
 const [a,e]=await Promise.all([
  client.from('essay_attempts').select('id,attempt_no,body').eq('session_id',session.id).order('attempt_no').limit(50),
  client.from('essay_evaluations').select('id,attempt_id,overall_summary,strengths,rewrite_checklist,essay_evaluation_dimensions(display_order,level_1_to_5,explanation)').eq('session_id',session.id).eq('status','completed').is('invalidated_at',null).order('completed_at').limit(50),
 ]);
 await assertOwner(client,owner);
 return {attempts:checked(a),evaluations:checked(e)} as unknown as EssayDetail;
}
