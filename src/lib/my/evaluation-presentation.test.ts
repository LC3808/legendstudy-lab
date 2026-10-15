import {describe,it,expect} from 'vitest';
import {evaluationChangeSentence,evaluationSpeech} from './evaluation-presentation';
import type {Report} from './evaluation-report';
import {examIdentityBadges} from './exam-history';
describe('stored result display and speech',()=>{
 const before:Report={id:'a',priorId:null,answer:'private',question:'q',summary:'종합 본문',rubric:[{id:'c',name:'논리',value:'',stars:3,feedback:'근거'}],strengths:[{title:'강점 제목',explanation:'강점 본문',evidence:'',action:''}],weaknesses:[],actions:['수정'],nextSteps:[],pins:['same']};
 const after:Report={...before,id:'b',priorId:'a',rubric:[{...before.rubric[0],stars:4}]};
 it('states exact changes without invented reasons',()=>{
  expect(evaluationChangeSentence(3,4)).toContain('한 단계 높아졌습니다');
  expect(evaluationChangeSentence(2,4)).toContain('두 단계 높아졌습니다');
  expect(evaluationChangeSentence(4,2)).toContain('두 단계 낮아졌습니다');
  expect(evaluationChangeSentence(3,3)).toContain('동일한 평가 수준');
 });
 it('reads titles before bodies in visible report order, without slash levels',()=>{
  const speech=evaluationSpeech(after);expect(speech).not.toContain('/5');
  expect(speech).toContain('5단계 평가 중 4단계입니다');
  expect(speech.indexOf('종합 평가')).toBeLessThan(speech.indexOf('잘한 점'));
  expect(speech.indexOf('잘한 점')).toBeLessThan(speech.indexOf('평가 기준별 결과'));
  expect(speech).not.toContain('private');
  expect(evaluationSpeech(after,before,true)).toContain('이전 3단계에서 이번 4단계로 상승했습니다');
 });
 it('uses exact registry track and session rather than splitting display text',()=>{
  expect(examIdentityBadges('345d3caa-3438-58c3-8f80-62a6242179ec')).toHaveLength(2);
  expect(examIdentityBadges('missing')).toEqual([]);
 });
});
