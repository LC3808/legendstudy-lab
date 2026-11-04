/** Learning judgement sidecar. No score conversion, billing, persistence or historical backfill.
 * Invoke only after the existing worker's independent review; browser input is not trusted context.
 */
export const LEARNING_POLICY = 'learning-completeness-v1';
export const LEVEL_ANCHORS = ['CORE_REQUIREMENTS_UNMET','VALID_START','CORE_PROGRESS','LOCAL_REFINEMENT','REQUIREMENTS_MET'] as const;
export interface LearningContext {
 evaluationId:string; questionId:string; policyVersion:string; rubricVersion:string;
 assessedAt:string; newEvaluation:boolean; evaluationComplete:boolean; reviewAccepted:boolean;
 transcriptionConfirmed:boolean; allQuestionsComplete:boolean;
 criterionIds:readonly string[]; observationIds:readonly string[];
 /** Only disclosure-safe text accepted by the existing review, never raw candidate prose. */
 reviewedNotes:Readonly<Record<string,string>>;
}
export interface LearningCandidate {
 status:'ASSESSED'|'INSUFFICIENT_EVIDENCE'; level:number|null; anchor:string|null;
 criterion_refs:string[]; observation_refs:string[];
 criterion_note_refs?:Record<string,string>;
 reason_ref:string; strength_refs:string[]; improvement_refs:string[]; direction_ref:string;
}
export interface LearningCompleteness {
 version:typeof LEARNING_POLICY; evaluation_id:string; question_id:string; rubric_version:string;
 assessed_at:string; status:LearningCandidate['status']; level:number|null;
 rationale:string; criterion_refs:string[]; observation_refs:string[];
 criterion_evidence?:{criterion_id:string;rationale:string}[];
 strengths:string[]; improvements:string[]; next_direction:string;
}
function uniqueRefs(refs:string[], allowed:readonly string[], required=false){
 if(!Array.isArray(refs)||refs.some(r=>typeof r!=='string'||!allowed.includes(r))||new Set(refs).size!==refs.length||(required&&!refs.length))throw Error('LEARNING_EVIDENCE_REQUIRED');
}
export function publishLearningCompleteness(candidate:LearningCandidate, context:LearningContext, reviewedCandidate:LearningCandidate|null):LearningCompleteness|null {
 // No reconstruction of old assessments. Failure never produces a low rating.
 if(!context.newEvaluation)return null;
 if(context.policyVersion!==LEARNING_POLICY||!context.evaluationId||!context.questionId||!context.rubricVersion||!Number.isFinite(Date.parse(context.assessedAt)))throw Error('LEARNING_CONTEXT_INVALID');
 if(!context.reviewAccepted||!context.evaluationComplete||!context.transcriptionConfirmed||!context.allQuestionsComplete)return null;
 const assessed=candidate.status==='ASSESSED';
 if(!assessed&&candidate.status!=='INSUFFICIENT_EVIDENCE')throw Error('LEARNING_STATUS_INVALID');
 if(assessed){
  if(!Number.isInteger(candidate.level)||candidate.level!<1||candidate.level!>5||candidate.anchor!==LEVEL_ANCHORS[candidate.level!-1])throw Error('LEARNING_ANCHOR_INVALID');
  // Every frozen official criterion must have been considered, not just the convenient ones.
  uniqueRefs(candidate.criterion_refs,context.criterionIds,true);
  if(candidate.criterion_refs.length!==context.criterionIds.length)throw Error('LEARNING_CRITERIA_INCOMPLETE');
  uniqueRefs(candidate.observation_refs,context.observationIds,true);
 }else{
  if(candidate.level!==null||candidate.anchor!==null)throw Error('LEARNING_UNSUPPORTED_RATING');
  uniqueRefs(candidate.criterion_refs,context.criterionIds);
  uniqueRefs(candidate.observation_refs,context.observationIds);
 }
 // Existing essay/math review acceptance does not approve a newly added judgement.
 // The worker must supply the exact independently accepted judgement, bound to this evaluation.
 const fields:(keyof LearningCandidate)[]=['status','level','anchor','criterion_refs','observation_refs','reason_ref','strength_refs','improvement_refs','direction_ref','criterion_note_refs'];
 if(!reviewedCandidate||fields.some(k=>JSON.stringify(candidate[k])!==JSON.stringify(reviewedCandidate[k])))throw Error('LEARNING_JUDGEMENT_REVIEW_REQUIRED');
 const keys=Object.keys(context.reviewedNotes);
 const note=(key:string)=>{if(!keys.includes(key)||!context.reviewedNotes[key].trim())throw Error('LEARNING_REVIEWED_NOTE_REQUIRED');return context.reviewedNotes[key];};
 uniqueRefs(candidate.strength_refs,keys);uniqueRefs(candidate.improvement_refs,keys);
 if(candidate.improvement_refs.length>5)throw Error('LEARNING_TASK_LIMIT');
 const criterionEvidence=candidate.criterion_note_refs?Object.entries(candidate.criterion_note_refs).map(([criterion_id,key])=>{
  if(!context.criterionIds.includes(criterion_id))throw Error('LEARNING_EVIDENCE_REQUIRED');
  return {criterion_id,rationale:note(key)};
 }):undefined;
 return {...(criterionEvidence?{criterion_evidence:criterionEvidence}:{}),version:LEARNING_POLICY,evaluation_id:context.evaluationId,question_id:context.questionId,rubric_version:context.rubricVersion,assessed_at:context.assessedAt,status:candidate.status,level:candidate.level,rationale:note(candidate.reason_ref),criterion_refs:[...candidate.criterion_refs],observation_refs:[...candidate.observation_refs],strengths:candidate.strength_refs.map(note),improvements:candidate.improvement_refs.map(note),next_direction:note(candidate.direction_ref)};
}
/** Caller obtains prior through the existing owned attempt lineage, never a client-supplied ID. */
export function compareLearningCompleteness(current:LearningCompleteness, prior:LearningCompleteness|null, linkedPriorEvaluationId:string|null){
 if(!prior)return {comparable:false,reason:'NO_PREVIOUS_ASSESSMENT'} as const;
 if(prior.evaluation_id!==linkedPriorEvaluationId||current.evaluation_id===prior.evaluation_id||prior.question_id!==current.question_id)return {comparable:false,reason:'LINEAGE_MISMATCH'} as const;
 if(prior.version!==current.version||prior.rubric_version!==current.rubric_version)return {comparable:false,reason:'CRITERIA_CHANGED'} as const;
 if(prior.status!=='ASSESSED'||current.status!=='ASSESSED'||prior.level===null||current.level===null)return {comparable:false,reason:'INSUFFICIENT_EVIDENCE'} as const;
 return {comparable:true,before:prior.level,after:current.level,prior_evaluation_id:prior.evaluation_id} as const;
}
