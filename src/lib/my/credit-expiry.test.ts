import {expect,it} from 'vitest';
import {expiryQuantities} from './credit-expiry';
it('shows actual remaining quantities by origin at the exact expiry, subtracting reservations',()=>{
 const grants=[{id:'a',origin:'purchase',expires_at:'2027-01-22'},{id:'b',origin:'promotion',expires_at:'2027-01-22'},{id:'c',origin:'purchase',expires_at:'2027-02-22'}];
 const tx=[{grant_id:'a',balance_delta:5,reserved_delta:0},{grant_id:'a',balance_delta:-2,reserved_delta:0},{grant_id:'a',balance_delta:0,reserved_delta:1},{grant_id:'b',balance_delta:1,reserved_delta:0},{grant_id:'c',balance_delta:10,reserved_delta:0}];
 expect(expiryQuantities(grants,tx,'2027-01-22')).toEqual([{label:'구매 크레딧',quantity:2},{label:'기타 지급 크레딧',quantity:1}]);
});
it('never invents quantity from an expiry date alone',()=>{expect(expiryQuantities([{id:'a',origin:'purchase',expires_at:'date'}],[],'date')).toEqual([]);});
