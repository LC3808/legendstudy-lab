// @vitest-environment jsdom
import {render,screen,cleanup} from '@testing-library/react';
import {afterEach,it,expect} from 'vitest';
import {DashboardUsageRankings} from './dashboard-usage-rankings';
afterEach(cleanup);
it('shows real member counts, limits materials to ten, and never invents menu counts',()=>{
 const rows=Array.from({length:12},(_,i)=>({kind:'recent',label:`자료 ${i}`,users:12-i,records:12-i}));
 render(<DashboardUsageRankings rows={[{kind:'saved',label:'저장만 한 자료',users:99,records:99},...rows]} loading={false}/>);
 expect(screen.getAllByRole('row')).toHaveLength(11);
 expect(screen.getByText('12명')).toBeVisible();
 expect(screen.queryByText('자료 10')).toBeNull();
 expect(screen.queryByText('저장만 한 자료')).toBeNull();
 expect(screen.getByText('집계 준비 중 · 메뉴 이용 기록 미수집')).toBeVisible();
 expect(screen.getByText(/앱·웹 구분과 자료실 탭 유입 경로/)).toBeInTheDocument();
});
it('keeps failure distinct from empty and loading',()=>{
 const {rerender}=render(<DashboardUsageRankings error loading/>);
 expect(screen.getByRole('alert')).toHaveTextContent('불러오지 못했습니다');
 expect(screen.queryByText(/기록이 없습니다/)).toBeNull();
 rerender(<DashboardUsageRankings loading/>);expect(screen.getByRole('status')).toBeVisible();
 rerender(<DashboardUsageRankings rows={[]} loading={false}/>);
 expect(screen.getByText(/선택 기간에 남아 있는/)).toBeVisible();
});
