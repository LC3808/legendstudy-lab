import type {SupabaseClient} from '@supabase/supabase-js';
import {publicCatalog} from './public-discovery';
import {loadRegisteredMaterials} from './registered-material-catalog';

/** Join runtime admission to the existing public metadata RPC. Unpublished
 * registered exams intentionally cannot be selected directly through table RLS.
 * Keep catalog reads in the browser so one Pages request cannot exceed its
 * subrequest budget. A catalog failure only hides that university's start action. */
export async function resolveReadyUniversities(client:SupabaseClient, admitted:{examId:string;questionIds:string[]}[], active=()=>true){
 const ready=new Set<string>();
 if(!admitted.length)return ready;
 const universities=publicCatalog.universities;
 for(let offset=0;offset<universities.length&&active();offset+=6){
  await Promise.all(universities.slice(offset,offset+6).map(async university=>{
   try{
    const exams=await loadRegisteredMaterials(client,university.sourceUniversityId);
    if(exams.some(exam=>admitted.some(a=>a.examId===exam.dbExamId&&a.questionIds.length>0&&a.questionIds.every(id=>exam.questions.some(q=>q.dbQuestionId===id))))&&university.universityId)ready.add(university.universityId);
   }catch{/* Metadata is unavailable; never infer readiness from a name. */}
  }));
 }
 return ready;
}
