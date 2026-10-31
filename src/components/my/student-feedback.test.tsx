// @vitest-environment jsdom
import {afterEach,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import cases from '@/lib/my/fixtures/student-feedback-cases.json';
import {EvaluationReport} from './evaluation-report';
import type {Report} from '@/lib/my/evaluation-report';
afterEach(cleanup);
for(const c of cases)it(`stored learner feedback ${c.case}: source immutable, no invented guide`,()=>{
 const report:Report={id:'a',answer:c.answer,question:'합성 문항',summary:c.summary,
 rubric:[{id:'criterion',name:c.official,value:'',stars:c.level,feedback:c.explanation}],
 strengths:c.strength?[{title:'',explanation:c.strength,evidence:'',action:''}]:[],
 weaknesses:c.explanation?[{title:c.title,explanation:c.explanation,evidence:'없는 인용',action:c.action}]:[],
 actions:c.action?[c.action]:[],nextSteps:c.checklist?[c.checklist]:[],pins:['q','v1'],priorId:null};
 const original=JSON.stringify(report);
 const {container}=render(<EvaluationReport voiceType="humanities_social" title="합성 검증" report={report}/>);
 const headings=[...container.querySelectorAll('article > section > h3')].map(e=>e.textContent);
 expect(headings.slice(0,4)).toEqual(['종합 평가','높은 평가를 위한 작성 가이드','잘한 점','보완할 점과 개선 방법']);
 expect(screen.queryByText(c.official)).toBeNull();expect(screen.queryByText('없는 인용')).toBeNull();
 if(c.action)expect(screen.getAllByText(c.action)).toHaveLength(1);
 expect(screen.getByText(/별도로 검증된 높은 평가의 핵심 조건/)).toBeTruthy();
 expect(screen.getByLabelText(`5단계 중 ${c.level}단계`)).toBeTruthy();
 const audio=container.querySelector('details.report-audio')!;
 expect(audio.hasAttribute('open')).toBe(false);expect(audio.previousElementSibling?.textContent).toContain('종합 평가');expect(audio.nextElementSibling?.textContent).toContain('높은 평가를 위한 작성 가이드');
 expect(JSON.stringify(report)).toBe(original);
});
