/** Server-only request gate. Ownership is checked with caller JWT before any privileged claim.
 * Adapter is injected from the separately approved provider configuration; no model is selected here. */
import { boundedBody } from "./request";
import { MathEvaluationWorkerClient, runWorkerEvaluation } from "../../math-eval/runtime/worker-client";
import type { MathEvaluatorAdapter } from "../../math-eval/types";
import type { MathRpcTransport } from "../../math-input/runtime/transport";
export interface MathGatewayPorts {
  enabled: boolean;
  origin: string;
  authenticate(token: string): Promise<boolean>;
  student(token: string): MathRpcTransport;
  worker: MathEvaluationWorkerClient;
  adapter: MathEvaluatorAdapter;
}
const reply = (status: number, code: string) => Response.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
export function evaluationGateway(ports: MathGatewayPorts) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return reply(405, "METHOD_NOT_ALLOWED");
    if (request.headers.get("origin") !== ports.origin) return reply(403, "ACCESS_DENIED");
    if (!ports.enabled) return reply(503, "EVALUATION_UNAVAILABLE");
    const bearer = request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/)?.[1];
    if (!bearer) return reply(401, "LOGIN_REQUIRED");
    try {
      if (!await ports.authenticate(bearer)) return reply(401, "LOGIN_REQUIRED");
      const body = new TextDecoder().decode(await boundedBody(request, 200));
      if (body.length > 200) return reply(400, "INVALID_REQUEST");
      const payload = JSON.parse(body);
      if (!payload || Object.keys(payload).join() !== "evaluation_id" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.evaluation_id)) return reply(400, "INVALID_REQUEST");
      const owned = await ports.student(bearer).rpc("math_learning", {
        dto_version: "math-learning-v1", action: "read_learning_state", payload,
      });
      const state = (owned as { result?: { evaluation_id?: string; evaluation_state?: string } })?.result;
      if (!state || state.evaluation_id !== payload.evaluation_id) return reply(403, "ACCESS_DENIED");
      if (["COMPLETED", "INVALIDATED"].includes(state.evaluation_state ?? "")) return reply(200, "COMPLETED");
      if (state.evaluation_state !== "REQUESTED") return reply(409, "RETRY_STATUS_CHECK");
      const result = await runWorkerEvaluation({ worker: ports.worker, adapter: ports.adapter, evaluationId: payload.evaluation_id });
      return reply(result.finalized ? 200 : 422, result.finalized ? "COMPLETED" : "EVALUATION_FAILED");
    } catch { return reply(409, "RETRY_STATUS_CHECK"); }
  };
}
