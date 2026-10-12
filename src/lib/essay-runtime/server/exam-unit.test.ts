import {expect,it} from 'vitest';
import {freezeExam,freezeReevaluation,examRequestHash,compareCriteria,type ExamCatalog} from './exam-unit';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const c:ExamCatalog={examId:id(1),universityId:id(2),year:2025,track:'인문1',session:'오후2',campus:'서울',kind:'REGULAR_ADMISSION_ESSAY',billing:'EXAM',reviewed:true,questions:[3,4,5].map(n=>({id:id(n),rubricVersion:'r1',evidenceVersion:'e1'}))};
const answer=(n:number)=>({questionId:id(n),body:'학생이 직접 작성한 합성 답안',revision:1});
const eligible={settledAt:100,now:100+14*86400000,includedUsed:false};
it('partial/all answers remain one immutable exam snapshot, sorted idempotently',async()=>{
 const a=freezeExam(id(6),c,[answer(4),answer(3)]),b=freezeExam(id(6),c,[answer(3),answer(4)]);
 expect(a.answers).toHaveLength(2);expect(await examRequestHash(a,null)).toBe(await examRequestHash(b,null));
 expect(freezeExam(id(6),c,[answer(3),answer(4),answer(5)]).answers).toHaveLength(3);
 expect(await examRequestHash(a,id(9))).not.toBe(await examRequestHash(a,null));
});
it('math, unreviewed, foreign, duplicate and blank answers fail closed',()=>{
 for(const catalog of [{...c,billing:'MATH_QUESTION' as const},{...c,reviewed:false}])expect(()=>freezeExam(id(6),catalog,[answer(3)])).toThrow();
 for(const a of [[answer(9)],[answer(3),answer(3)],[{...answer(3),body:' '}],[]])expect(()=>freezeExam(id(6),c,a)).toThrow();
});
it('revision keeps unchanged answers and frozen subset, never adds a new question',()=>{
 const p=freezeExam(id(6),c,[answer(3),answer(4)]);
 const next=freezeReevaluation(id(6),c,p,[{...answer(3),body:'직접 고친 답안',revision:2}],eligible);
 expect(next.answers[1]).toEqual(p.answers[1]);
 expect(()=>freezeReevaluation(id(6),c,p,[answer(5)],eligible)).toThrow('FROZEN_QUESTION_SET');
});
it('14-day and already-used, owner, exam, type, campus and rubric boundaries',()=>{
 const p=freezeExam(id(6),c,[answer(3)]);
 for(const e of [{...eligible,now:eligible.now+1},{...eligible,includedUsed:true},{...eligible,now:0}])expect(()=>freezeReevaluation(id(6),c,p,[],e)).toThrow();
 expect(()=>freezeReevaluation(id(7),c,p,[],eligible)).toThrow();
 for(const cat of [{...c,examId:id(9)},{...c,kind:'MOCK_ESSAY' as const},{...c,campus:'국제'},{...c,questions:c.questions.map(q=>({...q,rubricVersion:'r2'}))}])expect(()=>freezeReevaluation(id(6),cat,p,[],eligible)).toThrow();
});
it('only identical rubric criteria compare; decline is not growth',()=>{
 const a={questionId:id(3),criterionId:'c1',rubricVersion:'r1',level:4};
 expect(compareCriteria([a],[{...a,level:3}])[0].change).toBe('DECLINED');
 expect(compareCriteria([a],[a])[0].change).toBe('MAINTAINED');
 expect(compareCriteria([a],[{...a,level:5}])[0].change).toBe('IMPROVED');
 expect(compareCriteria([a],[{...a,rubricVersion:'r2'}])[0].change).toBe('NOT_COMPARABLE');
});
