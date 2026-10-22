// @vitest-environment jsdom
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {StudentQuestionPdf} from './student-pdf';
vi.mock('@/components/auth-context',()=>({useAuth:()=>({client:null,user:null})}));
vi.mock('./pdf-viewer',()=>({MaterialPdfViewer:({positionKey,jumpPage}:{positionKey:string;jumpPage:number})=> <div data-testid="pdf-renderer" data-position-key={positionKey} data-start-page={jumpPage}>PDF renderer</div>}));
const asset={assetId:'q',sha256:'a'.repeat(64),startPage:1,pageCount:2,questionId:'q',kind:'student_question',verification:'VERIFIED',studentDisplay:'APPROVED'} as const;
afterEach(()=>{cleanup();vi.restoreAllMocks();});
describe('question viewer launch',()=>{
 it('keeps answer mounted when mobile viewer opens and closes',()=>{
  vi.stubGlobal('matchMedia',()=>({matches:true}));
  render(<><textarea aria-label="답안" defaultValue="보존 답안"/><StudentQuestionPdf asset={asset} owner="owner"/></>);
  fireEvent.click(screen.getByRole('button',{name:'문제 보기 ↗'}));
  expect(screen.getByRole('dialog')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'닫기'}));
  expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByLabelText('답안')).toHaveValue('보존 답안');
 });
 it('tries new tab when separate window is blocked then preserves inline fallback',()=>{
  vi.stubGlobal('matchMedia',()=>({matches:false}));
  const open=vi.spyOn(window,'open').mockReturnValue(null);
  render(<StudentQuestionPdf asset={asset} owner="owner"/>);
  fireEvent.click(screen.getByRole('button',{name:'문제 보기 ↗'}));
  expect(open).toHaveBeenCalledTimes(2);expect(open.mock.calls[1][1]).toBe('_blank');expect(screen.getByRole('dialog')).toBeTruthy();
 });
});

it('isolates remembered pages when two questions share the same PDF',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true}));
 const {rerender}=render(<StudentQuestionPdf asset={asset} owner="owner"/>);
 fireEvent.click(screen.getByRole('button',{name:'문제 보기 ↗'}));
 const first=screen.getByTestId('pdf-renderer').getAttribute('data-position-key');
 rerender(<StudentQuestionPdf asset={{...asset,questionId:'q2',startPage:2}} owner="owner"/>);
 expect(screen.getByTestId('pdf-renderer').getAttribute('data-position-key')).not.toBe(first);
 expect(screen.getByTestId('pdf-renderer')).toHaveAttribute('data-start-page','2');
});
