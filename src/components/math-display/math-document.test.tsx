// @vitest-environment jsdom
import {render,screen} from '@testing-library/react';
import {describe,it,expect} from 'vitest';
import {MathDocument} from './math-document';
import {displayMathSource} from './math-text';
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
 it('renders explicit printed radicals without changing their operands',()=>{
  const {container}=render(<MathDocument text={'b-a=10/√n, d-c=6/√n\n1<10/√n, 6/√n<6/5'}/>);
  expect(container.querySelectorAll('math')).toHaveLength(2);
  expect(container.querySelector('.math-source-fallback')).toBeNull();
  expect(container.querySelector('annotation')?.textContent).toBe(String.raw`b-a=10/\sqrt{n}, d-c=6/\sqrt{n}`);
 });
 it('renders the actual commerce derivative prime without altering stored source',()=>{
  const source='f(t)=t⁴-1, f′(t)=4t³\nf′(-2)=-32.';
  const {container}=render(<MathDocument text={source}/>);
  expect(container.querySelectorAll('math')).toHaveLength(2);
  expect(container.querySelector('.math-source-fallback')).toBeNull();
  expect(container.querySelector('annotation')?.textContent).toBe("f(t)=t⁴-1, f'(t)=4t³");
  expect(source).toContain('f′(-2)=-32.');
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

it('renders production Inha indexed roots without changing their given index or operand',()=>{
 const source='t>1/√[4]{3}\nS(√[4]{u})';
 const {container}=render(<MathDocument text={source}/>);
 expect(container.querySelectorAll('math')).toHaveLength(2);
 expect(container.querySelectorAll('mroot')).toHaveLength(2);
 expect(container.querySelector('.math-source-fallback')).toBeNull();
 expect(Array.from(container.querySelectorAll('annotation')).map(n=>n.textContent)).toEqual([String.raw`t>1/\sqrt[4]{3}`,String.raw`S(\sqrt[4]{u})`]);
 expect(source).toBe('t>1/√[4]{3}\nS(√[4]{u})');
});
it('keeps compact problem labels as text while formatting their following equation',()=>{
 const {container}=render(<MathDocument text={'(1-2) u=t^4\n(1-2)u=t^4\n(1 - 2) u=t^4\n'+String.raw`\((1-2) u=t^4\)`}/>);
 expect(container.querySelectorAll('.math-document-label')).toHaveLength(1);
 expect(container.querySelector('.math-document-label')?.textContent).toBe('(1-2) ');
 expect(Array.from(container.querySelectorAll('annotation')).map(n=>n.textContent)).toEqual(['u=t^4','(1-2)u=t^4','(1 - 2) u=t^4','(1-2) u=t^4']);
});
it('never fills missing indexed-root content or silently converts an unspecified index',()=>{
 for(const source of ['√[4]{','√[4]{}','√[]{3}','√[?]{3}']){
  const displayed=displayMathSource(source);
  expect(displayed.includes('3')).toBe(source.includes('3'));
  expect(displayed.includes('4')).toBe(source.includes('4'));
 }
 const source='t>√[4]{';
 const {container}=render(<MathDocument text={source}/>);
 expect(container.querySelector('.math-source-fallback')?.textContent).toContain(source);
 expect(displayMathSource('√[?]{3}')).toBe('√[?]{3}');
});

it('renders the actual free-rewrite OCR superscript fourth-root index as mroot',()=>{
 const source='t>1/⁴√3\nS(⁴√u)\n²√{x+1}\n³√8\n¹²√u';
 const {container}=render(<MathDocument text={source}/>);
 expect(container.querySelector('.math-source-fallback')).toBeNull();
 expect(Array.from(container.querySelectorAll('mroot')).map(n=>n.lastElementChild?.textContent)).toEqual(['4','4','2','3','12']);
 expect(Array.from(container.querySelectorAll('annotation')).map(n=>n.textContent)).toEqual([
  String.raw`t>1/\sqrt[4]{3}`,String.raw`S(\sqrt[4]{u})`,String.raw`\sqrt[2]{x+1}`,String.raw`\sqrt[3]{8}`,String.raw`\sqrt[12]{u}`,
 ]);
 expect(source).toBe('t>1/⁴√3\nS(⁴√u)\n²√{x+1}\n³√8\n¹²√u');
});
it('does not reinterpret a preceding exponent or invent a missing radical operand',()=>{
 expect(displayMathSource('x⁴√3')).toBe(String.raw`x⁴\sqrt{3}`);
 expect(displayMathSource('⁴√')).toBe('⁴√');
 expect(displayMathSource('⁻³√x')).toBe(String.raw`⁻³\sqrt{x}`);
 const source='t>⁴√{';
 const {container}=render(<MathDocument text={source}/>);
 expect(container.querySelector('.math-source-fallback')?.textContent).toContain(source);
});
