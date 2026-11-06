// @vitest-environment jsdom
import {render,screen,cleanup} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {LearningCompletenessCard,LearningComparison} from './learning-completeness';
afterEach(cleanup);
const valid={version:'learning-completeness-v1',evaluation_id:'new',status:'ASSESSED',level:3,rationale:'공식 기준에 연결된 관측',next_direction:'조건과 근거를 확인하세요.'};
it('displays reviewed level with score distinction',()=>{render(<LearningCompletenessCard value={valid} evaluationId="new"/>);expect(screen.getByText('학습 완성도 · 3/5단계')).toBeInTheDocument();expect(screen.getByText(/대학 공식 점수나 합격 가능성/)).toBeInTheDocument();});
it.each([null,{}, {...valid,level:6},{...valid,level:2.5},{...valid,evaluation_id:'foreign'},{...valid,version:'unknown'}])('does not infer an unsupported rating %j',value=>{render(<LearningCompletenessCard value={value} evaluationId="new"/>);expect(screen.queryByRole('region',{name:'학습 완성도'})).toBeNull();});
it('withholds insufficient evidence instead of zero',()=>{render(<LearningCompletenessCard value={{...valid,status:'INSUFFICIENT_EVIDENCE',level:null}} evaluationId="new"/>);expect(screen.getByText('학습 완성도 · 판단 보류')).toBeInTheDocument();expect(screen.queryByLabelText(/전체 5단계/)).toBeNull();});

it('uses the server comparison and its evidence without inventing growth',()=>{
 render(<LearningComparison value={{comparable:true,before:2,after:4,delta:2,prior_rationale:'이전 조건 누락',current_rationale:'현재 조건 확인',improved_criterion_ids:['criterion'],remaining_criterion_ids:[]}}/>);
 expect(screen.getByText('2단계 → 4단계 (+2)')).toBeInTheDocument();
 expect(screen.getByText('이전 근거: 이전 조건 누락')).toBeInTheDocument();
 expect(screen.getByText(/실제 실력 향상이나 합격 가능성을 뜻하지/)).toBeInTheDocument();
});
it('does not compare different policies',()=>{render(<LearningComparison value={{comparable:false,reason:'CRITERIA_CHANGED'}}/>);expect(screen.getByText(/직접 비교하지 않습니다/)).toBeInTheDocument();});
