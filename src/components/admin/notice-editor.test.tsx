// @vitest-environment jsdom
import {useState} from 'react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {NoticeEditor} from './notice-editor';
import {NoticeContent} from '../notice-content';
import {type NoticeDocument,textBlock} from '@/lib/notices/document';
vi.mock('@/components/auth-context',()=>({useAuth:()=>({client:null,user:null})}));
afterEach(cleanup);
function Harness(){const [doc,setDoc]=useState<NoticeDocument>({version:1,blocks:[textBlock('안내 <script>alert(1)</script>')]});return <NoticeEditor content="안내" document={doc} onChange={(_,d)=>setDoc(d)} onBusyChange={()=>{}}/>;}
describe('notice editor',()=>{
 it('formats, previews and reorders without executing HTML',()=>{
  render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'문단 1 굵게'}));fireEvent.click(screen.getByRole('button',{name:'문단 1 밑줄'}));
  fireEvent.change(screen.getByLabelText('문단 1 글자 크기'),{target:{value:'28'}});
  expect(screen.getByRole('textbox',{name:'본문 문단 1'})).toHaveStyle({fontSize:'28px',fontWeight:'700',textDecoration:'underline'});
  fireEvent.click(screen.getByRole('button',{name:'문단 추가'}));fireEvent.change(screen.getByRole('textbox',{name:'본문 문단 2'}),{target:{value:'두 번째'}});
  fireEvent.click(screen.getByRole('button',{name:'항목 2 위로'}));expect(screen.getByRole('textbox',{name:'본문 문단 1'})).toHaveValue('두 번째');
  fireEvent.click(screen.getByRole('button',{name:'미리보기'}));expect(screen.getByText(/안내 <script>/)).toHaveStyle({fontSize:'28px'});expect(document.querySelector('script')).toBeNull();
 });
 it('renders legacy plain content and rejects malicious documents',()=>{
  render(<NoticeContent content="기존 공지" document={{version:1,blocks:[{type:'html'}]} as unknown as NoticeDocument}/>);
  expect(screen.getByText('기존 공지')).toBeVisible();
 });
});
