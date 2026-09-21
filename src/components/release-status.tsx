import type { ReactNode } from "react";

type ReleaseStatus = "SERVICE_PREPARING" | "DRAFT" | "OWNER_REVIEW_REQUIRED" | "FOUNDATION_ONLY";

const labels: Record<ReleaseStatus, string> = {
  SERVICE_PREPARING: "서비스 준비 중",
  DRAFT: "검토 초안",
  OWNER_REVIEW_REQUIRED: "운영자 검토 필요",
  FOUNDATION_ONLY: "서비스 기반 준비 중",
};

export function ReleaseStatusLabel({ status }: { status: ReleaseStatus }) {
  return <span className={`release-status release-status--${status.toLowerCase()}`}>{labels[status]}</span>;
}

export function ReleaseNotice({ children }: { children: ReactNode }) {
  return <aside className="release-notice" aria-label="현재 공개 범위 안내">{children}</aside>;
}
