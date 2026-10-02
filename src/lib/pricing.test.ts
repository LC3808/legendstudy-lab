import { describe, expect, it } from "vitest";

import {
  calculatePartialRefundKrw,
  creditCopy,
  evaluationResultCtaPolicy,
  excludedCreditPackSizes,
  heroCopy,
  paymentState,
  policyDocumentState,
  pricingPlans,
  pricingPolicy,
  promotionCopy,
  refundExamples,
  refundPolicy,
  serviceAvailability,
} from "./pricing";

describe("owner-final pricing", () => {
  it("keeps the approved payment amount for every Credit pack", () => {
    expect(pricingPlans.map((plan) => [plan.credits, plan.priceKrw])).toEqual([
      [1, 4900],
      [3, 11900],
      [5, 17900],
      [10, 29900],
    ]);
    expect(pricingPlans.map((plan) => plan.priceLabel)).toEqual(["4,900원", "11,900원", "17,900원", "29,900원"]);
  });

  it("displays the per-Credit price for each pack", () => {
    expect(pricingPlans.map((plan) => plan.perCreditKrw)).toEqual([4900, 3967, 3580, 2990]);
    expect(pricingPlans.map((plan) => plan.perCreditLabel)).toEqual(["4,900원", "약 3,967원", "3,580원", "2,990원"]);
  });

  it("recommends exactly one pack and it is 5 Credits", () => {
    expect(pricingPlans.filter((plan) => plan.recommended).map((plan) => plan.id)).toEqual(["5c"]);
  });

  it("does not sell the 20 Credit pack in the first release", () => {
    expect(excludedCreditPackSizes).toContain(20);
    expect(pricingPlans.every((plan) => plan.credits !== 20)).toBe(true);
  });
});

describe("hero copy", () => {
  it("uses the Owner-approved headline and description", () => {
    expect(heroCopy.titleLine1).toBe("필요한 만큼 충전하고,");
    expect(heroCopy.titleLine2).toBe("가능성을 좀 더 선명하게.");
    expect(heroCopy.description).toBe(
      "LegendStudy 논술 LAB은 대학별 논술의 특성을 반영해, 내 답안에서 무엇을 보완해야 하는지 구체적으로 보여주는 논술 첨삭 서비스입니다.",
    );
  });

  it("keeps internal evaluation strategy and removed marketing phrases out of the hero", () => {
    const hero = `${heroCopy.titleLine1} ${heroCopy.titleLine2} ${heroCopy.description}`;
    for (const phrase of heroCopy.bannedPhrases) {
      expect(hero).not.toContain(phrase);
    }
    expect(heroCopy.bannedPhrases).toContain("대학별 평가 관점");
    expect(heroCopy.bannedPhrases).toContain("정기결제가 아닙니다");
    expect(heroCopy.bannedPhrases).toContain("첨삭부터 재첨삭까지");
  });

  it("does not carry the reevaluation rule or the Credit scope into the hero", () => {
    const hero = `${heroCopy.titleLine1} ${heroCopy.titleLine2} ${heroCopy.description}`;
    expect(hero).not.toContain(creditCopy.primary);
    expect(hero).not.toContain("14일");
  });
});

describe("product card copy", () => {
  it("shows answer quantity only, without reevaluation wording", () => {
    expect(pricingPlans.map((plan) => plan.valueLine)).toEqual([
      "1개 답안",
      "3개 답안",
      "5개 답안",
      "10개 답안",
    ]);
  });

  it("keeps reevaluation and review-count claims off the cards", () => {
    for (const plan of pricingPlans) {
      const cardCopy = Object.values(plan).join(" ");
      expect(cardCopy).not.toMatch(/재첨삭/);
      expect(cardCopy).not.toMatch(/총 \d+회/);
      expect(cardCopy).not.toMatch(/\d+회 첨삭/);
      expect(cardCopy).not.toContain("포함");
    }
  });
});

describe("credit scope and reevaluation copy", () => {
  it("states the Owner-approved 1 Credit scope", () => {
    expect(creditCopy.primary).toBe("1 Credit으로 최초 첨삭과 답안 수정 후 재첨삭 1회까지 이용할 수 있습니다.");
  });

  it("states the Owner-approved reevaluation rule", () => {
    expect(creditCopy.reevaluation).toBe(
      "첨삭 결과를 확인한 뒤 답안을 다시 작성해 제출하면, 최초 첨삭 결과 제공일로부터 14일 이내에는 추가 Credit 차감 없이 재첨삭을 받을 수 있습니다.",
    );
  });

  it("keeps Credit validity separate from the reevaluation window", () => {
    expect(creditCopy.validity).toContain("결제일로부터 3개월");
    expect(creditCopy.validity).not.toContain("14일");
    expect(creditCopy.reevaluation).not.toContain("3개월");
    expect(pricingPolicy.paidCreditValidityMonths).toBe(3);
    expect(pricingPolicy.includedReevaluationsPerCredit).toBe(1);
    expect(pricingPolicy.reevaluationWindowDays).toBe(14);
    expect(pricingPolicy.reevaluationWindowBasis).toBe("최초 첨삭 결과 제공일");
  });

  it("matches the future evaluation result CTA to the published rule", () => {
    expect(evaluationResultCtaPolicy.creditNote).toContain("14일 이내");
    expect(evaluationResultCtaPolicy.creditNote).toContain("추가로 차감되지 않습니다");
  });
});

