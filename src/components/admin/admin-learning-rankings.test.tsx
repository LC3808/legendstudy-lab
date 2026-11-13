// @vitest-environment jsdom
import {render,screen,waitFor,cleanup,fireEvent} from '@testing-library/react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/components/auth-context',()=>({useAuth:()=>({client:{rpc:mocks.rpc},user:{id:'admin'}})}));
import {AdminLearningRankings} from './admin-learning-rankings';
const range={p_from:'2026-11-01T00:00:00Z',p_to:'2026-11-13T00:00:00Z'};
afterEach(cleanup);
beforeEach(()=>{mocks.rpc.mockReset();mocks.rpc.mockImplementation((_n,p)=>Promise.resolve({data:{version:'admin-learning-rankings-v1',page:p.p_page,total_count:11,total_pages:2,rows:[{id:String(p.p_page),label:'대학 '+p.p_page,users:1,records:1,rank:p.p_page===1?1:11}]}}));});
it('requests the next server page and resets whole-result search to first',async()=>{
 render(<AdminLearningRankings kind="targets" range={range}/>);
 await screen.findByText('대학 1');fireEvent.click(screen.getByText('다음'));await screen.findByText('대학 2');
 expect(mocks.rpc).toHaveBeenCalledWith('admin_learning_rankings_page',expect.objectContaining({p_page:2,p_page_size:10,...range}));
 fireEvent.change(screen.getByLabelText('전체 결과 검색'),{target:{value:'서울'}});
 await waitFor(()=>expect(mocks.rpc).toHaveBeenLastCalledWith('admin_learning_rankings_page',expect.objectContaining({p_page:1,p_search:'서울'})));
});
it('failed request is an error with retry, not empty rankings',async()=>{
 mocks.rpc.mockResolvedValue({error:{message:'denied'}});render(<AdminLearningRankings kind="saved" range={range}/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('집계를 불러오지 못했습니다');
});
