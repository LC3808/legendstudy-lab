import {serverTransport,type MathEnvironment} from './transport';
export type RecoveryEnvironment=MathEnvironment&{MATH_RECOVERY_BATCH_ENABLED?:string};
/** Prepared scheduled entry point. No schedule registration/configuration in this module. */
export async function runScheduledRecovery(env:RecoveryEnvironment){
 if(env.MATH_RECOVERY_BATCH_ENABLED!=='true'||!env.MATH_EVALUATION_WORKER_JWT)return {state:'disabled' as const};
 const value=await serverTransport(env).rpcRaw('math_recover_expired_evaluations',{p_limit:20},env.MATH_EVALUATION_WORKER_JWT);
 if(value?.version!=='math-recovery-v1'||!['scanned','recovered','skipped'].every(k=>Number.isSafeInteger(value[k])&&value[k]>=0&&value[k]<=20)||value.recovered+value.skipped>value.scanned)throw Error('INVALID_RECOVERY_RESPONSE');
 return {state:'completed' as const,scanned:value.scanned as number,recovered:value.recovered as number,skipped:value.skipped as number};
}
