import type {SourceExam} from './source-registry';
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
/** Only published metadata from anonymous RLS. This never authorizes evaluation. */
export function connectPublishedQuestions(exams:SourceExam[],rows:unknown,privateRegistry=false):SourceExam[]{
 if(!Array.isArray(rows)||rows.length>1000)return exams;
 return exams.map(exam=>{
  const mapped=exam.questions.map(question=>{
   const matches=rows.filter(r=>r&&r.question_key===question.key&&r.metadata_version==='source-registration-v1'&&uuid(r.id)&&uuid(r.essay_exam_id)&&
    r.essay_exams?.university_id===exam.universityId&&r.essay_exams?.admission_year===exam.year&&r.essay_exams?.exam_kind===exam.kind&&
    (!exam.dbExamId||r.essay_exam_id===exam.dbExamId));
   return matches.length===1?{question:{...question,dbQuestionId:matches[0].id,accountDraftReady:!privateRegistry&&matches[0].is_published!==false},examId:matches[0].essay_exam_id as string}:null;
  });
  const examIds=new Set(mapped.filter(Boolean).map(m=>m!.examId));
  if(examIds.size!==1)return exam;
  return {...exam,dbExamId:[...examIds][0],questions:exam.questions.map((q,i)=>mapped[i]?.question??q),evaluationReady:false};
 });
}
