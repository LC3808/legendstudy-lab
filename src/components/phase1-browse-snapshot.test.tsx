// @vitest-environment jsdom
// Optional local integration: public RPC response only, no credentials/Provider/writes.
import {readFileSync} from 'node:fs';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import {SourceExamSelection} from './source-exam-selection';
import {projectRegisteredExam,mergeRegisteredCatalog} from '@/lib/essay-runtime/registered-material-catalog';
import {sourceExams} from '@/lib/essay-runtime/source-registry';
import type {ExamRow,Detail} from '@/lib/materials/contract';
vi.mock('client-only',()=>({}));
const state=vi.hoisted(()=>({user:null,status:'anonymous',client:{rpc:vi.fn(),auth:{getSession:vi.fn().mockResolvedValue({data:{session:null}})}}}));
vi.mock('./auth-context',()=>({useAuth:()=>state}));
type Row=ExamRow&{questions:Detail['questions']};
const snapshot:Record<string,Row[]>=process.env.ESSAY_BROWSE_SNAPSHOT?JSON.parse(readFileSync(process.env.ESSAY_BROWSE_SNAPSHOT,'utf8')):{};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
for(const slug of ['gachon','konkuk','kyunghee','korea','dongguk','sogang','skku','sookmyung','soongsil','swu','kau']){
 it.skipIf(!snapshot[slug])(`selects every captured public exam and question for ${slug}`,async()=>{
  const rows=snapshot[slug];state.client.rpc.mockReset().mockResolvedValue({data:rows,error:null});
  vi.stubGlobal('fetch',vi.fn(()=>Promise.reject(Error('Unexpected network'))));
  render(<SourceExamSelection sourceId={slug} registeredOnly/>);
  await waitFor(()=>expect(screen.getByLabelText('학년도').querySelectorAll('option').length).toBeGreaterThan(1));
  const exams=mergeRegisteredCatalog(sourceExams(slug),rows.map(r=>projectRegisteredExam(slug,r,{examId:r.examId,questions:r.questions} as Detail)));
  expect(new Set(exams.map(e=>e.dbExamId)).size).toBe(rows.length);
  for(const exam of exams){
   fireEvent.change(screen.getByLabelText('학년도'),{target:{value:String(exam.year)}});
   fireEvent.change(screen.getByLabelText('시험 유형'),{target:{value:exam.kind}});
   fireEvent.change(screen.getByLabelText('계열'),{target:{value:exam.track}});
   const session=screen.queryByLabelText('캠퍼스·시험 회차');
   if(session)fireEvent.change(session,{target:{value:exam.key}});
   for(const question of exam.questions){
    if(exam.questions.length>1)fireEvent.click(screen.getByRole('tab',{name:question.label}));
    expect(screen.getAllByText(question.label).length).toBeGreaterThan(0);
    expect(question.dbQuestionId).toBeTruthy();
   }
   if(exam.verification==='REVIEW_REQUIRED')expect(screen.getByRole('button',{name:'첨삭 준비 중'})).toBeDisabled();
  }
  expect(fetch).not.toHaveBeenCalled();
 },30000);
}
