// @vitest-environment jsdom
import {render,screen,waitFor,fireEvent,cleanup} from '@testing-library/react';
import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/components/auth-context',()=>({useAuth:()=>({user:{id:'owner'},client:{rpc:mocks.rpc}})}));
import {AdminBeta} from './admin-beta';
const config={beta_enabled:false,beta_start_at:'2026-10-31T15:00:00Z',beta_end_at:'2026-11-10T15:00:00Z',daily_free_limit:1,next_daily_limit:null,limit_effective_at:null,version:3};
function setup(canEdit=true){mocks.rpc.mockImplementation((name:string)=>Promise.resolve({data:name==='admin_essay_beta_config'?{campaigns:[{campaign_id:'campaign',config,can_edit:canEdit}]}:{rows:[],total:0,page_size:25},error:null}));}
beforeEach(()=>{mocks.rpc.mockReset();setup();});afterEach(cleanup);
describe('existing admin beta surface',()=>{
 it('makes unapproved admins read only',async()=>{setup(false);render(<AdminBeta kind="settings"/>);expect(await screen.findByText('설정 변경은 Owner 또는 별도 승인된 관리자만 가능합니다.')).toBeInTheDocument();expect(screen.getByRole('button',{name:'설정 저장'})).toBeDisabled();expect(mocks.rpc).not.toHaveBeenCalledWith('admin_essay_beta_save',expect.anything());});
 it('blocks duplicate saves and sends version reason and KST policy',async()=>{render(<AdminBeta kind="settings"/>);const button=await screen.findByRole('button',{name:'설정 저장'});await waitFor(()=>expect(button).toBeEnabled());fireEvent.change(screen.getByLabelText('변경 사유'),{target:{value:'Owner approved window'}});mocks.rpc.mockReturnValue(new Promise(()=>{}));fireEvent.submit(button.closest('form')!);fireEvent.submit(button.closest('form')!);const saves=mocks.rpc.mock.calls.filter(([n])=>n==='admin_essay_beta_save');expect(saves).toHaveLength(1);expect(saves[0][1]).toMatchObject({p_campaign:'campaign',p_expected_version:3,p_reason:'Owner approved window',p_value:{beta_enabled:false,daily_free_limit:1,limit_application:'next_reset',reset_timezone:'Asia/Seoul'}});});
 it('does not show empty success when server denies access',async()=>{mocks.rpc.mockResolvedValue({data:null,error:{message:'ACCESS_DENIED'}});render(<AdminBeta kind="usage"/>);expect(await screen.findByRole('alert')).toHaveTextContent('조회하지 못했습니다');expect(screen.queryByText('조회된 내역이 없습니다.')).not.toBeInTheDocument();});
});
