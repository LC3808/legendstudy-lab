// @vitest-environment jsdom
import {cleanup,render,screen,fireEvent,act} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {EssaySessionProgress} from './essay-session-progress';
const f=vi.hoisted(()=>({reload:vi.fn(),data:{state:'reserved',exam_id:'exam',retry_allowed:true,questions:[{question_id:'q1',state:'completed'},{question_id:'q2',state:'failed'}]}}));
vi.mock('./owner-data',()=>({useOwnerData:()=>({data:f.data,reload:f.reload}),DataStatus:()=>null}));
vi.mock('../auth-context',()=>({useAuth:()=>({user:{id:'owner'},client:{auth:{getSession:async()=>({data:{session:{user:{id:'owner'},access_token:'test'}}})}}})}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('opens progress on retry, retains the run and sends no new paid request',async()=>{
 let resolve!:(r:Response)=>void;const fetcher=vi.fn((_url:string,_options:RequestInit)=>new Promise<Response>(r=>{resolve=r;}));vi.stubGlobal('fetch',fetcher);
 render(<EssaySessionProgress runId="existing-run" onComplete={()=>{}} hidden presentation={{onClose:()=>{},onResult:()=>{}}}/>);
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'다시 시도 · 0 크레딧'}));});
 expect(screen.getByRole('dialog')).toBeVisible();expect(screen.getByRole('progressbar')).toBeVisible();
 expect(screen.getByRole('button',{name:'재처리 요청 중…'})).toBeDisabled();
 expect(JSON.parse(String(fetcher.mock.calls[0][1].body))).toMatchObject({action:'retry',runId:'existing-run',examId:'exam'});
 await act(async()=>resolve(new Response('{}',{status:200})));
 expect(f.reload).toHaveBeenCalled();expect(fetcher).toHaveBeenCalledTimes(1);
});
