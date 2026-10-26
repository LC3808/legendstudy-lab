import registry from '@/data/essay-source-registry.json';
import catalog from '@/data/essay-public-catalog.json';
import {readExamDashboard} from './exam-history';
import type {SupabaseClient} from '@supabase/supabase-js';
import {assertOwner, readEssays} from './data';
export type Attempt={id:string;session_id:string;attempt_no:number;submitted_at:string};
export type RecordItem={id:string;source:'essay'|'math'|'exam';question:string;university:string|null;year?:number|null;essayType?:string|null;at:string;rewrite:boolean;evaluations:{id:string;status:string;at:string;completedAt:string|null;valid:boolean}[];sessionId?:string;examId?:string;questionIds?:string[];parentId?:string|null;previousPaidRunId?:string|null;submissionIndex?:number;mathSession?:MathSession};
export type MathSession={run_id:string;exam_id:string;parent_id:string|null;state:string;created_at:string;completed_at:string|null;questions:{attempt_id:string;leaf_id:string;question_id:string;evaluation_id:string;state:string}[]};
function checked<T>(value:{data:T;error:unknown}){if(value.error)throw Error('READ_FAILED');return value.data;}
export async function readEssayDashboard(client:SupabaseClient,owner:string):Promise<RecordItem[]>{
 const exams=await readExamDashboard(client,owner);
 const sessions=await readEssays(client,owner);
 if(!sessions.length)return exams;
 const attempts=checked(await client.from('essay_attempts').select('id,session_id,attempt_no,submitted_at').in('session_id',sessions.map(s=>s.id)).order('submitted_at',{ascending:false}).limit(501)) as Attempt[];
 if(attempts.length>500)throw Error('HISTORY_LIMIT');
 await assertOwner(client,owner);
 return [...exams,...attempts.map(a=>{
  const s=sessions.find(s=>s.id===a.session_id)!;
  return {id:a.id,examId:s.essay_questions?.essay_exams?.id,sessionId:s.id,source:'essay' as const,question:s.essay_questions?.label??'논술 문제',university:s.essay_questions?.essay_exams?.universities?.name??null,year:s.essay_questions?.essay_exams?.admission_year??null,at:a.submitted_at,rewrite:a.attempt_no>1,
   evaluations:s.evaluations.filter(e=>e.attempt_id===a.id).map(e=>({id:e.id,status:e.status,at:e.requested_at,completedAt:e.completed_at,valid:!e.invalidated_at}))};
 })];
}
export async function mathRead(client:SupabaseClient,owner:string,action:string,payload:Record<string,unknown>){
 await assertOwner(client,owner);
 const data=checked(await client.rpc('math_input',{p_request:{dto_version:'math-input-v1',action,payload}}));
 await assertOwner(client,owner);
 if(data?.dto_version!=='math-input-v1'||data?.action!==action||!data.result)throw Error('INVALID_RESPONSE');
 return data.result;
}
export async function readMathSession(client:SupabaseClient,owner:string,id:string):Promise<MathSession>{
 await assertOwner(client,owner);
 const data=checked(await client.rpc('math_session_read',{p_run:id}));
 await assertOwner(client,owner);
 if(data?.version!=='math-session-v1'||data.run_id!==id||!Array.isArray(data.questions))throw Error('INVALID_RESPONSE');
 return data;
}
export async function readMathDashboard(client:SupabaseClient,owner:string):Promise<RecordItem[]>{
 const data=await mathRead(client,owner,'history',{limit:50});
 if(!Array.isArray(data.attempts))throw Error('INVALID_RESPONSE');
 const response=await client.rpc('math_session_history');
 await assertOwner(client,owner);
 // Only an absent installation is optional; authorization/network failures stay visible.
 if(response.error&&response.error.code!=='PGRST202')throw Error('READ_FAILED');
 const history=response.error?{version:'math-session-history-v1',runs:[]}:response.data;
 if(history?.version!=='math-session-history-v1'||!Array.isArray(history.runs))throw Error('INVALID_RESPONSE');
 const runs=history.runs as MathSession[];
 if(runs.some(r=>!r.run_id||!Array.isArray(r.questions)))throw Error('INVALID_RESPONSE');
 const covered=new Set(runs.flatMap(r=>r.questions.map(q=>q.attempt_id)));
 const rounds:RecordItem[]=runs.map(r=>{
  const exam=registry.exams.find(e=>e.dbExamId===r.exam_id);
  return {id:r.run_id,source:'math',mathSession:r,examId:r.exam_id,parentId:r.parent_id,questionIds:r.questions.map(q=>q.question_id),question:exam?`${exam.year}학년도 · ${exam.track}`:'수리논술 회차',university:catalog.universities.find(u=>u.universityId===exam?.universityId)?.name??null,essayType:'수리',at:r.created_at,rewrite:!!r.parent_id,
   evaluations:r.questions.map(q=>({id:q.evaluation_id,status:q.state,at:r.created_at,completedAt:r.state==='completed'?r.completed_at:null,valid:true}))};
 });
 const legacy:RecordItem[]=data.attempts.filter((a:{attempt_id:string})=>!covered.has(a.attempt_id)).map((a:{attempt_id:string;created_at:string;predecessor_id:string|null;evaluations:{evaluation_id:string;state:string;requested_at:string}[]})=>({id:a.attempt_id,source:'math',question:'수리논술',university:null,essayType:'수리',at:a.created_at,rewrite:!!a.predecessor_id,evaluations:a.evaluations.map(e=>({id:e.evaluation_id,status:e.state,at:e.requested_at,completedAt:null,valid:true}))}));
 return [...rounds,...legacy];
}
export function summarizeRecords(rows:RecordItem[]){
 const done=(r:RecordItem)=>r.mathSession&&r.mathSession.state!=='completed'?[]:r.evaluations.filter(e=>e.valid&&e.status.toLowerCase()==='completed');
 const dates=rows.flatMap(r=>done(r).flatMap(e=>e.completedAt?[e.completedAt]:[])).sort();
 return {evaluatedExams:new Set(rows.filter(r=>!!r.examId&&done(r).length).map(r=>r.examId)).size,evaluatedCycles:new Set(rows.filter(r=>!!r.examId&&done(r).length).map(r=>r.parentId||r.id)).size,evaluated:rows.filter(r=>done(r).length).length,rewritten:rows.filter(r=>r.rewrite).length,reevaluated:rows.filter(r=>r.rewrite&&done(r).length).length,latest:dates.at(-1)??null};
}
export type EssayDetail={attempts:{id:string;attempt_no:number;body:string;mode?:string;conditions_snapshot?:unknown;question_metadata_version?:string}[];evaluations:{id:string;attempt_id:string;session_id?:string;question_id?:string;regime_key?:string;contract_version?:string;evidence_completeness?:string;input_snapshot?:unknown;overall_summary:string|null;strengths:string[];rewrite_checklist:string[];essay_improvement_progress?:{title:string;explanation:string;next_action:string;status:string}[];essay_evaluation_dimensions:{criterion_id?:string;essay_evaluation_criteria?:{label:string;definition_version:string};display_order:number;level_1_to_5:number|null;explanation:string}[]}[]};
export async function readEssayDetail(client:SupabaseClient,owner:string,row:RecordItem):Promise<EssayDetail>{
 await assertOwner(client,owner);
 const session=checked(await client.from('essay_practice_sessions').select('id').eq('id',row.sessionId!).eq('user_id',owner).single());
 if(!session)throw Error('NOT_FOUND');
 const [a,e]=await Promise.all([
  client.from('essay_attempts').select('id,attempt_no,body,mode,conditions_snapshot,question_metadata_version').eq('session_id',session.id).order('attempt_no').limit(50),
  client.from('essay_evaluations').select('id,attempt_id,session_id,question_id,regime_key,contract_version,evidence_completeness,input_snapshot,overall_summary,strengths,rewrite_checklist,essay_improvement_progress(title,explanation,next_action,status,scaffolding_observation),essay_generated_rewrites(status,origin,body),essay_evaluation_evidence(essay_question_evidence(role)),essay_evaluation_dimensions(criterion_id,display_order,level_1_to_5,explanation,essay_evaluation_criteria(label,definition_version))').eq('session_id',session.id).eq('status','completed').is('invalidated_at',null).order('completed_at').limit(50),
 ]);
 await assertOwner(client,owner);
 return {attempts:checked(a),evaluations:checked(e)} as unknown as EssayDetail;
}

export function historyType(r:RecordItem){return r.source==='exam'?(r.parentId?'무료 재첨삭':r.previousPaidRunId?'추가 첨삭':'최초 첨삭'):r.rewrite?'재첨삭':'최초 첨삭';}
export function answerVersion(r:RecordItem){return r.submissionIndex&&r.submissionIndex>0?(r.submissionIndex===1?'최초 제출 답안':`수정 제출 답안 ${r.submissionIndex-1}`):r.rewrite?'수정 제출 답안':'최초 제출 답안';}
export function completedAt(r:RecordItem){return r.evaluations.filter(e=>e.valid&&e.completedAt).map(e=>e.completedAt!).sort().at(-1)??r.at;}
export function examGroupKey(r:RecordItem){return r.examId?`${r.examId}`:`${r.source}:${r.id}`;}
export function historyGroups(rows:RecordItem[],byExam:boolean){const sorted=[...rows].sort((a,b)=>completedAt(b).localeCompare(completedAt(a))||b.id.localeCompare(a.id));if(!byExam)return sorted.map(r=>[r]);const groups=new Map<string,RecordItem[]>();for(const r of sorted){const k=examGroupKey(r);groups.set(k,[...(groups.get(k)??[]),r]);}return [...groups.values()];}
