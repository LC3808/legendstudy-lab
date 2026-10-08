/** Server-only composition of unbilled evaluators. No wallet or child evaluation RPC.
 * The candidate persistence adapter requires additive SQL deployment and reviewed content.
 * Never connect a user request directly to these trusted claim/plan objects.
 */
import type { MathEvaluationInput, MathEvaluatorAdapter } from '../../math-eval/types';
import { validateMathEval } from '../../math-eval/validation';
export type Capability = 'TEXT_REASONING' | 'QUANTITATIVE' | 'SCIENCE_REASONING';
export type ExamType = 'humanities_social' | 'business_economics' | 'math' | 'science';
export type ParentClaim = {
 evaluationId:string; attemptId:string; ownerId:string; submissionHash:string;
 leaseToken:string; classificationVersion:string;
};
export type Section = {questionKey:string;title:string;feedback:unknown;requiresReview:boolean};
export type UnifiedResult = {version:'essay-composition-v1';evaluationId:string;attemptId:string;sections:Section[];requiresReview:boolean};
export interface Component {
 questionKey:string; title:string; capability:Capability; rubricVersion:string;
 ownerId:string; attemptId:string; submissionHash:string;
 /** Provider/validator only. Must NOT create a separately billed Math/Essay evaluation. */
 evaluate(signal:AbortSignal):Promise<{feedback:unknown;requiresReview:boolean}>;
}
export interface CompositionPlan {
 examType:ExamType; classificationVersion:string;
 /** This comes from a reviewed server catalog; not an exam-name heuristic or client flag. */
 reviewed:boolean; requirements:Capability[]; components:Component[];
}
export interface ParentPersistence {
 /** False until an actual canonical atomic persistence mapping has been verified. */
 ready:boolean;
 claim(evaluationId:string):Promise<ParentClaim>;
 plan(claim:ParentClaim):Promise<CompositionPlan>;
 complete(claim:ParentClaim,result:UnifiedResult):Promise<void>;
 fail(claim:ParentClaim,reason:'INVALID_COMPONENT'|'COMPONENT_FAILED'):Promise<void>;
 unknown(claim:ParentClaim):Promise<void>;
}
export class IndeterminateComponent extends Error {}
function check(ok:unknown):asserts ok {if(!ok)throw Error('INVALID_COMPONENT');}
function planValid(plan:CompositionPlan,claim:ParentClaim) {
 check(plan.reviewed===true&&plan.classificationVersion===claim.classificationVersion);
 check(['humanities_social','business_economics','math','science'].includes(plan.examType));
 check(plan.components.length>0&&plan.components.length<=8);
 check(plan.requirements.length>0&&new Set(plan.requirements).size===plan.requirements.length);
 check([...new Set(plan.components.map(c=>c.capability))].sort().join('|')===[...plan.requirements].sort().join('|'));
 const keys=new Set<string>();
 for(const c of plan.components){
  check(c.questionKey&&c.title&&c.title.length<=160&&c.rubricVersion&&!keys.has(c.questionKey));keys.add(c.questionKey);
  check(c.ownerId===claim.ownerId&&c.attemptId===claim.attemptId&&c.submissionHash===claim.submissionHash);
  const allowed:Record<ExamType,Capability[]>={humanities_social:['TEXT_REASONING'],business_economics:['TEXT_REASONING','QUANTITATIVE'],math:['QUANTITATIVE'],science:['SCIENCE_REASONING']};
  check(allowed[plan.examType].includes(c.capability));
 }
}
/** One existing parent claim and one atomic publish. Partial results are never returned.
 * No retry loop. Replays use canonical idempotency/fencing; terminal read belongs to gateway.
 */
export async function runComposition(id:string,port:ParentPersistence,timeoutMs=80000):Promise<'completed'|'failed'|'reconciling'> {
 if(!port.ready)throw Error('PERSISTENCE_BLOCKED');
 const claim=await port.claim(id);
 check(claim.evaluationId===id);
 let plan:CompositionPlan;
 try {plan=await port.plan(claim);planValid(plan,claim);} catch {
  await port.fail(claim,'INVALID_COMPONENT');return 'failed';
 }
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 let sections:Section[];
 try {
  sections=await Promise.race([
   Promise.all(plan.components.map(async c=>{
    const value=await c.evaluate(controller.signal);
    check(value&&typeof value.requiresReview==='boolean'&&value.feedback!=null);
    check(new TextEncoder().encode(JSON.stringify(value.feedback)).length<=262144);
    return {questionKey:c.questionKey,title:c.title,feedback:value.feedback,requiresReview:value.requiresReview};
   })),
   new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new IndeterminateComponent()),Math.max(1,Math.min(timeoutMs,80000)));}),
  ]);
 } catch(error) {
  controller.abort();
  if(error instanceof IndeterminateComponent){await port.unknown(claim);return 'reconciling';}
  await port.fail(claim,'COMPONENT_FAILED');return 'failed';
 } finally {if(timer)clearTimeout(timer);}
 // Network failure here may already have committed. Never compensate or repeat evaluators.
 await port.complete(claim,{version:'essay-composition-v1',evaluationId:id,attemptId:claim.attemptId,sections,requiresReview:sections.some(s=>s.requiresReview)});
 return 'completed';
}
/** Reuse the existing Math evaluator/validator WITHOUT math_request_evaluation or worker claim. */
export function unbilledQuantitative(input:MathEvaluationInput,adapter:MathEvaluatorAdapter):Component['evaluate'] {
 return async signal=>{
  if(signal.aborted)throw new IndeterminateComponent();
  const {output}=await adapter.evaluate(input);
  if(signal.aborted)throw new IndeterminateComponent();
  check(validateMathEval(output,input).ok);
  check(output.selected_extraction===input.selectedExtractionId);
  // No unrevealed hints, generated solutions, source references or provider metadata.
  const feedback={overall:output.overall,steps:output.steps,errors:output.errors,core:output.core,
   criteria:output.criteria,rubric:output.rubric,progression:output.progression};
  return {feedback,requiresReview:output.overall.status==='NEEDS_HUMAN_REVIEW'};
 };
}
