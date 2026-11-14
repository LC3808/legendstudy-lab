// @vitest-environment jsdom
import {render,screen,fireEvent} from '@testing-library/react';
import {describe,it,expect,vi,beforeEach} from 'vitest';
import {AdminLabOperations,AdminLabDetail} from './admin-lab-operations';
import {labAlerts,type LabDetail} from '@/lib/admin/lab-operations';
const read=vi.hoisted(()=>vi.fn());
vi.mock('./admin-dashboard-view',()=>({useReadReport:read}));
vi.mock('@/components/my/evaluation-report',()=>({EvaluationReport:()=>null}));
vi.mock('@/lib/my/exam-history',()=>({examReports:()=>[],examQuestionLabel:()=> '문항1'}));
const detail:LabDetail={version:'admin-lab-detail-v1',user_id:'member',run:{id:'r',state:'reserved',created_at:'2026-01-01',result:{questions:[]},answers:[{questionId:'q',body:'실제 저장 답안',rubricVersion:'frozen-v1'}]},billing:{id:'b',reason:'included_revision',credits_required:0,status:'settled',created_at:'2026-01-01',reserved_at:null,settled_at:null,released_at:null},ledger:[{id:'t',at:'2026-01-01',type:'consume',balance_delta:-1,reserved_delta:0,origin:'promotion',reversal_of:null}],calls:[],retries:[],diagnostics:[],children:[],reviewed_questions:[],result_viewed_at:null};
const list={version:'admin-lab-v1',total:30,offset:0,limit:25,summary:{requested:30,initial:20,completed:25,failed:4,pending:1,free_revisions:10,beta_credit:1,last_requested_at:null,last_consumed_at:null},universities:[{university_id:'u',university:'성균관대'}],items:[]};
beforeEach(()=>{vi.clearAllMocks();read.mockReturnValue({data:list});});
describe('admin LAB operations',()=>{
 it('passes member/university/status and server offset instead of sorting current page',()=>{render(<AdminLabOperations accountId="member"/>);expect(read).toHaveBeenLastCalledWith('admin_lab_runs',expect.objectContaining({p_user:'member',p_offset:0}),0);fireEvent.click(screen.getByRole('button',{name:'다음'}));expect(read).toHaveBeenLastCalledWith('admin_lab_runs',expect.objectContaining({p_offset:25}),0);fireEvent.change(screen.getByLabelText('대학'),{target:{value:'u'}});expect(read).toHaveBeenLastCalledWith('admin_lab_runs',expect.objectContaining({p_university:'u',p_offset:0}),0);fireEvent.change(screen.getByLabelText('상태'),{target:{value:'completed'}});expect(read).toHaveBeenLastCalledWith('admin_lab_runs',expect.objectContaining({p_state:'completed'}),0);});
 it('shows read failures instead of a successful empty list',()=>{read.mockReturnValue({error:true});render(<AdminLabOperations/>);expect(screen.getByRole('alert')).toBeInTheDocument();expect(screen.queryByText('조건에 맞는 첨삭 요청이 없습니다.')).not.toBeInTheDocument();});
 it('shows frozen answer, missing process evidence and exact existing quality link without write controls',()=>{read.mockReturnValue({data:detail});render(<AdminLabDetail runId="r" onSelect={vi.fn()}/>);expect(screen.getByText('실제 저장 답안')).toBeInTheDocument();expect(screen.getByText(/사용자 결과 열람: 확인 불가/)).toBeInTheDocument();expect(screen.getByRole('link',{name:'기존 품질 검수로 이동'})).toHaveAttribute('href','/ql?run=r&question=q');expect(screen.queryByRole('button',{name:/재평가|저장|차감/})).not.toBeInTheDocument();});
 it('flags delayed request, charge-without-result and free-revision charging separately',()=>{expect(labAlerts(detail,Date.parse('2026-11-14'))).toEqual(expect.arrayContaining(['요청 후 30분 이상 미완료 — 확인 필요','차감 기록 있으나 결과 없음 — 환불·해제 기록 확인','무료 재첨삭 추가 차감 의심']));});
 it('does not infer duplicated charge from split grant transactions',()=>{const split={...detail,billing:{...detail.billing!,credits_required:2,reason:'paid_cycle'},run:{...detail.run,state:'completed',result:{questions:[{}]}},ledger:[detail.ledger[0],{...detail.ledger[0],id:'t2'}]};expect(labAlerts(split)).not.toContain('예정 수량 초과 차감 의심 — 원장 확인');});
});
