// @vitest-environment jsdom
import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({read:vi.fn()}));vi.mock('./admin-dashboard-view',()=>({useReadReport:mocks.read}));
import {AdminCreditReport} from './admin-credit-report';
afterEach(cleanup);
it('retains v2 source/action filters, distinct grant/consumption statistics and pagination',()=>{
 mocks.read.mockReturnValue({data:{version:'credit-report-v2',total:26,grant_total:1,consume_total:1,balance_delta:0,reserved_delta:0,grant_stats:[{source_kind:'beta',records:1,quantity:1}],action_stats:[{action:'reserve',records:1,quantity:1}],rows:[]}});
 render(<AdminCreditReport/>);fireEvent.change(screen.getByLabelText('지급 유형'),{target:{value:'beta'}});fireEvent.change(screen.getByLabelText('거래 유형'),{target:{value:'reserve'}});
 expect(mocks.read.mock.lastCall?.[0]).toBe('admin_credit_report');expect(mocks.read.mock.lastCall?.[1].p).toMatchObject({version:'credit-report-v2',source:'beta',action:'reserve',offset:0,limit:25});
 fireEvent.click(screen.getByRole('button',{name:'다음'}));expect(mocks.read.mock.lastCall?.[1].p.offset).toBe(25);
 expect(screen.getByText('예약은 사용 확정', {exact:false})).toBeInTheDocument();expect(screen.queryByRole('button',{name:'지급'})).toBeNull();
});
