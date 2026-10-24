// @vitest-environment jsdom
// Synthetic UI/HTTP/RPC journey; official-input Worker verification is separate.
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it,vi} from 'vitest';
import {EssayExamSubmit} from './essay-exam-submit';
import fixture from '@/lib/my/exam-history.fixture.json';
import type {SourceExam} from '@/lib/essay-runtime/source-registry';
const state=vi.hoisted(()=>({runs:[] as Record<string,unknown>[],rpc:vi.fn()}));
const client={auth:{getSession:async()=>({data:{session:{user:{id:'owner'},access_token:'synthetic'}}})},rpc:state.rpc};
vi.mock('./auth-context',()=>({useAuth:()=>({status:'authenticated',user:{id:'owner'},client})}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),replace:vi.fn(),back:vi.fn()})}));
const examId='1033e20b-9a20-5622-a67b-c288ace2734f',questionId='1f980d57-683e-5d49-b2ed-4bbb554b967b';
const exam:SourceExam={key:'konkuk-humanities-local',dbExamId:examId,universityId:null,sourceUniversityId:'konkuk',year:2026,kind:'admission',track:'인문',session:null,campus:null,verification:'VERIFIED',sourceHashes:[],evaluationReady:true,questions:[{key:'q2',dbQuestionId:questionId,label:'2번',sourceLocator:null,lengthLabel:null,inputMode:'text'}]};
it('canonical humanities draft uses existing submit, result, free rewrite and owner History adapters',async()=>{
 state.runs=[];sessionStorage.clear();localStorage.clear();
 state.rpc.mockImplementation(async(name:string,args:{p_run:string|null})=>{
  expect(name).toBe('essay_exam_history');
  return {data:{version:'essay-exam-history-v1',runs:args.p_run?state.runs.filter(r=>r.id===args.p_run):state.runs},error:null};
 });
 const quotes:number[]=[],submissions:Record<string,unknown>[]=[];
 vi.stubGlobal('fetch',vi.fn(async(url: string,init?:RequestInit)=>{
  expect(url).toBe('/api/essay/exam');
  const body=JSON.parse(String(init?.body));
  if(body.action==='availability')return Response.json({ready:true});
  if(body.action==='quote'){const credits=body.parentId?0:1;quotes.push(credits);return Response.json({version:'essay-exam-quote-v1',credits});}
  expect(body.action).toBe('submit');expect(body.examId).toBe(examId);expect(body.answers[0].questionId).toBe(questionId);
  submissions.push(body);
  const run=structuredClone(body.parentId?fixture.after:fixture.before);
  run.exam_id=examId;run.university='건국대학교';run.year=2026;run.title='2026 수시 인문 2번';
  run.answers[0]={...body.answers[0]};run.result.questions[0].questionId=questionId;
  state.runs.push({...run,question_ids:[questionId],free_rewrite_available:!body.parentId});
  return Response.json({runId:run.id});
 }));
 const u=userEvent.setup();
 const first=render(<EssayExamSubmit exam={exam} included={['q2']} drafts={{q2:{body:'First synthetic answer',revision:1,images:false,saved:true}}}/>);
 await u.click(await screen.findByRole('button',{name:'첨삭 요청 · 1 크레딧'}));
 await u.click(await screen.findByRole('button',{name:'첨삭 진행하기'}));
 await screen.findByText('First summary');
 expect(screen.getByRole('link',{name:'나의 첨삭 기록 →'})).toHaveAttribute('href','/my/essays');
 first.unmount();
 render(<EssayExamSubmit exam={exam} included={['q2']} cycle={{parentId:'first'}} drafts={{q2:{body:'Rewritten synthetic answer',revision:2,images:false,saved:true}}}/>);
 await u.click(await screen.findByRole('button',{name:'무료 재첨삭 요청'}));
 await u.click(await screen.findByRole('button',{name:'첨삭 진행하기'}));
 await waitFor(()=>expect(state.runs).toHaveLength(2));
 await screen.findByText('Rewritten synthetic answer');
 expect(quotes).toEqual([1,0]);expect(submissions[1].parentId).toBe('first');
 expect(submissions[0].key).not.toBe(submissions[1].key);
 expect(state.rpc).toHaveBeenCalledWith('essay_exam_history',{p_run:'first'});
 expect(state.rpc).toHaveBeenCalledWith('essay_exam_history',{p_run:'rewrite'});
});
