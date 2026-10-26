import type { SupabaseClient } from '@supabase/supabase-js';
import { AdminError, mapRpcError } from './errors';

export type CreditGrantInput = {
  accountId: string; email: string; quantity: number; reason: string; requestKey: string;
};
export type CreditGrantResult = { grantId: string; quantity: number; origin: 'admin_grant' };
/** Authenticated Admin RPC checks membership server-side. Never uses a finance key. */
export async function requestCreditGrant(client: Pick<SupabaseClient, 'rpc'>, input: CreditGrantInput): Promise<CreditGrantResult> {
  const {data,error} = await client.rpc('admin_manual_credit_grant', {
    p_user: input.accountId, p_email: input.email, p_quantity: input.quantity,
    p_reason: input.reason.trim(), p_key: input.requestKey,
  });
  if(error) {
    if(error.code === 'PT409') throw new AdminError('INVALID_REQUEST', 'target or request changed');
    throw mapRpcError(error);
  }
  if(typeof data !== 'string' || !data) throw new AdminError('MALFORMED_RESPONSE');
  return {grantId:data,quantity:input.quantity,origin:'admin_grant'};
}

export const grantKinds={admin_grant:'관리자 지급',promotion:'이벤트 프로모션',compensation:'서비스 오류 보상',other:'기타'} as const;
export type GrantKind=keyof typeof grantKinds;
export type GrantValidity='none'|'7'|'14'|'30'|'90'|'custom';
export type ExpiringGrantInput=CreditGrantInput & {kind:GrantKind;validity:GrantValidity;date:string|null};
export type RecoveryInfo={initial:number;used:number;reserved:number;recovered:number;expired:number;balance:number;recoverable:number};
export async function creditOperationsReady(client:Pick<SupabaseClient,'rpc'>,user:string){
 const {data,error}=await client.rpc('admin_credit_operation_info',{p_user:user,p_grant:null});
 return !error&&data?.version==='admin-credit-operations-v1';
}
export async function recoveryInfo(client:Pick<SupabaseClient,'rpc'>,user:string,grant:string):Promise<RecoveryInfo>{
 const {data,error}=await client.rpc('admin_credit_operation_info',{p_user:user,p_grant:grant});
 if(error)throw mapRpcError(error);
 if(data?.version!=='admin-credit-operations-v1'||data.grant_id!==grant||['initial','used','reserved','recovered','expired','balance','recoverable'].some(k=>!Number.isSafeInteger(data[k])||data[k]<0))throw new AdminError('MALFORMED_RESPONSE');
 return data;
}
export async function requestExpiringGrant(client:Pick<SupabaseClient,'rpc'>,input:ExpiringGrantInput){
 const {data,error}=await client.rpc('admin_credit_grant_expiring',{p_user:input.accountId,p_email:input.email,p_quantity:input.quantity,p_kind:input.kind,p_validity:input.validity,p_date:input.date,p_reason:input.reason,p_key:input.requestKey});
 if(error)throw mapRpcError(error);if(typeof data!=='string'||!data)throw new AdminError('MALFORMED_RESPONSE');return data;
}
export type RecoveryInput={user:string;grant:string;quantity:number;reason:string;key:string};
export async function requestCreditRecovery(client:Pick<SupabaseClient,'rpc'>,input:RecoveryInput){
 const {data,error}=await client.rpc('admin_credit_recover',{p_user:input.user,p_grant:input.grant,p_quantity:input.quantity,p_reason:input.reason,p_key:input.key});
 if(error)throw mapRpcError(error);if(typeof data!=='string'||!data)throw new AdminError('MALFORMED_RESPONSE');return data;
}
