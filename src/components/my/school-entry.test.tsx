// @vitest-environment jsdom
import {render, screen} from '@testing-library/react';
import {expect, it} from 'vitest';
import {SchoolStudyEntry} from './school-entry';

it('shows the mypage school-competition entry linking to /school/', () => {
  render(<SchoolStudyEntry/>);
  expect(screen.getByRole('heading', {name: '우리 학교 공부 순위'})).toBeTruthy();
  expect(screen.getByText(/우리 학교 친구들과 공부시간을 비교/)).toBeTruthy();
  const link = screen.getByRole('link', {name: /우리 학교 랭킹 보기/});
  expect(link.getAttribute('href')).toMatch(/^\/school\/?$/);
});
