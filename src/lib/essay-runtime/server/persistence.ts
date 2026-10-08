/** Candidate RPC bridge. Disabled until additive DB contract/content/provider gates pass.
 * One existing Essay parent and finalizer; never calls a Math billing/request RPC.
 */
import type {CompositionPlan,ParentClaim,ParentPersistence,UnifiedResult} from './composition';
export type Rpc = (name:string,args:Record<string,unknown>)=>Promise<unknown>;
export type Manifest = {
 version:'essay-components-v1';classification_version:string;exam_type:'business_economics'|'science';
 input_sha256:string;requirements:CompositionPlan['requirements'];
 components:{question_key:string;title:string;capability:CompositionPlan['requirements'][number];rubric_version:string;source_sha256:string}[];
};
export type ClaimWire={run_id:string;lease_token:string;input_sha256:string;input:{attempt_id:string;answer_hash:string};[key:string]:unknown};
export type CompletionCheckpoint={p_evaluation:string;p_run:string;p_token:string;p_output:unknown;p_manifest:Manifest;p_result:UnifiedResult};
export interface PersistenceOptions {
 enabled:boolean;ownerId:string;
 /** Separate verified student JWT and existing worker JWT transports. */
 student:Rpc;worker:Rpc;
 /** Trusted reviewed catalog resolver. Never deserialize these callbacks from a request. */
 resolve(wire:ClaimWire):Promise<{plan:CompositionPlan;manifest:Manifest}>;
 /** Existing reviewed canonical 1.3 output, not a score invented from component verdicts. */
 canonicalOutput(wire:ClaimWire,result:UnifiedResult):Promise<unknown>;
 /** Durable private checkpoint MUST finish before the finalizer request. */
 checkpoint(value:CompletionCheckpoint):Promise<void>;
}
function ensure(x:unknown):asserts x {if(!x)throw Error('INVALID_PERSISTENCE_BINDING');}
export function canonicalPersistence(options:PersistenceOptions):ParentPersistence {
 let active:{id:string;wire:ClaimWire;plan:CompositionPlan;manifest:Manifest}|undefined;
 function job(claim:ParentClaim){ensure(active&&active.id===claim.evaluationId&&active.wire.lease_token===claim.leaseToken&&options.ownerId===claim.ownerId);return active;}
 return {ready:options.enabled,
  async claim(id){
   ensure(options.enabled&&!active);
   const state=await options.student('essay_evaluation_status',{p_evaluation:id}) as {state?:string;credit_state?:string};
   ensure(state.state==='processing'&&['reserved','included'].includes(state.credit_state??''));
   const wire=await options.worker('essay_claim_components',{p_evaluation:id}) as ClaimWire;
   try {
    ensure(wire.run_id&&wire.lease_token&&wire.input?.attempt_id&&wire.input.answer_hash&&/^[a-f0-9]{64}$/.test(wire.input_sha256));
    const {plan,manifest}=await options.resolve(wire);
    ensure(plan.reviewed&&manifest.version==='essay-components-v1'&&manifest.input_sha256===wire.input_sha256&&manifest.classification_version===plan.classificationVersion&&manifest.exam_type===plan.examType);
    ensure(JSON.stringify([...manifest.requirements].sort())===JSON.stringify([...plan.requirements].sort()));
    ensure(manifest.components.length===plan.components.length&&manifest.components.every((m,i)=>{
     const c=plan.components[i];return m.question_key===c.questionKey&&m.title===c.title&&m.capability===c.capability&&m.rubric_version===c.rubricVersion&&/^[a-f0-9]{64}$/.test(m.source_sha256);
    }));
    active={id,wire,plan,manifest:structuredClone(manifest)};
    return {evaluationId:id,attemptId:wire.input.attempt_id,ownerId:options.ownerId,submissionHash:wire.input.answer_hash,leaseToken:wire.lease_token,classificationVersion:plan.classificationVersion};
   } catch(error){
    // A resolver failure after claim cannot publish or start component evaluation.
    if(wire?.run_id&&wire?.lease_token)await options.worker('essay_finalize_failure',{p_evaluation:id,p_run:wire.run_id,p_token:wire.lease_token});
    throw error;
   }
  },
  async plan(claim){return job(claim).plan;},
  async complete(claim,result){
   const {wire,manifest}=job(claim);
   const p_output=await options.canonicalOutput(wire,result);
   const checkpoint={p_evaluation:claim.evaluationId,p_run:wire.run_id,p_token:wire.lease_token,p_output,p_manifest:manifest,p_result:result};
   await options.checkpoint(structuredClone(checkpoint));
   await options.worker('essay_finalize_components',checkpoint);
  },
  async fail(claim){const {wire}=job(claim);await options.worker('essay_finalize_failure',{p_evaluation:claim.evaluationId,p_run:wire.run_id,p_token:wire.lease_token});},
  async unknown(claim){const {wire}=job(claim);await options.worker('essay_timeout',{p_evaluation:claim.evaluationId,p_run:wire.run_id,p_token:wire.lease_token});},
 };
}
/** Trusted persisted checkpoint only; never a public request body. SQL checks hashes/fences. */
export async function replayCompletion(worker:Rpc,checkpoint:CompletionCheckpoint){
 return worker('essay_finalize_components',structuredClone(checkpoint));
}
