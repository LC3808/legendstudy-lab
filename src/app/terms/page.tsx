import Link from "next/link";

import { PolicyDocument } from "@/components/policy-document";
import { buildPublicMetadata } from "@/lib/brand";
import { termsDocument } from "@/lib/legal-documents";

export const metadata = buildPublicMetadata(
  "LegendStudy 이용약관",
  "LegendStudy LAB 논술 첨삭 상품의 이용 조건, Credit 이용기간과 재첨삭, 결제와 환불, 미성년자 이용과 이용자의 의무를 안내합니다.",
  "/terms",
);

export default function TermsPage() {
  return (
    <div className="policy-page content-wrap content-wrap--detail terms-page">
      <PolicyDocument document={termsDocument} />
      <section className="policy-section" aria-labelledby="terms-related">
        <h2 id="terms-related">함께 확인할 문서</h2>
        <div className="policy-actions">
          <Link className="button button--outline" href="/privacy/">개인정보처리방침</Link>
          <Link className="button button--outline" href="/refund/">환불정책</Link>
          <Link className="button button--outline" href="/pricing/">요금 안내</Link>
          <Link className="button button--outline" href="/support/">고객센터</Link>
        </div>
      </section>
    </div>
  );
}