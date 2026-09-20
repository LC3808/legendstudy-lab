import "server-only";

import type {
  CreditEntitlement,
  EvaluationJob,
  EvaluationJobStatus,
  OriginType,
} from "@/types/domain";

export type PrivatePackageLifecycle =
  | "DRAFT"
  | "EXTRACTED"
  | "IN_REVIEW"
  | "BENCHMARKING"
  | "RELEASE_CANDIDATE"
  | "ACTIVE"
  | "SUSPENDED"
  | "RETIRED";

/**
 * Server-only shape. No real package contents, source text, rubric, answer key,
 * prompt, provider configuration, user record, or credential exists in Phase 2.
 */
export interface PrivateEvaluationPackageContract {
  packageId: string;
  packageVersion: string;
  rubricVersion: string;
  evaluationContractVersion: string;
  promptVersion: string;
  sourceVersion: string;
  lifecycle: PrivatePackageLifecycle;
  questionType: "LONG_ESSAY" | "STRUCTURED_SHORT_RESPONSE" | "MATH_PROOF" | "SCIENCE_RESPONSE" | "MIXED";
  origin: Exclude<OriginType, "SYNTHETIC_CONTENT">;
}

export interface EvaluationRequest {
  packageId: string;
  packageVersion: string;
  answerText: string;
  accessibilityMode?: boolean;
}

export interface EvaluationProvider {
  submit(request: EvaluationRequest): Promise<EvaluationJob>;
  getStatus(jobId: string): Promise<EvaluationJobStatus>;
}

export type { CreditEntitlement, EvaluationJob };
