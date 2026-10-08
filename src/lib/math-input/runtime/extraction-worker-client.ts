/**
 * MATH-3B-R — WORKER-ONLY extraction client. Wraps the `math_extraction` RPC
 * (claim / finalize / fail), which MATH-2D restricts to the trusted extraction worker role.
 *
 * SECURITY: this module must NEVER be imported by a student browser component. It lives behind a
 * server/test transport boundary (Cloudflare Pages Function or a deterministic test), and it carries
 * no worker credential itself — the trusted transport supplies worker authorization. The browser
 * student path uses only `MathInputClient` (math_input).
 */

import {
  MATH_EXTRACTION_DTO,
  type ClaimResult,
  type FailResult,
  type FinalizeOutput,
  type FinalizeResult,
  type ExtractionErrorCode,
} from "./contract";
import { toWireExtractionRegion } from "./mapping";
import { callRuntime, type MathRpcTransport } from "./transport";
import { validateProviderResult } from "../provider-validation";
import type { MathInputArtifact, MathResponseFormat, VisionProviderAdapter } from "../types";

export class MathExtractionWorkerClient {
  constructor(private readonly transport: MathRpcTransport) {}

  claim(attemptId: string): Promise<ClaimResult> {
    return callRuntime<ClaimResult>(this.transport, "math_extraction", MATH_EXTRACTION_DTO, "claim", {
      attempt_id: attemptId,
    });
  }

  finalize(runId: string, leaseToken: string, output: FinalizeOutput): Promise<FinalizeResult> {
    return callRuntime<FinalizeResult>(this.transport, "math_extraction", MATH_EXTRACTION_DTO, "finalize", {
      run_id: runId,
      lease_token: leaseToken,
      output,
    });
  }

  fail(runId: string, leaseToken: string, errorCode: ExtractionErrorCode): Promise<FailResult> {
    return callRuntime<FailResult>(this.transport, "math_extraction", MATH_EXTRACTION_DTO, "fail", {
      run_id: runId,
      lease_token: leaseToken,
      error_code: errorCode,
    });
  }
}

function claimArtifactToInput(artifactId: string, position: number, mediaType: string): MathInputArtifact {
  const modality = mediaType === "application/pdf" ? "PDF" : "IMAGE";
  return {
    artifactId,
    modality,
    mediaType,
    byteSize: 1,
    pageIndex: Math.max(0, position - 1),
    evidenceRef: artifactId,
  };
}

/**
 * Worker-side extraction flow: claim → run a (deterministic mock in this task) Vision adapter over the
 * claimed evidence → validate → map to the wire output → finalize. Returns the finalize result or
 * fails the run on invalid provider output. No live provider call here; `adapter` is injected.
 */
export async function runWorkerExtraction(params: {
  worker: MathExtractionWorkerClient;
  attemptId: string;
  responseFormat: MathResponseFormat;
  adapter: VisionProviderAdapter;
  provider?: string;
  model?: string;
  modelVersion?: string;
}): Promise<FinalizeResult | FailResult> {
  const claim = await params.worker.claim(params.attemptId);
  const artifacts = claim.artifacts.map((a) => claimArtifactToInput(a.artifact_id, a.position, a.media_type));

  const raw = await params.adapter.extract({
    attemptId: params.attemptId,
    responseFormat: params.responseFormat,
    artifacts,
  });
  const validated = validateProviderResult(raw, artifacts.map((a) => a.pageIndex));
  if (validated.providerStatus !== "OK") {
    return params.worker.fail(claim.run_id, claim.lease_token, "INVALID_OUTPUT");
  }

  const output: FinalizeOutput = {
    regions: validated.regions.map(toWireExtractionRegion),
    provider: params.provider ?? params.adapter.providerId,
    model: params.model ?? params.adapter.modelId,
    model_version: params.modelVersion ?? "mock-1",
  };
  return params.worker.finalize(claim.run_id, claim.lease_token, output);
}
