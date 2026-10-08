import {describe,it,expect,vi} from 'vitest';
import {runComposition,IndeterminateComponent,unbilledQuantitative,type ParentClaim,type ParentPersistence,type Component,type ExamType} from './composition';
import {baseOutput,evalInput} from '../../math-eval/fixtures';
const claim:ParentClaim={evaluationId:'evaluation',attemptId:'attempt',ownerId:'owner',submissionHash:'pinned-hash',leaseToken:'lease',classificationVersion:'reviewed-v1'};
function fixture(capabilities:Component['capability'][]=['TEXT_REASONING','QUANTITATIVE'],examType:ExamType='business_economics') {
 const components:Component[]=capabilities.map((capability,i)=>({questionKey:`q${i}`,title:`문항 ${i+1}`,capability,rubricVersion:'reviewed-v1',ownerId:'owner',attemptId:'attempt',submissionHash:'pinned-hash',evaluate:vi.fn(async()=>({feedback:{summary:'fixture'},requiresReview:false}))}));
 const port:ParentPersistence={ready:true,claim:vi.fn(async()=>claim),plan:vi.fn(async()=>({examType,classificationVersion:'reviewed-v1',reviewed:true,requirements:[...new Set(capabilities)],components})),complete:vi.fn(async()=>{}),fail:vi.fn(async()=>{}),unknown:vi.fn(async()=>{})};
 return {port,components};
}
describe('single parent mixed orchestration (fixture persistence, not Production)',()=>{
 it.each([['TEXT_REASONING'],['QUANTITATIVE'],['TEXT_REASONING','QUANTITATIVE']] as Component['capability'][][])('one atomic parent publish for %j',async(...caps)=>{
  const {port}=fixture(caps);expect(await runComposition('evaluation',port)).toBe('completed');
  expect(port.claim).toHaveBeenCalledTimes(1);expect(port.complete).toHaveBeenCalledTimes(1);
  const result=vi.mocked(port.complete).mock.calls[0][1];expect(result.sections).toHaveLength(caps.length);
  expect(result.sections[0].title).toBe('문항 1');expect(result).not.toHaveProperty('credit');
  expect(port.fail).not.toHaveBeenCalled();
 });
 it('partial failure publishes nothing and uses only parent recovery',async()=>{
  const {port,components}=fixture();components[1].evaluate=async()=>{throw Error('private provider error');};
  expect(await runComposition('evaluation',port)).toBe('failed');expect(port.complete).not.toHaveBeenCalled();
  expect(port.fail).toHaveBeenCalledExactlyOnceWith(claim,'COMPONENT_FAILED');
 });
 it('unknown timeout keeps parent reconciling without release or automatic retries',async()=>{
  const {port,components}=fixture();components[1].evaluate=async()=>{throw new IndeterminateComponent();};
  expect(await runComposition('evaluation',port)).toBe('reconciling');expect(port.fail).not.toHaveBeenCalled();expect(port.complete).not.toHaveBeenCalled();
  expect(components[0].evaluate).toHaveBeenCalledTimes(1);
 });
 it('bounded execution discards late partial work',async()=>{
  const {port,components}=fixture();components[1].evaluate=()=>new Promise(()=>{});
  expect(await runComposition('evaluation',port,2)).toBe('reconciling');expect(port.complete).not.toHaveBeenCalled();
 });
 it('unknown finalize is not compensated or evaluated twice',async()=>{
  const {port,components}=fixture();port.complete=vi.fn(async()=>{throw Error('transport');});
  await expect(runComposition('evaluation',port)).rejects.toThrow('transport');expect(port.fail).not.toHaveBeenCalled();
  expect(components.every(c=>vi.mocked(c.evaluate).mock.calls.length===1)).toBe(true);
 });
 it('rejects foreign ownership, wrong answer pins, unsupported capability and duplicates before providers',async()=>{
  for(const patch of [{ownerId:'other'},{attemptId:'other'},{submissionHash:'changed'},{questionKey:'q0'},{capability:'SCIENCE_REASONING' as const}]){
   const {port,components}=fixture();Object.assign(components[1],patch);
   expect(await runComposition('evaluation',port)).toBe('failed');expect(components[0].evaluate).not.toHaveBeenCalled();
  }
 });
 it('missing required quantitative part cannot publish text-only as a completed mixed result',async()=>{
  const {port,components}=fixture();const plan=await port.plan(claim);plan.components=[components[0]];port.plan=async()=>plan;
  expect(await runComposition('evaluation',port)).toBe('failed');expect(port.complete).not.toHaveBeenCalled();expect(components[0].evaluate).not.toHaveBeenCalled();
 });
 it('refuses absent persistence before parent claim/credit action',async()=>{
  const {port}=fixture();port.ready=false;await expect(runComposition('evaluation',port)).rejects.toThrow('PERSISTENCE_BLOCKED');expect(port.claim).not.toHaveBeenCalled();
 });
 it('science remains explicit and is not an economics alias',async()=>{
  const {port}=fixture(['SCIENCE_REASONING'],'science');expect(await runComposition('evaluation',port)).toBe('completed');
 });
 it('canonical claim denial prevents every component',async()=>{
  const {port,components}=fixture();port.claim=async()=>{throw Error('42501');};await expect(runComposition('evaluation',port)).rejects.toThrow('42501');expect(components[0].evaluate).not.toHaveBeenCalled();
 });
 it('reuses pure Math validator without a separately billed child RPC',async()=>{
  const output=baseOutput();const adapter={providerId:'fixture',modelId:'fixture',evaluate:async()=>({output})};
  const evaluate=unbilledQuantitative(evalInput(),adapter);
  const result=await evaluate(new AbortController().signal);expect(result.feedback).toMatchObject({overall:output.overall});
  for(const key of ['hints','generated_solution','references','provenance'])expect(result.feedback).not.toHaveProperty(key);
  output.selected_extraction='foreign';await expect(evaluate(new AbortController().signal)).rejects.toThrow();
 });
});
