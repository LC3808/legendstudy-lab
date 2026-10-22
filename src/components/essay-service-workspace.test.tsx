// @vitest-environment jsdom
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
import {EssayServiceWorkspace,EssayQuestionDraft} from './essay-service-workspace';
const f=vi.hoisted(()=>({slug:'',client:{auth:{getSession:async()=>({data:{session:null}})}},question:'00000000-0000-4000-8000-000000000002',user:{id:'00000000-0000-4000-8000-000000000001'} as {id:string}|null,save:vi.fn(),submit:vi.fn(),revoke:vi.fn()}));
vi.mock('next/navigation',()=>({useSearchParams:()=>new URLSearchParams({question:f.question})}));
vi.mock('./auth-context',()=>({useAuth:()=>({status:f.user?'authenticated':'anonymous',user:f.user,client:f.client})}));
vi.mock('@/lib/essay-runtime/supabase-transport',()=>({essaySupabaseTransport:vi.fn()}));
vi.mock('@/lib/essay-runtime/client',()=>({EssayRuntimeClient:class{open=async()=>({body:'저장된 답안',revision:1});save=f.save;submit=f.submit;history=async()=>({evaluations:[]});revoke=f.revoke;}}));
vi.mock('@/lib/essay-runtime/catalog',async original=>({...await original<typeof import('@/lib/essay-runtime/catalog')>(),loadQuestion:async()=>({id:f.question,essay_exam_id:'exam',label:'실제 계약 문항',length_count_rule:null}),loadExams:async()=>f.slug?[{id:'exam',universities:{slug:f.slug,name:'연세대학교'},official_source_url:'https://example.org'}]:[]}));
beforeEach(()=>{f.slug='';f.user={id:'00000000-0000-4000-8000-000000000001'};f.save.mockReset().mockResolvedValue({body:'수정 답안',revision:2});f.submit.mockReset().mockResolvedValue('attempt');f.revoke.mockClear();});
it('restores saved draft, saves before immutable submit, preserves original on direct rewrite',async()=>{
 render(<EssayServiceWorkspace/>);const answer=await screen.findByLabelText('내 답안');await waitFor(()=>expect(answer).toBeEnabled());expect(answer).toHaveValue('저장된 답안');fireEvent.change(answer,{target:{value:'수정 답안'}});fireEvent.click(screen.getByText('답안 제출'));
 await waitFor(()=>expect(f.submit).toHaveBeenCalledWith('수정 답안',2));expect(f.save).toHaveBeenCalledWith('수정 답안',1);expect(await screen.findByText('다시 써보기')).toBeVisible();expect(answer).toBeDisabled();fireEvent.click(screen.getByText('다시 써보기'));expect(answer).toHaveValue('수정 답안');expect(answer).toBeEnabled();expect(screen.getByText('첨삭 준비 중')).toBeDisabled();
});
it('CAS conflict keeps unsaved answer and does not submit',async()=>{
 f.save.mockRejectedValue({code:'PT409'});render(<EssayServiceWorkspace/>);const answer=await screen.findByLabelText('내 답안');await waitFor(()=>expect(answer).toBeEnabled());fireEvent.change(answer,{target:{value:'보존할 답안'}});fireEvent.click(screen.getByText('답안 제출'));expect(await screen.findByText(/다른 기기에서 답안이 변경/)).toBeVisible();expect(answer).toHaveValue('보존할 답안');expect(f.submit).not.toHaveBeenCalled();
});
it('guest uses existing login destination and opens no private workspace',()=>{f.user=null;render(<EssayServiceWorkspace/>);expect(screen.getByRole('link',{name:'로그인'}).getAttribute('href')).toContain('next=');expect(screen.queryByLabelText('내 답안')).toBeNull();});
it('unmount revokes the owner client',async()=>{const view=render(<EssayServiceWorkspace/>);await screen.findByLabelText('내 답안');view.unmount();expect(f.revoke).toHaveBeenCalled();});

it('inline Phase2 restores and saves Draft but cannot use legacy submit or evaluation',async()=>{
 const dirty=vi.fn();render(<EssayQuestionDraft questionId={f.question} onDirtyChange={dirty}/>);
 const answer=await screen.findByLabelText('내 답안');await waitFor(()=>expect(answer).toBeEnabled());
 fireEvent.change(answer,{target:{value:'시험 묶음용 답안'}});await waitFor(()=>expect(dirty).toHaveBeenCalledWith(f.question,true));
 fireEvent.click(screen.getByRole('button',{name:'답안 저장'}));await waitFor(()=>expect(f.save).toHaveBeenCalledWith('시험 묶음용 답안',1));
 expect(screen.queryByRole('button',{name:'답안 제출'})).toBeNull();expect(f.submit).not.toHaveBeenCalled();
 expect(screen.queryByText('첨삭 진행')).toBeNull();
});

it('blocks a held university direct writer while preserving official reading link',async()=>{f.slug='yonsei';render(<EssayServiceWorkspace/>);expect(await screen.findByRole('button',{name:'서비스 준비중'})).toBeDisabled();expect(screen.queryByLabelText('내 답안')).toBeNull();expect(screen.getByRole('link',{name:'공식 자료 확인'})).toHaveAttribute('href','https://example.org/');expect(f.submit).not.toHaveBeenCalled();});
