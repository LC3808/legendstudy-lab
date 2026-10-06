// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PaymentCheckout } from './payment-checkout';

const signedOut = { auth: { getSession: async () => ({ data: { session: null } }) } };
const signedIn = { auth: { getSession: async () => ({ data: { session: { access_token: 'synthetic-session' } } }) } };
let client: unknown = signedIn;
vi.mock('@/lib/browser-auth-client', () => ({ getBrowserAuthClient: () => client }));

const id = '11111111-1111-4111-8111-111111111111';
const orderId = 'ls_' + id.replaceAll('-', '');
const order = { mode: 'TEST', id, order_id: orderId, state: 'ORDER_CREATED', amount: 11900, quantity: 3, grant_state: 'NONE' };
const checkout = {
  clientKey: 'test_ck_synthetic',
  customerKey: id,
  orderId,
  orderName: 'LegendStudy 논술 첨부 3 Credits',
  amount: { currency: 'KRW', value: 11900 },
  successUrl: 'https://example.test/payments/success/',
  failUrl: 'https://example.test/payments/fail/',
};

function runtime(state: string) {
  return vi.fn().mockResolvedValueOnce(Response.json({ state }));
}

beforeEach(() => {
  sessionStorage.clear();
  client = signedIn;
  window.history.replaceState(null, '', '/payments/checkout/?sku=3c');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete window.TossPayments;
});

describe('checkout surface', () => {
  it('offers no purchase when the payment runtime is not configured', async () => {
    const f = runtime('NOT_READY');
    vi.stubGlobal('fetch', f);
    render(<PaymentCheckout />);
    await screen.findByText(/결제 준비 중/);
    // The review screens exist, but nothing can be paid and no order is created.
    expect(screen.getByText('주문 확인')).toBeTruthy();
    expect(screen.getByText('결제하기')).toBeDisabled();
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('labels a TEST runtime as a test and keeps the order summary off the price authority', async () => {
    vi.stubGlobal('fetch', runtime('TEST'));
    render(<PaymentCheckout />);
    await screen.findByText(/테스트 결제 환경입니다/);
    expect(await screen.findByText('주문 확인')).toBeTruthy();
    const plan = pricingPlans.find((p) => p.credits === 3);
    expect(plan).toBeTruthy();
    const summary = screen.getByRole('region', { name: '주문 확인' });
    expect(within(summary).getByText('3 Credit')).toBeTruthy();
    expect(within(summary).getByText(plan!.priceLabel)).toBeTruthy();
    expect(within(summary).getByText(/결제일로부터 3개월/)).toBeTruthy();
    expect(within(summary).getByText(/최초 첨삭 1회/)).toBeTruthy();
  });

  it('requires a login before the order can be created', async () => {
    client = signedOut;
    const f = runtime('TEST');
    vi.stubGlobal('fetch', f);
    render(<PaymentCheckout />);
    expect((await screen.findAllByRole('link', { name: '로그인' })).length).toBeGreaterThan(0);
    expect(screen.getByText('결제하기')).toBeDisabled();
    fireEvent.click(screen.getByText('결제하기'));
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('sends only a SKU and a request key, then pays with the server snapshot', async () => {
    const requestPayment = vi.fn().mockResolvedValue(undefined);
    window.TossPayments = vi.fn(() => ({ payment: () => ({ requestPayment }) }));
    const f = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ state: 'TEST' }))
      .mockResolvedValue(Response.json({ order, checkout }));
    vi.stubGlobal('fetch', f);
    render(<PaymentCheckout />);
    const pay = await screen.findByText('결제하기');
    await waitFor(() => expect(pay).not.toBeDisabled());
    fireEvent.click(pay);
    await waitFor(() => expect(requestPayment).toHaveBeenCalled());

    const body = JSON.parse(f.mock.calls[1][1].body);
    expect(Object.keys(body).sort()).toEqual(['request_key', 'sku']);
    expect(body.sku).toBe('3c');
    expect(f.mock.calls[1][0]).toBe('/api/payments/orders');
    expect(window.TossPayments).toHaveBeenCalledWith('test_ck_synthetic');
    expect(requestPayment.mock.calls[0][0].amount).toEqual({ currency: 'KRW', value: 11900 });
    expect(requestPayment.mock.calls[0][0].method).toBe('CARD');
  });

  it('ignores a SKU that is not a sold pack', async () => {
    window.history.replaceState(null, '', '/payments/checkout/?sku=99c');
    vi.stubGlobal('fetch', runtime('TEST'));
    render(<PaymentCheckout />);
    await screen.findByText(/테스트 결제 환경입니다/);
    const summary = screen.getByRole('region', { name: '주문 확인' });
    expect(within(summary).getByText('1 Credit')).toBeTruthy();
    expect(screen.getByText('상품 선택')).toBeTruthy();
  });
});
import { pricingPlans } from '@/lib/pricing';
import { within } from '@testing-library/react';
