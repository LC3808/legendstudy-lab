/**
 * MATH-5B — learning-guidance layer (CORE presentation, progressive hints, solution reveal) over
 * canonical MATH-4 evaluation facts. MATH-5 NEVER recomputes mathematical correctness; it selects,
 * presents, gates, and validates the facts MATH-4 already produced (MATH-5A). No live model call.
 */

import type { MathResponseFormat, ReferenceProvenance } from "../math-eval/types";

export type HintLevel = 0 | 1 | 2;

/** Leakage/safety result (multi-signal, not sole string matching). */
export type LeakageResult = "SAFE" | "POTENTIAL_LEAK" | "FORBIDDEN_LEAK";

/** Presentation of one CORE target (derived copy; canonical identity stays in MATH-4 output). */
export interface CorePresentation {
  coreId: string;
  errorId: string | null;
  stepId: string | null;
  title: string;
  diagnosis: string;
  why: string;
  nextAction: string;
}

export interface CoreView {
  /** Empty is valid — no material weakness (MATH-5A §6). */
  primary: CorePresentation | null;
  secondary: CorePresentation[];
  /** Human-readable grouping of propagated consequences under their root (never independent). */
  propagatedSummary: PropagatedGroup[];
}

export interface PropagatedGroup {
  rootErrorId: string;
  rootStepId: string;
  consequenceErrorIds: string[];
}

export interface HintAvailability {
  coreId: string;
  level: HintLevel;
  hintId: string;
  /** L0 body is delivered with the evaluation; L1/L2 bodies are gated (hidden until revealed). */
  bodyAvailable: boolean;
}

export interface RevealedHint {
  hintId: string;
  level: HintLevel;
  body: string;
  leakage: LeakageResult;
}

export interface ReferenceProvenanceLabel {
  provenance: ReferenceProvenance;
  label: string;
}

export interface HintExposureEvent {
  evaluationId: string;
  hintId: string;
  level: HintLevel;
  atIso: string;
  clientSubmissionId: string;
}

export interface SolutionRevealContext {
  evaluationId: string;
  /** true when revealed before exhausting L1/L2 (HYBRID early reveal). */
  earlyReveal: boolean;
  provenance: ReferenceProvenance;
  atIso: string;
}

/** Facts MATH-6 needs for the re-solve loop. MATH-5 does NOT decide commercial eligibility. */
export interface Math6Handoff {
  evaluationId: string;
  leafId: string;
  priorCore: CorePresentation | null;
  hintLevelsExposed: HintLevel[];
  referenceSolutionRevealed: boolean;
  /** Always deferred to backend/MATH-6 — never a client-side free-reeval promise. */
  resolveEligibility: "BACKEND_AUTHORITY";
  resolveCtaLabel: string;
}

export interface LeakagePolicyContext {
  responseFormat: MathResponseFormat;
  /** Known required final answer (for SHORT_ANSWER answer-leak detection); never echoed by hints. */
  finalAnswer?: string | null;
}
