import {generateReviewedMathLearning} from '../../../src/lib/learning-completeness/math-worker';
import { evaluationGateway } from "../../../src/lib/math-release/server/gateway";
import { serverTransport, publicMathLeaves, type MathEnvironment } from "../../../src/lib/math-release/server/transport";
import { openAiCandidate, candidateJson } from "../../../src/lib/math-release/server/provider";
import { MathEvaluationWorkerClient } from "../../../src/lib/math-eval/runtime/worker-client";
export async function onRequestPost({ request, env }: { request: Request; env: MathEnvironment & { MATH_KYUNGHEE_Q3_LEARNING_DISABLED?:string } }) {
  try {
    if (env.MATH_ENABLED !== "true" || env.MATH_PROVIDER_CALLS_ENABLED !== "true" || env.MATH_PROVIDER !== "OPENAI" || !env.MATH_EVALUATION_WORKER_JWT || !env.MATH_PRIMARY_MODEL || !env.MATH_PROVIDER_API_KEY) throw Error("CONFIGURATION_REQUIRED");
    const transport = serverTransport(env);
    return evaluationGateway({ enabled: true, origin: env.MATH_ORIGIN ?? "", authenticate: async token => !!await transport.subject(token, publicMathLeaves(env).length>0),
      releasedLeaves: publicMathLeaves(env), student: transport.rpc, worker: new MathEvaluationWorkerClient(transport.rpc(env.MATH_EVALUATION_WORKER_JWT)),
      learning: async (input,output)=>{
        if(env.MATH_KYUNGHEE_Q3_LEARNING_DISABLED==='true'||input.leafId!=='9552766f-0785-54f6-86d4-c8c70c5da1b8')return null;
        let insufficient=false;
        const reviewed=await generateReviewedMathLearning({input,output,newEvaluation:true,allQuestionsComplete:true,
          onInsufficientEvidence:()=>{insufficient=true;},
          call:(instructions,payload)=>candidateJson({enabled:true,model:env.MATH_PRIMARY_MODEL!,key:env.MATH_PROVIDER_API_KEY!,timeoutMs:24000},instructions,payload)});
        return reviewed ?? (insufficient ? {status:'INSUFFICIENT_EVIDENCE'} : null);
      },
      adapter: openAiCandidate({ enabled: true, model: env.MATH_PRIMARY_MODEL, key: env.MATH_PROVIDER_API_KEY }),
    })(request);
  } catch { return Response.json({ code: "EVALUATION_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
