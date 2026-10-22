/** Opt-in PRIVATE content contract probe. No source text in Git, network, or live DB.
 * UI journey is separately exercised in student-route.test.tsx; this proves that
 * the existing worker preserves the selected official package. Not quality E2E.
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {MathEvaluationWorkerClient,runWorkerEvaluation} from '../math-eval/runtime/worker-client';
import {baseOutput,step} from '../math-eval/fixtures';
const path=process.env.KONKUK_PRIVATE_INPUT;
it.skipIf(!path)('Konkuk official package reaches existing Math adapter without guessed band points',async()=>{
 const data=JSON.parse(readFileSync(path!,'utf8'));
 expect(data.essay_question_id).toBe('cea40cf3-dc05-507a-a6eb-fd5e1e1847bb');
 expect(data.provider_allowed).toBe(false);
 expect(createHash('sha256').update(readFileSync(data.source)).digest('hex')).toBe(data.source_sha256);
 expect(data.official_bands.every((row:{points:unknown})=>row.points===null)).toBe(true);
 const rows=data.existing_schema_rows;
 const saved:unknown[]=[];
 const worker=new MathEvaluationWorkerClient({rpc:async(_fn,req)=>{
  const action=req.action;
  const result=action==='claim'?{evaluation_id:'mock-evaluation',lease_token:'mock-lease',selected_extraction_id:'confirmed-mock',context:{
   attempt:{attempt_id:'mock-attempt',typed_answer:null,kind:'INITIAL',prior_evaluation_id:null},
   leaf:rows.math_subproblems[0],problem:rows.math_problems[0],profile:{...rows.math_evaluation_profiles[0],optional_dimensions:[]},
   extraction:[{id:'confirmed-region',raw_text:'Synthetic confirmed work',normalized_math:'A=(1,e)'}],criteria:rows.math_scoring_criteria,
   sources:rows.math_source_artifacts,solutions:rows.math_canonical_solutions,
  }}:action==='finalize'?(saved.push(req.payload.output),'mock-evaluation'):{failed:true};
  return {dto_version:req.dto_version,action,result};
 }});
 const result=await runWorkerEvaluation({worker,evaluationId:'mock-evaluation',adapter:{providerId:"mock",modelId:"mock",evaluate:async input=>{
  expect(input.leafId).toBe(data.ids.leaf);
  expect(input.canonicalPackage?.problem).toEqual(rows.math_problems[0]);
  expect(input.criteria).toEqual([{criterion_id:data.ids.criterion,max_points:17}]);
  return {output:baseOutput({selected_extraction:'confirmed-mock',steps:[step({position:1,regions:['confirmed-region'],representation:'Synthetic confirmed work'})],criteria:[{criterion_id:data.ids.criterion,satisfied:'SATISFIED',reason:'Synthetic contract output; not a quality judgment',awarded_points:null}]})};
 }}});
 expect(result.finalized).toBe(true);expect(saved).toHaveLength(1);
 expect(saved[0]).toMatchObject({extraction_id:'confirmed-mock',criteria:[{criterion_id:data.ids.criterion,verdict:'satisfied'}]});
});
