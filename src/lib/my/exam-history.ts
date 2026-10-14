import type {SupabaseClient} from '@supabase/supabase-js';
import {assertOwner} from './data';
import {array,object,text,humanReport,type Report} from './evaluation-report';
import type {RecordItem} from './essay-dashboard';
/** Same owner-scoped projection as Native. Only a not-yet-installed RPC is optional. */
export async function readExamRuns(client:SupabaseClient,owner:string,id:string|null=null){
 await assertOwner(client,owner);
 const {data,error}=await client.rpc('essay_exam_history',{p_run:id});
 await assertOwner(client,owner);
 if(error){if(error.code==='PGRST202'&&id===null)return [];throw Error('READ_FAILED');}
 if(data?.version!=='essay-exam-history-v1'||!Array.isArray(data.runs))throw Error('INVALID_RESPONSE');
 return data.runs as Record<string,unknown>[];
}
export async function readExamDashboard(client:SupabaseClient,owner:string):Promise<RecordItem[]>{
 return (await readExamRuns(client,owner)).map(r=>({id:text(r.id),source:'exam',question:text(r.title),university:text(r.university),year:Number(r.year),essayType:'인문·경제경영',at:text(r.created_at),rewrite:!!r.parent_id,
  evaluations:[{id:text(r.id),status:text(r.state)==='reserved'?'processing':text(r.state),at:text(r.created_at),completedAt:text(r.completed_at)||null,valid:true}]}));
}
/** Adapt stored Worker schema to the existing human report; no score conversion. */
export function examReports(run:Record<string,unknown>):Report[]{
 if(run.state!=='completed')return [];
 const answers=array(run.answers).map(object);
 return array(object(run.result).questions).map(object).map(q=>{
  const out=object(q.evaluation),answer=answers.find(a=>a.questionId===q.questionId),criteria=array(q.criteria).map(object);
  if(out.contract_version!=='1.3'||!answer)throw Error('INVALID_EXAM_RESULT');
  const id=text(run.id)+'/'+text(q.questionId);
  const report=humanReport({id,contract_version:out.contract_version,question_id:q.questionId,
   input_snapshot:{criteria:criteria.map(c=>object(c.binding))},overall_summary:out.summary,strengths:out.strengths,rewrite_checklist:out.checklist,
   essay_improvement_progress:array(out.improvements).map(object).map(i=>({...i,next_action:i.action,scaffolding_observation:{...object(i.scaffolding_observation),core_focus:array(out.core_improvement_keys).includes(i.issue_key)}})),
   essay_evaluation_dimensions:array(out.dimensions).map(object).map((d,index)=>({criterion_id:d.criterion_id,display_order:index+1,level_1_to_5:d.level,explanation:d.explanation,essay_evaluation_criteria:{label:criteria.find(c=>object(c.binding).id===d.criterion_id)?.label,definition_version:q.rubricVersion}}))
  },text(answer.body),text(run.title));
  return {...report,priorId:run.parent_id?text(run.parent_id)+'/'+text(q.questionId):null,pins:[text(q.questionId),text(q.rubricVersion),text(q.evidenceVersion),'1.3']};
 });
}
export async function readExamReports(client:SupabaseClient,owner:string,id:string){
 const rows=await readExamRuns(client,owner,id);if(rows.length!==1)throw Error('READ_FAILED');
 const current=rows[0];let previous:Report[]=[];
 if(current.parent_id){const parents=await readExamRuns(client,owner,text(current.parent_id));if(parents.length===1)previous=examReports(parents[0]);}
 return {current:examReports(current),previous,state:text(current.state)};
}
