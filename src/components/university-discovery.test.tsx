// @vitest-environment jsdom
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
import {UniversityDiscovery} from './university-discovery';
const availability=vi.hoisted(()=>({ids:new Set<string>(),status:'ready',retry:vi.fn()}));
vi.mock('./use-essay-service-status',()=>({useEssayServiceStatus:()=>({universities:availability.ids,status:availability.status,retry:availability.retry})}));
vi.mock('./auth-context',()=>({useAuth:()=>({client:null})}));
beforeEach(()=>{availability.status='ready';try{sessionStorage.clear();}catch{/* ignore */}});
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
 expect(screen.getByRole('img',{name:'건국대학교 로고'})).toBeVisible();
 expect(screen.getAllByText('논술 첨삭 준비 중').length).toBeGreaterThan(0);
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

it('keeps essay-first selection compact without changing all42 routes and applies the Owner location order',()=>{
 const {container}=render(<UniversityDiscovery essayFirst/>);
 expect(screen.getByText('UNIVERSITY SEARCH')).toBeVisible();
 expect(screen.getByRole('heading',{name:'대학 찾기'})).toBeVisible();
 for(const name of ['지역','논술 유형','전형 학년도'])expect(screen.queryByRole('combobox',{name})).toBeNull();
 expect(screen.getByRole('img',{name:'건국대학교 로고'})).toBeVisible();
 expect(container.querySelector('.university-card-meta,.university-card-status,.university-regions,.university-badges')).toBeNull();
 const names:string[]=[];
 for(let page=0;page<4;page++){
  const links=Array.from(document.querySelectorAll<HTMLAnchorElement>('.university-card-heading a'));
  for(const link of links){expect(link.getAttribute('href')).toMatch(/^\/essay-lab\/universities\/[^/]+\/?$/);names.push(link.textContent!);}
  if(page<3)fireEvent.click(screen.getByRole('button',{name:'다음'}));
 }
 expect(new Set(names).size).toBe(42);
 expect(names.slice(0,3)).toEqual(['건국대학교','경희대학교','고려대학교']);
 expect(names.slice(-1)).toEqual(['홍익대학교']);
 fireEvent.change(screen.getByLabelText('대학 검색'),{target:{value:'성균관'}});
 expect(screen.getByRole('status')).toHaveTextContent('1개 대학');
 expect(screen.getByRole('link',{name:'성균관대학교'}).getAttribute('href')).toMatch(/^\/essay-lab\/universities\/skku\/?$/);
 fireEvent.change(screen.getByLabelText('대학 검색'),{target:{value:''}});
 fireEvent.click(screen.getByRole('button',{name:'주요 대학'}));
 expect(screen.getByRole('status')).toHaveTextContent('32개 대학');
 fireEvent.change(screen.getByRole('combobox',{name:'대학 정렬'}),{target:{value:'name'}});
 expect(screen.getByText('1 / 3')).toBeVisible();
});

it('shows every university with 전체보기 and returns to the paged view',()=>{
 render(<UniversityDiscovery essayFirst/>);
 expect(screen.getByText('1 / 4')).toBeVisible();
 expect(screen.queryAllByRole('link',{name:/첨삭 시작하기$/})).toHaveLength(0);
 const viewAll=screen.getByRole('button',{name:'전체보기'});expect(viewAll).toHaveAttribute('aria-pressed','false');
 fireEvent.click(viewAll);
 expect(screen.queryAllByRole('link',{name:/첨삭 시작하기$/})).toHaveLength(0);
 expect(screen.getAllByRole('button',{name:'첨삭 서비스 준비 중'})).toHaveLength(42);
 for(const button of screen.getAllByRole('button',{name:'첨삭 서비스 준비 중'}))expect(button).toBeDisabled();
 expect(screen.queryByText('1 / 4')).toBeNull();
 expect(screen.getByText('42개 대학 전체 표시')).toBeVisible();
 const back=screen.getByRole('button',{name:'페이지 보기'});expect(back).toHaveAttribute('aria-pressed','true');
 fireEvent.click(back);
 expect(screen.getByText('1 / 4')).toBeVisible();
 expect(screen.queryAllByRole('link',{name:/첨삭 시작하기$/})).toHaveLength(0);
 expect(screen.getByRole('button',{name:'전체보기'})).toHaveAttribute('aria-pressed','false');
});

const DISCOVERY_KEY='legendstudy:essay-discovery:v1:essay';
it('restores the list page after returning from a detail page (remount)',async()=>{
 const view=render(<UniversityDiscovery essayFirst/>);
 await waitFor(()=>expect(sessionStorage.getItem(DISCOVERY_KEY)).not.toBeNull());
 fireEvent.click(screen.getByRole('button',{name:'다음'}));
 expect(screen.getByText('2 / 4')).toBeVisible();
 view.unmount();
 render(<UniversityDiscovery essayFirst/>);
 await waitFor(()=>expect(screen.getByText('2 / 4')).toBeVisible());
});

it('restores 전체보기 view and search text after returning',async()=>{
 const view=render(<UniversityDiscovery essayFirst/>);
 await waitFor(()=>expect(sessionStorage.getItem(DISCOVERY_KEY)).not.toBeNull());
 fireEvent.change(screen.getByLabelText('대학 검색'),{target:{value:'성균관'}});
 fireEvent.click(screen.getByRole('button',{name:'전체보기'}));
 view.unmount();
 render(<UniversityDiscovery essayFirst/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'페이지 보기'})).toBeVisible());
 expect(screen.getByLabelText('대학 검색')).toHaveValue('성균관');
});

it('distinguishes loading and failure from an unpublished university',()=>{
 availability.status='loading';const view=render(<UniversityDiscovery essayFirst/>);
 expect(screen.getAllByRole('button',{name:'서비스 확인 중'})).toHaveLength(12);
 expect(screen.queryByText('첨삭 서비스 준비 중')).toBeNull();
 availability.status='error';view.rerender(<UniversityDiscovery essayFirst/>);
 fireEvent.click(screen.getAllByRole('button',{name:'일시적으로 확인할 수 없습니다 · 다시 시도'})[0]);expect(availability.retry).toHaveBeenCalled();
 expect(screen.queryByText('첨삭 서비스 준비 중')).toBeNull();
});
