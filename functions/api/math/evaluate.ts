import { evaluationGateway } from "../../../src/lib/math-release/server/gateway";
import { serverTransport, type MathEnvironment } from "../../../src/lib/math-release/server/transport";
import { openAiCandidate } from "../../../src/lib/math-release/server/provider";
import { MathEvaluationWorkerClient } from "../../../src/lib/math-eval/runtime/worker-client";
export async function onRequestPost({ request, env }: { request: Request; env: MathEnvironment }) {
  try {
    if (env.MATH_ENABLED !== "true" || env.MATH_PROVIDER_CALLS_ENABLED !== "true" || env.MATH_PROVIDER !== "OPENAI" || !env.MATH_EVALUATION_WORKER_JWT || !env.MATH_PRIMARY_MODEL || !env.MATH_PROVIDER_API_KEY) throw Error("CONFIGURATION_REQUIRED");
    const transport = serverTransport(env);
    return evaluationGateway({ enabled: true, origin: env.MATH_ORIGIN ?? "", authenticate: async token => !!await transport.subject(token),
      student: transport.rpc, worker: new MathEvaluationWorkerClient(transport.rpc(env.MATH_EVALUATION_WORKER_JWT)),
      adapter: openAiCandidate({ enabled: true, model: env.MATH_PRIMARY_MODEL, key: env.MATH_PROVIDER_API_KEY }),
    })(request);
  } catch { return Response.json({ code: "EVALUATION_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
