// @vitest-environment jsdom
// Explicit opt-in, synthetic local PostgreSQL only. Not a gateway JWT test.
import {execFileSync} from 'node:child_process';
import {render,screen,cleanup,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect,vi,afterEach} from 'vitest';
const mocks=vi.hoisted(()=>({auth:vi.fn()}));
vi.mock('@/components/auth-context',()=>({useAuth:mocks.auth}));
import {AdminInquiriesView} from './admin-inquiries-view';
import {SupportInquiries} from '../support-inquiries';
const admin='00000000-0000-4000-8000-000000000001',member='00000000-0000-4000-8000-000000000002';
const quote=(s:string)=>`'${s.replaceAll("'","''")}'`;
function sql(q:string,user=member,asUser=true){const claims=JSON.stringify({sub:user,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600});return execFileSync('/opt/homebrew/opt/postgresql@17/bin/psql',['-h','127.0.0.1','-p','55441','-d','legendstudy_support_upgrade_20261104','-qAt','-v','ON_ERROR_STOP=1','-c',`set request.jwt.claim.sub=${quote(user)};set request.jwt.claims=${quote(claims)};${asUser?'set role authenticated;':''}${q}`],{encoding:'utf8'}).trim();}
function identity(user:string){const rpc=async(name:string,args?:{p?:unknown})=>{try{return {data:JSON.parse(sql(`select public.${name}(${args?.p?quote(JSON.stringify(args.p))+'::jsonb':''})`,user)),error:null};}catch{return {data:null,error:{message:'synthetic local RPC failure'}};}};mocks.auth.mockReturnValue({status:'authenticated',user:{id:user},client:{rpc,auth:{getSession:async()=>({data:{session:{user:{id:user}}},error:null})}}});}
afterEach(cleanup);
it.skipIf(process.env.LEGENDSTUDY_SUPPORT_LOCAL_TEST!=='1')('component → real SQL → APP answer → owner detail and queued email',async()=>{
 sql("insert into feedback_submissions(category,title,body,app_version,build_number,platform,os_version) values('suggestion','UI E2E APP','Synthetic original','1','1','ios','test')");
 identity(admin);const user=userEvent.setup();render(<AdminInquiriesView/>);
 await screen.findByText('UI E2E APP');await user.type(screen.getByRole('textbox',{name:'제목 또는 회원 식별자'}),'UI E2E APP');await user.click(screen.getByRole('button',{name:'조회'}));await waitFor(()=>expect(screen.getAllByRole('button',{name:'상세 열기'})).toHaveLength(1));await user.click(screen.getByRole('button',{name:'상세 열기'}));await user.type(await screen.findByRole('textbox',{name:'답변 작성'}),'SQL에 저장되는 합성 답변');await user.click(screen.getByRole('button',{name:'답변 등록'}));
 await screen.findByText('SQL에 저장되는 합성 답변');expect(sql("select count(*) from inquiry_notifications n join feedback_submissions f on f.id=n.feedback_id where f.title='UI E2E APP'",admin,false)).toBe('1');
 cleanup();identity(member);render(<SupportInquiries/>);await user.click(await screen.findByRole('button',{name:/UI E2E APP/}));expect(await screen.findByText('SQL에 저장되는 합성 답변')).toBeInTheDocument();
 await user.type(screen.getByRole('textbox',{name:'제목'}),'UI E2E WEB');await user.type(screen.getByRole('textbox',{name:'내용'}),'WEB 합성 문의');await user.click(screen.getByRole('button',{name:'문의 접수'}));await screen.findByText('문의가 접수되었습니다.');expect(sql("select count(*) from inquiries where title='UI E2E WEB'",admin,false)).toBe('1');
 cleanup();identity(admin);render(<AdminInquiriesView/>);await screen.findByText('UI E2E WEB');await user.type(screen.getByRole('textbox',{name:'제목 또는 회원 식별자'}),'UI E2E WEB');await user.click(screen.getByRole('button',{name:'조회'}));await waitFor(()=>expect(screen.getAllByRole('button',{name:'상세 열기'})).toHaveLength(1));await user.click(screen.getByRole('button',{name:'상세 열기'}));await user.type(await screen.findByRole('textbox',{name:'답변 작성'}),'WEB SQL 합성 답변');await user.click(screen.getByRole('button',{name:'답변 등록'}));await screen.findByText('WEB SQL 합성 답변');
 cleanup();identity(member);render(<SupportInquiries/>);await user.click(await screen.findByRole('button',{name:/UI E2E WEB/}));expect(await screen.findByText('WEB SQL 합성 답변')).toBeInTheDocument();
});
