// @vitest-environment jsdom
import {render,screen,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import {AdminLabWarningStrip} from './admin-lab-warning-strip';
const read=vi.hoisted(()=>vi.fn());
vi.mock('./admin-dashboard-view',()=>({useReadReport:read}));
afterEach(cleanup);
function fixture(failed=0,processing=0,retry_pending:number|undefined=0,pending=0){read.mockImplementation((name:string)=>({data:name==='admin_essay_feedback'?{stats:{pending}}:{summary:{failed},live:{processing,retry_pending}}}));}
it('shows four scoped cards and preserves exact destination contracts without summing overlaps',()=>{
 fixture(2,1,1,3);render(<AdminLabWarningStrip/>);
 expect(screen.getAllByRole('link')).toHaveLength(4);
 expect(screen.getByRole('link',{name:/최근 7일 첨삭 실패 2건/})).toHaveAttribute('href','/admin/essay-runs?state=failed');
 expect(screen.getByRole('link',{name:/현재 처리 중 1건/})).toHaveAttribute('href','/admin/essay-runs?state=reserved');
 expect(screen.getByRole('link',{name:/현재 재시도 대기 1건/})).toHaveTextContent('재시도 필터 미적용');
 expect(screen.getByRole('link',{name:/신규 학생 피드백 3건/})).toHaveAttribute('href','/admin/essay-feedback?status=new');
 expect(screen.getByText(/중복될 수 있으며 합산하지 않습니다/)).toBeInTheDocument();
 expect(read).toHaveBeenCalledWith('admin_essay_operations',expect.objectContaining({p_filters:{},p_run:null}),0);
});
it('collapses only four confirmed zeros and never asserts system health',()=>{
 fixture();render(<AdminLabWarningStrip/>);
 const summary=screen.getByText(/현재 표시 중인 운영 지표에서 추가 확인 항목이 없습니다/);
 expect(summary.closest('details')).not.toHaveAttribute('open');
 expect(screen.queryByText(/전체 시스템 정상/)).not.toBeInTheDocument();
 expect(document.querySelectorAll('.lab-status-grid .focus-kpi__v')).toHaveLength(4);
});
it('keeps unknown counts distinct from zero',()=>{
 fixture();read.mockReturnValue({data:{summary:{failed:0},live:{processing:0}}});render(<AdminLabWarningStrip/>);
 expect(screen.getByRole('link',{name:/현재 재시도 대기 확인 불가/})).toBeInTheDocument();
 expect(screen.queryByText(/현재 표시 중인 운영 지표에서 추가/)).not.toBeInTheDocument();
});
it('does not collapse loading or failed reads',()=>{
 read.mockImplementation((name:string)=>name==='admin_essay_feedback'?{error:true}:{});render(<AdminLabWarningStrip/>);
 expect(screen.getByRole('alert')).toHaveTextContent('조회 실패');
 expect(screen.getByRole('link',{name:/현재 처리 중 조회 중/})).toBeInTheDocument();
 expect(screen.queryByText(/현재 표시 중인 운영 지표에서 추가/)).not.toBeInTheDocument();
});
