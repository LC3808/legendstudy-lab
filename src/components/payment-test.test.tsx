// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PaymentTest } from './payment-test';
import FailPage from '@/app/payments/fail/page';
vi.mock('@/lib/browser-auth-client',()=>({getBrowserAuthClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'synthetic-session'}}})}})}));
const id='11111111-1111-4111-8111-111111111111';const orderId='ls_'+id.replaceAll('-','');
const order={mode:'TEST',id,order_id:orderId,state:'PAID',amount:4900,quantity:1,grant_state:'TEST_RECORDED'};
beforeEach(()=>{sessionStorage.clear();window.history.replaceState(null,'',`/payments/success/?orderId=${orderId}&paymentKey=synthetic&amount=4900`);});
afterEach(()=>{cleanup();vi.unstubAllGlobals();delete window.TossPayments;});
describe('TEST checkout UI',()=>{
 it('callback waits for canonical PAID, never trusts redirect alone',async()=>{let resolve!:(r:Response)=>void;vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(r=>{resolve=r;})));render(<PaymentTest callback/>);await waitFor(()=>expect(fetch).toHaveBeenCalled());expect(screen.queryByText(/테스트 결제 확인 완료/)).toBeNull();resolve(Response.json({order}));await screen.findByText(/테스트 결제 확인 완료/);expect(location.search).not.toContain('paymentKey');});
 it('success callback confirms server-created order',async()=>{const f=vi.fn().mockResolvedValueOnce(Response.json({order:{...order,state:'ORDER_CREATED'}})).mockResolvedValueOnce(Response.json({order}));vi.stubGlobal('fetch',f);render(<PaymentTest callback/>);await screen.findByText(/테스트 결제 확인 완료/);expect(f.mock.calls[1][0]).toBe('/api/payments/confirm');expect(JSON.parse(f.mock.calls[1][1].body)).toEqual({id,request_key:id,payment_key:'synthetic',amount:4900});});
 it('pending refresh uses reconcile without callback payment key',async()=>{window.history.replaceState(null,'',`?orderId=${orderId}`);const f=vi.fn().mockResolvedValueOnce(Response.json({order:{...order,state:'AUTHORIZATION_PENDING'}})).mockResolvedValueOnce(Response.json({order}));vi.stubGlobal('fetch',f);render(<PaymentTest callback/>);await screen.findByText(/테스트 결제 확인 완료/);expect(f.mock.calls[1][0]).toBe('/api/payments/reconcile');});
 it('failure route has no provider or grant calls',()=>{const f=vi.fn();vi.stubGlobal('fetch',f);render(<FailPage/>);expect(screen.getByText(/Credit은 지급되지 않습니다/)).toBeTruthy();expect(f).not.toHaveBeenCalled();});
 it('checkout uses server payload and sends no price authority',async()=>{const checkout={clientKey:'synthetic-public',customerKey:id,orderId,orderName:'TEST',amount:{currency:'KRW',value:4900},successUrl:'https://example.test/payments/success/',failUrl:'https://example.test/payments/fail/'};const f=vi.fn().mockResolvedValueOnce(Response.json({state:'TEST'})).mockResolvedValue(Response.json({order,checkout}));vi.stubGlobal('fetch',f);const requestPayment=vi.fn().mockResolvedValue(undefined);window.TossPayments=vi.fn(()=>({payment:()=>({requestPayment})}));render(<PaymentTest/>);await waitFor(()=>expect(screen.getAllByText('테스트 결제')[0]).not.toBeDisabled());fireEvent.click(screen.getAllByText('테스트 결제')[0]);await waitFor(()=>expect(requestPayment).toHaveBeenCalled());const body=JSON.parse(f.mock.calls[1][1].body);expect(Object.keys(body).sort()).toEqual(['request_key','sku']);expect(requestPayment.mock.calls[0][0].amount).toEqual(checkout.amount);});
});
