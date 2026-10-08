import type { CreditState } from '@/components/credit-balance';
import type { Goals, MyProfile } from './data';

/** View contract only: canonical Auth/profiles/Credit remain independent authorities. */
export function myIdentity(user:{id:string;email?:string},profile:MyProfile & {display_name?:string|null}) {
 const labels:Record<string,string>={student:'재학생',retaker:'N수·검정고시 등',other:'기타'};
 return {id:user.id,email:user.email??null,displayName:profile.display_name??null,
  school:{officeCode:profile.neis_office_code,schoolCode:profile.neis_school_code},
  status:profile.academic_status,statusLabel:profile.academic_status?labels[profile.academic_status]??'확인 필요':'설정 안 함',
  grade:profile.academic_status==='student'?profile.grade_level:null};
}
export function myUsage(credit:CreditState) {
 return {credit,periodEntitlement:null}; // No active subscription authority wired; not a claim of zero Credit.
}
export function myGoals(goals:Goals) {return {intendedMajor:goals.intended_major,targets:goals.targets};}

/** Strict comparison gate; same-question dimension changes, never a 100-point score. */
export type DimensionPoint = {
 evaluationId:string;attemptId:string;questionId:string;criterionId:string;definitionVersion:string;
 questionMetadataVersion:string;regimeKey:string;evaluationVersion:string;contractVersion:string;
 evidenceManifest:string;status:string;requestKind:string;invalidatedAt:string|null;completedAt:string|null;
 submittedAt:string;supersedesEvaluationId:string|null;level:number|null;
};
export function comparableDimensionDelta(before:DimensionPoint,after:DimensionPoint):number|null {
 const keys=['questionId','criterionId','definitionVersion','questionMetadataVersion','regimeKey','evaluationVersion','contractVersion','evidenceManifest'] as const;
 if(keys.some(k=>!before[k]||before[k]!==after[k]))return null;
 if(before.requestKind!=='student'||after.requestKind!=='student')return null;
 if(before.status!=='completed'||after.status!=='completed'||before.invalidatedAt||after.invalidatedAt||!before.completedAt||!after.completedAt)return null;
 if(before.attemptId===after.attemptId||before.evaluationId===after.evaluationId||before.supersedesEvaluationId||after.supersedesEvaluationId)return null;
 const earlier=Date.parse(before.submittedAt),later=Date.parse(after.submittedAt);
 if(!Number.isFinite(earlier)||!Number.isFinite(later)||later<=earlier)return null;
 if(!Number.isInteger(before.level)||!Number.isInteger(after.level)||before.level!<1||before.level!>5||after.level!<1||after.level!>5)return null;
 return after.level!-before.level!;
}
