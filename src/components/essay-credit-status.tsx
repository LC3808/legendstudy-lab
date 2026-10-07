'use client';

import Link from 'next/link';

import { useCreditSummary } from '@/components/credit-balance';

/**
 * Where a buyer tops up, where they read their past submissions, and where a
 * signed-out visitor signs in. The history target is the same route MY uses, so
 * there is one essay history and not a second list that can disagree with it.
 */
const purchaseHref = '/pricing/';
const historyHref = '/my/essays/';
const loginHref = '/login/?next=%2Fessay-lab%2F';

/** 2027.01.07 — the expiry is a date, so it must not render in the visitor's locale. */
export function formatExpiry(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

/**
 * The 논술 LAB header: how many 첨삭권 (Credits) this visitor can spend right now.
 *
 * The number comes from the same `credit_summary()` read that MY uses, so the two
 * screens can never disagree, and no second Credit state is created here. The
 * screen shows only what a visitor needs before writing — the count, its split,
 * the nearest expiry — and leaves the ledger to MY.
 *
 * Nothing is claimed before the read resolves: an unauthenticated, unconfigured
 * or failed read never renders a balance.
 */
export function EssayCreditStatus() {
  const { state } = useCreditSummary();

  if (state.status === 'loading') {
    return (
      <section className="essay-credit" aria-live="polite">
        <p className="essay-credit__meta">첨삭권을 확인하고 있습니다.</p>
      </section>
    );
  }

  if (state.status === 'signed-out') {
    return (
      <section className="essay-credit" aria-live="polite">
        <p className="essay-credit__meta">로그인하면 내 첨삭권을 확인할 수 있습니다.</p>
        <div className="essay-credit__actions">
          <Link className="button button--primary button--small" href={loginHref}>로그인하고 첨삭권 확인</Link>
        </div>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section className="essay-credit" aria-live="polite">
        <p className="essay-credit__meta">첨삭권을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
      </section>
    );
  }

  const { spendable, paid, free, other, next_expiry } = state.value;
  const expiry = next_expiry ? formatExpiry(next_expiry) : null;

  if (spendable === 0) {
    return (
      <section className="essay-credit" aria-live="polite">
        <p className="essay-credit__count">첨삭권이 없습니다.</p>
        <div className="essay-credit__actions">
          <Link className="button button--primary button--small" href={purchaseHref}>첨삭권 구매</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="essay-credit" aria-live="polite">
      <p className="essay-credit__count">내 첨삭권 <strong>{spendable}개</strong></p>
      <p className="essay-credit__meta">무료 {free} · 구매 {paid}{other > 0 ? ` · 기타 ${other}` : ''}</p>
      {/* `credit_summary()` reports the nearest expiry across every spendable
          grant, purchase and signup bonus alike, so the line must not claim it is
          a purchase-only date. */}
      {expiry ? <p className="essay-credit__meta">가장 가까운 만료일 {expiry}</p> : null}
      <div className="essay-credit__actions">
        <Link className="button button--outline button--small" href={historyHref}>나의 첨삭 기록</Link>
        <Link className="button button--primary button--small" href={purchaseHref}>첨삭권 구매</Link>
      </div>
    </section>
  );
}
