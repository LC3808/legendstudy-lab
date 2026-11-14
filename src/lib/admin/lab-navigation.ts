/** Only persisted UUID relationships may link a feedback record to a run. */
export const uuidValue=(value:unknown):string|null=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)?value.toLowerCase():null;
export function feedbackSubject(row:{run_id?:string|null;question_id?:string|null;evaluation_ref?:string|null}){
 const parts=row.evaluation_ref?.split('/')??[];
 const run=uuidValue(row.run_id),question=uuidValue(row.question_id);
 const refRun=parts.length===2?uuidValue(parts[0]):null,refQuestion=parts.length===2?uuidValue(parts[1]):null;
 if(row.run_id&&!run||row.question_id&&!question)return null;
 if(run&&refRun&&run!==refRun||question&&refQuestion&&question!==refQuestion)return null;
 const runId=run??refRun,questionId=question??refQuestion;
 return runId&&questionId?{runId,questionId}:null;
}
export function initialLabQuery(){return typeof window==='undefined'?new URLSearchParams():new URLSearchParams(window.location.search);}
