import {expect,it,vi} from 'vitest';
import {MathEvaluationWorkerClient,runWorkerEvaluation} from './worker-client';
import {baseOutput,evalInput} from '../fixtures';
import type {ReviewedLearningJudgement} from '../../learning-completeness/math-worker';
const input=evalInput();
const claim={evaluation_id:input.evaluationId,lease_token:'lease',context:{attempt:{attempt_id:input.attemptId,kind:'INITIAL',prior_evaluation_id:null},leaf:{id:input.leafId,response_format:input.responseFormat},profile:{requires_reasoning:input.requiresReasoning},selected_extraction_id:input.selectedExtractionId,extraction_region_ids:input.regionIds,criteria:input.criteria,solutions:input.authoritySolutions}};
it.each(['accepted','missing','rejected','disabled'])('optional learning %s uses exactly one canonical finalize',async(mode)=>{
 const calls:Record<string,unknown>[]=[];
 const rpc=vi.fn(async(_fn,request)=>{calls.push(request);return {dto_version:request.dto_version,action:request.action,result:request.action==='claim'?claim:input.evaluationId};});
 const packet={value:{status:'ASSESSED',level:3},review:{accepted:true}} as ReviewedLearningJudgement;
 const learning=vi.fn(async()=>{if(mode==='rejected')throw Error('private details');return mode==='missing'?null:packet;});
 const result=await runWorkerEvaluation({worker:new MathEvaluationWorkerClient({rpc}),evaluationId:input.evaluationId,adapter:{providerId:'fixture',modelId:'fixture',evaluate:async()=>({output:baseOutput()})},learning:mode==='disabled'?undefined:learning});
 expect(result.finalized).toBe(true);expect(calls.map(c=>c.action)).toEqual(['claim','finalize']);
 expect((calls[1].payload as Record<string,unknown>).learning_judgement).toEqual(mode==='accepted'?packet:undefined);
 expect(learning).toHaveBeenCalledTimes(mode==='disabled'?0:1);
});
