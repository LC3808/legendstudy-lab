// @vitest-environment jsdom
import {render,screen} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {UniversityCatalogDetail} from './university-catalog-detail';
import {catalogUniversity} from '@/lib/essay-runtime/public-discovery';
vi.mock('./auth-context',()=>({useAuth:()=>({client:null,user:null,status:'anonymous'})}));
it('puts collapsed schedule before writing entry and hides admission details without removing source data',()=>{
 render(<UniversityCatalogDetail university={catalogUniversity('konkuk')!}/>);
 expect(screen.getByRole('heading',{name:'건국대학교',level:1})).toBeVisible();
 expect(screen.getByRole('heading',{name:'논술 첨삭 시작'})).toBeVisible();
 expect(screen.queryByText('100%')).toBeNull();expect(screen.queryByText('0%')).toBeNull();
 expect(screen.queryByRole('heading',{name:'논술전형 안내'})).toBeNull();
 expect(screen.queryByText('2027학년도 논술전형')).toBeNull();
 for(const a of screen.getAllByRole('link').filter(a=>a.getAttribute('target')==='_blank'))expect(a.getAttribute('rel')).toContain('noopener');
 const schedule=screen.getByText('2027학년도 논술 일정').closest('details')!;
 expect(schedule).not.toHaveAttribute('open');
 expect(schedule.compareDocumentPosition(screen.getByRole('heading',{name:'논술 첨삭 시작'})) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(screen.getByRole('link',{name:'← 대학 목록'}).getAttribute('href')).toMatch(/^\/essay-lab\/?$/);
});
it('keeps an unmapped university honest without fake question choices',()=>{
 render(<UniversityCatalogDetail university={catalogUniversity('eulji')!}/>);
 expect(screen.getByText('기출문제를 준비하고 있어요.')).toBeVisible();
 expect(screen.getByRole('combobox',{name:'학년도'})).toHaveValue('');
 expect(screen.getByRole('combobox',{name:'시험 유형'})).toBeDisabled();
 expect(screen.queryByText(/NOT PUBLISHED/)).toBeNull();
});
it('uses verified schedule facts and distinguishes duration from unknown start time',()=>{
 render(<UniversityCatalogDetail university={catalogUniversity('skku')!}/>);
 expect(screen.getByText('2026-11-22')).toBeInTheDocument();
 expect(screen.getByText('100분')).toBeInTheDocument();
 expect(screen.queryByText('시작 시간')).toBeNull();
 expect(screen.queryByText('모집인원')).toBeNull();
});
