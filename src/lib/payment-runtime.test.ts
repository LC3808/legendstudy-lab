import {describe,it,expect} from 'vitest';
import {checkoutAvailable,checkoutNotice,checkoutOpen,purchaseEnabled} from './payment-runtime';
import {validCredit} from '../components/credit-balance';

const states = ['NOT_READY','TEST','REVIEW','LIVE','PAUSED'] as const;

describe('consumer runtime and shared Credit DTO',()=>{
 for(const state of states)it(state+' CTA',()=>expect(purchaseEnabled(state)).toBe(state==='LIVE'));
 it('canonical 5/4/4/3 snapshots displayed without a local wallet',()=>{for(const paid of [5,4,4,3])expect(validCredit({dto_version:'credit-v1',spendable:paid,paid,free:0,other:0,next_expiry:null})).toBe(true);});
 it('inconsistent, negative and unknown balance rejected',()=>{for(const patch of [{spendable:8},{paid:-1},{dto_version:'other'}])expect(validCredit({dto_version:'credit-v1',spendable:5,paid:5,free:0,other:0,next_expiry:null,...patch})).toBe(false);});
});

describe('checkout authorization',()=>{
 it('checkout opens only for a configured runtime',()=>{
  for(const state of states)
   expect(checkoutAvailable(state)).toBe(state==='TEST'||state==='REVIEW'||state==='LIVE');
 });
 it('the production review runtime opens for the allowlisted reviewer only',()=>{
  expect(checkoutOpen('REVIEW',true)).toBe(true);
  expect(checkoutOpen('REVIEW',false)).toBe(false);
  // The server answer is the only thing that opens it; a runtime state alone never does.
  expect(checkoutOpen('NOT_READY',true)).toBe(false);
  expect(checkoutOpen('PAUSED',true)).toBe(false);
 });
 it('TEST and LIVE keep their existing behaviour',()=>{
  for(const consumerPurchase of [true,false]){
   expect(checkoutOpen('TEST',consumerPurchase)).toBe(true);
   expect(checkoutOpen('LIVE',consumerPurchase)).toBe(true);
  }
 });
 it('never claims a purchase is available without a configured runtime',()=>{
  expect(checkoutNotice('LIVE')).toBeNull();
  for(const state of ['NOT_READY','PAUSED'] as const){
   const notice=checkoutNotice(state) ?? '';
   expect(notice.length).toBeGreaterThan(0);
   for(const banned of ['구매하기','결제하기','결제가 완료'])expect(notice).not.toContain(banned);
  }
  expect(checkoutNotice('NOT_READY')).toContain('결제 준비 중');
  expect(checkoutNotice('PAUSED')).toContain('일시 중지');
  // TEST and REVIEW are merchant/card-review runtimes. The Owner removed the
  // build-state sentence from the checkout, so neither produces a notice; the
  // runtime stays truthful through the control, which the server gates.
  expect(checkoutNotice('TEST')).toBeNull();
  expect(checkoutNotice('REVIEW')).toBeNull();
 });
});
