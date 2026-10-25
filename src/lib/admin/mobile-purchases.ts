import {AdminError} from './errors';
export type MobilePurchases={version:'admin-mobile-purchase-v1';as_of:string;basis:'CREDIT_GRANTED_AT';amount_available:false;environment_available:false;platforms:{platform:'apple'|'google';purchase_count:number;granted_credits:number}[]};
export function parseMobilePurchases(raw:unknown):MobilePurchases{
 const v=raw as MobilePurchases;
 if(v?.version!=='admin-mobile-purchase-v1'||v.basis!=='CREDIT_GRANTED_AT'||typeof v.as_of!=='string'||v.amount_available!==false||v.environment_available!==false||!Array.isArray(v.platforms)||v.platforms.some(p=>!['apple','google'].includes(p.platform)||![p.purchase_count,p.granted_credits].every(n=>Number.isSafeInteger(n)&&n>=0)))throw new AdminError('MALFORMED_RESPONSE');
 return v;
}
