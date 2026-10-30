import {describe,it,expect} from 'vitest';
import {classifyPages} from './contract';
import type {SourceExam} from '@/lib/essay-runtime/source-registry';
import registry from '@/data/essay-source-registry.json';
import {studentPdf} from './student-asset';
const asset={kind:'student_question',questionId:'q',assetId:'asset-1',sha256:'a'.repeat(64),pageCount:3,startPage:2,verification:'VERIFIED',studentDisplay:'APPROVED'};
describe('shared student delivery boundary',()=>{
 it('requires approved question-only asset and exact question',()=>{expect(studentPdf(asset,'q')).not.toBeNull();expect(studentPdf(asset,'other')).toBeNull();for(const p of [{kind:'original'},{studentDisplay:'UNVERIFIED'},{verification:'NEEDS_REVIEW'},{assetId:'../../original'},{startPage:4},{pageCount:0}])expect(studentPdf({...asset,...p},'q')).toBeNull();});
 it('does not label candidate pages verified or invent a question mapping',()=>{const rows=classifyPages(['문제 1 제시문','출제의도 채점기준 예시답안'],'a'.repeat(64));expect(rows.length).toBe(4);expect(rows.every(r=>r.verification==='NEEDS_REVIEW'&&r.questionId==='')).toBe(true);expect(rows[1].startPage).toBe(2);});
 it('keeps scanned documents unclassified for human inspection',()=>expect(classifyPages([''],'a'.repeat(64))).toEqual([]));
});

it('connects only the reviewed Hanyang question-only original without enabling evaluation',()=>{
 const exam=(registry.exams as SourceExam[]).find(e=>e.dbExamId==='345d3caa-3438-58c3-8f80-62a6242179ec')!;
 const q=exam.questions[0];
 expect(exam.evaluationReady).toBe(false);expect(q.accountDraftReady).toBe(false);
 const pdf=studentPdf(q.studentPdf,q.dbQuestionId!);expect(pdf).not.toBeNull();
 expect(studentPdf({...pdf,sha256:'ced37494c6b65531cca30649093846dde665bf401e630e8751f0bc8a3be90060'},q.dbQuestionId!)).toBeNull();
});

it('serves only explicitly approved current mappings and keeps pending mappings closed',async()=>{
 const {default:catalog}=await import('@/data/essay-student-pdf-candidates.json');
 const {studentPdfForExam}=await import('./student-asset');
 expect(new Set(catalog.questions.map(q=>q.questionId)).size).toBe(894);
 const approved=catalog.questions.filter(q=>q.storageRead==='APPROVED');
 expect(approved).toHaveLength(879);expect(new Set(approved.map(q=>q.assetId)).size).toBe(312);
 for(const q of catalog.questions){
  const pdf=studentPdfForExam(q.examId,q.questionId);
  if(q.storageRead==='APPROVED'){expect(q.verification).toBe('VERIFIED');expect(q.studentDisplay).toBe('APPROVED');expect(pdf?.startPage).toBe(q.startPage);expect(pdf?.assetId).toBe(q.assetId);}
  else {expect(q.studentDisplay).toBe('PENDING');expect(pdf).toBeNull();}
  expect(studentPdfForExam('wrong-exam',q.questionId)).toBeNull();
 }
});
