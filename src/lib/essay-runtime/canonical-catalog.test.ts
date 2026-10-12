import {it,expect} from 'vitest';
import registry from '@/data/essay-source-registry.json';
import {connectPublishedQuestions} from './canonical-catalog';
import type {SourceExam} from './source-registry';
const exam=registry.exams[0] as SourceExam;
const id='00000000-0000-4000-8000-000000000001';
const row={id,essay_exam_id:id,question_key:exam.questions[0].key,metadata_version:'source-registration-v1',essay_exams:{university_id:exam.universityId,admission_year:exam.year,exam_kind:exam.kind}};
it('adds canonical IDs without altering source identity or enabling evaluation',()=>{
 const [next]=connectPublishedQuestions([exam],[row]);
 expect(next.key).toBe(exam.key);expect(next.questions[0].dbQuestionId).toBe(id);expect(next.evaluationReady).toBe(false);
 expect(exam.questions[0].dbQuestionId).toBeNull();
});
it('wrong exam year, kind, university, duplicate or unknown metadata cannot bind',()=>{
 for(const rows of [[row,row],[{...row,metadata_version:'unknown'}],[{...row,essay_exams:{...row.essay_exams,admission_year:1900}}],[{...row,essay_exams:{...row.essay_exams,exam_kind:'other'}}],[{...row,essay_exams:{...row.essay_exams,university_id:'foreign'}}]])expect(connectPublishedQuestions([exam],rows)).toEqual([exam]);
});
it('known exam ID cannot be replaced and split exam mappings are rejected',()=>{
 const other='00000000-0000-4000-8000-000000000002';
 const known={...exam,dbExamId:other};expect(connectPublishedQuestions([known],[row])).toEqual([known]);
 const rows=[row,{...row,id:other,essay_exam_id:other,question_key:exam.questions[1].key}];expect(connectPublishedQuestions([exam],rows)).toEqual([exam]);
});
