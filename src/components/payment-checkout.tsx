"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getBrowserAuthClient } from "@/lib/browser-auth-client";
import { checkoutNotice, checkoutOpen, paymentRuntime, type PaymentRuntime } from "@/lib/payment-runtime";
import { pricingPlans, pricingPolicy } from "@/lib/pricing";

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
function skuFromLocation() {
  if (typeof window === "undefined") return null;
  const sku = new URLSearchParams(window.location.search).get("sku");
  if (!sku || !/^\d{1,2}c$/.test(sku)) return null;
  const credits = Number(sku.slice(0, -1));
  return pricingPlans.some((plan) => plan.credits === credits) ? credits : null;
}

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
  if (!r.ok) throw new Error(r.status === 401 ? "로그인 후 다시 시도해 주세요." : "결제 준비 중입니다.");
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

/**
 * Checkout for the sold Credit packs.
 *
 * The journey is fixed and every screen exists before any payment runtime is
 * configured: choose a pack, read the order summary, then pay. Only the final
 * control depends on the backend, so a card reviewer can walk and capture the
 * whole path on a release where nothing can be charged, and the same page turns
 * into a working purchase the moment the payment environment is present.
 *
 * The browser sends a SKU and a request key only — never a price, a quantity, an
 * owner or a redirect. Every value in the order summary is the pack the server
 * snapshot was created from, so the summary cannot drift from the charge.
 */
export function PaymentCheckout() {
  const [runtime, setRuntime] = useState<PaymentRuntime | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  /**
   * The card link preselects a pack, and a member arriving without one is shown
   * the smallest pack so the order summary is always concrete. The value only
   * decides which summary is displayed; it never authorizes anything.
   */
  const [credits, setCredits] = useState<number>(
      () => skuFromLocation() ?? pricingPlans.find((p) => p.recommended)?.credits ?? pricingPlans[0].credits,
    );
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void paymentRuntime().then((next) => {
      if (alive) setRuntime(next);
    });
    void getBrowserAuthClient()
      ?.auth.getSession()
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
  const payable = runtime !== null && checkoutOpen(runtime.state, runtime.consumerPurchase) && signedIn === true;
  const notice = runtime === null ? null : checkoutNotice(runtime.state);

  async function pay() {
    if (!payable || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const slot = `checkout-${plan.credits}`;
      let key = sessionStorage.getItem(slot);
      if (!key) {
        key = crypto.randomUUID();
        sessionStorage.setItem(slot, key);
      }
      const r = await call("orders", { sku: `${plan.credits}c`, request_key: key });
      setOrder(r.order);
      if (!r.checkout) throw new Error("결제 준비 중입니다.");
      await loadSdk();
      if (!window.TossPayments) throw new Error("결제창을 불러오지 못했습니다.");
      const { clientKey, customerKey, ...payment } = r.checkout;
      await window.TossPayments(clientKey).payment({ customerKey }).requestPayment({ method: "CARD", ...payment });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "결제 준비 중입니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="policy-page content-wrap content-wrap--detail checkout-page">
      <p className="eyebrow eyebrow--accent">LEGENDSTUDY LAB / CHECKOUT</p>
      <div className="policy-page__heading">
        <h1>Credit 구매</h1>
      </div>
      <p className="policy-page__lead">논술 첨삭에 사용할 Credit을 선택하고 결제합니다.</p>

      <section className="policy-section" aria-labelledby="checkout-plans-title">
        <h2 id="checkout-plans-title">상품 선택</h2>
        <div className="pricing-plans">
          {pricingPlans.map((option) => (
            <article
              className="pricing-plan"
              key={option.id}
              aria-labelledby={`checkout-plan-${option.id}`}
              data-selected={option.credits === plan.credits ? "true" : undefined}
            >
              <h3 className="pricing-plan__name" id={`checkout-plan-${option.id}`}>
                {option.name}
                {option.recommended ? <span className="pricing-plan__badge">추천</span> : null}
              </h3>
              <p className="pricing-plan__price">{option.priceLabel}</p>
              <p className="pricing-plan__unit">Credit당 {option.perCreditLabel}</p>
              <p className="pricing-plan__value">{option.valueLine}</p>
              {option.credits === plan.credits ? (
                <button
                  className="button button--accent pricing-plan__cta"
                  type="button"
                  disabled={!payable || busy}
                  onClick={() => void pay()}
                >
                  {busy ? "결제창을 여는 중" : "결제하기"}
                </button>
              ) : (
                <button
                  className="button button--outline pricing-plan__cta"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setCredits(option.credits);
                    setOrder(null);
                    setMessage(null);
                  }}
                >
                  선택하기
                </button>
              )}
            </article>
          ))}
        </div>
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
            결제를 진행하려면 <Link href="/login/">로그인</Link>이 필요합니다.
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