// @vitest-environment jsdom
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {it,expect,vi,beforeEach} from 'vitest';
import {UniversityEssayStart} from './university-essay-start';
import {sourceExams} from '@/lib/essay-runtime/source-registry';
import {catalogUniversity} from '@/lib/essay-runtime/public-discovery';
vi.mock('client-only',()=>({}));
const state=vi.hoisted(()=>({user:{id:'test-user'} as {id:string}|null,client:{rpc:vi.fn(),auth:{getSession:vi.fn()}}}));
vi.mock('./auth-context',()=>({useAuth:()=>state}));
vi.mock('./materials/student-pdf',()=>({StudentQuestionPdf:({asset}:{asset:{questionId:string}})=><div data-testid="approved-pdf">{asset.questionId}</div>}));
const original=sourceExams('hanyang').find(e=>e.kind==='admission')!;
const row={examId:original.dbExamId,universityId:original.universityId,year:2024,kind:'admission',track:original.track,title:'한양대 수시 인문 오후2',questionCount:1,questions:original.questions.map(q=>({id:q.dbQuestionId,label:q.label}))};
beforeEach(()=>{cleanup();localStorage.clear();state.user={id:'test-user'};state.client.rpc.mockReset().mockResolvedValue({data:[row],error:null});state.client.auth.getSession.mockResolvedValue({data:{session:null}});});
it.each(['guest','account'])('restores approved Hanyang PDF and original writer for %s without evaluation',async mode=>{
 if(mode==='guest')state.user=null;
 render(<UniversityEssayStart universityId={original.universityId} sourceId="hanyang"/>);
 expect(await screen.findByTestId('approved-pdf')).toHaveTextContent(original.questions[0].dbQuestionId!);
 expect(screen.getByRole('combobox',{name:'학년도·시험'})).toHaveDisplayValue('2024학년도 수시논술');
 expect(screen.queryByRole('tablist',{name:'문항 선택'})).toBeNull();
 const input=screen.getByLabelText('문제 1 답안');await waitFor(()=>expect(input).toBeEnabled());
 fireEvent.change(input,{target:{value:'로컬 합성 답안'}});expect(input).toHaveValue('로컬 합성 답안');
 expect(screen.getByRole('button',{name:'첨삭 가능 여부 확인 중'})).toBeDisabled();
 expect(state.client.rpc.mock.calls).toEqual([['essay_browse_catalog',{p_university:'hanyang'}]]);
});
it('loads canonical metadata even when a prior caller has no cached university UUID',async()=>{
 render(<UniversityEssayStart universityId={null} sourceId="hanyang"/>);
 await screen.findByTestId('approved-pdf');expect(state.client.rpc).toHaveBeenCalledOnce();
});
it('retains verified SWU and KAU UUID mappings without creating records',()=>{
 expect(catalogUniversity('swu')!.universityId).toBe('eba1d65c-5bb6-5454-afd4-82a18c57262a');
 expect(catalogUniversity('kau')!.universityId).toBe('881976e7-8e3d-53e3-8bd8-4ebe5d3a0445');
});
