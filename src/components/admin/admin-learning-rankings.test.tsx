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
it('distinguishes stored pairs from pageviews and exposes the complete material title',async()=>{
 const title='[2026년 9월 시행] 아주 긴 학습자료 원문 제목 '.repeat(5).trim();
 mocks.rpc.mockResolvedValue({data:{version:'admin-learning-rankings-v1',page:1,total_count:1,total_pages:1,rows:[{id:'material',label:title,users:7,records:7,rank:1}]}});
 render(<AdminLearningRankings kind="recent" range={range}/>);
 expect(await screen.findByRole('columnheader',{name:'열람 학생'})).toBeInTheDocument();
 expect(screen.getByRole('columnheader',{name:'학생·자료 쌍'})).toBeInTheDocument();
 expect(screen.getByTitle(title)).toHaveClass('learning-ranking__title');
 expect(screen.getByText('전체 자료명')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'다음'})).toBeDisabled();
});
