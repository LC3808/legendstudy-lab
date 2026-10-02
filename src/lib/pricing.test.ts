import { describe, expect, it } from "vitest";

import {
  businessInfoFields,
  calculatePartialRefundKrw,
  creditCopy,
  excludedCreditPackSizes,
  paymentState,
  policyDocumentState,
  pricingPlans,
  pricingPolicy,
  refundExamples,
  refundPolicy,
  requiredDataKeys,
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

describe("commercial policy", () => {
  it("sells a one-off Credit purchase with no subscription or automatic renewal", () => {
    expect(pricingPolicy.subscription).toBe(false);
    expect(pricingPolicy.autoRenewal).toBe(false);
    expect(creditCopy.noSubscription).toBe("정기결제가 아닙니다. 필요한 만큼만 구매하세요.");
  });

  it("matches the Owner decisions for validity and the included reevaluation", () => {
    expect(pricingPolicy.paidCreditValidityMonths).toBe(3);
    expect(pricingPolicy.includedReevaluationsPerCredit).toBe(1);
    expect(pricingPolicy.reevaluationWindowDays).toBe(14);
    expect(pricingPolicy.reevaluationWindowBasis).toBe("최초 첨삭 결과 제공일");
  });

  it("describes the free signup grant without expiry and without cash refund", () => {
    expect(pricingPolicy.freeSignupCredits).toBe(3);
    expect(pricingPolicy.freeCreditHasExpiry).toBe(false);
    expect(pricingPolicy.freeCreditCashRefundable).toBe(false);
    expect(creditCopy.freeCreditTerms).toContain("현금으로 환불되지 않습니다");
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
  });
});

describe("page copy safety", () => {
  it("counts answers instead of advertising a doubled review count", () => {
    expect(pricingPlans.map((plan) => plan.valueLine)).toEqual([
      "1개 답안 이용",
      "3개 답안 이용",
      "5개 답안 이용",
      "10개 답안 이용",
    ]);
    for (const plan of pricingPlans) {
      expect(Object.values(plan).join(" ")).not.toMatch(/20회|첨삭 20/);
    }
  });

  it("states the Credit explanation in the approved wording", () => {
    expect(creditCopy.primary).toBe("최초 첨삭과 동일 답안 재첨삭(1회)까지 이용할 수 있습니다.");
    expect(creditCopy.secondary).toBe("동일 답안 기준 1 Credit = 총 2회 첨삭");
  });

  it("keeps Credit validity and the reevaluation window as separate statements", () => {
    expect(creditCopy.validity).toContain("결제일로부터 3개월");
    expect(creditCopy.reevaluation).toContain("14일 이내");
    expect(creditCopy.reevaluation).toContain("추가 Credit은 차감되지 않습니다");
  });

  it("does not present payment as available", () => {
    expect(paymentState.cta).toBe("PAYMENT_NOT_READY");
    expect(paymentState.ctaLabel).toBe("결제 준비 중");
    expect(paymentState.provider).toBe("NOT_CONNECTED");
    expect(paymentState.promotion).toBe("NOT_IMPLEMENTED");
  });

  it("does not show either essay track as already available", () => {
    expect(serviceAvailability.humanities.state).toBe("PREPARING");
    expect(serviceAvailability.math.state).toBe("PREPARING");
    expect(serviceAvailability.humanities.stateLabel).toBe("준비 중");
    expect(serviceAvailability.math.stateLabel).toBe("준비 중");
    expect(serviceAvailability.service.notice).toContain("아직 열려 있지 않습니다");
  });
});

describe("required business data", () => {
  it("lists every Owner input without inventing a value", () => {
    expect(requiredDataKeys).toEqual([
      "BUSINESS_NAME",
      "REPRESENTATIVE",
      "BUSINESS_REGISTRATION_NUMBER",
      "ECOMMERCE_REGISTRATION_NUMBER",
      "BUSINESS_ADDRESS",
      "CUSTOMER_SERVICE_PHONE",
      "CUSTOMER_SERVICE_EMAIL",
      "PRIVACY_OFFICER",
    ]);
    for (const field of businessInfoFields) {
      expect(field.status).toBe("REQUIRED_DATA");
      expect(field.pendingLabel).toBe("확정 후 게시");
    }
  });

  it("reports the real state of each policy document", () => {
    expect(policyDocumentState.pricing).toBe("READY");
    expect(policyDocumentState.refund).toBe("READY");
    expect(policyDocumentState.terms).toBe("NEEDS_UPDATE");
    expect(policyDocumentState.privacy).toBe("NEEDS_UPDATE");
    expect(policyDocumentState.businessInfo).toBe("MISSING");
    expect(policyDocumentState.customerService).toBe("MISSING");
  });
});