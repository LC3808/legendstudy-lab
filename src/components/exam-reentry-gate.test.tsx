// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {ExamReentryGate} from './exam-reentry-gate';
import {scopedDraftKey,useEssayDraftSession} from './essay-draft-session';
import type {SourceExam} from '@/lib/essay-runtime/source-registry';
const mocks=vi.hoisted(()=>({essay:vi.fn(),math:vi.fn(),client:{}}));
vi.mock('./auth-context',()=>({useAuth:()=>({user:{id:'owner'},client:mocks.client})}));
vi.mock('@/lib/my/essay-dashboard',()=>({readEssayDashboard:mocks.essay,readMathDashboard:mocks.math}));
const exam={key:'exam-a',dbExamId:'exam-a'} as SourceExam;
function Writer(){const scope=useEssayDraftSession();return <input aria-label="draft" defaultValue={localStorage.getItem(scopedDraftKey('old-draft',scope))??''} onChange={e=>localStorage.setItem(scopedDraftKey('old-draft',scope),e.target.value)}/>;}
beforeEach(()=>{mocks.essay.mockResolvedValue([]);mocks.math.mockResolvedValue([]);HTMLDialogElement.prototype.showModal=function(){this.open=true;};});
afterEach(()=>{cleanup();localStorage.clear();vi.clearAllMocks();});
it('uses exact exam ID; another exam never triggers the modal',async()=>{mocks.essay.mockResolvedValue([{examId:'other',evaluations:[{valid:true}]}]);render(<ExamReentryGate exam={exam}><Writer/></ExamReentryGate>);await screen.findByLabelText('draft');expect(screen.queryByRole('dialog')).toBeNull();});
it('keeps original drafts, creates independent blank sessions and scopes history',async()=>{
 localStorage.setItem('old-draft','existing unsubmitted answer');mocks.essay.mockResolvedValue([{examId:'exam-a',evaluations:[{valid:true}]}]);
 const view=render(<ExamReentryGate exam={exam}><Writer/></ExamReentryGate>);
 await screen.findByRole('dialog');expect(screen.getByRole('link',{name:'네, 기록 확인'})).toHaveAttribute('href','/my/essays/?exam=exam-a');
 fireEvent.click(screen.getByRole('button',{name:'아니오, 새로 작성'}));expect(screen.getByLabelText('draft')).toHaveValue('');
 fireEvent.change(screen.getByLabelText('draft'),{target:{value:'new independent answer'}});
 expect(localStorage.getItem('old-draft')).toBe('existing unsubmitted answer');
 const stored=JSON.parse(localStorage.getItem('legendstudy:essay-draft-sessions:v1:owner:exam-a')!);expect(stored).toHaveLength(1);
 expect(localStorage.getItem(scopedDraftKey('old-draft',stored[0].id))).toBe('new independent answer');
 view.unmount();render(<ExamReentryGate exam={exam}><Writer/></ExamReentryGate>);await screen.findByRole('dialog');fireEvent.click(screen.getByRole('button',{name:'아니오, 새로 작성'}));expect(screen.getByLabelText('draft')).toHaveValue('');
 expect(localStorage.getItem(scopedDraftKey('old-draft',stored[0].id))).toBe('new independent answer');
 vi.spyOn(window,'confirm').mockReturnValue(true);fireEvent.change(screen.getByLabelText('보관된 작성 세션'),{target:{value:stored[0].id}});expect(screen.getByLabelText('draft')).toHaveValue('new independent answer');
});
it('history failure is not treated as no history and permits retry',async()=>{mocks.essay.mockRejectedValueOnce(Error('offline'));render(<ExamReentryGate exam={exam}><Writer/></ExamReentryGate>);await screen.findByRole('alert');expect(screen.queryByLabelText('draft')).toBeNull();fireEvent.click(screen.getByText('다시 시도'));await waitFor(()=>expect(screen.getByLabelText('draft')).toBeVisible());});
