import {AdminError} from './errors';

export type ReportKind='dashboard'|'credit'|'payment';
export type ReportFilter={kind:ReportKind;from:string|null;to:string|null;category?:string;state?:string;quantity?:number|null;limit?:number;offset?:number};
type Paid={mode:string;currency:string;count:number;amount:number};
export type ReportRow={id:string;created_at:string;transaction_type?:string;balance_delta?:number;reserved_delta?:number;origin?:string;sku?:string;quantity?:number;amount?:number;currency?:string;mode?:string;state?:string;paid_at?:string|null};
export type ReleaseReport={kind:ReportKind;as_of:string;total?:number;rows:ReportRow[];paid:Paid[];balance_delta?:number;reserved_delta?:number;new_members?:number;credit_granted?:number;credit_used?:number;study_seconds?:number;essay?:{pending:number;completed:number;failed:number};registry?:{exams:number;universities:number;published_questions:number}};
/** Reject incomplete response fields rather than rendering missing statistics as zero. */
export function parseReleaseReport(value:unknown,kind:ReportKind):ReleaseReport{
 const fail=():never=>{throw new AdminError('MALFORMED_RESPONSE');};
 if(!value||typeof value!=='object'||Array.isArray(value))return fail();
 const r=value as Record<string,unknown>;
 if(r.version!=='admin-release-v1'||r.kind!==kind||typeof r.as_of!=='string')return fail();
 const number=(x:unknown)=>typeof x==='number'&&Number.isFinite(x);
 const fields=kind==='dashboard'?['new_members','credit_granted','credit_used','study_seconds']:kind==='credit'?['total','balance_delta','reserved_delta']:['total'];
 if(fields.some(k=>!number(r[k])))return fail();
 if(kind==='dashboard')for(const [k,keys] of [['essay',['pending','completed','failed']],['registry',['exams','universities','published_questions']]] as const){
  const o=r[k];if(!o||typeof o!=='object'||keys.some(key=>!number((o as Record<string,unknown>)[key])))return fail();
 }
 if(kind!=='credit'&&(!Array.isArray(r.paid)||r.paid.some(p=>!p||typeof p.mode!=='string'||typeof p.currency!=='string'||!number(p.count)||!number(p.amount))))return fail();
 if(kind!=='dashboard'&&(!Array.isArray(r.rows)||r.rows.some(row=>!row||typeof row.id!=='string'||typeof row.created_at!=='string'||(kind==='credit'? !number(row.balance_delta)||!number(row.reserved_delta):!number(row.amount)||!number(row.quantity)))))return fail();
 return {...r,rows:r.rows??[],paid:r.paid??[]} as ReleaseReport;
}
