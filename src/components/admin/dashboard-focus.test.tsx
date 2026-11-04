// @vitest-environment jsdom
import {render,screen,waitFor,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import fs from 'node:fs';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),query:vi.fn(),user:{id:'synthetic-operator'}}));
vi.mock('@/components/auth-context',()=>({useAuth:()=>({client:{rpc:mocks.rpc},user:mocks.user})}));
vi.mock('./admin-surface',()=>({useAdminQuery:mocks.query,useSupportRefresh:()=>{},AdminErrorPanel:()=>null}));
import {AdminDashboardView} from './admin-dashboard-view';
afterEach(cleanup);
it('shows small cohorts, N수, hours/minutes and puts admissions above operations',async()=>{
 mocks.query.mockReturnValue({reload:vi.fn(),state:{status:'ready',data:{open:2,newToday:1,answered:3,failedDeliveries:0}}});
 mocks.rpc.mockImplementation(async(name:string)=>({error:null,data:name==='admin_member_composition'?{accounts:181,profiles:174,school_members:40,active:7,grades:[{label:'고1',count:5},{label:'고2',count:10},{label:'고3',count:66},{label:'N수·검정고시 등',count:3},{label:'미입력',count:90}],schools:[{label:'테스트고등학교',count:4},{label:'새빛고등학교',count:1}]}:name==='admin_dashboard_study'?{total:{users:7,ms:13457752},grades:[{grade:'1',users:1,ms:3600000},{grade:'retaker',users:1,ms:1800000}]}:{metrics:{targets:26,target_records:40,applications:2,saved:58},rows:[{kind:'targets',label:'가상대학교',users:3,records:3}]}}));
 const v=render(<AdminDashboardView/>);await screen.findByText('3시간 44분');
 expect(screen.getByText('N수·검정고시 등',{selector:'span'})).toBeInTheDocument();expect(screen.getByText('가상대학교')).toBeInTheDocument();
 const headings=screen.getAllByRole('heading',{level:2}).map(x=>x.textContent);expect(headings).toEqual(['회원과 학생 구성','기록된 공부 시간','학습·입시 종합 현황','문의와 서비스 운영']);
 await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('admin_member_composition',{p_from:null,p_to:null}));
 const css=fs.readFileSync('src/components/admin/member-dashboard.css','utf8');fs.mkdirSync('/tmp/member-dashboard-visual',{recursive:true});fs.writeFileSync('/tmp/member-dashboard-visual/index.html',`<!doctype html><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;background:#e9efed;margin:24px auto;max-width:1180px}*{box-sizing:border-box}a{color:#1d6178}h1{color:#203747;font-size:28px}${css}</style><h1>운영 대시보드 · TEST</h1>${v.container.innerHTML}`);
});
