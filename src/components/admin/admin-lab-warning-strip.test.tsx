// @vitest-environment jsdom
import {render,screen} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {AdminLabWarningStrip} from './admin-lab-warning-strip';
const read=vi.hoisted(()=>vi.fn());
vi.mock('./admin-dashboard-view',()=>({useReadReport:read}));
it('distinguishes unknown counts from zero and never calls a mutation',()=>{
 read.mockReturnValue({data:{summary:{failed:0},live:{processing:1}}});render(<AdminLabWarningStrip/>);
 expect(screen.getByRole('link',{name:/최근 7일 접수 중 실패 0건/})).toHaveAttribute('href','/admin/essay-runs/?state=failed');
 expect(screen.getByRole('link',{name:/현재 재시도 대기 확인 불가/})).toBeInTheDocument();
 expect(read).toHaveBeenCalledWith('admin_essay_operations',expect.objectContaining({p_filters:{},p_run:null}),0);
});
