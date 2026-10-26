import {AdminError} from './errors';
export type CreditMemberSort='balance_desc'|'balance_asc'|'granted_desc'|'used_desc'|'joined_desc';
export interface CreditMember {account_id:string;email:string|null;summary:{spendable:number;reserved:number;paid:number;free:number;other:number};last_used_at:string|null}
export interface CreditMembers {total:number;limit:number;offset:number;items:CreditMember[]}
export function parseCreditMembers(value:unknown):CreditMembers {
 const d=value as CreditMembers & {version:string};
 if(!d||d.version!=='admin-credit-members-v1'||!Number.isSafeInteger(d.total)||d.total<0||![10,20,50].includes(d.limit)||!Number.isSafeInteger(d.offset)||d.offset<0||!Array.isArray(d.items)||d.items.length>d.limit)throw new AdminError('MALFORMED_RESPONSE');
 for(const m of d.items){
  if(typeof m.account_id!=='string'||!(m.email===null||typeof m.email==='string')||!(m.last_used_at===null||typeof m.last_used_at==='string')||!m.summary)throw new AdminError('MALFORMED_RESPONSE');
  for(const k of ['spendable','reserved','paid','free','other'] as const)if(!Number.isSafeInteger(m.summary[k])||m.summary[k]<0)throw new AdminError('MALFORMED_RESPONSE');
 }
 return d;
}
