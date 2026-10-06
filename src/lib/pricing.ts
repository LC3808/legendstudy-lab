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

export type CreditPlan = {
  readonly id: "1c" | "3c" | "5c" | "10c";
  readonly credits: number;
  readonly name: string;
  readonly priceKrw: number;
  readonly priceLabel: string;
  /** Integer KRW per Credit, rounded for display only. */
  readonly perCreditKrw: number;
  readonly perCreditLabel: string;
  /**
   * What the pack contains, in consumer terms: one Credit buys one 첨삭권.
   * Cards stay quantity-and-price only; the reevaluation rule is stated once in
   * the 1 Credit section instead.
   */
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
    valueLine: "첨삭권 1개",
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
    valueLine: "첨삭권 3개",
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
    valueLine: "첨삭권 5개",
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
    valueLine: "첨삭권 10개",
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

/**
 * Owner-final hero copy.
 *
 * Internal evaluation strategy must not leak into marketing copy, so the hero
 * deliberately avoids naming an evaluation standard or perspective, and does not
 * carry the purchase-model or reevaluation wording that belongs further down.
 */
export const heroCopy = {
  titleLine1: "필요한 만큼 충전하고,",
  titleLine2: "가능성을 좀 더 선명하게.",
  description:
    "LegendStudy 논술 LAB은 대학별 논술의 특성을 반영해, 내 답안에서 무엇을 보완해야 하는지 구체적으로 보여주는 논술 첨삭 서비스입니다.",
  /**
   * Phrases the Owner removed from the hero. Asserted against the hero strings
   * only — the FAQ and policy sections may still state these as facts.
   */
  bannedPhrases: [
    "대학별 평가 기준",
    "대학별 평가 관점",
    "구독이 아니라",
    "정기결제가 아닙니다",
    "첨삭부터 재첨삭까지",
  ],
} as const;

export const creditCopy = {
  /** Scope of one Credit. Stated once here, not repeated on the product cards. */
  primary: "1 Credit으로 최초 첨삭과 답안 수정 후 재첨삭까지 이용할 수 있습니다.",
  reevaluation: `첨삭 결과를 확인한 뒤 답안을 다시 작성해 제출하면, 추가 Credit 차감 없이 재첨삭을 받을 수 있습니다. 최초 첨삭 결과 제공일로부터 ${pricingPolicy.reevaluationWindowDays}일 이내에 재첨삭을 1회 받을 수 있으며, 그 이후 다시 첨삭을 요청하면 새로운 첨삭권이 사용됩니다.`,
  validity: `구매한 Credit은 결제일로부터 ${pricingPolicy.paidCreditValidityMonths}개월 동안 사용할 수 있습니다.`,
  /** Factual purchase-model statement. Not used as hero marketing copy. */
  oneOffPurchase: "일회성 Credit 구매이며 자동 갱신 결제가 없습니다.",
  freeSignup: `신규 가입 시 ${pricingPolicy.freeSignupCredits} Credits를 무료로 제공할 예정입니다.`,
  freeCreditTerms:
    "무료로 지급된 Credit은 유효기간이 없고 현금으로 환불되지 않습니다. 무료 Credit으로 받은 최초 첨삭의 재첨삭도 동일하게 14일 이내에 이용할 수 있습니다.",
  statutoryRights:
    "관련 법령에 따른 청약철회, 계약해제·해지 및 환급에 관한 소비자의 권리는 본 환불정책과 별도로 보장됩니다.",
} as const;

/** Promotion / coupon block copy. Sits directly below the product cards. */
export const promotionCopy = {
  title: "학교 단체 이용 / 이벤트 프로모션",
  lead: "학교나 이벤트에서 받은 쿠폰 번호가 있다면 입력해 주세요.",
  inputLabel: "쿠폰 번호 입력",
  inputPlaceholder: "쿠폰 번호",
  ctaLabel: "적용하기",
} as const;

/**
 * Refund policy. Owner commercial policy, summarised on /pricing/ and stated in
 * full on /refund/. Do not change the arithmetic without Owner approval.
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
  /**
   * The free signup Credit grant is declared in the domain types
   * (`CreditEntitlement.initialFreeEvaluationCredits`) but has no runtime grant
   * logic, so the benefit must be presented as upcoming, never as active.
   */
  freeSignupGrant: {
    state: "PLANNED" as LaunchState,
    stateLabel: "출시 시 제공",
    runtimeStatus: "NOT_IMPLEMENTED",
  },
} as const;

/** Payment state. No payment provider is connected in this release. */
export const paymentState = {
  cta: "PAYMENT_NOT_READY" as const,
  ctaLabel: "결제 준비 중",
  ctaNote: "결제 기능을 준비하고 있습니다. 결제가 열리면 이 페이지에서 구매할 수 있습니다.",
  provider: "NOT_CONNECTED" as const,
  promotion: "NOT_IMPLEMENTED" as const,
  promotionNote: "쿠폰 적용 기능은 결제 기능과 함께 제공될 예정입니다.",
} as const;

/**
 * Purchase CTA on each product card.
 *
 * Payment is not connected in this release, so the control renders disabled
 * with the plain label only. Naming a build state on a shopping page would
 * describe the runtime to a consumer, and an enabled control with no checkout
 * behind it would be a fake purchase. When payment goes live the same CTA is
 * enabled and wired to the real checkout; no other card markup changes.
 */
export const purchaseCta = {
  label: "구매하기",
  enabled: false,
} as const;

export type PolicyDocumentState = "READY" | "NEEDS_OWNER_DATA" | "BLOCKED";

/**
 * Real state of each public document. `NEEDS_OWNER_DATA` means the document is
 * published and usable for review while still carrying an Owner-confirmed gap;
 * the exact gap per document is listed in `src/lib/business-info.ts`.
 */
export const policyDocumentState = {
  pricing: "READY" as PolicyDocumentState,
  refund: "READY" as PolicyDocumentState,
  terms: "NEEDS_OWNER_DATA" as PolicyDocumentState,
  privacy: "NEEDS_OWNER_DATA" as PolicyDocumentState,
  businessInfo: "READY" as PolicyDocumentState,
  customerService: "READY" as PolicyDocumentState,
} as const;

/**
 * Forward-compatibility note for the future evaluation result screen. Recorded
 * here so the screen built in a later task matches the published 14-day rule.
 * The evaluation result screen is NOT implemented in PAYMENT-1B.
 */
export const evaluationResultCtaPolicy = {
  ctaLabel: "답안을 다시 작성해 보세요.",
  creditNote: "14일 이내 재첨삭에는 Credit이 추가로 차감되지 않습니다.",
} as const;
