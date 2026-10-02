import Link from "next/link";

import { BusinessInfoList, ContactList } from "@/components/business-info-block";
import { buildPublicMetadata } from "@/lib/brand";
import { businessInfo, ecommerceRegistration, pendingOwnerData, supportContacts, supportEnquiryTypes, supportPhone } from "@/lib/business-info";
import { pricingPlans, pricingPolicy, refundPolicy } from "@/lib/pricing";

export const metadata = buildPublicMetadata(
  "LegendStudy 고객지원",
  "LegendStudy LAB 고객센터 연락처와 문의 유형, 결제·환불·계정·개인정보 문의 접수와 처리 절차를 안내합니다.",
  "/support",
);

/** Operating hours are deliberately absent: the Owner has not confirmed them. */
const supportHoursPending = pendingOwnerData.find((item) => item.key === "SUPPORT_HOURS");

export default function SupportPage() {
  return (
    <div className="policy-page content-wrap content-wrap--detail support-page">
      <p className="eyebrow eyebrow--accent">LEGENDSTUDY LAB / SUPPORT</p>
      <div className="policy-page__heading">
        <h1>고객센터</h1>
      </div>
      <p className="policy-page__lead">
        {businessInfo.legalName}가 운영하는 LegendStudy LAB 고객센터입니다. 서비스 이용, 결제, 환불, 계정, 개인정보에
        관한 문의를 접수합니다.
      </p>

      <section className="policy-section" aria-labelledby="support-contact">
        <h2 id="support-contact">연락처</h2>
        <ContactList />
        <p className="pricing-note">
          전화 연결이 어려운 경우 이메일로 문의해 주시면 확인 후 회신드립니다.
          {supportHoursPending ? " 상담 운영시간은 확정 후 이 페이지에 안내합니다." : null}
        </p>
      </section>

      <section className="policy-section" aria-labelledby="support-topics">
        <h2 id="support-topics">문의 유형</h2>
        <ul className="tag-row" aria-label="문의 유형">
          {supportEnquiryTypes.map((type) => <li className="tag" key={type}>{type}</li>)}
        </ul>
        <p>
          결제와 환불 문의는 결제 내역을 확인할 수 있도록 가입한 이메일 주소를 함께 알려주세요. 답안이나 첨삭 결과에
          관한 문의는 문제명과 제출 시점을 알려주시면 확인이 빠릅니다.
        </p>
      </section>

      <section className="policy-section" aria-labelledby="support-refund">
        <h2 id="support-refund">환불 문의</h2>
        <ul className="policy-list">
          <li>
            환불은 {refundPolicy.requestWindow}에 {supportContacts[0].display} 또는 {supportPhone.display}로 신청할 수
            있습니다.
          </li>
          <li>{refundPolicy.partiallyUsed}</li>
          <li>{refundPolicy.zeroOrNegative}</li>
          <li>{refundPolicy.processing} {refundPolicy.processingCaveat}</li>
          <li>{refundPolicy.freeCredit}</li>
        </ul>
        <div className="policy-actions">
          <Link className="button button--outline" href="/refund/">환불정책 자세히 보기</Link>
        </div>
      </section>

      <section className="policy-section" aria-labelledby="support-process">
        <h2 id="support-process">접수와 처리 절차</h2>
        <ol className="process-list">
          <li>
            <strong>문의 접수</strong>
            <span>전화 또는 이메일로 문의를 접수합니다.</span>
          </li>
          <li>
            <strong>내용 확인</strong>
            <span>가입 계정과 결제·이용 내역을 확인하고 추가로 필요한 정보를 요청할 수 있습니다.</span>
          </li>
          <li>
            <strong>안내와 조치</strong>
            <span>처리 결과 또는 환불 산정 내역을 안내하고 필요한 조치를 진행합니다.</span>
          </li>
        </ol>
      </section>

      <section className="policy-section" aria-labelledby="support-links">
        <h2 id="support-links">관련 안내</h2>
        <div className="policy-actions">
          <Link className="button button--outline" href="/pricing/">요금 안내</Link>
          <Link className="button button--outline" href="/refund/">환불정책</Link>
          <Link className="button button--outline" href="/terms/">이용약관</Link>
          <Link className="button button--outline" href="/privacy/">개인정보처리방침</Link>
          <Link className="button button--outline" href="/account-deletion/">계정 삭제 안내</Link>
        </div>
        <p className="pricing-note">
          판매 상품: Credit 충전형 논술 첨삭 이용권({pricingPlans.map((plan) => plan.credits).join(" / ")} Credits).
          구매한 Credit은 결제일로부터 {pricingPolicy.paidCreditValidityMonths}개월 동안 사용할 수 있습니다.{" "}
          {ecommerceRegistration.note}
        </p>
      </section>

      <section className="policy-section" aria-labelledby="support-business">
        <h2 id="support-business">사업자 정보</h2>
        <BusinessInfoList />
      </section>
    </div>
  );
}