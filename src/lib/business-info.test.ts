import { describe, expect, it } from "vitest";

import {
  businessInfo,
  customerCenter,
  ecommerceRegistration,
  privacyActivationGates,
  privacyOfficer,
  productNaming,
  supportContacts,
} from "./business-info";

/**
 * Operational mailboxes must never reach a consumer-facing surface. Their
 * literal values are assembled here instead of being written into the
 * repository, so this file cannot be harvested for the addresses it forbids.
 */
const forbiddenOperationalAddresses = [
  ["admin", "legendstudy.com"].join("@"),
  ["ceo", "copacabana.co.kr"].join("@"),
  ["privacy", "legendstudy.com"].join("@"),
];

/** Consumer-facing support must carry exactly one name. */
const legacyCustomerCenterNames = [
  "LegendStudy 고객센터",
  "레전드스터디 고객센터",
  "LegendStudy LAB 고객센터",
  "레전드스터디+ 고객센터",
];

const publishedSurface = () =>
  JSON.stringify({ businessInfo, customerCenter, productNaming, supportContacts, privacyOfficer });

describe("seller identity", () => {
  it("publishes the Owner-confirmed business identity", () => {
    expect(businessInfo.legalName).toBe("주식회사 코파카바나");
    expect(businessInfo.representative).toBe("장우진");
    expect(businessInfo.businessRegistrationNumber).toBe("262-88-02453");
    expect(businessInfo.corporateRegistrationNumber).toBe("110111-8450069");
    expect(businessInfo.ecommerceRegistrationNumber).toBe("2025-서울노원-1263");
    expect(businessInfo.businessType).toBe("교육서비스업");
    expect(businessInfo.businessCategory).toBe("교육관련 자문 및 평가업");
  });

  it("publishes the Owner-confirmed address", () => {
    expect(businessInfo.address).toBe("서울특별시 노원구 화랑로 621, 서울여자대학교 고명우기념관 305호");
  });

  it("keeps the existing filing published while the change report is pending", () => {
    expect(ecommerceRegistration.number).toBe(businessInfo.ecommerceRegistrationNumber);
    expect(ecommerceRegistration.validityStatus).toBe("VALID");
    expect(ecommerceRegistration.changeReportStatus).toBe("PENDING_ADMIN_CONFIRMATION");
    expect(ecommerceRegistration.changeReportAuthority).toBe("노원구청");
  });

  it("does not invent a replacement filing number", () => {
    const serialized = JSON.stringify(ecommerceRegistration);
    expect(serialized).toContain("2025-서울노원-1263");
    expect(serialized).not.toMatch(/2026-서울/);
  });
});

describe("customer centre identity", () => {
  it("uses exactly one consumer-facing name", () => {
    expect(customerCenter.displayName).toBe("레전드스터디 랩 고객센터");
    expect(customerCenter.serviceName).toBe("레전드스터디 랩");
    expect(customerCenter.brandName).toBe("LegendStudy Lab");
  });

  it("derives the centre name from the service name", () => {
    expect(customerCenter.displayName).toBe(`${customerCenter.serviceName} 고객센터`);
  });

  it("never publishes a legacy centre name", () => {
    const serialized = publishedSurface();
    for (const legacy of legacyCustomerCenterNames) {
      expect(serialized).not.toContain(legacy);
    }
  });

  it("keeps the site brand, the sold product and the operator hierarchy distinct", () => {
    expect(customerCenter.brandName).not.toBe(customerCenter.displayName);
    expect(productNaming.essayProduct).toBe("LegendStudy 논술 LAB");
    expect(businessInfo.legalName).toBe("주식회사 코파카바나");
    expect(productNaming.separateSiteNote).toContain("legendstudy.com");
  });
});

