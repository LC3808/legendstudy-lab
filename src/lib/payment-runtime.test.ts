import {describe,it,expect} from 'vitest';
import {purchaseEnabled} from './payment-runtime';
import {validCredit} from '../components/credit-balance';
describe('consumer runtime and shared Credit DTO',()=>{
 for(const state of ['NOT_READY','TEST','LIVE','PAUSED'] as const)it(state+' CTA',()=>expect(purchaseEnabled(state)).toBe(state==='LIVE'));
 it('canonical 5/4/4/3 snapshots displayed without a local wallet',()=>{for(const paid of [5,4,4,3])expect(validCredit({dto_version:'credit-v1',spendable:paid,paid,free:0,other:0,next_expiry:null})).toBe(true);});
 it('inconsistent, negative and unknown balance rejected',()=>{for(const patch of [{spendable:8},{paid:-1},{dto_version:'other'}])expect(validCredit({dto_version:'credit-v1',spendable:5,paid:5,free:0,other:0,next_expiry:null,...patch})).toBe(false);});
});
