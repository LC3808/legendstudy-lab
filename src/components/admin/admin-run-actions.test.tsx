// @vitest-environment jsdom
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {AdminRunActions} from './admin-run-actions';
import type {LabRun} from '@/lib/admin/lab-operations';
const mock=vi.hoisted(()=>({rpc:vi.fn(),getSession:vi.fn()}));
vi.mock('@/components/auth-context',()=>({useAuth:()=>({client:{rpc:mock.rpc,auth:{getSession:mock.getSession}}})}));
const run={id:'10000000-0000-4000-8000-000000000001',state:'reserved',university:'합성 대학',title:'합성 시험'} as LabRun;
const caps={version:'admin-run-management-v1',run_id:run.id,state:'reserved',classification:'credit_linked',ledger_count:1,credits_required:1,billing_status:'reserved',decision_id:'billing-fixture',retry_allowed:true,retry_reason:null,delete_allowed:false,delete_reason:'CREDIT_LINKED',archive_allowed:true,archive_reason:null,restore_allowed:false,hidden:false,as_of:'2026-11-20T00:00:00Z'};
beforeEach(()=>{vi.restoreAllMocks();mock.rpc.mockReset();mock.getSession.mockResolvedValue({data:{session:{access_token:'admin-test-token'}}});mock.rpc.mockResolvedValue({data:caps});vi.spyOn(window,'confirm').mockReturnValue(true);});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
async function open(){fireEvent.click(screen.getByRole('button',{name:'상태 확인 · 요청 관리'}));await screen.findByRole('region',{name:'요청 관리'});}
it('checks capabilities on demand; protected request has disabled delete and explicit reason',async()=>{
 render(<AdminRunActions run={run} onChanged={vi.fn()}/>);expect(mock.rpc).not.toHaveBeenCalled();await open();expect(screen.getByRole('button',{name:'삭제'})).toBeDisabled();expect(screen.getByText(/이용권·원장이 연결/)).toBeInTheDocument();
});
it('uses audited archive after contextual confirmation and refreshes list/KPI/detail',async()=>{
 const changed=vi.fn(),event=vi.fn();window.addEventListener('admin-lab-changed',event);render(<AdminRunActions run={run} onChanged={changed}/>);await open();mock.rpc.mockResolvedValue({data:{version:'admin-run-management-v1',run_id:run.id,action:'archive'}});fireEvent.click(screen.getByRole('button',{name:'보관'}));
 await waitFor(()=>expect(changed).toHaveBeenCalledTimes(1));expect(event).toHaveBeenCalledTimes(1);window.removeEventListener('admin-lab-changed',event);
 expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining(run.id));expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('원장 1건'));
 expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('현재 이용권 예약은 유지됩니다'));
 expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('환불·예약 해제는 실행하지 않습니다'));
 expect(mock.rpc).toHaveBeenLastCalledWith('admin_lab_manage_run',{p_run:run.id,p_action:'archive',p_key:expect.any(String)});
});
it('blocks archived retry even if a stale capability says retry allowed; restore does not dispatch',async()=>{
 mock.rpc.mockResolvedValue({data:{...caps,hidden:true,archive_allowed:false,restore_allowed:true}});const fetcher=vi.fn(),changed=vi.fn();vi.stubGlobal('fetch',fetcher);render(<AdminRunActions run={run} onChanged={changed}/>);await open();
 expect(screen.getByRole('button',{name:'재진행'})).toBeDisabled();expect(screen.getByText(/보관된 요청은 재진행할 수 없습니다/)).toBeInTheDocument();expect(screen.getByText(/예약이나 원장은 변경되지 않습니다/)).toHaveTextContent('예약됨');
 fireEvent.click(screen.getByRole('button',{name:'재진행'}));expect(fetcher).not.toHaveBeenCalled();
 mock.rpc.mockResolvedValue({data:{version:'admin-run-management-v1',run_id:run.id,action:'restore'}});fireEvent.click(screen.getByRole('button',{name:'활성 목록에 복원'}));await waitFor(()=>expect(changed).toHaveBeenCalledTimes(1));
 expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('자동으로 첨삭을 재진행하지 않습니다'));expect(mock.rpc).toHaveBeenLastCalledWith('admin_lab_manage_run',expect.objectContaining({p_action:'restore'}));expect(fetcher).not.toHaveBeenCalled();
});
it.each(['ACTIVE_LEASE','RECONCILIATION_REQUIRED'])('blocks archive while server reports %s',async reason=>{
 mock.rpc.mockResolvedValue({data:{...caps,archive_allowed:false,archive_reason:reason}});render(<AdminRunActions run={run} onChanged={vi.fn()}/>);await open();expect(screen.getByRole('button',{name:'보관'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'보관'}));expect(mock.rpc).toHaveBeenCalledTimes(1);expect(window.confirm).not.toHaveBeenCalled();expect(screen.queryByText(reason)).not.toBeInTheDocument();
});
it('does not enable archive when the updated server capability is missing',async()=>{
 mock.rpc.mockResolvedValue({data:{...caps,archive_allowed:undefined}});render(<AdminRunActions run={run} onChanged={vi.fn()}/>);await open();expect(screen.getByRole('button',{name:'보관'})).toBeDisabled();expect(screen.getByText(/현재 보관 가능 여부를 확인할 수 없습니다/)).toBeInTheDocument();
});
it('does not mutate on cancellation and preserves row on server rejection',async()=>{
 render(<AdminRunActions run={run} onChanged={vi.fn()}/>);await open();vi.mocked(window.confirm).mockReturnValue(false);fireEvent.click(screen.getByRole('button',{name:'보관'}));expect(mock.rpc).toHaveBeenCalledTimes(1);
 vi.mocked(window.confirm).mockReturnValue(true);mock.rpc.mockResolvedValue({error:{message:'ACTIVE_LEASE'}});fireEvent.click(screen.getByRole('button',{name:'보관'}));expect(await screen.findByRole('alert')).toHaveTextContent('실행 잠금');expect(screen.getByRole('region',{name:'요청 관리'})).toBeInTheDocument();
});
it('reuses retry key after uncertain response; duplicate click is blocked',async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({code:'REQUEST_UNCERTAIN'}),{status:503}));vi.stubGlobal('fetch',fetcher);render(<AdminRunActions run={run} onChanged={vi.fn()}/>);await open();const button=screen.getByRole('button',{name:'재진행'});fireEvent.click(button);fireEvent.click(button);await screen.findByRole('alert');expect(fetcher).toHaveBeenCalledTimes(1);const first=JSON.parse(fetcher.mock.calls[0][1].body);fetcher.mockResolvedValue(new Response(JSON.stringify({code:'REQUEST_UNCERTAIN'}),{status:503}));fireEvent.click(button);await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(2));expect(JSON.parse(fetcher.mock.calls[1][1].body).key).toBe(first.key);expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer admin-test-token');
});
it('deletes only a server-verified test after a destructive confirmation',async()=>{
 mock.rpc.mockResolvedValue({data:{...caps,classification:'verified_test',delete_allowed:true,delete_reason:null,ledger_count:0}});const changed=vi.fn();render(<AdminRunActions run={run} onChanged={changed}/>);await open();mock.rpc.mockResolvedValue({data:{version:'admin-run-management-v1',run_id:run.id,action:'delete'}});fireEvent.click(screen.getByRole('button',{name:'삭제'}));await waitFor(()=>expect(changed).toHaveBeenCalled());expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('복구할 수 없습니다'));expect(mock.rpc).toHaveBeenLastCalledWith('admin_lab_manage_run',expect.objectContaining({p_action:'delete'}));
});
