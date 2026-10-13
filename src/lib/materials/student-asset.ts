export type StudentPdf={kind:'student_question';questionId:string;assetId:string;sha256:string;pageCount:number;startPage:number;verification:'VERIFIED';studentDisplay:'APPROVED'};
/** Shared WEB/Native DTO. This validates shape only; Storage must authorize delivery. */
export function studentPdf(value:unknown,questionId:string):StudentPdf|null{
 if(!questionId||!value||typeof value!=='object')return null;const v=value as StudentPdf;
 if(v.kind!=='student_question'||v.questionId!==questionId||v.verification!=='VERIFIED'||v.studentDisplay!=='APPROVED'||!/^[-a-zA-Z0-9]{1,80}$/.test(v.assetId)||!/^[a-f0-9]{64}$/.test(v.sha256)||!Number.isInteger(v.pageCount)||v.pageCount<1||v.pageCount>3000||!Number.isInteger(v.startPage)||v.startPage<1||v.startPage>v.pageCount)return null;
 return v;
}
