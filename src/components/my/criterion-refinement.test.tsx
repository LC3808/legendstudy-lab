// @vitest-environment jsdom
import {afterEach,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {CriterionResults,EvaluationComparison} from './evaluation-report';
import {criterionDisplayName} from '@/lib/my/criterion-display';
import type {Report} from '@/lib/my/evaluation-report';
afterEach(cleanup);
const base:Report={id:'a',answer:'',question:'q',summary:'',rubric:[{id:'c',name:'공식 원문',stars:4,value:'',feedback:'저장된 설명'}],strengths:[],weaknesses:[],actions:[],nextSteps:[],pins:['q','v1'],priorId:null,evidenceLabels:['공식 원문 — 저장된 설명']};
it('renders shared explanation once, retains distinct matched evidence without exposing raw unmatched sources',()=>{
 render(<CriterionResults report={{...base,evidenceLabels:[...base.evidenceLabels!,'공식 원문 — 별도 근거','다른 출처']}}/>);
 expect(screen.getAllByText('저장된 설명')).toHaveLength(1);
 expect(screen.getByText('별도 근거')).toBeTruthy();expect(screen.queryByText('다른 출처')).toBeNull();
 expect(base.evidenceLabels).toEqual(['공식 원문 — 저장된 설명']);
 expect(screen.queryByText('공식 채점기준 자세히 보기')).toBeNull();
});
it('uses exact-label evidence fallback and honestly marks missing explanations',()=>{
 render(<CriterionResults report={{...base,rubric:[{...base.rubric[0],feedback:''},{id:'missing',name:'다른 기준',stars:2,value:'',feedback:''}]}}/>);
 expect(screen.getByText('저장된 설명')).toBeTruthy();expect(screen.getByText('상세 평가 설명이 제공되지 않았습니다.')).toBeTruthy();
});
it('retains long unclear originals and uses only established aliases',()=>{
 const raw='6. 평가기준 하위 채점 기준 배점 문항 '+ '복합적인 공식 기준 '.repeat(20);
 expect(criterionDisplayName(raw,'unseen')).toBe(raw);
 expect(criterionDisplayName(raw,'unseen',1)).toBe('문항별 채점기준');
 expect(criterionDisplayName(raw,'unseen',2)).toBe(raw);
 expect(criterionDisplayName('논리 전개와 구성이 잘 이루어졌는가','unseen')).toBe('논리·구성');
});
it('keeps stored equal levels and rejects incompatible comparisons',()=>{
 const after={...base,id:'b',priorId:'a'};
 const {rerender}=render(<EvaluationComparison before={base} after={after}/>);
 expect(screen.getByText('변화 없음')).toBeTruthy();expect(screen.getAllByText(/★★★★☆ 4\/5/)).toHaveLength(2);
 expect(screen.getByText('재첨삭 평가 설명')).toBeTruthy();
 rerender(<EvaluationComparison before={base} after={{...after,pins:['other']}}/>);
 expect(screen.getByText('평가 기준이 다르거나 비교에 필요한 정보가 없어 직접 비교하기 어렵습니다.')).toBeTruthy();
});
