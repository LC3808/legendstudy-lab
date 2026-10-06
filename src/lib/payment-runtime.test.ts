import {describe,it,expect} from 'vitest';
import {purchaseEnabled} from './payment-runtime';
import {checkoutAvailable,checkoutNotice} from './payment-runtime';
import {validCredit} from '../components/credit-balance';
describe('consumer runtime and shared Credit DTO',()=>{
 for(const state of ['NOT_READY','TEST','LIVE','PAUSED'] as const)it(state+' CTA',()=>expect(purchaseEnabled(state)).toBe(state==='LIVE'));
 it('canonical 5/4/4/3 snapshots displayed without a local wallet',()=>{for(const paid of [5,4,4,3])expect(validCredit({dto_version:'credit-v1',spendable:paid,paid,free:0,other:0,next_expiry:null})).toBe(true);});
 it('inconsistent, negative and unknown balance rejected',()=>{for(const patch of [{spendable:8},{paid:-1},{dto_version:'other'}])expect(validCredit({dto_version:'credit-v1',spendable:5,paid:5,free:0,other:0,next_expiry:null,...patch})).toBe(false);});
});
 it('checkout opens only for a configured runtime',()=>{
  for(const state of ['NOT_READY','TEST','LIVE','PAUSED'] as const)
   expect(checkoutAvailable(state)).toBe(state==='TEST'||state==='LIVE');
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
  // A TEST runtime must say what it is, so nobody mistakes it for a real charge.
  const test=checkoutNotice('TEST') ?? '';
  expect(test).toContain('테스트');
  expect(test).toContain('청구되지 않고');
 });
