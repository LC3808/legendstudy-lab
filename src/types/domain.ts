export type OriginType =
  | "OFFICIAL_SOURCE"
  | "LSLAB_DERIVED"
  | "MODEL_DERIVED"
  | "HUMAN_REVIEWED"
  | "SYNTHETIC_CONTENT";

export type EssayTaxonomy =
  | "long_essay_document_analysis"
  | "structured_short_response"
  | "math_proof"
  | "science_response"
  | "mixed_aat_structured_response";

export type PublicSourceStatus =
  | "OFFICIAL_CONFIRMED"
  | "OFFICIAL_PARTIAL"
  | "REVIEW_REQUIRED"
  | "NOT_PUBLISHED"
  | "NOT_FOUND_IN_AUDIT";

export type LinkQuality =
  | "OFFICIAL_ARCHIVE_PAGE"
  | "OFFICIAL_NOTICE_WITH_ATTACHMENT"
  | "DIRECT_OFFICIAL_FILE"
  | "OFFICIAL_SEARCH_REQUIRED"
  | "UNSTABLE_SESSION_LINK"
  | "BROKEN";

export type LinkAvailability =
  | "AVAILABLE"
  | "REVIEW_REQUIRED"
  | "UNSTABLE"
  | "BROKEN";

export interface EssaySourceLink {
  id: string;
  label: string;
  canonicalNoticeUrl?: string;
  directAttachmentUrl?: string;
  quality: LinkQuality;
  availability: LinkAvailability;
  checkedDate: string;
  origin: "OFFICIAL_SOURCE";
}

export interface UniversityPublicMetadata {
  id: string;
  universityName: string;
  campus: string;
  region: string;
  city: string;
  admissionYear: number;
  admissionTrack: string;
  examTypeLabel: string;
  taxonomy: EssayTaxonomy;
  taxonomyLabel: string;
  sourceStatus: PublicSourceStatus;
  sourceTitle: string;
  sourceNote: string;
  officialAdmissionsUrl: string;
  sourceLinks: EssaySourceLink[];
  checkedDate: string;
  origin: "OFFICIAL_SOURCE";
}

export interface EssayQuestionPublic {
  id: string;
  title: string;
  universityLabel: string;
  yearLabel: string;
  trackLabel: string;
  timeLimitLabel: string;
  questionPrompt: string;
  passages: Array<{ label: string; text: string }>;
  origin: "SYNTHETIC_CONTENT";
  safetyNotice: string;
}

export type AttemptStatus = "DRAFT" | "SUBMITTED" | "EVALUATED_MOCK";

export interface EssayAttempt {
  id: string;
  questionId: string;
  universityLabel: string;
  yearLabel: string;
  questionTitle: string;
  status: AttemptStatus;
  evaluationDateLabel?: string;
  isSynthetic: true;
}

export interface EvaluationCriterion {
  id: string;
  label: string;
  status: "충족" | "부분 충족" | "개선 여지";
  detail: string;
  origin: "SYNTHETIC_CONTENT";
}

export interface EssayEvaluation {
  attemptId: string;
  overallSummary: string;
  criteria: EvaluationCriterion[];
  strengths: string[];
  improvements: string[];
  evidence: string[];
  nextActions: string[];
  patternSignalIds: string[];
  origin: "SYNTHETIC_CONTENT";
  scoreKind: "MOCK_LEARNING_SIGNAL";
}

export type EssayPatternSignalType =
  | "THESIS_MISREAD"
  | "PASSAGE_CONNECTION_WEAK"
  | "EVIDENCE_INSUFFICIENT"
  | "LOGIC_GAP"
  | "STRUCTURE_WEAK"
  | "CONCEPT_INACCURATE"
  | "ANSWER_ELEMENT_MISSING"
  | "LENGTH_IMBALANCE";

export interface EssayPatternSignal {
  id: string;
  type: EssayPatternSignalType;
  studentLabel: string;
  signalLabel: "강점 후보" | "다음 연습" | "누적 데이터 필요";
  description: string;
  contributingAttemptCount: number;
  origin: "SYNTHETIC_CONTENT" | "LSLAB_DERIVED";
}

export type EvaluationJobStatus =
  | "CREATED"
  | "CREDIT_RESERVED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface EvaluationJob {
  id: string;
  attemptId: string;
  packageId: string;
  packageVersion: string;
  status: EvaluationJobStatus;
  createdAt: string;
}

export interface CreditEntitlement {
  entitlementId: string;
  initialFreeEvaluationCredits: number;
  remainingCredits: number;
  authority: "FUTURE_SERVER_AUTHORITATIVE";
}
