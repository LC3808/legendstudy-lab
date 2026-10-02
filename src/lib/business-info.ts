/**
 * LegendStudy LAB — public business, support and pending-owner data.
 *
 * Single source of truth for the facts that have to agree across the footer,
 * the pricing page, the refund policy, the terms, the privacy policy and the
 * support page. Nothing here may be duplicated as a literal in a page.
 *
 * Every value in `businessInfo`, `supportContacts` and `supportPhone` is
 * Owner-confirmed for public publication (TOSS-REVIEW-1, 2026-10-02). A value
 * that is NOT confirmed belongs in `pendingOwnerData` and must never be
 * guessed, because an invented business or legal value is worse than a
 * disclosed gap.
 */

/** Operating entity that concludes the sale. */
export const businessInfo = {
  legalName: "주식회사 코파카바나",
  representative: "장우진",
  businessRegistrationNumber: "262-88-02453",
  corporateRegistrationNumber: "110111-8450069",
  ecommerceRegistrationNumber: "2025-서울노원-1263",
  businessType: "교육서비스업",
  businessCategory: "교육관련 자문 및 평가업",
  /**
   * Owner-confirmed address. Published with a comma before the building detail
   * instead of the "/" separator used in the Owner note, keeping every token
   * unchanged. See OWNER_DATA_REQUIRED: the Toss application text could not be
   * read from this environment to confirm byte-for-byte equality.
   */
  address: "서울특별시 노원구 화랑로 621, 서울여자대학교 고명우기념관 305호",
} as const;

/**
 * 통신판매업 filing. The number is valid and is what the public site must
 * display. Whether selling through Cloudflare Pages at lab.legendstudy.com also
 * needs a 변경신고 is being confirmed with the local office; that question does
 * not block the public site and the valid filing number stays published.
 */
export const ecommerceRegistration = {
  number: businessInfo.ecommerceRegistrationNumber,
  validityStatus: "VALID",
  changeReportStatus: "PENDING_ADMIN_CONFIRMATION",
  changeReportAuthority: "노원구청",
  /** Public copy must not speculate about the outcome or the office's address. */
  note:
    "판매 환경 변경에 따른 변경신고 필요 여부를 관할 행정기관에 확인하고 있습니다. 확인 결과에 따라 신고 내용을 정리해 안내합니다.",
} as const;

/** Customer centre phone. */
export const supportPhone = {
  label: "LegendStudy 고객센터",
  display: "010-6469-7654",
  /** E.164 digits for the tel: link. */
  href: "tel:01064697654",
} as const;

/**
 * Consumer-facing contact addresses. `admin@` and the corporate `ceo@` mailbox
 * are operational addresses and are deliberately NOT published as customer
 * support channels.
 */
export const supportContacts = [
  {
    id: "support",
    label: "고객지원 · 결제 · 환불",
    description: "서비스 이용, 결제, 환불, 계정, 개인정보 문의",
    display: "support@legendstudy.com",
    href: "mailto:support@legendstudy.com",
  },
  {
    id: "contact",
    label: "일반 · 제휴",
    description: "서비스 일반 문의와 제휴 제안",
    display: "contact@legendstudy.com",
    href: "mailto:contact@legendstudy.com",
  },
] as const;

/** Enquiry categories offered on the support page. */
export const supportEnquiryTypes = [
  "서비스 이용",
  "결제",
  "환불·취소",
  "계정",
  "개인정보",
  "기타",
] as const;

export type OwnerPendingKey =
  | "PRIVACY_OFFICER"
  | "POLICY_EFFECTIVE_DATE"
  | "MINOR_PAYMENT_CLAUSE"
  | "PROCESSOR_AND_TRANSFER_DETAIL"
  | "SUPPORT_HOURS";

export type OwnerPendingItem = {
  readonly key: OwnerPendingKey;
  readonly label: string;
  /** Why the value is needed and where it is blocked. */
  readonly reason: string;
  readonly requiredFor: "TOSS_REVIEW" | "GO_LIVE";
};

/**
 * Values the Owner has not yet confirmed. They are reported, never invented.
 * The public site keeps working without them: each one is either omitted or
 * shown as an explicitly pending item on the document that needs it.
 */
export const pendingOwnerData: readonly OwnerPendingItem[] = [
  {
    key: "PRIVACY_OFFICER",
    label: "개인정보 보호책임자",
    reason:
      "개인정보처리방침은 보호책임자의 성명과 연락처를 공개해야 합니다. 현재 저장소와 기존 문서 어디에도 확정된 지정이 없어 임의로 지정하지 않았습니다.",
    requiredFor: "TOSS_REVIEW",
  },
  {
    key: "POLICY_EFFECTIVE_DATE",
    label: "정책 시행일",
    reason:
      "이용약관과 개인정보처리방침의 최종 시행일은 공개 승인 시점에 확정해야 합니다. 문서 작성일과 분리해 표시합니다.",
    requiredFor: "TOSS_REVIEW",
  },
  {
    key: "MINOR_PAYMENT_CLAUSE",
    label: "미성년자 결제·법정대리인 동의 최종 문구",
    reason:
      "현재 가입 절차는 연령을 수집하지 않습니다. 미성년자 결제와 법정대리인 동의에 관한 최종 법률 문구는 법률 검토 후 확정해야 합니다.",
    requiredFor: "TOSS_REVIEW",
  },
  {
    key: "PROCESSOR_AND_TRANSFER_DETAIL",
    label: "처리위탁·국외이전 세부(보관 리전)",
    reason:
      "인증 데이터는 호스팅 Supabase 프로젝트에 저장되고 정적 사이트는 Cloudflare Pages가 제공합니다. 저장 리전 등 국외이전 세부는 저장소에 기록된 값이 없어 확정 후 고지해야 합니다.",
    requiredFor: "TOSS_REVIEW",
  },
  {
    key: "SUPPORT_HOURS",
    label: "고객센터 운영시간",
    reason:
      "운영시간이 확정되지 않아 고객센터 페이지에 안내하지 않았습니다. 확정 시 표시합니다.",
    requiredFor: "GO_LIVE",
  },
] as const;

export const pendingOwnerKeys: readonly OwnerPendingKey[] = pendingOwnerData.map((item) => item.key);

/** Label used everywhere a pending Owner value would otherwise be shown. */
export const ownerPendingLabel = "Owner 확정 후 게시" as const;

/**
 * Naming hierarchy. LegendStudy LAB is the platform that also carries 내신 학습
 * and 모의고사·수능; 논술 첨삭 is one product inside it. Marketing copy must not
 * describe the whole LAB as an essay service.
 */
export const productNaming = {
  essayProduct: "LegendStudy 논술 LAB",
  /** legendstudy.com is a separate admissions-materials web/blog service. */
  separateSiteNote:
    "legendstudy.com은 입시자료를 다루는 별도 웹 서비스이며, 이 요금 안내의 판매 대상이 아닙니다.",
} as const;
