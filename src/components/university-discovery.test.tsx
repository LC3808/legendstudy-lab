// @vitest-environment jsdom
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {UniversityDiscovery} from './university-discovery';
vi.mock('./auth-context',()=>({useAuth:()=>({client:null})}));
it('paginates all source universities and resets page after search',async()=>{render(<UniversityDiscovery/>);expect(screen.getByText('42개 대학 · 전형 정보 기준')).toBeVisible();expect(screen.getByText('1 / 4')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'다음'}));expect(screen.getByText('2 / 4')).toBeVisible();fireEvent.change(screen.getByLabelText('대학 검색'),{target:{value:'성균관'}});expect(screen.getByText('1개 대학 · 전형 정보 기준')).toBeVisible();expect(screen.getByText('1 / 1')).toBeVisible();await waitFor(()=>expect(screen.getByRole('link',{name:'성균관대학교'}).getAttribute('href')).toMatch(/^\/essay-lab\/universities\/skku\/?$/));expect(screen.queryByRole('button',{name:'첨삭 가능'})).toBeNull();});
