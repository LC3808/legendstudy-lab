// @vitest-environment jsdom
import {render,screen,waitFor,cleanup,within,fireEvent} from '@testing-library/react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>{const rpc=vi.fn();return {rpc,client:{rpc},query:vi.fn(),user:{id:'synthetic-operator'}};});
vi.mock('@/components/auth-context',()=>({useAuth:()=>({client:mocks.client,user:mocks.user})}));
vi.mock('./admin-surface',()=>({useAdminQuery:mocks.query,useSupportRefresh:()=>{},AdminErrorPanel:()=>null}));
vi.mock('./school-distribution',()=>({SchoolDistribution:()=>null}));
import {AdminDashboardView} from './admin-dashboard-view';
const payload:Record<string,unknown>={
 admin_member_composition:{accounts:181,profiles:174,school_members:40,active:7,grades:[{label:'고1',count:5},{label:'N수·검정고시 등',count:3}],schools:[]},
 admin_dashboard_study:{total:{users:7,ms:13457752},grades:[{grade:'1',users:1,ms:3600000},{grade:'retaker',users:1,ms:1800000}]},
 admin_learning_analytics:{metrics:{targets:26},rows:[]},
 admin_admissions_analytics:{aspiration:{students:3,records:3,avg_per_student:1,major_students:2,universities:[{label:'가상대학교',students:3,priority1:2}],majors:[]},application:{eligible:3,students:0,records:0,coverage_pct:0,avg_per_student:0,universities:[],admission_types:[]}},
 admin_admission_outcomes:{totals:{final_accepted:0,accepted_students:0,decided_apps:0,result_students:0,stage_pass_only:0,rejected:0,registered:0,not_registered:0,accept_rate_apps:null,accept_exp_rate_students:null},universities:[],admission_types:[]}
};
beforeEach(()=>{
 mocks.rpc.mockReset();mocks.query.mockReset();
 mocks.query.mockImplementation((_read:unknown,key:string)=>({reload:vi.fn(),state:{status:'ready',data:key==='dashboard-support'?{open:2,newToday:1,answered:3,failedDeliveries:0}:key.startsWith('dashboard-kpi-release:')?{credit_used:8,paid:[{count:2}]}:{total:0,filteredTotal:0,items:[]}}}));
 mocks.rpc.mockImplementation(async(name:string)=>({error:null,data:payload[name]}));
});
afterEach(cleanup);
const kpis=()=>screen.getByRole('region',{name:'핵심 지표 요약'});
it('shows small cohorts, N수, hours/minutes and puts admissions above operations',async()=>{
 render(<AdminDashboardView/>);await screen.findAllByText('3시간 44분');
 expect(screen.getByText('N수·검정고시 등',{selector:'span'})).toBeInTheDocument();expect(screen.getByText('가상대학교')).toBeInTheDocument();
 expect(screen.getAllByRole('heading',{level:2}).map(x=>x.textContent)).toEqual(['논술 LAB 운영 확인','회원과 학생 구성','기록된 공부 시간','희망 대학·전공 현황','실제 지원 현황 · 고3·N수','입시 성과 · 합격 현황','앱 이용·인기 자료','문의와 서비스 운영']);
 expect(mocks.rpc).toHaveBeenCalledWith('admin_member_composition',{p_from:null,p_to:null});
});
it('uses bounded KST dates for the default 30 days and preserves existing KPI values',async()=>{
 render(<AdminDashboardView/>);await screen.findAllByText('3시간 44분');
 const args=mocks.rpc.mock.calls.find(([name])=>name==='admin_dashboard_study')![1];
 expect(Date.parse(args.p_to)-Date.parse(args.p_from)).toBe(30*86400000);
 expect(args.p_from).toMatch(/T15:00:00.000Z$/);
 expect(within(kpis()).getByText('26')).toBeInTheDocument();
 expect(within(kpis()).getByText('8')).toBeInTheDocument();
});
it('sends NULL/NULL only to supported all-time readers, without fallback windows',async()=>{
 render(<AdminDashboardView/>);await screen.findAllByText('3시간 44분');mocks.rpc.mockClear();
 fireEvent.change(within(kpis()).getByRole('combobox'),{target:{value:'all'}});
 await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('admin_dashboard_study',{p_from:null,p_to:null}));
 expect(mocks.rpc).toHaveBeenCalledWith('admin_member_composition',{p_from:null,p_to:null});
 expect(mocks.rpc.mock.calls.filter(([name])=>name==='admin_learning_analytics')).toHaveLength(0);
 expect(within(kpis()).getByText('기간 선택 필요')).toBeInTheDocument();
 expect(mocks.query.mock.calls.some(([,key])=>key.includes('"p_from":null'))).toBe(true);
 fireEvent.change(within(kpis()).getByRole('combobox'),{target:{value:'d30'}});
 await waitFor(()=>expect(within(kpis()).getByText('26')).toBeInTheDocument());
});
it('shows an RPC failure rather than zero or endless loading',async()=>{
 mocks.rpc.mockImplementation(async(name:string,args:{p_from:string|null})=>name==='admin_dashboard_study'&&args.p_from===null?{data:null,error:{code:'PT422'}}:{error:null,data:payload[name]});
 render(<AdminDashboardView/>);await screen.findAllByText('3시간 44분');
 fireEvent.change(within(kpis()).getByRole('combobox'),{target:{value:'all'}});
 expect(await within(kpis()).findByRole('alert')).toHaveTextContent('조회 실패');
 expect(within(kpis()).queryByText('0시간 0분')).not.toBeInTheDocument();
});
it('renders an actually empty aggregate as zero',async()=>{
 mocks.rpc.mockImplementation(async(name:string)=>({error:null,data:name==='admin_dashboard_study'?{total:{users:0,ms:0},grades:[]}:payload[name]}));
 render(<AdminDashboardView/>);
 expect(await within(kpis()).findByText('0시간 0분')).toBeInTheDocument();
});
it('does not issue invalid KPI date requests while custom dates are incomplete',async()=>{
 render(<AdminDashboardView/>);await screen.findAllByText('3시간 44분');mocks.rpc.mockClear();
 fireEvent.change(within(kpis()).getByRole('combobox'),{target:{value:'custom'}});
 expect(within(kpis()).getByRole('alert')).toBeInTheDocument();
 expect(mocks.rpc).not.toHaveBeenCalled();
});
