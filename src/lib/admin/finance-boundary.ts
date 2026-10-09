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
