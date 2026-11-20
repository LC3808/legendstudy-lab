// @vitest-environment jsdom
import {cleanup, render, within} from '@testing-library/react';
import {afterEach, expect, it} from 'vitest';
import {humanReport} from '@/lib/my/evaluation-report';
import {WritingGuideCard} from './writing-guide-card';
import {EvaluationReport} from './evaluation-report';
afterEach(cleanup);
it.each([1, 2, 3, 12])('renders %i structured priorities and questions without splitting or mutating text', count => {
  const text = '<제시문 1> · 수치 50%, 약 -30m. 근거를 구별했는가?\n두 번째 줄';
  const report = {...humanReport({}, ''), actions: Array.from({length: count}, (_, i) => `${i}: ${text}`), nextSteps: Array.from({length: count}, (_, i) => `${i}: 질문 ${text}`)};
  const original = JSON.stringify(report);
  const {container} = render(<WritingGuideCard report={report}/>);
  expect(container.querySelectorAll('ol > li')).toHaveLength(count);
  expect(container.querySelectorAll('ul > li')).toHaveLength(count);
  expect(container.querySelector('.writing-guide__text')?.textContent).toBe(report.actions[0]);
  expect(container.querySelector('input')).toBeNull();
  expect(JSON.stringify(report)).toBe(original);
});
it('removes only template repetition, preserves identical words inside stored feedback and links', () => {
  const report = {...humanReport({}, ''), actions: ['실제 개선 방법', '저장 문장 · 아래 개선 방법 확인'], nextSteps: ['실제 개선 방법', '점검 질문'], weaknesses: [{title: '핵심 과제', action: '실제 개선 방법', explanation: '보완 사유', evidence: ''}]};
  const {container} = render(<EvaluationReport report={report} title="기존 결과"/>);
  const guide = within(container.querySelector('.writing-guide') as HTMLElement);
  expect(guide.getByText('핵심 과제')).toBeInTheDocument();
  expect(guide.getByText('저장 문장 · 아래 개선 방법 확인')).toBeInTheDocument();
  expect(guide.queryByText('핵심 과제 · 아래 개선 방법 확인')).toBeNull();
  expect(container.querySelector('.report-weaknesses')).toHaveTextContent('실제 개선 방법');
});
it('handles legacy empty records without fabricating evaluation content', () => {
  const report = {...humanReport({}, ''), actions: ['', '  '], nextSteps: ['\n']};
  const {container} = render(<WritingGuideCard report={report}/>);
  expect(container.querySelector('li')).toBeNull();
  expect(container).toHaveTextContent('저장된 개선 과제와 확인 항목이 없습니다.');
  expect(container).toHaveTextContent('추가 평가 기준이 제공되지 않은 문항');
});
it('uses the stored action if a linked title is blank', () => {
  const report = {...humanReport({}, ''), actions: ['원문 그대로'], weaknesses: [{title: ' ', action: '원문 그대로', explanation: '', evidence: ''}]};
  const {container} = render(<WritingGuideCard report={report}/>);
  expect(container.querySelector('li')).toHaveTextContent('원문 그대로');
});
