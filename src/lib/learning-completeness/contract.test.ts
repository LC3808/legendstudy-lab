import {describe,it,expect} from 'vitest';
import {publishLearningCompleteness as checkedPublish,compareLearningCompleteness as compare,LEVEL_ANCHORS,LEARNING_POLICY,type LearningCandidate,type LearningContext} from './contract';
const context:LearningContext={evaluationId:'new',questionId:'q',policyVersion:LEARNING_POLICY,rubricVersion:'official-v1',assessedAt:'2026-11-04T01:00:00Z',newEvaluation:true,evaluationComplete:true,reviewAccepted:true,transcriptionConfirmed:true,allQuestionsComplete:true,criterionIds:['c1','c2'],observationIds:['s1'],reviewedNotes:{r:'공식 요구의 충족과 남은 설명을 확인했습니다.',s:'조건을 확인한 접근을 유지하세요.',i:'근거 연결을 보완하세요.',d:'적용 조건을 먼저 대조하세요.'}};
const candidate:LearningCandidate={status:'ASSESSED',level:3,anchor:'CORE_PROGRESS',criterion_refs:['c1','c2'],observation_refs:['s1'],reason_ref:'r',strength_refs:['s'],improvement_refs:['i'],direction_ref:'d'};
const publish=(c:LearningCandidate,ctx:LearningContext)=>checkedPublish(c,ctx,structuredClone(c));
describe('new reviewed learning judgement',()=>{
 it.each(LEVEL_ANCHORS.map((anchor,i)=>[anchor,i+1] as const))('accepts reviewed anchor %s without inventing university points',(anchor,level)=>{
  const result=publish({...candidate,anchor,level},context)!;
  expect(result.level).toBe(level);expect(result).not.toHaveProperty('score');expect(result).not.toHaveProperty('probability');
 });
 it.each(['newEvaluation','evaluationComplete','reviewAccepted','transcriptionConfirmed','allQuestionsComplete'] as const)('withholds %s failure rather than showing zero',key=>expect(publish(candidate,{...context,[key]:false})).toBeNull());
 it('requires an independent review of the exact judgement, not only the base evaluation',()=>{
  expect(()=>checkedPublish(candidate,context,null)).toThrow('LEARNING_JUDGEMENT_REVIEW_REQUIRED');
  expect(()=>checkedPublish(candidate,context,{...candidate,level:5,anchor:'REQUIREMENTS_MET'})).toThrow('LEARNING_JUDGEMENT_REVIEW_REQUIRED');
 });
 it('requires every pinned criterion and real observation',()=>{
  for(const patch of [{criterion_refs:['c1']},{criterion_refs:['foreign','c2']},{observation_refs:[]},{observation_refs:['foreign']},{criterion_refs:['c1','c1']}])expect(()=>publish({...candidate,...patch},context)).toThrow();
 });
 it('rejects unsupported and inconsistent levels',()=>{
  for(const level of [0,6,NaN,2.5,2])expect(()=>publish({...candidate,level},context)).toThrow();
  expect(()=>publish({...candidate,status:'INSUFFICIENT_EVIDENCE'},context)).toThrow();
 });
 it('represents insufficient evidence without a rating',()=>{
  expect(publish({...candidate,status:'INSUFFICIENT_EVIDENCE',level:null,anchor:null,criterion_refs:[],observation_refs:[]},context)).toMatchObject({status:'INSUFFICIENT_EVIDENCE',level:null});
 });
 it('only publishes reviewed disclosure-safe notes and bounds priorities',()=>{
  expect(()=>publish({...candidate,reason_ref:'unreviewed full answer'},context)).toThrow();
  expect(()=>publish({...candidate,improvement_refs:['i','i']},context)).toThrow();
  const notes=Object.fromEntries(Array.from({length:6},(_,i)=>['i'+i,'reviewed direction']));
  expect(()=>publish({...candidate,improvement_refs:Object.keys(notes)},{...context,reviewedNotes:{...context.reviewedNotes,...notes}})).toThrow();
 });
 it('does not mutate the original candidate or frozen source',()=>{
  const c=structuredClone(candidate),ctx=structuredClone(context);const before=JSON.stringify([c,ctx]);
  publish(c,ctx)!.criterion_refs.push('external');expect(JSON.stringify([c,ctx])).toBe(before);
 });
 it('compares only the owned prior lineage and same rubric',()=>{
  const now=publish(candidate,context)!,old=publish({...candidate,level:2,anchor:'VALID_START'},{...context,evaluationId:'old'})!;
  expect(compare(now,old,'old')).toMatchObject({comparable:true,before:2,after:3});
  expect(compare(now,null,null)).toMatchObject({comparable:false});
  expect(compare(now,old,'foreign')).toMatchObject({comparable:false});
  expect(compare(now,{...old,question_id:'foreign'},'old')).toMatchObject({comparable:false});
  expect(compare(now,{...old,rubric_version:'different'},'old')).toMatchObject({comparable:false});
  expect(compare(now,{...old,status:'INSUFFICIENT_EVIDENCE',level:null},'old')).toMatchObject({comparable:false});
 });
});
