// @vitest-environment jsdom
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {describe,it,expect,vi,afterEach} from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('../auth-context',()=>({useAuth:()=>({user:{id:'owner'},client:{rpc:mocks.rpc,auth:{getUser:async()=>({data:{user:{id:'owner'}}})}}})}));
import {AdminEssayFeedback} from './admin-essay-feedback';
afterEach(()=>{cleanup();mocks.rpc.mockReset();});
describe('admin feedback',()=>{
 it('does not report empty success on permission rejection',async()=>{mocks.rpc.mockResolvedValue({error:{message:'denied'}});render(<AdminEssayFeedback/>);fireEvent.click(screen.getByText('조회'));expect(await screen.findByRole('alert')).toHaveTextContent('권한');expect(screen.queryByText('선택 범위 통계')).not.toBeInTheDocument();});
 it('shows server aggregates and existing Owner review link',async()=>{
 const row={id:'feedback',user_id:'student',body:'fixture opinion',status:'new',updated_at:'2026-10-31T00:00:00Z',created_at:'2026-10-31T00:00:00Z',kind:'quality',evaluation_ref:'run/question',platform:'ios'};
 mocks.rpc.mockResolvedValue({data:{rows:[row],stats:{total:1,positive:1,negative:0,bugs:0,pending:1,resolved:0},categories:{helpful:1},actions:[]}});
 render(<AdminEssayFeedback/>);fireEvent.click(screen.getByText('조회'));fireEvent.click(await screen.findByText('상세 보기'));
 expect(await screen.findByText('기존 Owner 검수에서 관련 평가 보기')).toHaveAttribute('href','/owner-review/essay/?feedback=feedback');
 expect(screen.getByText(/긍정 100.0%/)).toBeInTheDocument();
 expect(screen.getByLabelText('처리 상태')).toHaveValue('new');
 });
});
