import { describe, expect, it } from "vitest";

import { customerCenter, pendingOwnerData } from "./business-info";
import { legalDocuments, pendingItemsFor, privacyDocument, termsDocument } from "./legal-documents";
import { pricingPlans, pricingPolicy } from "./pricing";

const text = (document: unknown) => JSON.stringify(document);

describe("legal document set", () => {
  it("publishes both documents", () => {
    expect(legalDocuments.map((document) => document.id)).toEqual(["terms", "privacy"]);
  });

  it("keeps the effective date unset until the Owner confirms it", () => {
    for (const document of legalDocuments) {
      expect(document.effectiveDate).toBeNull();
      expect(document.ownerPendingKeys).toContain("POLICY_EFFECTIVE_DATE");
      expect(document.preparedOn).toBe("2026년 10월 2일");
    }
  });

  it("references only Owner-pending keys that exist", () => {
    const known = new Set(pendingOwnerData.map((item) => item.key));
    for (const document of legalDocuments) {
      for (const key of document.ownerPendingKeys) expect(known.has(key)).toBe(true);
      expect(pendingItemsFor(document)).toHaveLength(document.ownerPendingKeys.length);
    }
  });
});

describe("terms document", () => {
  const terms = text(termsDocument);

  it("matches the published prices", () => {
    for (const plan of pricingPlans) expect(terms).toContain(plan.priceLabel);
    expect(terms).toContain(`${pricingPolicy.freeSignupCredits} Credits`);
  });

  it("matches the published Credit periods and deduction", () => {
    expect(terms).toContain(`${pricingPolicy.paidCreditValidityMonths}개월`);
    expect(terms).toContain(`${pricingPolicy.reevaluationWindowDays}일`);
    expect(terms).toContain(pricingPolicy.refundDeductionPerCreditKrw.toLocaleString("ko-KR"));
  });

  it("covers every topic the review requires", () => {
    for (const topic of ["Credit", "결제", "환불", "미성년자", "계정", "고객센터", "시행일", "지식재산권"]) {
      expect(terms).toContain(topic);
    }
  });

  it("names the customer centre and puts e-mail before the phone", () => {
    expect(terms).toContain(customerCenter.displayName);
    for (const legacy of ["LegendStudy 고객센터", "레전드스터디 고객센터", "LegendStudy LAB 고객센터", "레전드스터디+ 고객센터"]) {
      expect(terms).not.toContain(legacy);
    }
    const paragraphStart = terms.indexOf(customerCenter.displayName);
    const phoneAt = terms.indexOf(customerCenter.phone.display);
    expect(paragraphStart).toBeGreaterThan(-1);
    expect(phoneAt).toBeGreaterThan(paragraphStart);
    expect(terms.indexOf(customerCenter.primary.display)).toBeLessThan(phoneAt);
  });

  it("does not claim a live payment flow", () => {
    expect(terms).toContain("결제 기능은 아직 제공되지 않습니다");
  });

  it("keeps the statutory consumer-rights wording", () => {
    expect(terms).toContain("별도로 보장됩니다");
  });

  it("describes Credit as a non-transferable usage unit, not money", () => {
    expect(terms).toContain("환금성 포인트가 아니며");
    expect(terms).not.toMatch(/캐시|머니|현금처럼/);
  });
});

describe("privacy document", () => {
  const privacy = text(privacyDocument);

  it("covers every topic the review requires", () => {
    for (const topic of [
      "처리 목적",
      "처리하는 개인정보 항목",
      "보유 및 이용기간",
      "파기",
      "제3자 제공",
      "위탁",
      "국외 이전",
      "이용자의 권리",
      "계정 삭제",
      "미성년자",
      "개인정보 보호책임자",
      "시행일",
    ]) {
      expect(privacy).toContain(topic);
    }
  });

  it("does not claim a working account-deletion flow", () => {
    expect(privacy).toContain("계정 삭제 요청 절차는 준비 중입니다");
  });

  it("does not name an unconfirmed privacy officer", () => {
    expect(privacy).toContain("개인정보 보호책임자");
    expect(privacy).not.toContain("장우진");
  });

  it("records the real processors and the real absence of LAB answer storage", () => {
    for (const processor of ["Supabase", "Cloudflare", "Google", "Apple", "Kakao"]) {
      expect(privacy).toContain(processor);
    }
    expect(privacy).toContain("논술 답안, 첨삭 결과, 성적, 학교·학년 정보는 서버에 저장하지 않습니다");
  });

  it("keeps operational mailboxes out of the public documents", () => {
    const forbidden = [
      ["admin", "legendstudy.com"].join("@"),
      ["ceo", "copacabana.co.kr"].join("@"),
    ];
    for (const document of legalDocuments) {
      for (const address of forbidden) {
        expect(text(document)).not.toContain(address);
      }
    }
  });
});
