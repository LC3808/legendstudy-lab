import candidates from '@/data/essay-student-pdf-candidates.json';
export type StudentPdf={bucket?:'essay-student-questions'|'essay-material-originals';kind:'student_question';questionId:string;assetId:string;sha256:string;pageCount:number;startPage:number;verification:'VERIFIED';studentDisplay:'APPROVED'};
/** Shared WEB/Native DTO. This validates shape only; Storage must authorize delivery. */
export function studentPdf(value:unknown,questionId:string):StudentPdf|null{
 if(!questionId||!value||typeof value!=='object')return null;const v=value as StudentPdf;
 if(v.kind!=='student_question'||v.questionId!==questionId||v.verification!=='VERIFIED'||v.studentDisplay!=='APPROVED'||!/^[-a-zA-Z0-9]{1,80}$/.test(v.assetId)||!/^[a-f0-9]{64}$/.test(v.sha256)||!Number.isInteger(v.pageCount)||v.pageCount<1||v.pageCount>3000||!Number.isInteger(v.startPage)||v.startPage<1||v.startPage>v.pageCount)return null;
 // Keep the existing Hanyang exception; other originals need every approval gate.
 if(v.bucket==='essay-material-originals'&&!approvedOriginal(v)&&(v.questionId!=='4cbe8b69-2ccc-5c4e-9e77-0644f90e2cde'||v.sha256!=='4f3b87f2197a042c8abdd361584e3e03ab4bd4d15bc5341273dee27b7b6fc73b'||v.assetId!==v.sha256||v.pageCount!==3))return null;
 if(v.bucket&&v.bucket!=='essay-student-questions'&&v.bucket!=='essay-material-originals')return null;
 return v;
}

/** A reviewed source is not permission to publish. Both gates require scoped Owner approval. */
function approvedOriginal(asset:StudentPdf):boolean{
 return candidates.questions.some(r=>r.questionId===asset.questionId&&r.assetId===asset.assetId&&asset.sha256===r.assetId&&r.pageCount===asset.pageCount&&r.startPage===asset.startPage&&r.verification==='VERIFIED'&&r.studentDisplay==='APPROVED'&&r.storageRead==='APPROVED');
}
export function studentPdfForExam(examId:string,questionId:string):StudentPdf|null{
 const matches=candidates.questions.filter(r=>r.examId===examId&&r.questionId===questionId);
 if(matches.length!==1)return null;
 const r=matches[0];
 return studentPdf({bucket:'essay-material-originals',kind:'student_question',questionId,assetId:r.assetId,sha256:r.assetId,pageCount:r.pageCount,startPage:r.startPage,verification:r.verification,studentDisplay:r.studentDisplay},questionId);
}
