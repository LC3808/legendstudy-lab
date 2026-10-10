import Link from "next/link";

import { BusinessInfoList, ContactList } from "@/components/business-info-block";
import { buildPublicMetadata } from "@/lib/brand";
import { businessInfo, customerCenter } from "@/lib/business-info";
import { pricingPlans, pricingPolicy, refundExamples, refundPolicy } from "@/lib/pricing";

export const metadata = buildPublicMetadata(
  "LegendStudy 논술 LAB 환불정책",
  "LegendStudy LAB Credit 구매의 환불 신청 기간과 미사용·일부 사용 환불 기준, 처리 절차를 안내합니다.",
  "/refund",
);

export default function RefundPage() {
  const fullPrice = pricingPolicy.refundDeductionPerCreditKrw;

  return (
    <div className="policy-page content-wrap content-wrap--detail refund-page">
      <p className="eyebrow eyebrow--accent">LEGENDSTUDY LAB / REFUND</p>
      <div className="policy-page__heading">
        <h1>환불정책</h1>
      </div>
      <p className="policy-page__lead">
        LegendStudy LAB의 Credit 판매에 적용되는 환불 기준입니다.
      </p>

      <section className="policy-section">
        <h2>적용 범위</h2>
        <p>
          이 정책은 LegendStudy LAB이 판매하는 일회성 Credit 상품에 적용됩니다. 정기 구독이나 자동 갱신 결제는
          제공하지 않습니다.
        </p>
        <dl className="pricing-summary">
          <div>
            <dt>판매 상품</dt>
            <dd>Credit 충전형 논술 첨삭 이용권 (1 / 3 / 5 / 10 Credits)</dd>
          </div>
          <div>
            <dt>판매 가격</dt>
            <dd>{pricingPlans.map((plan) => `${plan.credits} Credits ${plan.priceLabel}`).join(" · ")}</dd>
          </div>
          <div>
            <dt>이용기간</dt>
            <dd>
              구매한 Credit은 결제일로부터 {pricingPolicy.paidCreditValidityMonths}개월 동안 사용할 수 있습니다. 신규
              가입 시 무료로 지급되는 {pricingPolicy.freeSignupCredits} Credits는 유효기간이 없습니다.
            </dd>
          </div>
        </dl>
      </section>

      <section className="policy-section">
        <h2>환불 신청 기간</h2>
        <ul className="policy-list">
          <li>{refundPolicy.requestWindow}에 환불을 신청할 수 있습니다.</li>
          <li>구매한 Credit을 하나도 사용하지 않은 경우와 일부만 사용한 경우로 나누어 환불금을 계산합니다.</li>
          <li>구매한 Credit을 모두 사용한 경우에는 환불할 잔액이 없습니다.</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>미사용 Credit 환불</h2>
        <p>{refundPolicy.unused}합니다. 결제 수단과 결제 내역을 확인한 뒤 환불을 진행합니다.</p>
      </section>

      <section className="policy-section">
        <h2>일부 사용한 경우 환불</h2>
        <p>
          사용한 Credit은 할인 적용 단가가 아니라 1 Credit 정상가({fullPrice.toLocaleString("ko-KR")}원) 기준으로
          공제합니다.
        </p>
        <div className="refund-formula">
          <code>환불액 = 실제 결제금액 - (사용한 Credit 수 × {fullPrice.toLocaleString("ko-KR")}원)</code>
          <p>{refundPolicy.zeroOrNegative}</p>
        </div>
        <ul className="policy-list">
          {refundExamples.map((example) => (
            <li key={example.description}>
              {example.description}: {example.paidKrw.toLocaleString("ko-KR")}원 - ({example.usedCredits} ×{" "}
              {fullPrice.toLocaleString("ko-KR")}원) = <strong>{example.refundKrw.toLocaleString("ko-KR")}원 환불</strong>
            </li>
          ))}
        </ul>
      </section>

      <section className="policy-section">
        <h2>사용한 Credit으로 보는 기준</h2>
        <ul className="policy-list">
          <li>1 Credit은 최초 첨삭과 동일 답안 재첨삭 1회로 구성됩니다.</li>
          <li>{refundPolicy.usedCreditRule}</li>
          <li>포함된 재첨삭은 별도의 Credit으로 계산하지 않습니다.</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>무료로 지급된 Credit</h2>
        <p>
          {refundPolicy.freeCredit} 무료 Credit으로 받은 최초 첨삭의 재첨삭은 최초 첨삭 결과 제공일로부터{" "}
          {pricingPolicy.reevaluationWindowDays}일 이내에 이용할 수 있습니다.
        </p>
      </section>

      <section className="policy-section">
        <h2>환불 처리 절차와 기간</h2>
        <ol className="process-list">
          <li>
            <strong>환불 신청</strong>
            <span>유료 Credit 유효기간 내에 {customerCenter.displayName}로 환불 의사를 전달합니다.</span>
          </li>
          <li>
            <strong>결제·사용 내역 확인</strong>
            <span>결제 내역과 사용한 Credit 수를 확인해 환불금을 산정합니다.</span>
          </li>
          <li>
            <strong>환불 승인</strong>
            <span>산정된 환불금을 안내하고 환불을 승인합니다.</span>
          </li>
          <li>
            <strong>환불 처리</strong>
            <span>{refundPolicy.processing} {refundPolicy.processingCaveat}</span>
          </li>
        </ol>
      </section>

      <section className="policy-section">
        <h2>소비자 권리</h2>
        <p>
          관계 법령에 따라 별도의 청약철회, 계약 취소 또는 환급 사유가 인정되는 경우에는 해당 법령이 적용됩니다.
          이 정책은 관계 법령에 따른 소비자의 권리를 제한하지 않으며, 법령상 권리가 이 정책의 상업적 기준과 다르게
          적용되는 경우에는 법령이 우선합니다.
        </p>
      </section>

      <section className="policy-section">
        <h2>환불 문의</h2>
        <p>
          환불 문의 및 신청은 {customerCenter.primary.display}으로 접수해 주세요. 결제 내역과 사용한 Credit 수를
          확인할 수 있도록 가입한 이메일 주소를 함께 알려주세요.
        </p>
        <ContactList showName />
        <div className="policy-actions">
          <Link className="button button--outline" href="/pricing/">요금 안내 보기</Link>
          <Link className="button button--outline" href="/support/">고객센터</Link>
        </div>
      </section>

      <section className="policy-section">
        <h2>판매 주체</h2>
        <p>이 환불정책이 적용되는 상품의 판매 주체는 {businessInfo.legalName}입니다.</p>
        <BusinessInfoList />
      </section>

    </div>
  );
}
