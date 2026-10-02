import { describe, expect, it } from "vitest";

import { businessInfo, customerCenter, privacyOfficer } from "./business-info";
import {
  effectiveDateLabel,
  legalDocuments,
  policyEffectiveDateIso,
  privacyDocument,
  termsDocument,
} from "./legal-documents";
import { pricingPlans, pricingPolicy } from "./pricing";

const text = (document: unknown) => JSON.stringify(document);

/**
 * Vocabulary that belongs to the internal build process. A consumer-facing
 * policy page must never carry any of it.
 */
const forbiddenPublicStrings = [
  "LEGAL_REVIEW_RECOMMENDED",
  "OWNER_PENDING",
  "OWNER_DATA_REQUIRED",
  "PROCESSOR_AND_TRANSFER_DETAIL",
  "PRODUCTION_ACTIVATION_GATE",
  "PLACEHOLDER",
  "확정 후 게시",
  "법률 검토 후 확정",
  "확정 후 이 방침에 표시",
  "확정 후 이 페이지에 표시",
];

describe("legal document set", () => {
  it("publishes both documents", () => {
    expect(legalDocuments.map((document) => document.id)).toEqual(["terms", "privacy"]);
  });

  it("carries no internal build or review vocabulary", () => {
    for (const document of legalDocuments) {
      for (const forbidden of forbiddenPublicStrings) {
        expect(text(document)).not.toContain(forbidden);
      }
    }
  });

  it("uses one effective-date source for both documents", () => {
    const label = effectiveDateLabel();
    expect(text(termsDocument)).toContain(label);
    expect(text(privacyDocument)).toContain(label);
    // The branch ships with the date unset, so the documents state that they
    // take effect from publication instead of inventing a date.
    expect(policyEffectiveDateIso).toBeNull();
    expect(label).toBe("본 문서를 공개한 날");
    expect(text(termsDocument)).not.toMatch(/시행일은 확정/);
  });
});

describe("terms document", () => {
  const terms = text(termsDocument);

  it("names the operating entity and the sold product", () => {
    expect(terms).toContain(businessInfo.legalName);
    expect(terms).toContain("LegendStudy LAB");
    expect(terms).toContain("LegendStudy 논술 LAB");
  });

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
    for (const topic of [
      "Credit",
      "환금성 포인트가 아니며",
      "유효기간",
      "재첨삭",
      "결제",
      "환불",
      "관계 법령에 따른 소비자의 권리",
      "미성년자",
      "계정",
      "이용자의 의무",
      "회사의 책임",
      "고객센터",
      "개인정보처리방침",
      "시행일",
    ]) {
      expect(terms).toContain(topic);
    }
  });

  it("states the minor payment clause without over-promising", () => {
    expect(terms).toContain("법정대리인의 동의가 필요할 수 있습니다");
    expect(terms).toContain("미성년자 본인 또는 법정대리인이 취소할 수 있습니다");
    expect(terms).toContain("취소가 제한되는 경우가 있습니다");
    expect(terms).not.toMatch(/미성년자는 항상 전액 환불|무조건 전액 환불|미성년자는 결제할 수 없습니다/);
  });

  it("does not let the refund policy outrank statutory rights", () => {
    expect(terms).toContain("관계 법령에 따른 소비자의 권리를 제한하지 않습니다");
    expect(terms).not.toMatch(/법률보다 우선|법령보다 우선/);
  });

  it("names the customer centre and puts e-mail before the phone", () => {
    expect(terms).toContain(customerCenter.displayName);
    for (const legacy of [
      "LegendStudy 고객센터",
      "레전드스터디 고객센터",
      "LegendStudy LAB 고객센터",
      "레전드스터디+ 고객센터",
    ]) {
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
      "처리위탁",
      "국외 처리·이전",
      "소셜 로그인",
      "이용자의 권리",
      "계정 삭제",
      "미성년자",
      "안전성 확보조치",
      "개인정보 보호책임자",
      "변경과 고지",
      "시행일",
    ]) {
      expect(privacy).toContain(topic);
    }
  });

  it("publishes the Owner-confirmed privacy officer and contact", () => {
    expect(privacy).toContain(privacyOfficer.name);
    expect(privacy).toContain(privacyOfficer.role);
    expect(privacy).toContain(privacyOfficer.channel.display);
  });

  it("states the real current processors and the real data boundaries", () => {
    for (const processor of ["Supabase", "Cloudflare", "Google Workspace", "Resend", "Apple", "Kakao"]) {
      expect(privacy).toContain(processor);
    }
    expect(privacy).toContain("논술 답안과 첨삭 결과, 성적, 학교·학년 정보도 서버에 저장하지 않습니다");
    expect(privacy).toContain("생년월일, 주민등록번호, 학생부나 공식 성적표, 보호자 정보를 수집하지 않습니다");
  });

  it("places the primary database in Seoul and never in the United States", () => {
    expect(privacy).toContain("대한민국 서울 리전");
    expect(privacy).toContain("ap-northeast-2");
    expect(privacy).not.toContain("미국");
  });

  it("does not list an inactive payment or AI provider as a current processor", () => {
    for (const inactive of [
      "Toss",
      "토스",
      "OpenAI",
      "Anthropic",
      "Gemini",
      "AdMob",
      "Sentry",
      "Crashlytics",
      "GA4",
    ]) {
      expect(privacy).not.toContain(inactive);
    }
  });

  it("never claims to collect social-login passwords or payment card numbers", () => {
    expect(privacy).toContain("비밀번호를 수집하거나 보관하지 않습니다");
    expect(privacy).toContain("카드번호 등 결제수단 정보를 직접 저장하지 않습니다");
    expect(privacy).not.toMatch(/Google.{0,20}비밀번호를 수집합니다|카드번호를 저장합니다/);
  });

  it("describes the real account-deletion path without promising an unbuilt one", () => {
    expect(privacy).toContain(customerCenter.primary.display);
    expect(privacy).toContain("자동화된 삭제 경로는 준비 중");
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