// @vitest-environment jsdom
import {render,screen} from '@testing-library/react';
import {it,expect} from 'vitest';
import {EvaluationReport} from './evaluation-report';
import {humanReport,compareReports} from '@/lib/my/evaluation-report';
const raw={id:'first',question_id:'q',session_id:'s',regime_key:'policy',contract_version:'1.3',evidence_completeness:'complete',input_snapshot:{criteria:[{id:'c',version:'1'}]},overall_summary:'주장이 명확해요.',strengths:['자료를 연결했어요.'],essay_evaluation_dimensions:[{criterion_id:'c',display_order:1,level_1_to_5:3,explanation:'인용의 뜻을 설명하세요.',essay_evaluation_criteria:{label:'근거의 해석'}}],essay_improvement_progress:[{title:'근거',status:'open',explanation:'연결 설명이 빠졌어요.',next_action:'근거의 의미를 설명하세요.',scaffolding_observation:{core_focus:true,sentences:[{quote:'자료를 비교했다.'}]}}],rewrite_checklist:['해석을 확인하세요.']};
const attempt={mode:'text',question_metadata_version:'v1',conditions_snapshot:{kind:'practice'}};
it('preserves approved human result order and collapsed five-level/details/examples',()=>{
 const {container}=render(<EvaluationReport title="최초 첨삭" voiceType="humanities_social" report={humanReport(raw,'자료를 비교했다.','',attempt)}/>);
 expect([...container.querySelectorAll('article > section > h3')].map(e=>e.textContent)).toEqual(['종합 평가','잘한 점','평가 기준별 결과','보완할 점','우선 수정할 부분','재작성 안내','평가 근거']);
 expect(screen.getByLabelText('5단계 중 3단계')).toHaveTextContent('★★★☆☆');
 for(const label of ['근거의 해석','첨삭을 반영한 예시 답안','대학 공식 예시답안'])expect(screen.getByText(label).closest('details')).not.toHaveAttribute('open');
 expect(container.querySelector('blockquote')).toHaveTextContent('자료를 비교했다.');
});
it('compares only actual selected prior with matching question, session and rubric',()=>{
 const before=humanReport(raw,'자료를 비교했다.','',attempt);
 const revised={...raw,id:'second',input_snapshot:{...raw.input_snapshot,scaffolding_context:{selected_previous_evaluation_id:'first'}}};
 expect(compareReports(before,humanReport(revised,'수정','',attempt))?.[0].direction).toBe('UNCHANGED');
 for(const value of [{...revised,session_id:'other'},{...revised,question_id:'other'},{...revised,input_snapshot:{criteria:[{id:'c',version:'2'}],scaffolding_context:{selected_previous_evaluation_id:'first'}}},{...revised,input_snapshot:raw.input_snapshot}])expect(compareReports(before,humanReport(value,'수정','',attempt))).toBeNull();
});
it('does not surface invented answer quotes or non-core priorities',()=>{
 const value={...raw,essay_improvement_progress:[{...raw.essay_improvement_progress[0],scaffolding_observation:{core_focus:false,sentences:[{quote:'답안에 없는 문장'}]}}]};
 const report=humanReport(value,'실제 답안');expect(report.actions).toEqual([]);expect(report.weaknesses[0].evidence).toBe('');expect(report.example).toBeUndefined();
});
