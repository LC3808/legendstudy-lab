"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { appendReturnPath } from "@/lib/return-to";

import { PlanCard } from "@/components/plan-card";
import { getBrowserAuthClient } from "@/lib/browser-auth-client";
import { checkoutNotice, checkoutOpen, paymentRuntime, type PaymentRuntime } from "@/lib/payment-runtime";
import { defaultSelectedCredits, pricingPlans, pricingPolicy, purchaseCta } from "@/lib/pricing";

type Order = {
  mode?: "TEST" | "LIVE";
  id: string;
  order_id: string;
  state: string;
  amount: number;
  quantity: number;
  grant_state: string;
};
type Checkout = {
  clientKey: string;
  customerKey: string;
  orderId: string;
  orderName: string;
  amount: { currency: string; value: number };
  successUrl: string;
  failUrl: string;
};

declare global {
  interface Window {
    TossPayments?: (key: string) => {
      payment: (options: { customerKey: string }) => {
        requestPayment: (
          options: Omit<Checkout, "clientKey" | "customerKey"> & { method: string },
        ) => Promise<void>;
      };
    };
  }
}

/** Reads the SKU from the card link. Only a SKU is ever taken from the URL. */
function creditsFromSku(sku: string | null) {
  if (!sku || !/^\d{1,2}c$/.test(sku)) return null;
  const credits = Number(sku.slice(0, -1));
  return pricingPlans.some((plan) => plan.credits === credits) ? credits : null;
}

class StaleOrderError extends Error {}

