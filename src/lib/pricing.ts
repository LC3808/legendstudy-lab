/**
 * LegendStudy LAB — public pricing, Credit terms and refund policy.
 *
 * Single source of truth for the numbers and sentences the public /pricing/ and
 * /refund/ pages render, so the page copy, the FAQ and the tests cannot drift.
 *
 * Scope boundary: this module only *describes* the commercial offer. It is not
 * financial authority. The real product, amount, Credit grant, Credit usage and
 * refund amount must be decided by the future server-side payment backend
 * (PAYMENT-2). The browser is never trusted for price or Credit quantity.
 */

export type LaunchState = "PREPARING" | "PLANNED";

export type BusinessInfoKey =
  | "BUSINESS_NAME"
  | "REPRESENTATIVE"
  | "BUSINESS_REGISTRATION_NUMBER"
  | "ECOMMERCE_REGISTRATION_NUMBER"
  | "BUSINESS_ADDRESS"
  | "CUSTOMER_SERVICE_PHONE"
  | "CUSTOMER_SERVICE_EMAIL"
  | "PRIVACY_OFFICER";

export type BusinessInfoField = {
  readonly key: BusinessInfoKey;
  readonly label: string;
  /** Owner-provided input that must not be guessed or invented. */
  readonly status: "REQUIRED_DATA";
  /** Public-facing wording while the value is still unconfirmed. */
  readonly pendingLabel: string;
};

export type CreditPlan = {
  readonly id: "1c" | "3c" | "5c" | "10c";
  readonly credits: number;
  readonly name: string;
  readonly priceKrw: number;
  readonly priceLabel: string;
  /** Integer KRW per Credit, rounded for display only. */
  readonly perCreditKrw: number;
  readonly perCreditLabel: string;
  /** Primary value line. Deliberately counts answers, not review sessions. */
  readonly valueLine: string;
  readonly recommended: boolean;
};

const won = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

/**
 * Owner-final prices. These are fixed by the Product Owner and must not be
 * re-derived from competitor research.
 */
export const pricingPlans: readonly CreditPlan[] = [
  {
    id: "1c",
    credits: 1,
    name: "1 CREDIT",
    priceKrw: 4900,
    priceLabel: won(4900),
    perCreditKrw: 4900,
    perCreditLabel: won(4900),
    valueLine: "1개 답안 이용",
    recommended: false,
  },
  {
    id: "3c",
    credits: 3,
    name: "3 CREDITS",
    priceKrw: 11900,
    priceLabel: won(11900),
    perCreditKrw: Math.round(11900 / 3),
    perCreditLabel: `약 ${won(Math.round(11900 / 3))}`,
    valueLine: "3개 답안 이용",
    recommended: false,
  },
  {
    id: "5c",
    credits: 5,
    name: "5 CREDITS",
    priceKrw: 17900,
    priceLabel: won(17900),
    perCreditKrw: 3580,
    perCreditLabel: won(3580),
    valueLine: "5개 답안 이용",
    recommended: true,
  },
  {
    id: "10c",
    credits: 10,
    name: "10 CREDITS",
    priceKrw: 29900,
    priceLabel: won(29900),
    perCreditKrw: 2990,
    perCreditLabel: won(2990),
    valueLine: "10개 답안 이용",
    recommended: false,
  },
] as const;

/** A 20 Credit pack is out of scope for the first release. */
export const excludedCreditPackSizes: readonly number[] = [20];

export const pricingPolicy = {
  currency: "KRW",
  /** One-off Credit purchase. No subscription and no automatic renewal. */
  subscription: false,
  autoRenewal: false,
  paidCreditValidityMonths: 3,
  includedReevaluationsPerCredit: 1,
  reevaluationWindowDays: 14,
  reevaluationWindowBasis: "최초 첨삭 결과 제공일",
  freeSignupCredits: 3,
  freeCreditHasExpiry: false,
  freeCreditCashRefundable: false,
  /** Statutory basis used to deduct consumed Credits from a partial refund. */
  refundDeductionPerCreditKrw: 4900,
  refundProcessingBusinessDays: 3,
  refundRequestWindow: "유료 Credit 유효기간 내",
} as const;

export const creditCopy = {
  primary: "최초 첨삭과 동일 답안 재첨삭(1회)까지 이용할 수 있습니다.",
  secondary: "동일 답안 기준 1 Credit = 총 2회 첨삭",
  valueSecondary: "각 답안 최초 첨삭 + 재첨삭 1회 포함",
  validity: `구매한 Credit은 결제일로부터 ${pricingPolicy.paidCreditValidityMonths}개월 동안 사용할 수 있습니다.`,
  reevaluation: `최초 첨삭 결과를 받은 후 ${pricingPolicy.reevaluationWindowDays}일 이내 동일 답안을 수정해 1회 재첨삭받을 수 있으며 추가 Credit은 차감되지 않습니다.`,
  noSubscription: "정기결제가 아닙니다. 필요한 만큼만 구매하세요.",
  freeSignup: `신규 가입 시 ${pricingPolicy.freeSignupCredits} Credits를 무료로 제공합니다.`,
  freeCreditTerms:
    "무료로 지급된 Credit은 유효기간이 없고 현금으로 환불되지 않습니다. 무료 Credit으로 받은 최초 첨삭의 재첨삭도 동일하게 14일 이내에 이용할 수 있습니다.",
  statutoryRights:
    "관련 법령에 따른 청약철회, 계약해제·해지 및 환급에 관한 소비자의 권리는 본 환불정책과 별도로 보장됩니다.",
} as const;

/**
 * Refund policy. Owner commercial policy, summarised on /pricing/ and stated in
 * full on /refund/.
 */
