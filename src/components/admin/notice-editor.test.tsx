// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import Quill from 'quill';
import Surface from '../rich-text/quill-surface';
import {NoticeContent} from '../notice-content';
import {parseDocument,plainContent,toRich,type RichDocument,type NoticeDocument} from '@/lib/notices/document';
vi.mock('@/components/auth-context',()=>({useAuth:()=>({client:null,user:null})}));
afterEach(cleanup);
describe('notice editor',()=>{
 it('preserves only the selected Korean word across saving and reopening',()=>{
  Range.prototype.getBoundingClientRect=()=>new DOMRect();
  const text='신청 기간은 내일까지입니다.';
  let q!: Quill, saved!: RichDocument;
  const view=render(<Surface value={toRich(text)} onReady={editor=>{if(editor)q=editor;}} onChange={doc=>{saved=doc;}} renderPhoto={()=>null}/>);
  act(()=>{q.setSelection(7,2,'silent');});
  fireEvent.click(screen.getByRole('button',{name:'굵게'}));
  fireEvent.click(screen.getByRole('button',{name:'밑줄'}));
  act(()=>{q.format('background','#ffff00','user');q.format('color','#993300','user');q.format('size','22px','user');});
  expect(parseDocument(saved)).toEqual(saved);
  expect(plainContent(saved)).toBe(text);
  view.unmount();
  render(<Surface value={saved} renderPhoto={()=>null} onReady={editor=>{if(editor)q=editor;}}/>);
  expect(q.getFormat(7,2)).toMatchObject({bold:true,underline:true,background:'#ffff00',color:'#993300',size:'22px'});
  expect(q.getFormat(0,2)).toEqual({});
 });
 it('renders legacy plain content and rejects malicious documents',()=>{
  render(<NoticeContent content="기존 공지" document={{version:1,blocks:[{type:'html'}]} as unknown as NoticeDocument}/>);
  expect(screen.getByText('기존 공지')).toBeVisible();
 });
});
