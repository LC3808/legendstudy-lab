// @vitest-environment jsdom
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {EssayExamSubmit} from './essay-exam-submit';
import {EssayDraftSession,scopedDraftKey} from './essay-draft-session';
import {pendingStorageKey} from '@/lib/essay-runtime/pending-request';
import type {SourceExam} from '@/lib/essay-runtime/source-registry';
const client={auth:{getSession:async()=>({data:{session:{user:{id:'owner'},access_token:'synthetic'}}})}};
vi.mock('./auth-context',()=>({useAuth:()=>({user:{id:'owner'},client})}));
vi.mock('@/lib/my/exam-history',()=>({readExamRuns:async()=>[{id:'parent',exam_id:'exam',free_rewrite_available:true,created_at:'2026-10-26'}],readExamDashboard:async()=>[]}));
const exam={key:'test',dbExamId:'exam',questions:[{key:'q',dbQuestionId:'question',inputMode:'text'}]} as SourceExam;
afterEach(()=>{cleanup();vi.unstubAllGlobals();localStorage.clear();});
it('new draft ignores old receipts and offers a paid quote without submitting; explicit rewrite still quotes zero',async()=>{
 const old=pendingStorageKey('legendstudy:essay-exam-request:v1:owner:test:initial',['question']);
 const receipt=JSON.stringify({id:'old-run',owner:'owner',examId:'exam',scope:old});localStorage.setItem(old+':accepted',receipt);
 const calls:Record<string,unknown>[]=[];vi.stubGlobal('fetch',vi.fn(async(_url,init)=>{const body=JSON.parse(init.body);calls.push(body);return Response.json(body.action==='availability'?{ready:true}:{version:'essay-exam-quote-v1',credits:body.parentId?0:1});}));
 const drafts={q:{body:'UI-only unsent text',revision:1,images:false,saved:true}};
 const view=render(<EssayDraftSession.Provider value="new-session"><EssayExamSubmit exam={exam} included={['q']} drafts={drafts}/></EssayDraftSession.Provider>);
 await act(async()=>{});expect(screen.queryByLabelText('제출 방식')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'논술 첨삭 요청하기 · 1 크레딧'}));await screen.findByRole('dialog');expect(calls.at(-1)).toMatchObject({action:'quote',parentId:null});expect(screen.getByText('이번 첨삭에는 1 크레딧이 사용됩니다.')).toBeVisible();expect(localStorage.getItem(old+':accepted')).toBe(receipt);
 expect(scopedDraftKey(old,'new-session')).not.toBe(old);view.unmount();
 render(<EssayExamSubmit exam={exam} included={['q']} drafts={drafts} cycle={{parentId:'parent'}}/>);await act(async()=>{});fireEvent.click(screen.getByRole('button',{name:'무료 재첨삭 요청'}));await screen.findByRole('dialog');expect(calls.at(-1)).toMatchObject({action:'quote',parentId:'parent'});expect(screen.getByText('이번 첨삭에는 0 크레딧이 사용됩니다.')).toBeVisible();expect(calls.every(c=>c.action!=='submit')).toBe(true);
});
