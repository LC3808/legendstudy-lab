// @vitest-environment jsdom
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {UniversityDiscovery} from './university-discovery';
vi.mock('./auth-context',()=>({useAuth:()=>({client:null})}));
it('paginates all source universities and resets page after search',async()=>{render(<UniversityDiscovery/>);expect(screen.getByText('42개 대학 · 전형 정보 기준')).toBeVisible();expect(screen.getByText('1 / 4')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'다음'}));expect(screen.getByText('2 / 4')).toBeVisible();fireEvent.change(screen.getByLabelText('대학 검색'),{target:{value:'성균관'}});expect(screen.getByText('1개 대학 · 전형 정보 기준')).toBeVisible();expect(screen.getByText('1 / 1')).toBeVisible();await waitFor(()=>expect(screen.getByRole('link',{name:'성균관대학교'}).getAttribute('href')).toMatch(/^\/essay-lab\/universities\/skku\/?$/));expect(screen.queryByRole('button',{name:'첨삭 가능'})).toBeNull();});

it('keeps all42 browsable and offers preferred22 plus Seoul without exposing development groups',()=>{
 render(<UniversityDiscovery/>);fireEvent.click(screen.getByRole('button',{name:'주요 대학'}));
 expect(screen.queryByRole('link',{name:'강남대학교'})).toBeNull();
 expect(screen.getByRole('button',{name:'주요 대학'})).toHaveAttribute('aria-pressed','true');
 fireEvent.click(screen.getByRole('button',{name:'전체 42개'}));expect(screen.getByText('42개 대학 · 전형 정보 기준')).toBeVisible();
 expect(screen.queryByText('GROUP A')).toBeNull();expect(screen.queryByText('CORE')).toBeNull();
});
it('shows the reference search affordance and separates type, materials and AI readiness',()=>{
 render(<UniversityDiscovery/>);
 expect(screen.getByPlaceholderText('대학명을 검색해 보세요.')).toHaveAttribute('type','search');
 expect(screen.getByRole('img',{name:'가천대학교 로고'})).toBeVisible();
 expect(screen.getAllByText('AI 첨삭 준비 중').length).toBeGreaterThan(0);
 expect(screen.queryByText('첨삭 가능')).toBeNull();
});
it('defaults to service priority, supports explicit alphabetical order, and resets pagination on sort changes',()=>{
 render(<UniversityDiscovery/>);
 expect(screen.getByRole('combobox',{name:'대학 정렬'})).toHaveValue('service');
 expect(screen.queryByRole('link',{name:'강남대학교'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'다음'}));
 fireEvent.change(screen.getByRole('combobox',{name:'대학 정렬'}),{target:{value:'name'}});
 expect(screen.getByText('1 / 4')).toBeVisible();
 expect(screen.getByRole('link',{name:'강남대학교'})).toBeVisible();
 fireEvent.change(screen.getByRole('combobox',{name:'대학 정렬'}),{target:{value:'applicants'}});
 expect(screen.getByText('검증된 2027학년도 통계가 없는 대학은 서비스 우선순위를 적용합니다.')).toBeVisible();
 fireEvent.change(screen.getByLabelText('대학 검색'),{target:{value:'을지'}});
 expect(screen.getByRole('link',{name:'을지대학교'})).toBeVisible();
});
