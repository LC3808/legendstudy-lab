import type { OriginType, PublicSourceStatus } from "@/types/domain";

const originLabels: Record<OriginType, string> = {
  OFFICIAL_SOURCE: "공식 확인",
  LSLAB_DERIVED: "LS LAB 분석",
  MODEL_DERIVED: "AI 평가",
  HUMAN_REVIEWED: "사람 검수",
  SYNTHETIC_CONTENT: "합성 예시",
};

const sourceStatusLabels: Record<PublicSourceStatus, string> = {
  OFFICIAL_CONFIRMED: "공식 확인",
  OFFICIAL_PARTIAL: "공식 자료 일부 확인",
  REVIEW_REQUIRED: "자료 확인 필요",
  NOT_PUBLISHED: "공개되지 않음",
  NOT_FOUND_IN_AUDIT: "자료 확인 필요",
};

export function OriginLabel({ origin }: { origin: OriginType }) {
  return <span className={`trust-label trust-label--${origin.toLowerCase()}`}>{originLabels[origin]}</span>;
}

export function SourceStatusLabel({ status }: { status: PublicSourceStatus }) {
  const tone = status === "OFFICIAL_CONFIRMED" ? "verified" : status === "OFFICIAL_PARTIAL" ? "partial" : "review";
  return <span className={`trust-label trust-label--${tone}`}>{sourceStatusLabels[status]}</span>;
}

export function MockNotice({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={`mock-notice ${compact ? "mock-notice--compact" : ""}`} aria-label="Mock foundation 안내">
      <span className="mock-notice__icon" aria-hidden="true">✦</span>
      <p><strong>합성 Mock foundation.</strong> 대학·연도·출처 metadata 일부만 공개 fixture로 시연합니다. 문제·지문·학생 답안·AI 평가는 실제 대학 자료나 실서비스 결과가 아닙니다.</p>
    </aside>
  );
}