export const refundPolicy = {
  requestWindow: "유료 Credit 유효기간 내",
  unused: "실제 결제금액 전액 환불",
  partialFormula:
    "실제 결제금액 - (사용한 Credit 수 × 1 Credit 정상가 4,900원)",
  partiallyUsed:
    "일부 사용한 경우 사용한 Credit을 1 Credit 정상가(4,900원) 기준으로 공제한 뒤 남은 결제금액을 환불합니다.",
  zeroOrNegative: "공제액이 결제금액과 같거나 크면 추가 환불금이 없습니다.",
  processing:
    `환불 승인 후 ${pricingPolicy.refundProcessingBusinessDays}영업일 이내 환불 처리를 진행합니다.`,
  processingCaveat:
    "카드사·결제수단의 사정에 따라 실제 환불 반영 시점은 달라질 수 있습니다.",
  freeCredit:
    "무료로 지급된 Credit은 현금으로 환불되지 않습니다.",
  usedCreditRule:
    "최초 첨삭이 정상 제공된 Credit은 환불 계산에서 사용한 Credit으로 봅니다. 포함된 재첨삭을 사용했는지 여부는 사용한 Credit 수를 늘리지 않습니다. 처리 오류 등으로 유효한 첨삭 결과가 제공되지 않은 경우에는 사용한 것으로 보지 않습니다.",
} as const;

/** Worked example shown on the refund page so the formula is unambiguous. */
export const refundExamples = [
  {
    description: "10 Credits를 29,900원에 구매하고 5 Credits를 사용한 경우",
    paidKrw: 29900,
    usedCredits: 5,
    refundKrw: 29900 - 5 * pricingPolicy.refundDeductionPerCreditKrw,
  },
] as const;

/**
 * Refund amount for a partially used purchase. Consumed Credits are always
 * deducted at the 1 Credit full price, never at the discounted package rate.
 * The server remains the final authority for the real figure.
 */
export function calculatePartialRefundKrw(paidKrw: number, usedCredits: number): number {
  const used = Math.max(0, Math.trunc(usedCredits));
  return Math.max(0, paidKrw - used * pricingPolicy.refundDeductionPerCreditKrw);
}

/**
 * Actual launch state taken from the repository, not from a product roadmap.
 * Neither essay track is live in this web foundation, so neither may be shown
 * as already available and no launch date is claimed.
 */
export const serviceAvailability = {
  humanities: {
    label: "인문논술",
    state: "PREPARING" as LaunchState,
    stateLabel: "준비 중",
    detail: "인문논술 첨삭은 준비 중이며, 결제와 함께 공개 시점을 안내합니다.",
  },
  math: {
    label: "수리논술",
    state: "PREPARING" as LaunchState,
    stateLabel: "준비 중",
    detail: "수리논술 첨삭은 준비 중이며, 공개 시점을 안내합니다.",
  },
  service: {
    state: "PREPARING" as LaunchState,
    stateLabel: "서비스 준비 중",
    notice:
      "결제 기능과 첨삭 서비스는 아직 열려 있지 않습니다. 가격과 이용 조건을 먼저 안내하고, 결제가 열리는 시점에 이 페이지에서 다시 알립니다.",
  },
} as const;

/** Payment state. No payment provider is connected in this release. */
export const paymentState = {
  cta: "PAYMENT_NOT_READY" as const,
  ctaLabel: "결제 준비 중",
  ctaNote: "결제 기능을 준비하고 있습니다. 결제가 열리면 이 페이지에서 구매할 수 있습니다.",
  provider: "NOT_CONNECTED" as const,
  promotion: "NOT_IMPLEMENTED" as const,
  promotionNote: "프로모션 코드 적용 기능은 결제 기능과 함께 제공될 예정입니다.",
} as const;

export const businessInfoFields: readonly BusinessInfoField[] = [
  { key: "BUSINESS_NAME", label: "상호", status: "REQUIRED_DATA", pendingLabel: "확정 후 게시" },
  { key: "REPRESENTATIVE", label: "대표자", status: "REQUIRED_DATA", pendingLabel: "확정 후 게시" },
  { key: "BUSINESS_REGISTRATION_NUMBER", label: "사업자등록번호", status: "REQUIRED_DATA", pendingLabel: "확정 후 게시" },
  { key: "ECOMMERCE_REGISTRATION_NUMBER", label: "통신판매업 신고번호", status: "REQUIRED_DATA", pendingLabel: "확정 후 게시" },
  { key: "BUSINESS_ADDRESS", label: "사업장 주소", status: "REQUIRED_DATA", pendingLabel: "확정 후 게시" },
  { key: "CUSTOMER_SERVICE_PHONE", label: "고객센터 전화", status: "REQUIRED_DATA", pendingLabel: "확정 후 게시" },
  { key: "CUSTOMER_SERVICE_EMAIL", label: "고객센터 이메일", status: "REQUIRED_DATA", pendingLabel: "확정 후 게시" },
  { key: "PRIVACY_OFFICER", label: "개인정보 보호책임자", status: "REQUIRED_DATA", pendingLabel: "확정 후 게시" },
] as const;

/** Owner/business inputs that must be supplied before payment can go live. */
export const requiredDataKeys: readonly BusinessInfoKey[] = businessInfoFields.map((field) => field.key);

export type PolicyDocumentState = "READY" | "NEEDS_UPDATE" | "MISSING";

export const policyDocumentState = {
  pricing: "READY" as PolicyDocumentState,
  refund: "READY" as PolicyDocumentState,
  terms: "NEEDS_UPDATE" as PolicyDocumentState,
  privacy: "NEEDS_UPDATE" as PolicyDocumentState,
  businessInfo: "MISSING" as PolicyDocumentState,
  customerService: "MISSING" as PolicyDocumentState,
} as const;