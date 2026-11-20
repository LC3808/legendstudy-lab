// @vitest-environment jsdom
import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import {AdminLabWarningStrip} from './admin-lab-warning-strip';
const read=vi.hoisted(()=>vi.fn());
vi.mock('./admin-dashboard-view',()=>({useReadReport:read}));
afterEach(()=>{cleanup();vi.useRealTimers();});
function fixture(){read.mockImplementation((name:string)=>({receivedAt:'2026-11-20T00:00:00Z',data:name==='admin_essay_feedback'?{stats:{pending:3}}:name==='admin_lab_operation_stats'?{version:'admin-lab-operation-stats-v1',summary:{requests:4,completed:2,failed:1,retries:1},as_of:'2026-11-20T00:00:00Z'}:{live:{processing:1,retry_pending:1}}}));}
it('separates four period metrics and three live metrics with truthful scope and timestamps',()=>{
 fixture();render(<AdminLabWarningStrip/>);
 expect(screen.getAllByRole('link')).toHaveLength(8);
 expect(screen.getByRole('link',{name:/첨삭 요청 4건/})).toHaveTextContent('선택 기간에 생성된 요청');
 expect(screen.getByRole('link',{name:/재시도 발생 1건/})).toHaveTextContent('선택 기간에 기록된 재시도 사건');
 expect(screen.getByRole('link',{name:/현재 처리 중 1건/})).toHaveAttribute('href','/admin/essay-runs?state=reserved&visibility=all');
 expect(screen.getByRole('link',{name:/미처리 학생 피드백 3건/})).toHaveTextContent('신규 및 확인 중');
 expect(screen.getByText(/중복될 수 있으며 합산하지 않습니다/)).toBeInTheDocument();
 expect(read).toHaveBeenCalledWith('admin_essay_feedback',{p:{}},0);
});
it('KST midnight selects inclusive dates and never filters live data with custom period',()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-19T15:00:00Z'));fixture();render(<AdminLabWarningStrip/>);
 fireEvent.change(screen.getByLabelText('논술 운영 기간 (KST)'),{target:{value:'today'}});
 expect(read).toHaveBeenCalledWith('admin_lab_operation_stats',{p_from:'2026-11-19T15:00:00.000Z',p_to:'2026-11-20T15:00:00.000Z'},0);
 fireEvent.change(screen.getByLabelText('논술 운영 기간 (KST)'),{target:{value:'custom'}});
 expect(screen.getByRole('link',{name:/현재 처리 중 1건/})).toBeInTheDocument();
 expect(read).toHaveBeenLastCalledWith('admin_lab_operation_stats',null,0);
});
it('zero and unknown remain distinct; live status remains visible on stats failure',()=>{
 read.mockImplementation((name:string)=>name==='admin_lab_operation_stats'?{error:true}:name==='admin_essay_feedback'?{data:{stats:{pending:0}}}:{data:{live:{processing:0}}});render(<AdminLabWarningStrip/>);
 expect(screen.getByRole('alert')).toHaveTextContent('기간별 지표 조회 실패');
 expect(screen.getByRole('link',{name:/현재 처리 중 0건/})).toBeInTheDocument();
 expect(screen.getByRole('link',{name:/현재 재시도 대기 확인 불가/})).toBeInTheDocument();
});
