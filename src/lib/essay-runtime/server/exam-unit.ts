/** Offline/server contract preparation only. Not mounted in any route.
 * The atomic DB reservation/finalization adapter is intentionally NOT implemented:
 * legacy per-question billing RPCs cannot safely bill an exam bundle once.
 */
export type ExamCatalog = {examId:string;universityId:string;year:number;track:string;session:string|null;campus:string|null;kind:'REGULAR_ADMISSION_ESSAY'|'MOCK_ESSAY';billing:'EXAM'|'MATH_QUESTION';reviewed:boolean;questions:{id:string;rubricVersion:string;evidenceVersion:string}[]};
export type ExamAnswer={questionId:string;body:string;revision:number};
export type ExamSnapshot={version:'essay-exam-unit-v1';ownerId:string;examId:string;universityId:string;kind:ExamCatalog['kind'];year:number;track:string;session:string|null;campus:string|null;answers:(ExamAnswer&{rubricVersion:string;evidenceVersion:string})[]};
function requireThat(x:unknown,reason:string):asserts x {if(!x)throw Error(reason);}
const id=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export function freezeExam(ownerId:string,catalog:ExamCatalog,answers:ExamAnswer[]):ExamSnapshot{
 requireThat(catalog.reviewed&&catalog.billing==='EXAM','EXAM_CONTRACT_NOT_READY');
 requireThat(id(ownerId)&&id(catalog.examId)&&id(catalog.universityId),'INVALID_IDENTITY');
 requireThat(['REGULAR_ADMISSION_ESSAY','MOCK_ESSAY'].includes(catalog.kind)&&Number.isSafeInteger(catalog.year)&&catalog.year>=2001&&catalog.track.trim(),'INVALID_EXAM');
 requireThat(catalog.questions.length>0&&new Set(catalog.questions.map(q=>q.id)).size===catalog.questions.length,'INVALID_CATALOG');
 requireThat(answers.length>0&&answers.length<=catalog.questions.length&&new Set(answers.map(a=>a.questionId)).size===answers.length,'INVALID_QUESTION_SET');
 const selected=answers.map(a=>{
  const q=catalog.questions.find(q=>q.id===a.questionId);
  requireThat(q&&id(q.id)&&q.rubricVersion&&q.evidenceVersion,'QUESTION_NOT_IN_EXAM');
  requireThat(a.body.trim()&&a.body.length<=30000&&Number.isSafeInteger(a.revision)&&a.revision>=0,'INVALID_ANSWER');
  return {...a,rubricVersion:q.rubricVersion,evidenceVersion:q.evidenceVersion};
 }).sort((a,b)=>a.questionId.localeCompare(b.questionId));
 return {version:'essay-exam-unit-v1',ownerId,examId:catalog.examId,universityId:catalog.universityId,kind:catalog.kind,year:catalog.year,track:catalog.track,session:catalog.session,campus:catalog.campus,answers:selected};
}
/** parent/eligibility must come from the locked server record, never browser fields. */
export function freezeReevaluation(ownerId:string,catalog:ExamCatalog,parent:ExamSnapshot,changes:ExamAnswer[],eligibility:{settledAt:number;now:number;includedUsed:boolean}):ExamSnapshot{
 requireThat(ownerId===parent.ownerId&&catalog.examId===parent.examId,'CROSS_OWNER_OR_EXAM');
 requireThat(Number.isFinite(eligibility.now)&&Number.isFinite(eligibility.settledAt)&&eligibility.now>=eligibility.settledAt&&eligibility.now-eligibility.settledAt<=14*86400000&&!eligibility.includedUsed,'REEVALUATION_NOT_INCLUDED');
 requireThat(new Set(changes.map(a=>a.questionId)).size===changes.length&&changes.every(a=>parent.answers.some(p=>p.questionId===a.questionId)),'FROZEN_QUESTION_SET');
 requireThat(changes.every(a=>{const p=parent.answers.find(p=>p.questionId===a.questionId)!;return a.revision>=p.revision&&(a.body===p.body||a.revision>p.revision);}), 'STALE_REVISION');
 const next=freezeExam(ownerId,catalog,parent.answers.map(p=>changes.find(a=>a.questionId===p.questionId)??p));
 requireThat(next.universityId===parent.universityId&&next.kind===parent.kind&&next.year===parent.year&&next.track===parent.track&&next.session===parent.session&&next.campus===parent.campus,'EXAM_METADATA_CHANGED');
 requireThat(next.answers.every((a,i)=>a.rubricVersion===parent.answers[i].rubricVersion&&a.evidenceVersion===parent.answers[i].evidenceVersion),'RUBRIC_OR_EVIDENCE_CHANGED');
 return next;
}
export async function examRequestHash(snapshot:ExamSnapshot,parentEvaluationId:string|null):Promise<string>{
 // JSON order is canonicalized by freezeExam. Include exam kind and immutable set.
 const bytes=new TextEncoder().encode(JSON.stringify({snapshot,parentEvaluationId}));
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export type CriterionResult={questionId:string;criterionId:string;rubricVersion:string;level:number};
export function compareCriteria(before:CriterionResult[],after:CriterionResult[]){
 return after.map(a=>{
  const matches=before.filter(b=>b.questionId===a.questionId&&b.criterionId===a.criterionId&&b.rubricVersion===a.rubricVersion);
  const b=matches.length===1?matches[0]:undefined;
  const valid=(n:number)=>Number.isInteger(n)&&n>=1&&n<=5;
  return {questionId:a.questionId,criterionId:a.criterionId,change:!b||!valid(a.level)||!valid(b.level)?'NOT_COMPARABLE':a.level>b.level?'IMPROVED':a.level<b.level?'DECLINED':'MAINTAINED'};
 });
}
