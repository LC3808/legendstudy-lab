// @vitest-environment jsdom
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import {AdminLabPreview,PreviewButton} from './admin-lab-preview';
const mocks=vi.hoisted(()=>({read:vi.fn(),reports:vi.fn(()=>[]),layout:vi.fn()}));
vi.mock('./admin-dashboard-view',()=>({useReadReport:mocks.read}));
vi.mock('@/lib/my/exam-history',()=>({examReports:mocks.reports}));
vi.mock('@/components/my/exam-result-layout',()=>({ExamResultLayout:(props:unknown)=>{mocks.layout(props);return <p>학생 결과 렌더러</p>;}}));
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('opens exact run in a new tab and isolates opener',()=>{const tab={opener:window};const open=vi.spyOn(window,'open').mockReturnValue(tab as unknown as Window);render(<PreviewButton runId="run" available/>);fireEvent.click(screen.getByRole('button'));expect(open).toHaveBeenCalledWith('/admin/essay-runs/preview/?run=run','_blank');expect(tab.opener).toBeNull();});
it('explains blocked popup and disables missing result',()=>{vi.spyOn(window,'open').mockReturnValue(null);const {rerender}=render(<PreviewButton runId="run" available/>);fireEvent.click(screen.getByRole('button'));expect(screen.getByRole('alert')).toHaveTextContent('새 탭이 차단');expect(screen.getByRole('link')).toHaveAttribute('rel','noopener noreferrer');rerender(<PreviewButton runId="run" available={false}/>);expect(screen.getByRole('button')).toBeDisabled();});
it('uses only the admin detail contract and fails closed on denied access',()=>{window.history.replaceState({},'','/admin/essay-runs/preview/?run=00000000-0000-4000-8000-000000000001');mocks.read.mockReturnValue({error:true});render(<AdminLabPreview/>);expect(mocks.read).toHaveBeenCalledWith('admin_lab_run_detail',{p_run:'00000000-0000-4000-8000-000000000001'});expect(screen.getByRole('alert')).toHaveTextContent('관리자 권한');expect(screen.queryByText('학생 결과 렌더러')).not.toBeInTheDocument();});
