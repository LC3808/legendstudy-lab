import {parseApplications,parseStudy,type ApplicationPage,type StudySummary} from '@/lib/my/foundation';
import {parseEssaySummary,type EssaySummary} from '@/lib/my/essay-summary';
import {AdminError} from './errors';
export type Student360={status:string|null;study:StudySummary;applications:ApplicationPage;essay:EssaySummary;asOf:string};
export function parseStudent360(v:unknown):Student360{
 try{
  if(!v||typeof v!=='object')throw new Error();const r=v as Record<string,unknown>;
  if(r.version!=='student360-v1'||typeof r.as_of!=='string'||!Number.isFinite(Date.parse(r.as_of)))throw new Error();
  let status:string|null=null;
  if(r.identity!==null){if(!r.identity||typeof r.identity!=='object')throw new Error();const i=r.identity as Record<string,unknown>;if(i.academic_status!==null&&!['student','retaker','other'].includes(i.academic_status as string))throw new Error();status=i.academic_status as string|null;}
  if(r.period_entitlement!==null||r.academic_performance!==null)throw new Error();
  return {status,asOf:r.as_of,study:parseStudy(r.study),applications:parseApplications(r.applications),essay:parseEssaySummary(r.essay)};
 }catch{throw new AdminError('MALFORMED_RESPONSE');}
}
