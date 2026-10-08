import {describe,it,expect,vi} from 'vitest';
import {canonicalPersistence,replayCompletion,type PersistenceOptions,type CompletionCheckpoint} from './persistence';
import {runComposition} from './composition';
function setup(){
 const wire={run_id:'run',lease_token:'lease',input_sha256:'a'.repeat(64),input:{attempt_id:'attempt',answer_hash:'answer'}};
 const evaluate=vi.fn(async()=>({feedback:{summary:'synthetic'},requiresReview:false}));
 const plan={examType:'business_economics' as const,classificationVersion:'reviewed-v1',reviewed:true,requirements:['TEXT_REASONING' as const],components:[{questionKey:'q',title:'문항',capability:'TEXT_REASONING' as const,rubricVersion:'v1',ownerId:'owner',attemptId:'attempt',submissionHash:'answer',evaluate}]};
 const manifest={version:'essay-components-v1' as const,classification_version:'reviewed-v1',exam_type:'business_economics' as const,input_sha256:wire.input_sha256,requirements:plan.requirements,components:[{question_key:'q',title:'문항',capability:'TEXT_REASONING' as const,rubric_version:'v1',source_sha256:'b'.repeat(64)}]};
 const worker=vi.fn(async(name:string)=>name==='essay_claim_components'?wire:'evaluation');
 const options:PersistenceOptions={enabled:true,ownerId:'owner',student:vi.fn(async()=>({state:'processing',credit_state:'reserved'})),worker,resolve:vi.fn(async()=>({plan,manifest})),canonicalOutput:vi.fn(async()=>({contract_version:'1.3',summary:'reviewed synthetic'})),checkpoint:vi.fn(async()=>{})};
 return {options,worker,evaluate,manifest};
}
describe('canonical component persistence bridge (gated candidate)',()=>{
 it('uses student ownership before worker, one parent finalizer after durable checkpoint',async()=>{
  const {options,worker}=setup();await runComposition('evaluation',canonicalPersistence(options));
  expect(worker.mock.calls.map(c=>c[0])).toEqual(['essay_claim_components','essay_finalize_components']);
  const checked=vi.mocked(options.checkpoint);expect(checked).toHaveBeenCalledTimes(1);
  expect(checked.mock.invocationCallOrder[0]).toBeLessThan(worker.mock.invocationCallOrder[1]);
  expect(vi.mocked(options.student).mock.invocationCallOrder[0]).toBeLessThan(worker.mock.invocationCallOrder[0]);
 });
 it('disabled/foreign/terminal cannot claim or evaluate',async()=>{
  for(const mode of ['disabled','foreign','completed']){
   const {options,worker,evaluate}=setup();if(mode==='disabled')options.enabled=false;
   if(mode==='foreign')options.student=async()=>{throw Error('PT403');};
   if(mode==='completed')options.student=async()=>({state:'completed'});
   await expect(runComposition('evaluation',canonicalPersistence(options))).rejects.toThrow();
   expect(worker).not.toHaveBeenCalled();expect(evaluate).not.toHaveBeenCalled();
  }
 });
 it('rejects unbound catalog before provider and releases only that parent claim',async()=>{
  const {options,worker,evaluate,manifest}=setup();manifest.input_sha256='c'.repeat(64);
  await expect(runComposition('evaluation',canonicalPersistence(options))).rejects.toThrow('INVALID_PERSISTENCE_BINDING');
  expect(evaluate).not.toHaveBeenCalled();expect(worker.mock.calls.map(c=>c[0])).toEqual(['essay_claim_components','essay_finalize_failure']);
 });
 it('ambiguous commit replays checkpoint without rerunning providers',async()=>{
  const {options,worker,evaluate}=setup();let checkpoint:CompletionCheckpoint|undefined;
  options.checkpoint=async c=>{checkpoint=c;};const original=options.worker;
  options.worker=async(n,args)=>{if(n==='essay_finalize_components')throw Error('UNKNOWN_COMMIT');return original(n,args);};
  await expect(runComposition('evaluation',canonicalPersistence(options))).rejects.toThrow('UNKNOWN_COMMIT');
  await replayCompletion(worker,checkpoint!);expect(evaluate).toHaveBeenCalledTimes(1);
  expect(worker.mock.calls.map(c=>c[0])).toEqual(['essay_claim_components','essay_finalize_components']);
 });
 it('checkpoint failure never invokes finalizer or automatic retry',async()=>{
  const {options,worker}=setup();options.checkpoint=async()=>{throw Error('CHECKPOINT_UNAVAILABLE');};
  await expect(runComposition('evaluation',canonicalPersistence(options))).rejects.toThrow('CHECKPOINT_UNAVAILABLE');
  expect(worker.mock.calls.map(c=>c[0])).toEqual(['essay_claim_components']);
 });
});
