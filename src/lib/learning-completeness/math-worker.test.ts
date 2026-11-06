import {describe,it,expect,vi} from 'vitest';
import {generateReviewedMathLearning,learningProviderContent} from './math-worker';
import {baseOutput,evalInput} from '../math-eval/fixtures';
const candidate={status:'ASSESSED',level:4,anchor:'LOCAL_REFINEMENT',criterion_refs:['criterion'],criterion_note_refs:{criterion:'reason'},observation_refs:['step-1'],reason_ref:'reason',strength_refs:['strength'],improvement_refs:['improvement'],direction_ref:'direction'};
const notes={reason:'핵심 과정이 연결되어 있고 설명 보완이 남아 있습니다.',strength:'조건을 풀이에 반영했습니다.',improvement:'조건을 적용한 근거를 밝혀 보세요.',direction:'해당 단계의 적용 조건을 다시 확인해 보세요.'};
function setup(){
 const input=evalInput({criteria:[{criterion_id:'criterion',max_points:null}],canonicalPackage:{attempt:{input_kind:'TYPED',typed_answer:'student work'},extraction:[],profile:{reasoning_required:true},criteria:[{id:'criterion',description:'공식 조건과 풀이 근거'}]}});
 const output=baseOutput({criteria:[{criterion_id:'criterion',satisfied:'SATISFIED',reason:'조건을 확인함'}]});
 const call=vi.fn(async (_instructions:string,payload:unknown):Promise<unknown>=>{
  const p=payload as {candidate_sha256?:string};
  return p.candidate_sha256?{candidate_sha256:p.candidate_sha256,accepted:true,checks:{base_evaluation_supported:true,all_official_criteria_considered:true,level_supported:true,notes_grounded:true,no_early_solution_disclosure:true}}:{candidate,notes};
 });
 return {input,output,newEvaluation:true,allQuestionsComplete:true,call,now:()=> '2026-11-04T00:00:00Z'};
}
describe('new math learning independent judgement',()=>{
 it('does not map a correct answer to five; publishes the independently supported level',async()=>{
  const args=setup();const value=await generateReviewedMathLearning(args);
  expect(args.call).toHaveBeenCalledTimes(2);expect(value?.value.level).toBe(4);
  expect(value?.review.candidate_sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(value?.value.rubric_version).toMatch(/^pinned-/);
 });
 it('assesses a completed review of partial student work without treating it as an incomplete exam',async()=>{
  const args=setup();args.output.overall={...args.output.overall,status:'PARTIAL',answer:'PARTIALLY_CORRECT'};
  expect((await generateReviewedMathLearning(args))?.value.level).toBe(4);
  expect(args.call).toHaveBeenCalledTimes(2);
 });
 it('withholds indeterminate and human-review results',async()=>{
  for(const change of [{status:'NEEDS_HUMAN_REVIEW' as const},{answer:'NOT_DETERMINABLE' as const}]){
   const args=setup();args.output.overall={...args.output.overall,...change};
   expect(await generateReviewedMathLearning(args)).toBeNull();expect(args.call).not.toHaveBeenCalled();
  }
 });
 it('never calls a Provider for historical, incomplete mixed or criterion-free records',async()=>{
  for(const change of [{newEvaluation:false},{allQuestionsComplete:false},{input:{...setup().input,criteria:[]}}]){
   const args={...setup(),...change};expect(await generateReviewedMathLearning(args)).toBeNull();expect(args.call).not.toHaveBeenCalled();
  }
 });
 it('rejects unresolved recognition before any generation',async()=>{
  const args=setup();args.input.canonicalPackage={...args.input.canonicalPackage,attempt:{input_kind:'TYPED',typed_answer:'x=UNCERTAIN'}};
  await expect(generateReviewedMathLearning(args)).rejects.toThrow('MATH_RECOGNITION_UNRESOLVED');expect(args.call).not.toHaveBeenCalled();
 });
 it('rejects another candidate hash and rejects disclosure leakage',async()=>{
  for(const verdict of [{candidate_sha256:'different',accepted:true,checks:{}},{accepted:true,checks:{base_evaluation_supported:true,all_official_criteria_considered:true,level_supported:true,notes_grounded:true,no_early_solution_disclosure:false}}]){
   const args=setup();args.call.mockImplementationOnce(async()=>({candidate,notes})).mockImplementationOnce(async(_,p)=>({...p as object,...verdict}));
   expect(await generateReviewedMathLearning(args)).toBeNull();
  }
 });
 it('rejects invented evidence before paying for a reviewer',async()=>{
  const args=setup();args.call.mockResolvedValueOnce({candidate:{...candidate,observation_refs:['invented']},notes});
  await expect(generateReviewedMathLearning(args)).rejects.toThrow('LEARNING_EVIDENCE_REQUIRED');expect(args.call).toHaveBeenCalledTimes(1);
 });
 it('does not persist insufficient evidence or spend a reviewer call',async()=>{
  const args=setup();args.call.mockImplementationOnce(async()=>({candidate:{...candidate,status:'INSUFFICIENT_EVIDENCE',level:null,anchor:null},notes}));
  expect(await generateReviewedMathLearning(args)).toBeNull();expect(args.call).toHaveBeenCalledTimes(1);
 });
 it('changes the comparison version when official criteria change',async()=>{
  const a=setup(),b=setup();b.input.canonicalPackage={...b.input.canonicalPackage,criteria:[{id:'criterion',description:'공식 기준 변경'}]};
  expect((await generateReviewedMathLearning(a))?.value.rubric_version).not.toBe((await generateReviewedMathLearning(b))?.value.rubric_version);
 });
});

describe('official learning evidence transport',()=>{
 it('preserves official images as visual parts and all current text without base64 text inflation',()=>{
  const source={canonical:{official_images:[{data:'iVBORtest==',sha256:'a'.repeat(64)}],criteria:['official'],attempt:{typed_answer:'confirmed'}},candidate_sha256:'review-hash'};
  const out=learningProviderContent(source) as {content:{type:string;text?:string;image_url?:string}[]}[];
  expect(out[0].content[0].text).not.toContain('iVBOR');
  expect(out[0].content[0].text).toContain('confirmed');
  expect(out[0].content[0].text).toContain('official');
  expect(out[0].content[0].text).toContain('review-hash');
  expect(out[0].content[1].image_url).toBe('data:image/png;base64,iVBORtest==');
  expect(source.canonical.official_images).toHaveLength(1);
 });
 it('rejects unverified image shape before transmission',()=>{
  expect(()=>learningProviderContent({canonical:{official_images:[{data:'bad',sha256:'a'.repeat(64)}]}})).toThrow('INVALID_OFFICIAL_IMAGES');
 });
});

it('reports failed reviewer checks without logging student work or generated notes',async()=>{
 const args=setup();const log=vi.spyOn(console,'warn').mockImplementation(()=>{});
 args.call.mockImplementationOnce(async()=>({candidate,notes})).mockImplementationOnce(async(_,p)=>({...p as object,accepted:false,checks:{base_evaluation_supported:true,all_official_criteria_considered:true,level_supported:true,notes_grounded:true,no_early_solution_disclosure:false}}));
 try{
  expect(await generateReviewedMathLearning(args)).toBeNull();
  expect(log).toHaveBeenCalledWith('MATH_LEARNING_WITHHELD',{evaluationId:args.input.evaluationId,reason:'INDEPENDENT_REVIEW_REJECTED',failedChecks:['no_early_solution_disclosure']});
  expect(JSON.stringify(log.mock.calls)).not.toContain('student work');
  expect(JSON.stringify(log.mock.calls)).not.toContain(notes.reason);
 }finally{log.mockRestore();}
});
