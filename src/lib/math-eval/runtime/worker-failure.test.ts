import { expect, it, vi } from "vitest";
import { MathEvaluationWorkerClient, runWorkerEvaluation } from "./worker-client";
const claim={evaluation_id:"evaluation",lease_token:"lease",context:{attempt:{attempt_id:"attempt",prior_evaluation_id:null},leaf:{id:"leaf",response_format:"SHORT_ANSWER"},profile:{requires_reasoning:false},selected_extraction_id:"extraction",extraction_region_ids:[],criteria:[],solutions:[]}};
it.each(["throw","timeout","malformed"])("worker %s fails bounded and releases via canonical RPC",async mode=>{
 const actions:string[]=[];
 const rpc=vi.fn(async(_fn,payload)=>{actions.push(payload.action);return {dto_version:payload.dto_version,action:payload.action,result:payload.action==="claim"?claim:{failed:true}};});
 const adapter={providerId:"synthetic",modelId:"synthetic",evaluate:async()=>{
  if(mode==="throw")throw Error("sensitive provider detail");if(mode==="timeout")return new Promise<never>(()=>{});return {output:null as never};
 }};
 const result=await runWorkerEvaluation({worker:new MathEvaluationWorkerClient({rpc}),evaluationId:"evaluation",adapter,timeoutMs:5});
 expect(result.failed).toBe(true);expect(actions).toEqual(["claim","fail"]);
 expect(JSON.stringify(result)).not.toContain("sensitive");
});
