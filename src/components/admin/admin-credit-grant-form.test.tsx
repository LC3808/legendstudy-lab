// @vitest-environment jsdom
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {render,screen,waitFor,fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {SupabaseClient} from '@supabase/supabase-js';
import {AuthContext,type AuthContextValue} from '@/components/auth-context';
import {AdminCreditGrantForm} from './admin-credit-grant-form';
const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';const target='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const rpc=vi.fn();const granted=vi.fn();
function mount(){const auth:AuthContextValue={status:'authenticated',client:{rpc} as unknown as SupabaseClient,user:{id:actor,email:'admin@example.test'},signOut:vi.fn(),recoveryActive:false,completeRecovery:vi.fn()};return render(<AuthContext.Provider value={auth}><AdminCreditGrantForm accountId={target} email="recipient@example.test" onGranted={granted}/></AuthContext.Provider>);}
beforeEach(()=>{vi.clearAllMocks();sessionStorage.clear();HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new Event('close'));};});
async function open(){await userEvent.click(screen.getByRole('button',{name:'Credit 지급'}));}
describe('operator manual grant confirmation',()=>{
 it('confirms email/UID and bounded reason/quantity before sending canonical RPC',async()=>{
  rpc.mockResolvedValue({data:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',error:null});mount();await open();
  expect(screen.getByText(`회원 UID: ${target}`)).toBeInTheDocument();expect(screen.getByText('대상 이메일: recipient@example.test')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'확인 후 지급'})).toBeDisabled();
  await userEvent.type(screen.getByLabelText('지급 사유'),'고객 지원 지급');
  fireEvent.change(screen.getByLabelText('지급 수량 (1~100)'),{target:{value:'101'}});expect(screen.getByRole('button',{name:'확인 후 지급'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('지급 수량 (1~100)'),{target:{value:'1'}});
  await userEvent.click(screen.getByRole('button',{name:'확인 후 지급'}));
  expect(rpc).toHaveBeenCalledWith('admin_manual_credit_grant',expect.objectContaining({p_user:target,p_email:'recipient@example.test',p_quantity:1,p_reason:'고객 지원 지급',p_key:expect.any(String)}));
  expect(granted).toHaveBeenCalledOnce();expect(sessionStorage.length).toBe(0);
 });
 it('keeps the key across lost response and component reload',async()=>{
  rpc.mockRejectedValueOnce(Error('network')).mockResolvedValueOnce({data:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',error:null});const first=mount();await open();await userEvent.type(screen.getByLabelText('지급 사유'),'재시도 검증');await userEvent.click(screen.getByRole('button',{name:'확인 후 지급'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'동일 요청 다시 확인'})).toBeEnabled());const key=rpc.mock.calls[0][1].p_key;
  first.unmount();mount();await open();expect(screen.getByLabelText('지급 사유')).toHaveValue('재시도 검증');expect(screen.getByLabelText('지급 사유')).toBeDisabled();
  await userEvent.click(screen.getByRole('button',{name:'동일 요청 다시 확인'}));expect(rpc.mock.calls[1][1].p_key).toBe(key);expect(granted).toHaveBeenCalledOnce();
 });
 it('prevents double submit while a request is in flight',async()=>{
  let finish!:(v:unknown)=>void;rpc.mockReturnValue(new Promise(resolve=>{finish=resolve;}));mount();await open();await userEvent.type(screen.getByLabelText('지급 사유'),'중복 방지');const form=screen.getByLabelText('지급 사유').closest('form')!;
  fireEvent.submit(form);fireEvent.submit(form);expect(rpc).toHaveBeenCalledOnce();finish({data:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',error:null});await waitFor(()=>expect(granted).toHaveBeenCalledOnce());
 });
 it('does not announce success on server authorization denial',async()=>{
  rpc.mockResolvedValue({data:null,error:{code:'PT403'}});mount();await open();await userEvent.type(screen.getByLabelText('지급 사유'),'권한 검증');await userEvent.click(screen.getByRole('button',{name:'확인 후 지급'}));await waitFor(()=>expect(screen.getByRole('button',{name:'동일 요청 다시 확인'})).toBeEnabled());expect(granted).not.toHaveBeenCalled();
 });
});