async function call(action: string, payload: object): Promise<{ order: Order; checkout?: Checkout }> {
  const auth = getBrowserAuthClient();
  const session = await auth?.auth.getSession();
  if (!session?.data.session) throw new Error("로그인 후 다시 시도해 주세요.");
  const r = await fetch(`/api/payments/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.data.session.access_token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const body = await r.json().catch(() => null);
    if (action === "orders" && r.status === 409 && body?.error === "ORDER_NOT_CHECKOUT_READY") {
      throw new StaleOrderError("새 주문이 필요합니다.");
    }
    throw new Error(r.status === 401 ? "결제 서버에서 인증을 확인하지 못했습니다. (ORDERS_HTTP_401)" : "결제 준비 중입니다.");
  }
  return r.json();
}

async function loadSdk() {
  if (window.TossPayments) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v2/standard";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("결제창을 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}

/** One checkout controller for Pricing and the compatibility checkout route.
 * Orders/SDK/session/return URLs remain on the existing server-snapshot path.
 */
export function PaymentCheckout({ embedded = false }: { embedded?: boolean }) {
  return <Suspense fallback={<div className="pricing-plans">{pricingPlans.map((plan) =>
    <PlanCard key={plan.id} plan={plan} selected={plan.credits === defaultSelectedCredits} headingId={`pending-plan-${plan.id}`}>
      <button className="button button--outline plan-card__button" disabled>{plan.credits === defaultSelectedCredits ? purchaseCta.payLabel : purchaseCta.selectLabel}</button>
    </PlanCard>
  )}</div>}><CheckoutQuery embedded={embedded} /></Suspense>;
}

function CheckoutQuery({ embedded }: { embedded: boolean }) {
  const params = useSearchParams();
  const initialCredits = creditsFromSku(params?.get("sku") ?? null) ?? defaultSelectedCredits;
  return <CheckoutContent key={initialCredits} embedded={embedded} initialCredits={initialCredits} />;
}

function CheckoutContent({ embedded, initialCredits }: { embedded: boolean; initialCredits: number }) {
  const [runtime, setRuntime] = useState<PaymentRuntime | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [credits, setCredits] = useState(initialCredits);
  const paying = useRef(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void paymentRuntime().then((next) => {
      if (alive) setRuntime(next);
    });
    const client = getBrowserAuthClient();
    void (client ? client.auth.getSession() : Promise.resolve({ data: { session: null } }))
      .then((s) => {
        if (alive) setSignedIn(Boolean(s.data.session));
      })
      .catch(() => {
        if (alive) setSignedIn(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const plan = useMemo(() => pricingPlans.find((p) => p.credits === credits) ?? pricingPlans[0], [credits]);
  const available = runtime !== null && checkoutOpen(runtime.state, runtime.consumerPurchase);
  const payable = available && signedIn === true;
  const loginHref = appendReturnPath("/login/", `${embedded ? "/pricing/" : "/payments/checkout/"}?sku=${plan.credits}c`);
  /**
   * Only a genuine availability state is narrated. The test-environment wording
   * was removed by the Owner: the checkout does not explain the build to a buyer.
   */
  const notice = runtime === null ? null : checkoutNotice(runtime.state);

  async function pay() {
    if (!payable || paying.current) return;
    paying.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const slot = `checkout-${plan.credits}`;
      let key = sessionStorage.getItem(slot);
      if (!key) {
        key = crypto.randomUUID();
        sessionStorage.setItem(slot, key);
      }
      let r;
      try {
        r = await call("orders", { sku: `${plan.credits}c`, request_key: key });
      } catch (error) {
        if (!(error instanceof StaleOrderError)) throw error;
        // Rotate only after the server says this order cannot enter checkout.
        key = crypto.randomUUID();
        sessionStorage.setItem(slot, key);
        r = await call("orders", { sku: `${plan.credits}c`, request_key: key });
      }
      setOrder(r.order);
      if (!r.checkout) throw new Error("결제 준비 중입니다.");
      await loadSdk();
      if (!window.TossPayments) throw new Error("결제창을 불러오지 못했습니다.");
      const { clientKey, customerKey, ...payment } = r.checkout;
      await window.TossPayments(clientKey).payment({ customerKey }).requestPayment({ method: "CARD", ...payment });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "결제 준비 중입니다.");
    } finally {
      paying.current = false;
      setBusy(false);
    }
  }

  const productGrid = (
        <div className="pricing-plans">
          {pricingPlans.map((option) => (
            <PlanCard
              key={option.id}
              plan={option}
              selected={option.credits === plan.credits}
              headingId={`${embedded ? "pricing" : "checkout"}-plan-${option.id}`}
            >
              {option.credits === plan.credits ? (
                embedded && available && signedIn === false ? <Link className="button button--accent plan-card__button" href={loginHref}>{purchaseCta.payLabel}</Link> : <button
                  className="button button--accent plan-card__button"
                  type="button"
                  disabled={!payable || busy}
                  onClick={() => void pay()}
                >
                  {busy ? "결제창을 여는 중" : purchaseCta.payLabel}
                </button>
              ) : (
                <button
                  className="button button--outline plan-card__button"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setCredits(option.credits);
                    setOrder(null);
                    setMessage(null);
                  }}
                >
                  {purchaseCta.selectLabel}
                </button>
              )}
            </PlanCard>
          ))}
        </div>
  );
  if (embedded) return <>
    {productGrid}
    {notice && <p className="checkout-notice" role="status">{notice}</p>}
    {message && <p className="checkout-message" role="status">{message}</p>}
    {signedIn === false && <p className="checkout-signin">결제를 진행하려면 <Link href={loginHref}>로그인</Link>이 필요합니다.</p>}
  </>;

  return (
    <div className="policy-page content-wrap content-wrap--detail checkout-page">
      <p className="eyebrow eyebrow--accent">LEGENDSTUDY LAB / CHECKOUT</p>
      <div className="policy-page__heading">
        <h1>Credit 구매</h1>
      </div>
      <p className="policy-page__lead">논술 첨삭에 사용할 Credit을 선택하고 결제합니다.</p>

      <section className="policy-section" aria-labelledby="checkout-plans-title">
        <h2 id="checkout-plans-title">상품 선택</h2>
        {productGrid}
      </section>

      {notice ? (
        <p className="checkout-notice" role="status">
          {notice}
        </p>
      ) : null}

      {message ? (
        <p className="checkout-message" role="status">
          {message}
        </p>
      ) : null}

      {order ? (
        <p className="checkout-message" role="status">
          주문 상태: {order.state}
        </p>
      ) : null}

      <section className="policy-section" aria-labelledby="checkout-confirm-title">
        <h2 id="checkout-confirm-title">주문 확인</h2>
        <dl className="checkout-summary">
          <div>
            <dt>상품</dt>
            <dd>{plan.name}</dd>
          </div>
          <div>
            <dt>수량</dt>
            <dd>{plan.credits} Credit</dd>
          </div>
          <div>
            <dt>결제금액</dt>
            <dd>{plan.priceLabel}</dd>
          </div>
          <div>
            <dt>이용기간</dt>
            <dd>결제일로부터 {pricingPolicy.paidCreditValidityMonths}개월</dd>
          </div>
          <div>
            <dt>1 Credit 이용 범위</dt>
            <dd>최초 첨삭 1회 + 동일 답안 재첨삭 1회</dd>
          </div>
          <div>
            <dt>환불</dt>
            <dd>
              미사용 시 전액 환불 · <Link href="/refund/">환불정책</Link>
            </dd>
          </div>
        </dl>
        {signedIn !== true ? (
          <p className="checkout-signin">
            결제를 진행하려면 <Link href={loginHref}>로그인</Link>이 필요합니다.
          </p>
        ) : null}
      </section>

      <nav className="policy-actions" aria-label="안내">
        <Link className="button button--outline" href="/pricing/">
          요금 안내
        </Link>
        <Link className="button button--outline" href="/refund/">
          환불정책
        </Link>
        <Link className="button button--outline" href="/support/">
          고객센터
        </Link>
      </nav>
    </div>
  );
}
