/**
 * LegendStudy LAB — public business, support and privacy-role data.
 *
 * Single source of truth for the facts that have to agree across the footer,
 * the pricing page, the refund policy, the terms, the privacy policy and the
 * support page. Nothing here may be duplicated as a literal in a page.
 *
 * Every value in `businessInfo`, `customerCenter`, `ecommerceRegistration` and
 * `privacyOfficer` is Owner-confirmed for public publication. A value that is
 * not confirmed is not written here at all: an invented business or legal value
 * is worse than an omitted one.
 *
 * This file is also where the future privacy gates live. `privacyActivationGates`
 * lists the features that must trigger a policy review before they are turned
 * on. That list is internal release information and is never rendered on a
 * public page.
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
   * unchanged.
   */
  address: "서울특별시 노원구 화랑로 621, 서울여자대학교 고명우기념관 305호",
} as const;

/**
 * 통신판매업 filing. The number is valid and is what the public site must
 * display. Whether selling through Cloudflare Pages at lab.legendstudy.com also
 * needs a 변경신고 is being confirmed with the local office; that open question
 * does not block the public site and the valid filing number stays published.
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

/**
 * The customer centre. The site itself is LegendStudy Lab and the paid product
 * is sold inside the Lab, so support is the Lab's customer centre and carries
 * exactly one consumer-facing name. Every page reads this object, so no surface
 * can invent a second name or reorder the channels.
 */
export const customerCenter = {
  /** Official consumer-facing name, used verbatim wherever support is named. */
  displayName: "레전드스터디 랩 고객센터",
  /** Korean name of the service itself, without the customer-centre suffix. */
  serviceName: "레전드스터디 랩",
  /** English name of the site itself. Not a translation of `displayName`. */
  brandName: "LegendStudy Lab",
  /**
   * E-mail is the primary channel. The internal admin mailbox and the corporate
   * representative mailbox are operational addresses and are deliberately NOT
   * published as customer support channels; their literals are not written into
   * this repository so they cannot be harvested from it.
   */
  primary: {
    id: "support",
    label: "고객지원 · 결제 및 환불 문의",
    description: "서비스 이용, 결제·환불, 계정, 개인정보 관련 문의",
    display: "support@legendstudy.com",
    href: "mailto:support@legendstudy.com",
  },
  secondary: {
    id: "contact",
    label: "일반 · 제휴 문의",
    description: "서비스 일반 문의 및 제휴 제안",
    display: "contact@legendstudy.com",
    href: "mailto:contact@legendstudy.com",
  },
  /**
   * Published inside the 사업자 정보 block so a reviewer can verify a telephone
   * channel, but never the first contact method and never a call-to-action.
   * Operating hours are not published and must not be invented.
   */
  phone: {
    label: "전화 문의",
    display: "010-6469-7654",
    /** E.164 digits for the tel: link. */
    href: "tel:01064697654",
    note: "원활한 확인과 처리를 위해 이메일 문의를 권장합니다.",
  },
} as const;

/** E-mail channels in priority order: primary first, secondary second. */
export const supportContacts = [customerCenter.primary, customerCenter.secondary] as const;

/**
 * Owner-confirmed 개인정보 보호책임자, published in the privacy policy.
 *
 * The public privacy contact is the customer-centre e-mail. The telephone
 * number is deliberately NOT used as the privacy officer's contact: it stays a
 * business fact inside the 사업자 정보 block.
 */
export const privacyOfficer = {
  name: "장우진",
  role: "개인정보 보호책임자",
  channel: customerCenter.primary,
} as const;

/**
 * Features that must trigger a privacy-policy review BEFORE they are activated.
 *
 * This is internal release information. It records what the published policy
 * deliberately does not cover yet, so that turning one of these on cannot ship
 * without a policy update. It must never be rendered on a public page: a public
 * policy describes what is happening now, not a development roadmap.
 */
export const privacyActivationGates = [
  "Toss Payments Production 결제",
  "Production AI 평가 provider",
  "Math private image/PDF Storage",
  "external Vision/OCR provider",
  "AdMob",
  "GA4 또는 기타 analytics",
  "push notification provider",
  "external crash/error collection provider",
] as const;

/**
 * Naming hierarchy. LegendStudy LAB is the platform that also carries 내신 학습
 * and 모의고사·수능; 논술 첨삭 is one product inside it. 레전드스터디+ is the app
 * bundle and legendstudy.com is a separate admissions-materials service, so
 * marketing copy must not use either name for the whole LAB.
 */
export const productNaming = {
  essayProduct: "LegendStudy 논술 LAB",
  /** legendstudy.com is a separate admissions-materials web/blog service. */
  separateSiteNote:
    "legendstudy.com은 입시자료를 다루는 별도 웹 서비스이며, 이 요금 안내의 판매 대상이 아닙니다.",
} as const;