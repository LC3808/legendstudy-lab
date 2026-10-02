import { describe, expect, it } from "vitest";

import {
  businessInfo,
  ecommerceRegistration,
  ownerPendingLabel,
  pendingOwnerData,
  pendingOwnerKeys,
  productNaming,
  supportContacts,
  supportEnquiryTypes,
  supportPhone,
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
    expect(serialized).not.toMatch(/제?\s?2025-\d{2,4}-[0-9]{3,}/);
  });
});

describe("customer support channels", () => {
  it("publishes the Owner-confirmed consumer channels", () => {
    expect(supportPhone.display).toBe("010-6469-7654");
    expect(supportPhone.href).toBe("tel:01064697654");
    expect(supportContacts.map((contact) => contact.display)).toEqual([
      "support@legendstudy.com",
      "contact@legendstudy.com",
    ]);
    expect(supportContacts.map((contact) => contact.href)).toEqual([
      "mailto:support@legendstudy.com",
      "mailto:contact@legendstudy.com",
    ]);
  });

  it("never exposes an operational mailbox as customer support", () => {
    const serialized = JSON.stringify({ supportContacts, supportPhone });
    for (const address of forbiddenOperationalAddresses) {
      expect(serialized).not.toContain(address);
    }
  });

  it("does not invent support hours", () => {
    const serialized = JSON.stringify({ supportContacts, supportPhone, supportEnquiryTypes });
    expect(serialized).not.toMatch(/운영시간|상담시간|평일|주말/);
    expect(serialized).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it("offers the enquiry categories the support page renders", () => {
    expect(supportEnquiryTypes).toEqual(["서비스 이용", "결제", "환불·취소", "계정", "개인정보", "기타"]);
  });

  it("keeps every published contact reachable without JavaScript", () => {
    for (const contact of supportContacts) {
      expect(contact.href.startsWith("mailto:")).toBe(true);
    }
    expect(supportPhone.href.startsWith("tel:")).toBe(true);
  });
});

describe("pending Owner data", () => {
  it("lists exactly the unconfirmed items", () => {
    expect(pendingOwnerKeys).toEqual([
      "PRIVACY_OFFICER",
      "POLICY_EFFECTIVE_DATE",
      "MINOR_PAYMENT_CLAUSE",
      "PROCESSOR_AND_TRANSFER_DETAIL",
      "SUPPORT_HOURS",
    ]);
  });

  it("never carries an invented value", () => {
    for (const item of pendingOwnerData) {
      expect(item).not.toHaveProperty("value");
      expect(item.reason.length).toBeGreaterThan(20);
      expect(item.requiredFor === "TOSS_REVIEW" || item.requiredFor === "GO_LIVE").toBe(true);
    }
  });

  it("uses one pending label everywhere", () => {
    expect(ownerPendingLabel).toBe("Owner 확정 후 게시");
  });
});

describe("product naming", () => {
  it("keeps the essay product distinct from the whole LAB platform", () => {
    expect(productNaming.essayProduct).toBe("LegendStudy 논술 LAB");
    expect(productNaming.separateSiteNote).toContain("legendstudy.com");
  });
});
