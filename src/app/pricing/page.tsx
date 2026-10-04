import Link from "next/link";

import { BusinessInfoList, ContactList } from "@/components/business-info-block";
import { PricingPromoForm } from "@/components/pricing-promo-form";
import { buildPublicMetadata } from "@/lib/brand";
import { customerCenter } from "@/lib/business-info";
import {
  creditCopy,
  heroCopy,
  paymentState,
  pricingPlans,
  pricingPolicy,
  promotionCopy,
  refundPolicy,
} from "@/lib/pricing";

export const metadata = buildPublicMetadata(
  "LegendStudy 논술 LAB 요금 안내",
  "LegendStudy LAB 논술 첨삭의 Credit 판매 가격과 이용 기간, 재첨삭 조건, 환불 정책을 안내합니다.",
  "/pricing",
);

/** Sold packs, in price order. Cards and the comparison table share this source. */
const plans = pricingPlans;

/**
 * Public pricing guide.
 *
 * This page states the commercial offer a consumer needs — price, what a pack
 * contains, how Credit is used, the reevaluation window, refunds and who to
 * contact. It deliberately does not narrate the internal build state, the
 * payment runtime, the release roadmap or any excluded product: those belong in
 * the repository and in the payment handoff document, not on a shopping page.
 *
 * The page therefore carries no purchase button while payment is not connected.
 * A disabled control labelled with a runtime state would describe the build to a
 * consumer, and an enabled one would be a fake purchase.
 */
