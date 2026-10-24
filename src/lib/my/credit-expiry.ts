import type {SupabaseClient} from '@supabase/supabase-js';
import {assertOwner} from './data';
export type ExpiryGrant={id:string;origin:string;expires_at:string};
export type ExpiryTransaction={grant_id:string;balance_delta:number;reserved_delta:number};
export function expiryQuantities(grants:ExpiryGrant[],transactions:ExpiryTransaction[],at:string){
 const quantities=new Map<string,number>();
 for(const t of transactions){if(!Number.isSafeInteger(t.balance_delta)||!Number.isSafeInteger(t.reserved_delta))throw Error('INVALID_LEDGER');quantities.set(t.grant_id,(quantities.get(t.grant_id)??0)+t.balance_delta-t.reserved_delta);}
 const groups=new Map<string,number>();
 for(const g of grants){if(g.expires_at!==at)continue;const n=quantities.get(g.id)??0;if(n<0)throw Error('INVALID_LEDGER');if(n>0){const type=g.origin==='purchase'?'구매 크레딧':['signup_bonus','signup'].includes(g.origin)?'무료 크레딧':'기타 지급 크레딧';groups.set(type,(groups.get(type)??0)+n);}}
 return [...groups].map(([label,quantity])=>({label,quantity}));
}
export async function readCreditExpiry(client:SupabaseClient,owner:string,at:string|null){
 await assertOwner(client,owner);if(!at)return {at:null,groups:[]};
 const account=await client.from('credit_accounts').select('id').eq('user_id',owner).maybeSingle();if(account.error||!account.data)throw Error('READ_FAILED');
 const grants=await client.from('credit_grants').select('id,origin,expires_at').eq('account_id',account.data.id).eq('expires_at',at).limit(1000);
 if(grants.error||grants.data.length===1000||!grants.data.length)throw Error('EXPIRY_QUANTITY_UNAVAILABLE');
 // One bounded ledger response; a truncated response is never presented as a balance.
 const tx=await client.from('credit_transactions').select('grant_id,balance_delta,reserved_delta').eq('account_id',account.data.id).in('grant_id',grants.data.map(g=>g.id)).limit(1000);
 if(tx.error||tx.data.length===1000)throw Error('READ_BOUND');
 await assertOwner(client,owner);
 const groups=expiryQuantities(grants.data,tx.data,at);if(!groups.length)throw Error('EXPIRY_QUANTITY_UNAVAILABLE');return {at,groups};
}
