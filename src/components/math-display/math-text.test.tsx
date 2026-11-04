// @vitest-environment jsdom
import {render,screen} from '@testing-library/react';
import {describe,it,expect} from 'vitest';
import {MathText,Formula} from './math-text';
describe('math rendering',()=>{
 it('renders fractions exponents subscripts integrals matrices without rewriting prose',()=>{
  const {container}=render(<MathText text={String.raw`풀이 \(\frac{x_1^2}{2}+\int_0^1 x\,dx+\begin{pmatrix}1&2\\3&4\end{pmatrix}\)`}/>);
  expect(container.querySelector('math')).not.toBeNull();expect(container.querySelectorAll('.mfrac').length).toBeGreaterThan(0);expect(screen.getByText(/풀이/)).toBeInTheDocument();
 });
 it('preserves malformed source and rejects active links',()=>{
  const raw=String.raw`\frac{broken`;const {container}=render(<><Formula source={raw}/><Formula source={String.raw`\href{javascript:alert(1)}{click}`}/></>);
  expect(screen.getByText(raw)).toBeInTheDocument();expect(container.querySelector('a')).toBeNull();
 });
});