export default function PricingPage() {
  return (
    <div className="policy-page content-wrap content-wrap--detail pricing-page">
      <p className="eyebrow eyebrow--accent">LEGENDSTUDY LAB / PRICING</p>
      <div className="policy-page__heading">
        <h1>
          {heroCopy.titleLine1}
          <br />
          {heroCopy.titleLine2}
        </h1>
      </div>
      <p className="policy-page__lead">{heroCopy.description}</p>

      <section className="pricing-free" aria-labelledby="pricing-free-title">
        <h2 id="pricing-free-title">신규 가입 {pricingPolicy.freeSignupCredits} Credits 무료</h2>
      </section>

      <section className="policy-section" aria-labelledby="pricing-plans-title">
        <h2 id="pricing-plans-title">Credit 판매 가격</h2>
        <p className="pricing-section__lead">
          팩에 따라 제공되는 기능은 같고, 구매 수량이 늘어날수록 Credit당 가격이 낮아집니다.
        </p>
        <div className="pricing-plans">
          {plans.map((plan) => (
            <article className="pricing-plan" key={plan.id} aria-labelledby={`pricing-plan-${plan.id}`}>
              <h3 className="pricing-plan__name" id={`pricing-plan-${plan.id}`}>
                {plan.name}
                {plan.recommended ? <span className="pricing-plan__badge">추천</span> : null}
              </h3>
              <p className="pricing-plan__price">{plan.priceLabel}</p>
              <p className="pricing-plan__unit">Credit당 {plan.perCreditLabel}</p>
              <p className="pricing-plan__value">{plan.valueLine}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="policy-section" aria-labelledby="pricing-credit-title">
        <h2 id="pricing-credit-title">1 Credit 이용 범위</h2>
        <div className="pricing-facts">
          <div className="pricing-fact">
            <h3>1 Credit으로 이용할 수 있는 범위</h3>
            <p className="pricing-fact__statement">{creditCopy.primary}</p>
          </div>
          <div className="pricing-fact">
            <h3>재첨삭 방법과 기간</h3>
            <p className="pricing-fact__statement">{creditCopy.reevaluation}</p>
          </div>
        </div>
      </section>

      <section className="policy-section" aria-labelledby="pricing-compare-title">
        <h2 id="pricing-compare-title">Credit 상세 비교</h2>
        <div
          className="pricing-table-scroll"
          role="region"
          aria-label="Credit 팩 상세 비교 표"
          tabIndex={0}
        >
          <table className="pricing-table">
            <caption>
              Credit 팩별 결제 금액과 이용할 수 있는 답안 수입니다. 표는 좌우로 스크롤해 확인할 수 있습니다.
            </caption>
            <thead>
              <tr>
                <th scope="col">항목</th>
                {plans.map((plan) => (
                  <th scope="col" key={plan.id}>
                    {plan.name}
                    {plan.recommended ? <span className="pricing-plan__badge">추천</span> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Credit</th>
                {plans.map((plan) => <td key={plan.id}>{plan.credits}</td>)}
              </tr>
              <tr>
                <th scope="row">결제 금액</th>
                {plans.map((plan) => <td key={plan.id}>{plan.priceLabel}</td>)}
              </tr>
              <tr>
                <th scope="row">Credit당 가격</th>
                {plans.map((plan) => <td key={plan.id}>{plan.perCreditLabel}</td>)}
              </tr>
              <tr>
                <th scope="row">이용할 수 있는 답안</th>
                {plans.map((plan) => <td key={plan.id}>{plan.credits}개</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="pricing-note">
          모든 Credit 상품은 동일한 서비스 범위를 제공하며, 구매 수량만 다릅니다.
        </p>
      </section>

      <section className="policy-section" aria-labelledby="pricing-how-title">
        <h2 id="pricing-how-title">이용 방법</h2>
        <ol className="process-list">
          <li>
            <strong>최초 첨삭</strong>
            <span>답안을 확인하고 대학별 평가·채점 기준에 맞춰 첨삭 결과와 개선점을 확인합니다.</span>
          </li>
          <li>
            <strong>답안 수정</strong>
            <span>제시된 첨삭 방향에 맞춰 답안을 고쳐 쓰거나 다시 풀어봅니다.</span>
          </li>
          <li>
            <strong>재첨삭</strong>
            <span>수정한 답안을 다시 제출하면 대학별 평가·채점 기준에 맞춰 재평가합니다.</span>
          </li>
        </ol>
      </section>

      <section className="policy-section" aria-labelledby="pricing-credit-policy-title">
        <h2 id="pricing-credit-policy-title">Credit 이용 조건</h2>
        <ul className="policy-list">
          <li>{creditCopy.validity}</li>
          <li>유효기간은 결제일을 기준으로 계산하며, 구매한 Credit은 여러 답안에 나누어 사용할 수 있습니다.</li>
          <li>
            재첨삭은 최초 첨삭 결과 제공일로부터 {pricingPolicy.reevaluationWindowDays}일 이내에 1회 제공되며, 추가
            Credit은 차감되지 않습니다. Credit 유효기간과는 별개로 계산합니다.
          </li>
          <li>{creditCopy.oneOffPurchase}</li>
        </ul>
        <dl className="pricing-summary">
          <div>
            <dt>Credit 사용 기준</dt>
            <dd>{refundPolicy.usedCreditRule}</dd>
          </div>
        </dl>
      </section>

      <section className="policy-section pricing-promo-section" aria-labelledby="pricing-promo-title">
        <h2 id="pricing-promo-title">{promotionCopy.title}</h2>
        <div className="pricing-promo">
          <p className="pricing-promo__lead">{promotionCopy.lead}</p>
          <PricingPromoForm />
        </div>
      </section>

      <section className="policy-section" aria-labelledby="pricing-refund-title" id="refund-policy">
        <h2 id="pricing-refund-title">결제 및 환불 안내</h2>
        <ul className="policy-list">
          <li>{creditCopy.validity}</li>
          <li>유효기간 내에 환불을 신청할 수 있습니다.</li>
          <li>미사용 Credit 상품은 실제 결제금액 전액을 환불합니다.</li>
          <li>{refundPolicy.partiallyUsed}</li>
          <li>{refundPolicy.freeCredit}</li>
          <li>{creditCopy.statutoryRights}</li>
        </ul>
        <p className="pricing-note">
          {refundPolicy.processing} {refundPolicy.processingCaveat} 전체 조건은 환불정책에서 확인할 수 있습니다.
        </p>
        <div className="policy-actions">
          <Link className="button button--outline" href="/refund/">환불정책 자세히 보기</Link>
        </div>
      </section>

      <section className="policy-section" aria-labelledby="pricing-faq-title">
        <h2 id="pricing-faq-title">자주 묻는 질문</h2>
        <div className="pricing-faq">
          <details>
            <summary>1 Credit으로 무엇을 이용할 수 있나요?</summary>
            <p>{creditCopy.primary} {creditCopy.reevaluation}</p>
          </details>
          <details>
            <summary>재첨삭은 언제까지 받을 수 있나요?</summary>
            <p>
              재첨삭은 최초 첨삭 결과 제공일로부터 {pricingPolicy.reevaluationWindowDays}일 이내에 1회 제공되며, 추가
              Credit은 차감되지 않습니다.
            </p>
          </details>
          <details>
            <summary>구매한 Credit은 언제까지 사용할 수 있나요?</summary>
            <p>
              {creditCopy.validity} 유효기간은 결제일을 기준으로 계산하며, 여러 답안에 나누어 사용할 수 있습니다.
            </p>
          </details>
          <details>
            <summary>무료로 받은 Credit도 유효기간이 있나요?</summary>
            <p>{creditCopy.freeCreditTerms}</p>
          </details>
          <details>
            <summary>정기결제인가요?</summary>
            <p>{creditCopy.oneOffPurchase}</p>
          </details>
          <details>
            <summary>환불은 어떻게 신청하나요?</summary>
            <p>
              유료 Credit 유효기간 내에 신청할 수 있습니다. 미사용이면 실제 결제금액을 전액 환불하고, 일부 사용한
              경우에는 사용한 Credit을 {pricingPolicy.refundDeductionPerCreditKrw.toLocaleString("ko-KR")}원 기준으로
              공제한 뒤 남은 금액을 환불합니다. {refundPolicy.processing} {creditCopy.statutoryRights}
            </p>
          </details>
          <details>
            <summary>인문논술과 수리논술을 모두 이용할 수 있나요?</summary>
            <p>
              Credit은 논술 첨삭에 사용하며, 인문논술과 수리논술을 별도 상품으로 나누지 않습니다. 어떤 Credit 상품을
              구매해도 이용할 수 있는 범위는 같습니다.
            </p>
          </details>
          <details>
            <summary>쿠폰 번호는 어떻게 사용하나요?</summary>
            <p>
              학교나 이벤트에서 받은 쿠폰 번호를 위 입력란에 입력하면 됩니다. {paymentState.promotionNote}
            </p>
          </details>
        </div>
      </section>

      <section className="policy-section" aria-labelledby="pricing-contact-title">
        <h2 id="pricing-contact-title">{customerCenter.displayName}</h2>
        <ContactList />
      </section>

      <nav className="policy-actions pricing-policy-nav" aria-label="정책 문서">
        <Link className="button button--outline" href="/terms/">이용약관</Link>
        <Link className="button button--outline" href="/privacy/">개인정보처리방침</Link>
        <Link className="button button--outline" href="/refund/">환불정책</Link>
        <Link className="button button--outline" href="/support/">고객센터</Link>
      </nav>

      <section className="policy-section pricing-business" aria-labelledby="pricing-business-title">
        <h2 id="pricing-business-title">사업자정보</h2>
        <BusinessInfoList />
      </section>
    </div>
  );
}
