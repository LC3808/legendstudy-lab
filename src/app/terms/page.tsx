import Link from "next/link";

import { PolicyDocument } from "@/components/policy-document";
import { ReleaseNotice } from "@/components/release-status";
import { buildPublicMetadata } from "@/lib/brand";
import { termsDocument } from "@/lib/legal-documents";

export const metadata = buildPublicMetadata(
  "LegendStudy 이용약관",
  "LegendStudy LAB 논술 첨삭 상품의 이용 조건, Credit 이용기간과 재첨삭, 결제와 환불, 이용자의 의무를 안내합니다.",
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
      <ReleaseNotice>
        <strong>LEGAL_REVIEW_RECOMMENDED.</strong> 이 약관은 운영자가 확정한 상품 조건과 실제 서비스 상태를 기준으로
        작성했지만 법률 검토를 거친 문서가 아닙니다. 청약철회 기간과 그 제한 범위, 미성년자 결제와 법정대리인 동의
        절차, 분쟁 해결 조항의 최종 문구는 법률 검토 후 확정합니다.
      </ReleaseNotice>
    </div>
  );
}