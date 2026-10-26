// @vitest-environment jsdom
import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {ResultContent} from './essay-result-page';
const f=vi.hoisted(()=>({read:vi.fn(),client:{auth:{getSession:async()=>({data:{session:{user:{id:'owner'}}}})}}}));
vi.mock('@/components/auth-context',()=>({useAuth:()=>({status:'authenticated',user:{id:'owner'},client:f.client})}));
vi.mock('./essay-dashboard',()=>({RecordDetail:({row}:{row:{id:string}})=><p>History 공통 결과 {row.id}</p>}));
vi.mock('@/lib/my/essay-dashboard',()=>({readEssayDashboard:f.read,readMathDashboard:f.read}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('uses the exact existing History record and does not mount answer submission',async()=>{
 f.read.mockResolvedValue([{source:'exam',id:'saved-run'},{source:'exam',id:'other'}]);
 render(<ResultContent source="exam" id="saved-run"/>);
 expect(await screen.findByText('History 공통 결과 saved-run')).toBeVisible();
 expect(screen.queryByRole('textbox')).toBeNull();
 expect(screen.getByRole('link',{name:'다른 논술 풀기'})).toHaveAttribute('href','/essay-lab');
 expect(f.read).toHaveBeenCalledWith(f.client,'owner');
});
it('never falls back to a different result when the ID/source is not owned',async()=>{
 f.read.mockResolvedValue([{source:'math',id:'saved-run'}]);
 render(<ResultContent source="exam" id="saved-run"/>);
 expect(await screen.findByText('이 계정에서 해당 첨삭 기록을 찾을 수 없습니다.')).toBeVisible();
 expect(screen.queryByText(/History 공통 결과/)).toBeNull();
});
