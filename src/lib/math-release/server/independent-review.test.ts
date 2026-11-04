import {describe,it,expect,vi} from 'vitest';
import {independentlyReviewMath} from './independent-review';
import {baseOutput,evalInput} from '../../math-eval/fixtures';
const input=()=>evalInput({canonicalPackage:{attempt:{typed_answer:'T(5/3)=9/8'},extraction:[],problem:{statement:'minimize T(u)=(u+1)^2/(2*(3*u-1)), u>1/3'},criteria:[]}});
const output=()=>baseOutput();
const yes={student_grounding:true,calculation_verified:true,criteria_grounding:true,error_classification:true,hint_safety:true};
describe('independent mathematical review gate',()=>{
 it('rejects numerically false VALID/CORRECT even when structural validation passes',async()=>{
  const call=vi.fn(async(_i:string,p:any)=>({assessment_sha256:p.assessment_sha256,accepted:false,checks:{...yes,calculation_verified:false}}));
  expect(await independentlyReviewMath(input(),output(),call)).toBe(false);
  expect(call).toHaveBeenCalledTimes(1);
 });
 it('accepts only exact digest and all true checks',async()=>{
  expect(await independentlyReviewMath(input(),output(),async(_i,p:any)=>({assessment_sha256:p.assessment_sha256,accepted:true,checks:yes}))).toBe(true);
  for(const patch of [{assessment_sha256:'wrong'},{checks:{...yes,hint_safety:false}},{checks:{...yes,calculation_verified:'true'}},{accepted:false}]){
   expect(await independentlyReviewMath(input(),output(),async(_i,p:any)=>({assessment_sha256:p.assessment_sha256,accepted:true,checks:yes,...patch}))).toBe(false);
  }
 });
 it('never reviews invalid structures or missing canonical source',async()=>{
  const call=vi.fn();
  expect(await independentlyReviewMath(evalInput(),output(),call)).toBe(false);
  expect(await independentlyReviewMath(input(),{...output(),selected_extraction:'different'},call)).toBe(false);
  expect(call).not.toHaveBeenCalled();
 });
 it('does not swallow upstream failure into acceptance',async()=>{
  await expect(independentlyReviewMath(input(),output(),async()=>{throw Error('upstream');})).rejects.toThrow('upstream');
 });
});
