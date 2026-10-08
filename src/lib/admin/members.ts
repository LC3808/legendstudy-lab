import {AdminError} from './errors';
export type MemberFilters={query:string;sort:'newest'|'oldest';accountState:string;academicStatus:string;grade:string;office:string;school:string;schoolUnset:boolean};
export const defaultMemberFilters:MemberFilters={query:'',sort:'newest',accountState:'',academicStatus:'',grade:'',office:'',school:'',schoolUnset:false};
export type DirectoryMember={accountId:string;email:string|null;displayName:string|null;createdAt:string;accountState:string;academicStatus:string|null;grade:number|null;major:string|null;schoolName:string|null;schoolState:'unset'|'unresolved'|'resolved'};
export type MemberDirectory={total:number;filteredTotal:number;limit:number;offset:number;items:DirectoryMember[]};
export function parseMemberDirectory(value:unknown):MemberDirectory{
 const fail=():never=>{throw new AdminError('MALFORMED_RESPONSE');};
 const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:fail();
 const str=(v:unknown):string=>typeof v==='string'?v:fail();
 const nullable=(v:unknown)=>v===null?null:str(v);
 const integer=(v:unknown):number=>Number.isSafeInteger(v)&&(v as number)>=0?v as number:fail();
 const r=object(value);
 if(r.version!=='admin-members-v1'||!Number.isFinite(Date.parse(str(r.as_of))))fail();
 const total=integer(r.total),filteredTotal=integer(r.filtered_total),limit=integer(r.limit),offset=integer(r.offset);
 if(filteredTotal>total||limit<1||limit>50||!Array.isArray(r.items)||r.items.length>limit)fail();
 const items=(r.items as unknown[]).map(v=>{const m=object(v);const state=str(m.school_state);const schoolName=nullable(m.school_name);const grade=m.grade_level===null?null:integer(m.grade_level);
  if(!['unset','unresolved','resolved'].includes(state)||(state==='resolved')!==(schoolName!==null)||grade!==null&&![1,2,3].includes(grade))fail();
  const status=nullable(m.academic_status);if(status!==null&&!['student','retaker','other'].includes(status))fail();
  if(!['NORMAL','DELETION_PENDING','ERASING','ERASED','CANCELLED'].includes(str(m.account_state)))fail();
  if(!Number.isFinite(Date.parse(str(m.created_at))))fail();
  return {accountId:str(m.account_id),email:nullable(m.email),displayName:nullable(m.display_name),createdAt:str(m.created_at),accountState:str(m.account_state),academicStatus:status,grade,major:nullable(m.intended_major),schoolName,schoolState:state as DirectoryMember['schoolState']};
 });
 if(items.length>filteredTotal||new Set(items.map(m=>m.accountId)).size!==items.length)fail();
 return {total,filteredTotal,limit,offset,items};
}
export const directorySchoolLabel=(m:DirectoryMember)=>m.schoolState==='unset'?'학교 미설정':m.schoolName??'학교명 확인 필요';
