// @vitest-environment jsdom
import {render,screen} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {UniversityCatalogDetail} from './university-catalog-detail';
import {catalogUniversity} from '@/lib/essay-runtime/public-discovery';
vi.mock('./auth-context',()=>({useAuth:()=>({client:null,user:null})}));
it('uses real admissions fields and sources while keeping admissions and question years separate',()=>{
 render(<UniversityCatalogDetail university={catalogUniversity('konkuk')!}/>);
 expect(screen.getByRole('heading',{name:'건국대학교',level:1})).toBeVisible();
 expect(screen.getByText('100%')).toBeVisible();expect(screen.getByText('0%')).toBeVisible();
 expect(screen.queryByText('지원자 수')).toBeNull();
 expect(screen.getByRole('heading',{name:'공식 자료'})).toBeVisible();
 for(const a of screen.getAllByRole('link').filter(a=>a.getAttribute('target')==='_blank'))expect(a.getAttribute('rel')).toContain('noopener');
 expect(screen.queryByRole('button',{name:'첨삭 시작하기'})).toBeNull();
});
it('keeps an unmapped university browsable with an honest empty state',()=>{
 render(<UniversityCatalogDetail university={catalogUniversity('eulji')!}/>);
 expect(screen.getByText('기출문제를 준비하고 있어요.')).toBeVisible();
 expect(screen.getByRole('button',{name:'서비스 추후 제공'})).toBeDisabled();
 expect(screen.queryByText(/NOT PUBLISHED/)).toBeNull();
 expect(screen.getAllByRole('heading',{name:'성남캠퍼스'})).toHaveLength(2);
});
