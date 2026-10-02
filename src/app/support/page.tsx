import Link from "next/link";

import { BusinessInfoList, ContactList } from "@/components/business-info-block";
import { buildPublicMetadata } from "@/lib/brand";
import { businessInfo, customerCenter } from "@/lib/business-info";
import { refundPolicy } from "@/lib/pricing";

export const metadata = buildPublicMetadata(
  customerCenter.displayName,
  "레전드스터디 랩 고객센터 연락처와 환불 규정, 문의 접수 처리 절차를 안내합니다.",
  "/support",
);

/**
 * Consumer-facing support page. Deliberately short: the two contact channels
 * sit directly under the heading, and only what a customer needs in order to
 * reach support or understand the refund rules is kept. Operational process
 * detail and repeated contact blocks were removed.
 */
export default function SupportPage() {
  return (
    <div className="policy-page content-wrap content-wrap--detail support-page">
      <p className="eyebrow eyebrow--accent">LEGENDSTUDY LAB / SUPPORT</p>
      <div className="policy-page__heading">
        <h1>{customerCenter.displayName}</h1>
      </div>
      <p className="policy-page__lead">
        {businessInfo.legalName}가 운영하는 레전드스터디 랩 고객센터입니다. 서비스 이용, 결제·환불, 계정, 개인정보 관련
        문의를 접수합니다.
      </p>

      <ContactList />

      <section className="policy-section" aria-labelledby="support-refund-rules">
        <h2 id="support-refund-rules">환불 규정</h2>
        <div className="refund-summary">
          <p>
            <span>미사용 Credit</span>
            <strong>{refundPolicy.unused}</strong>
          </p>
          <p>
            <span>일부 사용</span>
            <strong>{refundPolicy.partialFormula}</strong>
          </p>
        </div>
        <ul className="policy-list">
          <li>{refundPolicy.requestWindow}에 환불을 신청할 수 있습니다.</li>
          <li>{refundPolicy.zeroOrNegative}</li>
          <li>{refundPolicy.freeCredit}</li>
          <li>{refundPolicy.usedCreditRule}</li>
        </ul>
        <div className="policy-actions">
          <Link className="button button--outline" href="/refund/">환불정책 자세히 보기</Link>
        </div>
      </section>

      <section className="policy-section" aria-labelledby="support-process">
        <h2 id="support-process">문의 접수 처리 절차</h2>
        <div className="process-flow">
          <ol className="process-flow__steps" role="list">
            <li>문의 접수</li>
            <li>내용 확인</li>
            <li>안내 및 처리</li>
          </ol>
          <p className="process-flow__note">
            이메일로 문의를 접수하면 가입 계정과 필요한 내용을 확인한 후 처리 결과 또는 필요한 조치를 안내합니다.
          </p>
        </div>
      </section>

      <section className="policy-section" aria-labelledby="support-links">
        <h2 id="support-links">기타 안내</h2>
        <div className="policy-actions">
          <Link className="button button--outline" href="/pricing/">요금 안내</Link>
          <Link className="button button--outline" href="/refund/">환불정책</Link>
          <Link className="button button--outline" href="/terms/">이용약관</Link>
          <Link className="button button--outline" href="/privacy/">개인정보처리방침</Link>
          <Link className="button button--outline" href="/account-deletion/">계정 삭제 안내</Link>
        </div>
      </section>

      <section className="policy-section" aria-labelledby="support-business">
        <h2 id="support-business">사업자 정보</h2>
        <BusinessInfoList />
      </section>
    </div>
  );
}