// @vitest-environment jsdom
import {render,screen,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {UniversityAvailability} from './university-availability';
const setup=vi.hoisted(()=>({value:{data:[] as {id:string}[],error:null as unknown},reject:false}));
vi.mock('./auth-context',()=>({useAuth:()=>({client:{from:()=>{const query={select:()=>query,eq:()=>query,limit:()=>query,abortSignal:()=>setup.reject?Promise.reject(new Error('offline')):Promise.resolve(setup.value)};return query;}}})}));
it('does not infer evaluation readiness from question presence and clears an old university status',async()=>{
 setup.reject=false;setup.value={data:[{id:'published-question'}],error:null};
 const {rerender}=render(<UniversityAvailability id="canonical-id"/>);
 await screen.findByText('문항 제공');expect(screen.getByText('AI 첨삭 가능 여부는 문항에서 확인해 주세요.')).toBeVisible();
 expect(screen.queryByRole('button',{name:'첨삭 가능'})).toBeNull();
 rerender(<UniversityAvailability id={null}/>);await screen.findByText('자료 준비 중');expect(screen.queryByText('문항 제공')).toBeNull();
});
it('distinguishes a failed read from an empty catalog without opening evaluation',async()=>{
 setup.reject=true;render(<UniversityAvailability id="canonical-id"/>);
 await screen.findByText('자료 상태 확인 필요');expect(screen.getByText('AI 첨삭 준비 중')).toBeVisible();
 await waitFor(()=>expect(screen.queryByText('자료 준비 중')).toBeNull());setup.reject=false;
});
