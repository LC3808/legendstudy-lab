// @vitest-environment jsdom
import {render,screen,cleanup,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({auth:vi.fn()}));
vi.mock('@/components/auth-context',()=>({useAuth:mocks.auth}));
import {AdminInquiriesView} from './admin-inquiries-view';
import {SupportInquiries} from '../support-inquiries';
afterEach(cleanup);
const time='2026-11-04T01:00:00Z';
function setup(){let replyAttempts=0;const calls:{name:string;p:Record<string,unknown>}[]=[];
 const rpc=vi.fn(async(name:string,args?:{p:Record<string,unknown>})=>{const p=args?.p??{};calls.push({name,p});let data:unknown;
 if(name==='support_admin_list')data={dto_version:'admin-v1',as_of:time,total:26,open:3,limit:25,offset:p.offset,items:[{source:'APP',inquiry_id:'f',category:'suggestion',title:'합성 앱 제안',user_id:null,status:'RECEIVED',created_at:time,updated_at:time,reply_count:0,preview:'합성 원문'}]};
 else if(name==='support_admin_detail')data={dto_version:'admin-v1',as_of:time,source:'APP',inquiry:{inquiry_id:'f',category:'suggestion',title:'합성 앱 제안',body:'합성 원문',status:'RECEIVED',submitted_at:time,updated_at:time,answered_at:null,closed_at:null},member:{account_id:null,grade_level:null,account_state:null,spendable:null},related:{essay_evaluations:null,payment_orders:null},status_events:[],replies:[]};
 else if(name==='support_admin_reply'){replyAttempts++;if(replyAttempts===1)return {data:null,error:{message:'network',code:'NETWORK'}};data={reply_id:'r',created:true};}
 else if(name==='support_mine')data={items:[{source:'APP',inquiry_id:'f',title:'내 합성 문의',status:'ANSWERED',created_at:time,answered:true}]};
 else if(name==='support_detail')data={title:'내 합성 문의',body:'내 원본',replies:[{reply_id:'r',body:'저장된 합성 답변',created_at:time}]};
 else throw new Error(name);
 return {data,error:null};});
 mocks.auth.mockReturnValue({client:{rpc,auth:{getSession:async()=>({data:{session:{user:{id:'operator'}}},error:null})}},user:{id:'operator'},status:'authenticated'});return {rpc,calls};}
it('APP source/detail, guest member, reply retry idempotency and global paging',async()=>{
 const {calls}=setup();const user=userEvent.setup();render(<AdminInquiriesView/>);
 expect(await screen.findByText('합성 앱 제안')).toBeInTheDocument();expect(screen.getByText(/회원 비회원/)).toBeInTheDocument();
 await user.click(screen.getByRole('button',{name:'상세 열기'}));await screen.findByText('문의 내용');
 expect(calls.find(c=>c.name==='support_admin_detail')?.p.source).toBe('APP');
 const textbox=screen.getByRole('textbox',{name:/답변/});await user.type(textbox,'합성 답변입니다');
 const send=screen.getByRole('button',{name:/답변 등록/});await user.click(send);await waitFor(()=>expect(send).not.toBeDisabled());await user.click(send);
 await waitFor(()=>expect(calls.filter(c=>c.name==='support_admin_reply')).toHaveLength(2));const replies=calls.filter(c=>c.name==='support_admin_reply');expect(replies[0].p.request_key).toBe(replies[1].p.request_key);expect(replies[1].p.source).toBe('APP');
 await user.click(screen.getByRole('button',{name:'다음'}));await waitFor(()=>expect(calls.some(c=>c.name==='support_admin_list'&&c.p.offset===25)).toBe(true));
});
it('member follows existing support route to saved reply',async()=>{setup();const user=userEvent.setup();render(<SupportInquiries/>);await user.click(await screen.findByRole('button',{name:/내 합성 문의/}));expect(await screen.findByText('저장된 합성 답변')).toBeInTheDocument();});
it('sign out does not retain prior member content',async()=>{setup();const view=render(<SupportInquiries/>);await screen.findByText(/내 합성 문의/);mocks.auth.mockReturnValue({status:'anonymous',client:null,user:null});view.rerender(<SupportInquiries/>);expect(screen.queryByText(/내 합성 문의/)).not.toBeInTheDocument();});
