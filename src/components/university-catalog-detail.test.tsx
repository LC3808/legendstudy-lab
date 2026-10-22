// @vitest-environment jsdom
import {render,screen} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {UniversityCatalogDetail} from './university-catalog-detail';
import {catalogUniversity} from '@/lib/essay-runtime/public-discovery';
vi.mock('./auth-context',()=>({useAuth:()=>({client:null,user:null,status:'anonymous'})}));
it('puts question selection before collapsed schedule and hides admission details without removing source data',()=>{
 render(<UniversityCatalogDetail university={catalogUniversity('konkuk')!}/>);
 expect(screen.getByRole('heading',{name:'건국대학교',level:1})).toBeVisible();
 expect(screen.getByRole('heading',{name:'기출문제 선택'})).toBeVisible();
 expect(screen.queryByText('100%')).toBeNull();expect(screen.queryByText('0%')).toBeNull();
 expect(screen.queryByRole('heading',{name:'논술전형 안내'})).toBeNull();
 expect(screen.queryByText('2027학년도 논술전형')).toBeNull();
 for(const a of screen.getAllByRole('link').filter(a=>a.getAttribute('target')==='_blank'))expect(a.getAttribute('rel')).toContain('noopener');
 const schedule=screen.getByText('2027학년도 논술 일정').closest('details')!;
 expect(schedule).not.toHaveAttribute('open');
 expect(schedule.compareDocumentPosition(screen.getByRole('heading',{name:'기출문제 선택'})) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
 expect(screen.getByRole('link',{name:'← 대학 목록'}).getAttribute('href')).toMatch(/^\/essay-lab\/?$/);
});
it('keeps an unmapped university honest without fake question choices',()=>{
 render(<UniversityCatalogDetail university={catalogUniversity('eulji')!}/>);
 expect(screen.getByText('기출문제를 준비하고 있어요.')).toBeVisible();
 expect(screen.getByRole('combobox',{name:'학년도·시험'})).toHaveValue('');
 expect(screen.queryByRole('combobox',{name:'시험 유형'})).toBeNull();
 expect(screen.queryByText(/NOT PUBLISHED/)).toBeNull();
});
it('uses verified schedule facts and distinguishes duration from unknown start time',()=>{
 render(<UniversityCatalogDetail university={catalogUniversity('skku')!}/>);
 expect(screen.getByText('2026-11-22')).toBeInTheDocument();
 expect(screen.getByText('100분')).toBeInTheDocument();
 expect(screen.queryByText('시작 시간')).toBeNull();
 expect(screen.queryByText('모집인원')).toBeNull();
});

it('uses the verified Sogang materials page instead of a PDF fallback',()=>{
 render(<UniversityCatalogDetail university={catalogUniversity('sogang')!}/>);
 expect(screen.getByRole('link',{name:/공식 논술 자료 확인/})).toHaveAttribute('href','https://admission.sogang.ac.kr/enter/html/rolling/data.asp');
});
it('uses the official multi-year KAU archive without exposing the source PDF',()=>{
 render(<UniversityCatalogDetail university={catalogUniversity('kau')!}/>);
 expect(screen.getByRole('link',{name:/공식 논술 자료 확인/})).toHaveAttribute('href','https://ibhak.kau.ac.kr/admission/html/rolling/previous_in_exam.asp');
});
