/**
 * MATH-7B — qlm_quality runtime contract (dto qlm-runtime-v1). Read-only authority: MATH-2D runtime
 * (APP 17e528b, migration 20261002000200, SHA b40bf72). Actions: list / detail / submit_judgment /
 * review_state / history. Nested qlm-read-v1 / hq-math-read-v1 / hq-math-write-v1 semantics unchanged;
 * `ql-read-v1` / `hq-read-v1` (Humanities) are NOT touched. Reviewer identity is server-derived.
 */

import type { HqDisposition, HqJudgmentRecord, HqMathJudgment, MathQualityCaseDetail } from "../types";

export const QLM_RUNTIME_DTO = "qlm-runtime-v1" as const;

export type QlmAction = "list" | "detail" | "submit_judgment" | "review_state" | "history";

export interface QlmListPayload {
  limit?: number;
  before_at?: string;
  before_id?: string;
}
export interface QlmCaseSummary {
  evaluation_id: string;
  completed_at: string | null;
  review_state: string;
  response_format: string;
  review_status: string;
}
export interface QlmListResult {
  dto_version: "qlm-read-v1";
  cases: QlmCaseSummary[];
  next_cursor: { completed_at: string; evaluation_id: string } | null;
}

export interface QlmDetailPayload {
  evaluation_id: string;
}
export interface QlmDetailResult {
  dto_version: "qlm-read-v1";
  detail: MathQualityCaseDetail;
  judgments: HqJudgmentRecord[];
}

export interface QlmSubmitPayload {
  judgment: HqMathJudgment;
}
export interface QlmSubmitResult {
  judgment_id: string;
  replayed?: boolean;
}

export interface QlmReviewStatePayload {
  evaluation_ids: string[];
}
export interface QlmReviewStateResult {
  dto_version: "hq-math-read-v1";
  states: Array<{ evaluation_id: string; review_state: string; active_count: number; dispositions: HqDisposition[] }>;
}

export interface QlmHistoryPayload {
  evaluation_id: string;
  limit?: number;
  before_at?: string;
  before_id?: string;
}
export interface QlmHistoryResult {
  dto_version: "hq-math-read-v1";
  judgments: HqJudgmentRecord[];
  next_cursor: { created_at: string; judgment_id: string } | null;
}