describe("customer support channels", () => {
  it("makes e-mail the primary channel", () => {
    expect(customerCenter.primary.label).toBe("고객지원 · 결제 및 환불 문의");
    expect(customerCenter.primary.display).toBe("support@legendstudy.com");
    expect(customerCenter.primary.href).toBe("mailto:support@legendstudy.com");
    expect(customerCenter.primary.description).toBe("서비스 이용, 결제·환불, 계정, 개인정보 관련 문의");
  });

  it("keeps the general and partnership channel secondary", () => {
    expect(customerCenter.secondary.label).toBe("일반 · 제휴 문의");
    expect(customerCenter.secondary.display).toBe("contact@legendstudy.com");
    expect(customerCenter.secondary.href).toBe("mailto:contact@legendstudy.com");
    expect(customerCenter.secondary.description).toBe("서비스 일반 문의 및 제휴 제안");
  });

  it("keeps the telephone channel published but never first", () => {
    expect(customerCenter.phone.label).toBe("전화 문의");
    expect(customerCenter.phone.display).toBe("010-6469-7654");
    expect(customerCenter.phone.href).toBe("tel:01064697654");
    expect(supportContacts.map((contact) => contact.display)).toEqual([
      "support@legendstudy.com",
      "contact@legendstudy.com",
    ]);
    const channelDisplays: string[] = supportContacts.map((contact) => contact.display);
    expect(channelDisplays).not.toContain(customerCenter.phone.display);
  });

  it("never promises phone-first help or invents operating hours", () => {
    const serialized = publishedSurface();
    expect(serialized).not.toMatch(/전화 상담을 우선|언제든 전화|전화 주세요|우선 이용/);
    expect(serialized).not.toMatch(/운영시간|상담시간|평일|주말/);
    expect(serialized).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it("never exposes an operational mailbox as customer support", () => {
    const serialized = publishedSurface();
    for (const address of forbiddenOperationalAddresses) {
      expect(serialized).not.toContain(address);
    }
  });

  it("keeps every published channel actionable without JavaScript", () => {
    expect(customerCenter.primary.href.startsWith("mailto:")).toBe(true);
    expect(customerCenter.secondary.href.startsWith("mailto:")).toBe(true);
    expect(customerCenter.phone.href.startsWith("tel:")).toBe(true);
  });
});

describe("privacy officer", () => {
  it("publishes the Owner-confirmed officer and contact", () => {
    expect(privacyOfficer.name).toBe("장우진");
    expect(privacyOfficer.role).toBe("개인정보 보호책임자");
    expect(privacyOfficer.channel.display).toBe("support@legendstudy.com");
  });

  it("does not use the telephone number as the privacy contact", () => {
    expect(privacyOfficer.channel.href.startsWith("mailto:")).toBe(true);
    expect(JSON.stringify(privacyOfficer)).not.toContain(customerCenter.phone.display);
  });
});

describe("privacy activation gates", () => {
  it("lists exactly the features that must trigger a policy review", () => {
    expect([...privacyActivationGates]).toEqual([
      "Toss Payments Production 결제",
      "Production AI 평가 provider",
      "Math private image/PDF Storage",
      "external Vision/OCR provider",
      "AdMob",
      "GA4 또는 기타 analytics",
      "push notification provider",
      "external crash/error collection provider",
    ]);
  });

  it("is internal release information, not public policy copy", () => {
    // The gate list is documentation. It must never be rendered, so the
    // published surfaces may not carry its wording.
    const serialized = publishedSurface();
    for (const gate of privacyActivationGates) {
      expect(serialized).not.toContain(gate);
    }
  });

  it("no longer treats support hours as an open item", () => {
    const serialized = publishedSurface();
    expect(serialized).not.toMatch(/SUPPORT_HOURS/);
    expect(serialized).not.toMatch(/OWNER_PENDING|OWNER_DATA_REQUIRED/);
  });
});

describe("product naming", () => {
  it("keeps the essay product distinct from the whole LAB platform", () => {
    expect(productNaming.essayProduct).toBe("LegendStudy 논술 LAB");
    expect(productNaming.separateSiteNote).toContain("legendstudy.com");
  });
});