// @vitest-environment jsdom
import {render,screen} from '@testing-library/react';
import {describe,it,expect} from 'vitest';
import {MathDocument} from './math-document';
describe('student math document projection',()=>{
 it('renders undelimited equations and preserves Korean conclusions missing from normalized OCR',()=>{
  const {container}=render(<MathDocument text={String.raw`따라서 e^{-x}=\frac{1}{x^2}
25<n<100 (최댓값 99, 최솟값 26)`}/>);
  expect(container.querySelectorAll('math').length).toBeGreaterThanOrEqual(2);
  expect(container.textContent).toContain('최댓값 99, 최솟값 26');
  expect(container.querySelector('annotation')?.textContent).toContain('e^{-x}');
 });
 it('keeps integrals, matrices, probability and aligned multiline expressions intact',()=>{
  const {container}=render(<MathDocument text={String.raw`\int_0^1 x^2\,dx
P(X=k)=\frac{n!}{k!(n-k)!}p^k(1-p)^{n-k}
\begin{pmatrix}1&2\\3&4\end{pmatrix}
\begin{aligned}x&=1\\y&=2\end{aligned}`}/>);
  expect(container.querySelectorAll('math')).toHaveLength(4);
  expect(container.querySelector('.math-source-fallback')).toBeNull();
 });
 it('shows explicit tables without guessing missing cells or changing values',()=>{
  render(<MathDocument text={'| 구분 | 값 |\n| --- | --- |\n| 표본 | -0.25 |\n| 확률 | 1/2 |'}/>);
  expect(screen.getByRole('table')).toBeInTheDocument();
  expect(screen.getByRole('cell',{name:'-0.25'})).toBeInTheDocument();
  expect(screen.getByRole('cell',{name:'1/2'})).toBeInTheDocument();
 });
 it('renders Q2 table rows without outer pipes and keeps following calculation',()=>{
  const {container}=render(<MathDocument text={'k/l | 1 | 1/2\nP(W=k/l) | 1/4 | 19/140\nE(W)=69/56'}/>);
  expect(screen.getByRole('table')).toBeInTheDocument();
  expect(Array.from(container.querySelectorAll('[role=cell]')).some(c=>c.textContent==='19/140')).toBe(true);
  expect(container.querySelector('annotation')?.textContent).toBe('P(W=k/l)');
  expect(container.textContent).toContain('69/56');
 });
 it('preserves unresolved or malformed source and never enables HTML or links',()=>{
  const {container}=render(<MathDocument text={String.raw`UNCERTAIN
\frac{broken
\href{javascript:alert(1)}{click}
<script>alert(1)</script>`}/>);
  expect(container.textContent).toContain('UNCERTAIN');
  expect(container.textContent).toContain(String.raw`\frac{broken`);
  expect(container.querySelector('script,a')).toBeNull();
 });
});
