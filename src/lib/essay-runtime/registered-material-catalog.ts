import type {SupabaseClient} from '@supabase/supabase-js';
import {catalogUniversity} from './public-discovery';
import type {SourceExam} from './source-registry';
import type {ExamRow,Detail} from '../materials/contract';
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
/** Existing reviewer RPCs enforce operator access. Project metadata only; never copy
 * private document paths, evidence, student data or review bodies into the selector. */
export async function loadRegisteredMaterials(client:SupabaseClient,sourceId:string):Promise<SourceExam[]>{
 const university=catalogUniversity(sourceId);
 if(!university)return [];
 const browse=await client.rpc('essay_browse_catalog',{p_university:sourceId});
 if(!browse.error){
  if(!Array.isArray(browse.data))throw Error('REGISTERED_CATALOG_INVALID');
  return browse.data.map((row:ExamRow & {questions:Detail['questions']})=>{
   if(university.universityId && row.universityId!==university.universityId)throw Error('REGISTERED_CATALOG_INVALID');
   return projectRegisteredExam(sourceId,row,{examId:row.examId,questions:row.questions} as Detail);
  });
 }
 // During staged rollout, only a missing RPC permits the existing reviewer path.
 if(!['PGRST202','42883'].includes(browse.error.code))throw Error('REGISTERED_CATALOG_UNAVAILABLE');
 const permission=await client.rpc('is_quality_operator');
 if(permission.error||permission.data!==true)return [];
 const list=await client.rpc('essay_material_list');
 if(list.error||!Array.isArray(list.data))throw Error('REGISTERED_CATALOG_UNAVAILABLE');
 const rows=(list.data as ExamRow[]).filter(e=>university.universityId?e.universityId===university.universityId:e.university===university.name);
 if(rows.length>100||new Set(rows.map(e=>e.universityId)).size>1)throw Error('REGISTERED_CATALOG_AMBIGUOUS');
 const exams:SourceExam[]=[];
 for(const row of rows){
  const response=await client.rpc('essay_material_detail',{p_exam:row.examId});
  if(response.error)throw Error('REGISTERED_CATALOG_UNAVAILABLE');
  exams.push(projectRegisteredExam(sourceId,row,response.data));
 }
 return exams;
}
export function projectRegisteredExam(sourceId:string,row:ExamRow,detail:Detail):SourceExam{
 if(!uuid(row.examId)||!uuid(row.universityId)||detail?.examId!==row.examId||!Number.isInteger(row.year)||!['admission','mock'].includes(row.kind)||!Array.isArray(detail.questions)||detail.questions.length!==row.questionCount||!detail.questions.length||detail.questions.some(q=>!uuid(q.id)||typeof q.label!=='string')||new Set(detail.questions.map(q=>q.id)).size!==detail.questions.length)throw Error('REGISTERED_CATALOG_INVALID');
 return {key:`registered:${row.examId}`,dbExamId:row.examId,universityId:row.universityId,sourceUniversityId:sourceId,year:row.year,kind:row.kind,track:row.track||row.title,session:row.title,campus:null,verification:'REVIEW_REQUIRED',sourceHashes:[],evaluationReady:false,questions:detail.questions.map(q=>({key:`registered:${q.id}`,dbQuestionId:q.id,label:q.label,sourceLocator:null,lengthLabel:null,accountDraftReady:false}))};
}

/** Preserve approved content only when the exact canonical question set agrees. */
export function mergeRegisteredCatalog(existing:SourceExam[], registered:SourceExam[]):SourceExam[]{
 return registered.map(row=>{
  const old=existing.find(e=>e.dbExamId===row.dbExamId&&e.sourceUniversityId===row.sourceUniversityId);
  const ids=new Set(row.questions.map(q=>q.dbQuestionId));
  return old&&old.questions.length===row.questions.length&&old.questions.every(q=>q.dbQuestionId&&ids.has(q.dbQuestionId))?old:row;
 });
}
