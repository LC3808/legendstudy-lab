/** Optional exact historical binding; no inference from a flattened PDF string. */
export type OfficialRubric = {rows:{score:string;grade:string;description:string}[];bonus:string;source:{page:number;package_version:number;pdf_hash:string;package_digest:string}};
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
export function readOfficialRubric(value:unknown,criterionId:string,packageDigest:string,originalText:string):OfficialRubric|null{
 const v=object(value),s=object(v.source);
 if(v.schema!=='official-rubric-read-v1'||v.status!=='VERIFIED'||v.criterion_id!==criterionId||v.original_text!==originalText||!packageDigest||s.package_digest!==packageDigest||typeof s.pdf_hash!=='string'||!/^[a-f0-9]{64}$/.test(s.pdf_hash)||typeof s.page!=='number'||!Number.isInteger(s.page)||s.page<1||typeof s.package_version!=='number'||!Number.isInteger(s.package_version)||s.package_version<1||typeof v.bonus!=='string'||!Array.isArray(v.rows)||!v.rows.length)return null;
 const rows=[];
 for(const item of v.rows){const r=object(item);if(typeof r.score!=='string'||typeof r.grade!=='string'||!(r.score||r.grade)||typeof r.description!=='string'||!r.description.trim())return null;rows.push({score:r.score,grade:r.grade,description:r.description});}
 return {rows,bonus:v.bonus,source:{page:s.page,package_version:s.package_version,pdf_hash:s.pdf_hash,package_digest:packageDigest}};
}
