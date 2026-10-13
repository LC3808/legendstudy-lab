// @vitest-environment jsdom
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {ReviewEditor} from './materials-console';
import type {Detail} from '@/lib/materials/contract';
import type {materialsClient} from '@/lib/materials/client';
afterEach(cleanup);
const initial:Detail={examId:'e',questions:[{id:'q',label:'문항1',sourceKey:'q'}],documents:[],history:[],review:{revision:2,state:'IN_REVIEW',body:{documents:[],mappings:[],checks:{}},approvalRequested:false}};
function mount(save=vi.fn().mockResolvedValue({...initial,review:{...initial.review,revision:3}})){
 const client={save} as unknown as ReturnType<typeof materialsClient>;
 render(<ReviewEditor initial={initial} documents={[]} client={client} owner="operator" back={vi.fn()} updated={vi.fn()}/>);return save;
}
it('incomplete checklist cannot approve or verify',()=>{mount();expect(screen.getByText('검수 완료')).toBeDisabled();expect(screen.getByText('Package 승인 요청')).toBeDisabled();});
it('retains edits and revision after a save conflict',async()=>{const save=mount(vi.fn().mockRejectedValue(Error('REVISION_CONFLICT')));fireEvent.change(screen.getByRole('textbox'),{target:{value:'검수 중인 내용'}});fireEvent.click(screen.getByText('저장'));await screen.findByText(/다른 검수자가 수정/);expect(screen.getByRole('textbox')).toHaveValue('검수 중인 내용');expect(save.mock.calls[0][1]).toBe(2);expect(screen.getByText(/저장 후 이동/)).toBeDisabled();});
it('uses server saved response after successful save',async()=>{const save=mount();fireEvent.click(screen.getByText('저장'));await waitFor(()=>expect(save).toHaveBeenCalled());await screen.findByText('검수 내용을 서버에 저장했습니다.');expect(screen.getByText('수정본 3 · IN_REVIEW')).toBeTruthy();});
