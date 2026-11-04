// @vitest-environment jsdom
import {render,screen,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({read:vi.fn()}));
vi.mock('./admin-dashboard-view',()=>({useReadReport:mocks.read}));
import {MemberRecentActivity,materialUrl} from './member-recent-activity';
afterEach(cleanup);
it('renders actual stored and viewed records separately with dates and safe links',()=>{
 const row={id:'x',content_item_id:'c',title:'저장한 합성 자료',source_url:'https://legendstudy.com/test',at:'2026-11-04T00:00:00Z'};
 mocks.read.mockReturnValue({data:{version:'admin-member-activity-v1',account_id:'a',bookmarks_total:8,recent_total:1,bookmarks:[row],recent:[{...row,title:'최근 본 합성 자료'}]}});
 render(<MemberRecentActivity accountId="a"/>);expect(screen.getByText('북마크(즐겨찾기)')).toBeInTheDocument();expect(screen.getByRole('link',{name:'저장한 합성 자료 ↗'})).toHaveAttribute('rel','noopener noreferrer');expect(screen.getAllByText('2026-11-04 09:00')).toHaveLength(2);
});
it('does not render another member response',()=>{mocks.read.mockReturnValue({data:{version:'admin-member-activity-v1',account_id:'b'}});render(<MemberRecentActivity accountId="a"/>);expect(screen.getByRole('alert')).toBeInTheDocument();});
it('distinguishes failure from empty records',()=>{mocks.read.mockReturnValue({error:true});render(<MemberRecentActivity accountId="a"/>);expect(screen.queryByText('기록이 없습니다.')).toBeNull();});
it.each(['javascript:alert(1)','data:text/html,test','/unknown',null])('rejects unsafe or unknown link %s',url=>expect(materialUrl(url)).toBeNull());