describe("purchase model", () => {
  it("sells a one-off Credit purchase with no subscription or automatic renewal", () => {
    expect(pricingPolicy.subscription).toBe(false);
    expect(pricingPolicy.autoRenewal).toBe(false);
    expect(creditCopy.oneOffPurchase).toBe("일회성 Credit 구매이며 자동 갱신 결제가 없습니다.");
  });

  it("does not use the removed subscription marketing line", () => {
    expect(creditCopy.oneOffPurchase).not.toContain("정기결제가 아닙니다");
    expect(creditCopy.oneOffPurchase).not.toContain("필요한 만큼만 구매하세요");
  });
});

describe("free signup benefit", () => {
  it("keeps the free grant presented as upcoming, never as active", () => {
    expect(pricingPolicy.freeSignupCredits).toBe(3);
    expect(serviceAvailability.freeSignupGrant.runtimeStatus).toBe("NOT_IMPLEMENTED");
    expect(serviceAvailability.freeSignupGrant.stateLabel).toBe("출시 시 제공");
    expect(serviceAvailability.freeSignupGrant.state).toBe("PLANNED");
  });

  it("describes the free grant without expiry and without cash refund", () => {
    expect(pricingPolicy.freeCreditHasExpiry).toBe(false);
    expect(pricingPolicy.freeCreditCashRefundable).toBe(false);
    expect(creditCopy.freeCreditTerms).toContain("현금으로 환불되지 않습니다");
    expect(creditCopy.freeSignup).toContain("제공할 예정입니다");
  });
});

describe("promotion block", () => {
  it("uses the Owner-approved title, label and CTA", () => {
    expect(promotionCopy.title).toBe("학교 단체 이용 / 이벤트 프로모션");
    expect(promotionCopy.inputLabel).toBe("쿠폰 번호 입력");
    expect(promotionCopy.ctaLabel).toBe("적용하기");
  });

  it("does not pretend the coupon can be redeemed yet", () => {
    expect(paymentState.promotion).toBe("NOT_IMPLEMENTED");
    expect(paymentState.promotionNote).toContain("제공될 예정입니다");
  });
});

describe("refund policy", () => {
  it("deducts consumed Credits at the full 1 Credit price", () => {
    expect(pricingPolicy.refundDeductionPerCreditKrw).toBe(4900);
    expect(calculatePartialRefundKrw(29900, 5)).toBe(5400);
  });

  it("reproduces the Owner worked example", () => {
    const [example] = refundExamples;
    expect(example.refundKrw).toBe(5400);
    expect(calculatePartialRefundKrw(example.paidKrw, example.usedCredits)).toBe(example.refundKrw);
  });

  it("never returns a negative refund when the deduction exceeds the payment", () => {
    expect(calculatePartialRefundKrw(11900, 3)).toBe(0);
    expect(calculatePartialRefundKrw(4900, 10)).toBe(0);
  });

  it("refunds an entirely unused purchase in full", () => {
    expect(calculatePartialRefundKrw(29900, 0)).toBe(29900);
    expect(refundPolicy.unused).toBe("실제 결제금액 전액 환불");
  });

  it("keeps statutory consumer rights separate from this commercial policy", () => {
    expect(creditCopy.statutoryRights).toContain("별도로 보장됩니다");
    expect(refundPolicy.processing).toContain(`${pricingPolicy.refundProcessingBusinessDays}영업일`);
    expect(refundPolicy.processingCaveat).toContain("카드사");
    expect(refundPolicy.requestWindow).toBe("유료 Credit 유효기간 내");
  });
});

describe("service and payment state", () => {
  it("does not present payment as available", () => {
    expect(paymentState.cta).toBe("PAYMENT_NOT_READY");
    expect(paymentState.ctaLabel).toBe("결제 준비 중");
    expect(paymentState.provider).toBe("NOT_CONNECTED");
  });

  it("does not show either essay track as already available", () => {
    expect(serviceAvailability.humanities.state).toBe("PREPARING");
    expect(serviceAvailability.math.state).toBe("PREPARING");
    expect(serviceAvailability.humanities.stateLabel).toBe("준비 중");
    expect(serviceAvailability.math.stateLabel).toBe("준비 중");
    expect(serviceAvailability.service.notice).toContain("아직 열려 있지 않습니다");
  });
});

describe("public document state", () => {
  it("reports the real state of each public document", () => {
    expect(policyDocumentState.pricing).toBe("READY");
    expect(policyDocumentState.refund).toBe("READY");
    expect(policyDocumentState.terms).toBe("NEEDS_OWNER_DATA");
    expect(policyDocumentState.privacy).toBe("NEEDS_OWNER_DATA");
    expect(policyDocumentState.businessInfo).toBe("READY");
    expect(policyDocumentState.customerService).toBe("READY");
  });
});
