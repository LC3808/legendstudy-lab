// @vitest-environment jsdom
import {cleanup,render,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {EssaySessionProgress} from './essay-session-progress';
const f=vi.hoisted(()=>({data:{state:'completed',questions:[{question_id:'q1',state:'completed'},{question_id:'q2',state:'failed'}]}}));
vi.mock('./owner-data',()=>({useOwnerData:()=>({data:f.data,reload:()=>{}}),DataStatus:()=>null}));
vi.mock('../auth-context',()=>({useAuth:()=>({})}));
afterEach(cleanup);
it('does not navigate on partial completion, but completes even when the progress dialog was closed',async()=>{
 const done=vi.fn();
 const view=render(<EssaySessionProgress runId="same-run" hidden onComplete={done}/>);
 expect(done).not.toHaveBeenCalled();
 f.data={state:'completed',questions:[{question_id:'q1',state:'completed'},{question_id:'q2',state:'completed'}]};
 view.rerender(<EssaySessionProgress runId="same-run" hidden onComplete={done}/>);
 await waitFor(()=>expect(done).toHaveBeenCalledTimes(1));
});
