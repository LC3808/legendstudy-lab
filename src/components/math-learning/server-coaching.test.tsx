// @vitest-environment jsdom
import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,expect,it,vi} from 'vitest';
import {ServerCoaching} from './server-coaching';
const f=vi.hoisted(()=>{
 const state={owner:'student',unsafe:false,calls:[] as {fn:string;action:string;payload:Record<string,unknown>}[]};
 const client={auth:{getSession:async()=>({data:{session:{user:{id:state.owner}}}})},rpc:(fn:string,args:{p_request:{action:string;payload:Record<string,unknown>}})=>{const run=async()=>{
 const {action,payload}=args.p_request;state.calls.push({fn,action,payload});
 return {data:{dto_version:'math-coaching-v1',action,result:action==='history'?{attempts:[]}:action==='hint'?{body:'개념을 확인하세요'}:{version:'math-coaching-v1',evaluation_id:'evaluation',disclosed:action==='reveal',diagnosis:'조건과 풀이를 확인하세요',strengths:[],tasks:[{id:'task',title:'조건 확인'}],concepts:[],...((state.unsafe||action==='reveal')?{full_solution:{steps:[{representation:'최종 정답 12345'}]}}:{})}},error:null};
 };return {abortSignal:run,then:(resolve: (v:unknown)=>unknown,reject:(e:unknown)=>unknown)=>run().then(resolve,reject)};}};return {state,client};
});
vi.mock('../auth-context',()=>({useAuth:()=>({user:{id:f.state.owner},client:f.client})}));
beforeEach(()=>{f.state.owner='student';f.state.unsafe=false;f.state.calls=[];});
it('requests answers only after explicit consent; hint and reveal keep canonical identity',async()=>{
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(false),u=userEvent.setup();
 render(<ServerCoaching evaluationId="evaluation"/>);
 await screen.findByText('조건 확인');expect(screen.queryByText('최종 정답 12345')).toBeNull();
 await u.click(screen.getByRole('button',{name:'개념 힌트'}));await screen.findByText('개념을 확인하세요');
 await u.click(screen.getByRole('button',{name:'전체 풀이 및 해설 보기'}));expect(f.state.calls.some(c=>c.action==='reveal')).toBe(false);
 confirm.mockReturnValue(true);await u.click(screen.getByRole('button',{name:'전체 풀이 및 해설 보기'}));
 await u.click(await screen.findByText('AI 평가의 풀이 단계'));await screen.findByText('최종 정답 12345');expect(f.state.calls.find(c=>c.action==='reveal')).toMatchObject({fn:'math_coaching',payload:{evaluation_id:'evaluation',client_submission_id:expect.any(String)}});confirm.mockRestore();
});
it('rejects an undisclosed response containing a full solution',async()=>{
 f.state.unsafe=true;render(<ServerCoaching evaluationId="evaluation"/>);await screen.findByRole('alert');expect(screen.queryByText('최종 정답 12345')).toBeNull();
});
it('uses mixed run/question identity and remounts on an owner switch',async()=>{
 const view=render(<ServerCoaching runId="run" questionId="q2"/>);await screen.findByText('조건 확인');
 expect(f.state.calls[0]).toMatchObject({fn:'essay_math_coaching',payload:{run_id:'run',question_id:'q2'}});
 expect(f.state.calls[0].payload).not.toHaveProperty('evaluation_id');
 f.state.owner='another';view.rerender(<ServerCoaching runId="run" questionId="q2"/>);await waitFor(()=>expect(f.state.calls.filter(c=>c.action==='read')).toHaveLength(2));
});
