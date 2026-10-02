import Link from "next/link";

import { PolicyDocument } from "@/components/policy-document";
import { ReleaseNotice } from "@/components/release-status";
import { buildPublicMetadata } from "@/lib/brand";
import { privacyDocument } from "@/lib/legal-documents";

export const metadata = buildPublicMetadata(
  "LegendStudy 개인정보처리방침",
  "LegendStudy LAB이 처리하는 개인정보의 항목과 목적, 보유기간, 처리위탁과 국외 이전, 이용자의 권리를 안내합니다.",
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
      <ReleaseNotice>
        <strong>LEGAL_REVIEW_RECOMMENDED.</strong> 이 방침은 저장소에 기록된 실제 인증·데이터 흐름을 기준으로
        작성했지만 법률·개인정보 검토를 거친 문서가 아닙니다. 개인정보 보호책임자 지정, 국외 이전의 저장 위치 세부,
        미성년자 처리 기준은 확정 후 반영합니다. 확인되지 않은 수집 항목이나 처리위탁 사업자는 임의로 기재하지
        않았습니다.
      </ReleaseNotice>
    </div>
  );
}