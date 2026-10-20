// @vitest-environment jsdom
import {render,screen,waitFor} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
import {DbExamSubmit} from './db-exam-submit';
const f=vi.hoisted(()=>({session:vi.fn(),submit:vi.fn()}));
const client={auth:{getSession:f.session}};
vi.mock('./auth-context',()=>({useAuth:()=>({client,user:{id:'owner'}})}));
vi.mock('./essay-exam-submit',()=>({EssayExamSubmit:(props:unknown)=>{f.submit(props);return <div>existing submit</div>;}}));
const exam={dbExamId:'exam',verification:'VERIFIED',questions:[{key:'key',dbQuestionId:'question'}]};
const props={examId:'exam',questionIds:['question'],included:['question'],drafts:{question:{body:'saved answer',revision:7,images:false,saved:true}}};
beforeEach(()=>{vi.clearAllMocks();f.session.mockResolvedValue({data:{session:{user:{id:'owner'},access_token:'fixture'}}});vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({version:'essay-source-registry-v1',exams:[exam]})}));});
it('maps saved canonical drafts to the existing submit consumer',async()=>{
 render(<DbExamSubmit {...props}/>);await screen.findByText('existing submit');
 expect(f.submit).toHaveBeenLastCalledWith(expect.objectContaining({included:['key'],drafts:{key:props.drafts.question}}));
 expect(fetch).toHaveBeenCalledTimes(1);
});
it('fails closed for unverified metadata',async()=>{
 vi.mocked(fetch).mockResolvedValue({ok:true,json:async()=>({version:'essay-source-registry-v1',exams:[{...exam,verification:'PENDING'}]})} as Response);
 render(<DbExamSubmit {...props}/>);await waitFor(()=>expect(fetch).toHaveBeenCalled());expect(f.submit).not.toHaveBeenCalled();
});
it('does not fetch metadata using another account session',async()=>{
 f.session.mockResolvedValue({data:{session:{user:{id:'other'},access_token:'fixture'}}});render(<DbExamSubmit {...props}/>);
 await waitFor(()=>expect(f.session).toHaveBeenCalled());expect(fetch).not.toHaveBeenCalled();expect(f.submit).not.toHaveBeenCalled();
});
it('rejects selected questions missing from the reviewed registry',async()=>{
 render(<DbExamSubmit {...props} included={['unreviewed']}/>);await waitFor(()=>expect(fetch).toHaveBeenCalled());expect(f.submit).not.toHaveBeenCalled();
});
it('hides previously reviewed submission immediately when exam identity changes',async()=>{
 const view=render(<DbExamSubmit {...props}/>);await screen.findByText('existing submit');
 vi.mocked(fetch).mockImplementation(()=>new Promise(()=>{}));
 view.rerender(<DbExamSubmit {...props} examId="different-exam"/>);
 expect(screen.queryByText('existing submit')).toBeNull();
 expect(screen.getByRole('status')).toHaveTextContent('연결을 확인');
});
