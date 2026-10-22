import {expect,it,vi} from 'vitest';
vi.mock('@/data/essay-student-pdf-candidates.json',()=>({default:{questions:[
 {examId:'00000000-0000-4000-8000-000000000001',questionId:'00000000-0000-4000-8000-000000000002',assetId:'a'.repeat(64),pageCount:5,startPage:1,verification:'VERIFIED',studentDisplay:'APPROVED',storageRead:'APPROVED'},
 {examId:'exam-b',questionId:'question-b',assetId:'b'.repeat(64),pageCount:3,startPage:1,verification:'VERIFIED',studentDisplay:'APPROVED',storageRead:'PENDING'},
 {examId:'exam-c',questionId:'question-c',assetId:'c'.repeat(64),pageCount:2,startPage:1,verification:'VISUAL_REVIEWED',studentDisplay:'APPROVED',storageRead:'APPROVED'},
]}}));
import {studentPdf,studentPdfForExam} from './student-asset';
it('requires the exact exam/question pair before reusing a whole problem PDF',()=>{
 const asset=studentPdfForExam('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');expect(asset).toMatchObject({assetId:'a'.repeat(64),pageCount:5,startPage:1});
 expect(studentPdfForExam('exam-b','00000000-0000-4000-8000-000000000002')).toBeNull();expect(studentPdfForExam('00000000-0000-4000-8000-000000000001','question-b')).toBeNull();
 expect(studentPdf({...asset,assetId:'b'.repeat(64),sha256:'b'.repeat(64)},'00000000-0000-4000-8000-000000000002')).toBeNull();
 expect(studentPdf({...asset,pageCount:6},'00000000-0000-4000-8000-000000000002')).toBeNull();
});
it('does not equate content review or display approval with Storage read approval',()=>{
 expect(studentPdfForExam('exam-b','question-b')).toBeNull();
 expect(studentPdfForExam('exam-c','question-c')).toBeNull();
});

import {projectRegisteredExam,mergeRegisteredCatalog} from '../essay-runtime/registered-material-catalog';
import type {ExamRow} from './contract';
it('attaches approved content without enabling evaluation or changing canonical IDs',()=>{
 const examId='00000000-0000-4000-8000-000000000001',questionId='00000000-0000-4000-8000-000000000002';
 const row={examId,universityId:'00000000-0000-4000-8000-000000000003',university:'test',year:2026,kind:'admission',track:'test',title:'test',questionCount:1} as ExamRow;
 const projected=projectRegisteredExam('test',row,{examId,questions:[{id:questionId,label:'1번'}]} as Parameters<typeof projectRegisteredExam>[2]);
 expect(projected).toMatchObject({dbExamId:examId,evaluationReady:false,questions:[{dbQuestionId:questionId,accountDraftReady:false,studentPdf:{assetId:'a'.repeat(64)}}]});
 const existing={...projected,questions:projected.questions.map(q=>({...q,sourceLocator:'existing approved location',studentPdf:undefined}))};
 const [merged]=mergeRegisteredCatalog([existing],[projected]);
 expect(merged.questions[0]).toMatchObject({dbQuestionId:questionId,sourceLocator:'existing approved location',studentPdf:{assetId:'a'.repeat(64)}});
 expect(merged.evaluationReady).toBe(false);
});
