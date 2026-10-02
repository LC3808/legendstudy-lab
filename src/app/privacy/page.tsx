import Link from "next/link";

import { PolicyDocument } from "@/components/policy-document";
import { buildPublicMetadata } from "@/lib/brand";
import { privacyDocument } from "@/lib/legal-documents";

export const metadata = buildPublicMetadata(
  "LegendStudy 개인정보처리방침",
  "LegendStudy LAB이 처리하는 개인정보의 항목과 목적, 보유기간, 외부 서비스와 국외 처리, 개인정보 보호책임자를 안내합니다.",
  "/privacy",
);

export default function PrivacyPage() {
  return (
    <div className="policy-page content-wrap content-wrap--detail privacy-page">
      <PolicyDocument document={privacyDocument} />
      <section className="policy-section" aria-labelledby="privacy-related">
        <h2 id="privacy-related">함께 확인할 문서</h2>
        <div className="policy-actions">
          <Link className="button button--outline" href="/terms/">이용약관</Link>
          <Link className="button button--outline" href="/refund/">환불정책</Link>
          <Link className="button button--outline" href="/support/">고객센터</Link>
          <Link className="button button--outline" href="/account-deletion/">계정 삭제 안내</Link>
        </div>
      </section>
    </div>
  );
}