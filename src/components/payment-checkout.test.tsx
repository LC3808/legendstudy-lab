// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PaymentCheckout } from './payment-checkout';

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(window.location.search) }));

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

  it('keeps the order summary off the price authority on the review runtime', async () => {
    vi.stubGlobal('fetch', runtime('TEST'));
    render(<PaymentCheckout />);
    await waitFor(() => expect(screen.getByText('결제하기')).not.toBeDisabled());
    // The Owner removed the test-environment narration from the checkout.
    expect(screen.queryByText(/테스트 결제 환경/)).toBeNull();
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
    await waitFor(() => expect(screen.getByText('결제하기')).not.toBeDisabled());
    const summary = screen.getByRole('region', { name: '주문 확인' });
    expect(within(summary).getByText('5 Credit')).toBeTruthy();
    expect(screen.getByText('상품 선택')).toBeTruthy();
  });
});
import { pricingPlans } from '@/lib/pricing';
import { within } from '@testing-library/react';

it('replaces an expired server order key once before opening Toss',async()=>{
 const old='22222222-2222-4222-8222-222222222222';sessionStorage.setItem('checkout-3',old);
 const f=vi.fn().mockResolvedValueOnce(Response.json({state:'TEST'}))
 .mockResolvedValueOnce(Response.json({error:'ORDER_NOT_CHECKOUT_READY'},{status:409}))
 .mockResolvedValueOnce(Response.json({order,checkout}));vi.stubGlobal('fetch',f);
 const requestPayment=vi.fn().mockResolvedValue(undefined);window.TossPayments=vi.fn(()=>({payment:()=>({requestPayment})}));
 render(<PaymentCheckout/>);await waitFor(()=>expect(screen.getByText('결제하기')).not.toBeDisabled());
 fireEvent.click(screen.getByText('결제하기'));await waitFor(()=>expect(requestPayment).toHaveBeenCalledTimes(1));
 expect(JSON.parse(f.mock.calls[1][1].body).request_key).toBe(old);
 expect(JSON.parse(f.mock.calls[2][1].body).request_key).not.toBe(old);
});
it('renders the same product card as /pricing/, with one pack selected',async()=>{
 vi.stubGlobal('fetch',runtime('TEST'));
 render(<PaymentCheckout/>);
 await waitFor(()=>expect(screen.getByText('결제하기')).not.toBeDisabled());
 // Same class names as the pricing page: one card component, one visual language.
 const cards=document.querySelectorAll('.plan-card');
 expect(cards.length).toBe(pricingPlans.length);
 const selected=document.querySelectorAll('.plan-card[data-selected="true"]');
 expect(selected.length).toBe(1);
 // Recommendation is a badge and lives on its own pack, independently of which
 // pack happens to be selected (the URL preselects 3c here).
 const badges=document.querySelectorAll('.plan-card__badge');
 expect(badges.length).toBe(pricingPlans.filter((p)=>p.recommended).length);
 expect(selected[0].querySelector('.plan-card__badge')).toBeNull();
 expect(screen.getAllByText('선택하기').length).toBe(pricingPlans.length-1);
 expect(screen.getAllByText('결제하기').length).toBe(1);
});
it('does not loop or open Toss when the replacement is also rejected',async()=>{
 const f=vi.fn().mockResolvedValueOnce(Response.json({state:'TEST'})).mockImplementation(()=>Promise.resolve(Response.json({error:'ORDER_NOT_CHECKOUT_READY'},{status:409})));vi.stubGlobal('fetch',f);
 const requestPayment=vi.fn();window.TossPayments=vi.fn(()=>({payment:()=>({requestPayment})}));
 render(<PaymentCheckout/>);await waitFor(()=>expect(screen.getByText('결제하기')).not.toBeDisabled());fireEvent.click(screen.getByText('결제하기'));
 await screen.findByText('새 주문이 필요합니다.');expect(f).toHaveBeenCalledTimes(3);expect(requestPayment).not.toHaveBeenCalled();
});
