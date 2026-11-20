// @vitest-environment jsdom
import {render,screen,fireEvent,waitFor,within,cleanup} from '@testing-library/react';
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const mock=vi.hoisted(()=>{const rpc=vi.fn();return {rpc,client:{rpc},user:{id:'admin-test'}};});
vi.mock('@/components/auth-context',()=>({useAuth:()=>({client:mock.client,user:mock.user})}));
import {AdminLabDashboard} from './admin-lab-dashboard';
const id='00000000-0000-4000-8000-000000000001';
const records=Array.from({length:25},(_,i)=>({id:`run-${i}`,user_id:id,email:'synthetic@example.test',exam_id:id,university_id:id,university:'테스트 대학',title:'테스트 시험',state:'completed',created_at:'2026-11-14T02:00:00Z',completed_at:'2026-11-14T02:02:00Z',free_revision:false,beta_credit:false}));
const summary={version:'admin-lab-dashboard-v1',students:1,avg_seconds:120,duration_samples:25,universities:[{university_id:id,university:'테스트 대학',requests:25,students:1,completed:25,failed:0,free_revisions:0,beta_requests:0}]};
const ops={summary:{failed:0},live:{processing:1,retry_pending:1},cost_coverage:{unknown:1},costs:[{dimension:'model',label:'model-A',cost_status:'UNKNOWN',usd:null,calls:1},{dimension:'day',label:'same-call',cost_status:'UNKNOWN',usd:null,calls:1}]};
function payload(name:string,p:Record<string,unknown>){if(name==='admin_lab_dashboard_summary')return summary;if(name==='admin_lab_runs_filtered')return {version:'admin-lab-filtered-v1',summary:{requested:25,completed:25,failed:0},items:records};if(name==='admin_essay_operations')return ops;if(name==='admin_lab_operation_stats')return {version:'admin-lab-operation-stats-v1',summary:{requests:25,completed:25,failed:0,retries:0},as_of:'2026-11-20T00:00:00Z'};if(name==='admin_essay_feedback')return {stats:{pending:0}};if(name==='is_quality_operator')return false;if(name==='admin_release_report')return (p.p as {kind:string}).kind==='dashboard'?{credit_granted:4,credit_used:1,paid:[]}:{total:0};return null;}
beforeEach(()=>{mock.rpc.mockReset();mock.rpc.mockImplementation(async(name:string,p:Record<string,unknown>)=>({data:payload(name,p),error:null}));});afterEach(cleanup);
it('reuses one d7 operations call, limits recent display to ten, and gates quality separately',async()=>{
 render(<AdminLabDashboard/>);await screen.findByText('품질 검수 접근 권한이 없습니다. 일반 관리자 권한과 별도입니다.');
 expect(mock.rpc.mock.calls.filter(([n])=>n==='admin_essay_operations')).toHaveLength(1);
 expect(screen.getAllByRole('link',{name:'첨삭 상세 보기'})).toHaveLength(10);
 expect(mock.rpc.mock.calls.some(([n])=>n==='admin_lab_run_detail'||n==='ql_exam_cases'||n==='admin_release_report')).toBe(false);
 expect(within(screen.getByRole('region',{name:'논술 LAB 핵심 지표'})).getByText('1명')).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'테스트 대학'})).toHaveAttribute('href',expect.stringContaining('university='+id));
 expect(screen.getByRole('combobox',{name:'조회 기간 (KST)'})).toHaveValue('d7');
});
it('supports all-time aggregate/list without calling unsupported operations and preserves beta scope',async()=>{
 render(<AdminLabDashboard/>);await screen.findByText('1명');mock.rpc.mockClear();
 fireEvent.change(screen.getByRole('combobox',{name:'조회 기간 (KST)'}),{target:{value:'all'}});
 await waitFor(()=>expect(mock.rpc).toHaveBeenCalledWith('admin_lab_dashboard_summary',{p_from:null,p_to:null,p_source:null}));
 expect(mock.rpc.mock.calls.some(([n])=>n==='admin_essay_operations')).toBe(false);
 fireEvent.change(screen.getByRole('combobox',{name:'이용권 출처'}),{target:{value:'beta'}});
 await waitFor(()=>expect(mock.rpc).toHaveBeenCalledWith('admin_lab_dashboard_summary',{p_from:null,p_to:null,p_source:'beta'}));
 expect(screen.getByRole('link',{name:'테스트 대학'})).toHaveAttribute('href',expect.stringContaining('source=beta'));
});
it('shows partial error with retry while preserving successful recent activity',async()=>{
 mock.rpc.mockImplementation(async(n:string,p:Record<string,unknown>)=>n==='admin_lab_dashboard_summary'?{error:{code:'42501'},data:null}:{data:payload(n,p),error:null});
 render(<AdminLabDashboard/>);expect(await screen.findByRole('alert')).toHaveTextContent('이 영역을 조회하지 못했습니다');
 expect(screen.getAllByRole('link',{name:'첨삭 상세 보기'})).toHaveLength(10);
 const before=mock.rpc.mock.calls.filter(([n])=>n==='admin_lab_dashboard_summary').length;
 fireEvent.click(screen.getByRole('button',{name:'다시 시도'}));
 await waitFor(()=>expect(mock.rpc.mock.calls.filter(([n])=>n==='admin_lab_dashboard_summary')).toHaveLength(before+1));
});
it('renders real zero/empty and unknown durations without fabricating results',async()=>{
 mock.rpc.mockImplementation(async(n:string,p:Record<string,unknown>)=>({error:null,data:n==='admin_lab_dashboard_summary'?{...summary,students:0,universities:[],avg_seconds:null,duration_samples:0}:n==='admin_lab_runs_filtered'?{version:'admin-lab-filtered-v1',summary:{requested:0,completed:0,failed:0},items:[]}:payload(n,p)}));
 render(<AdminLabDashboard/>);expect(await screen.findByText('0명')).toBeInTheDocument();expect(screen.getByText('기록 없음')).toBeInTheDocument();expect(screen.getByText('조건에 맞는 첨삭 요청이 없습니다.')).toBeInTheDocument();
});
it('loads financial reads on demand and never treats UNKNOWN as zero money or sums duplicate dimensions',async()=>{
 render(<AdminLabDashboard/>);await screen.findByText('1명');fireEvent.click(screen.getByRole('button',{name:'이용권·매출·비용 불러오기'}));
 expect(await screen.findByText('4개')).toBeInTheDocument();expect(screen.getByText('model-A')).toBeInTheDocument();expect(screen.queryByText('same-call')).toBeNull();
 expect(screen.getByText('UNKNOWN')).toBeInTheDocument();expect(screen.getByText(/실제 환불 완료 금액/)).toBeInTheDocument();
 expect(mock.rpc.mock.calls.filter(([n])=>n==='admin_release_report')).toHaveLength(2);
});
it('loads quality metadata only after separate permission and an explicit request',async()=>{
 mock.rpc.mockImplementation(async(n:string,p:Record<string,unknown>)=>({error:null,data:n==='is_quality_operator'?true:n==='ql_exam_cases'?{coverage:{subjects:3,reviewed:1},rows:[{run_id:id,question_id:id,official_label:'문항 1',reviewed:true,created_at:'2026-11-14T02:00:00Z'}]}:payload(n,p)}));
 render(<AdminLabDashboard/>);const button=await screen.findByRole('button',{name:'품질 검수 현황 불러오기'});
 expect(mock.rpc.mock.calls.some(([n])=>n==='ql_exam_cases')).toBe(false);fireEvent.click(button);
 expect(await screen.findByText('검토 기록 보유 문항')).toBeInTheDocument();
 expect(screen.getByRole('link',{name:/문항 1 · 요청/})).toHaveAttribute('href',`/ql?run=${id}&question=${id}`);
 expect(mock.rpc.mock.calls.filter(([n])=>n==='ql_exam_cases')).toHaveLength(1);
});
