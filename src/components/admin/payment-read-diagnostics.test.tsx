// @vitest-environment jsdom
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {PaymentReadDiagnostics} from './payment-read-diagnostics';
const auth=vi.hoisted(()=>({id:'d5eab102-da92-4c4c-9adb-16d2c9d20e4c'}));
vi.mock('../auth-context',()=>({useAuth:()=>({user:{id:auth.id},client:{auth:{getSession:async()=>({data:{session:{user:{id:auth.id},access_token:'synthetic'}}})}}})}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();auth.id='d5eab102-da92-4c4c-9adb-16d2c9d20e4c';});
it('hides for other administrators and when not paused',()=>{auth.id='other-admin';const {rerender}=render(<PaymentReadDiagnostics paused/>);expect(screen.queryByRole('button')).toBeNull();auth.id='d5eab102-da92-4c4c-9adb-16d2c9d20e4c';rerender(<PaymentReadDiagnostics paused={false}/>);expect(screen.queryByRole('button')).toBeNull();});
it('sends only empty readonly action and renders bounded fields',async()=>{const f=vi.fn().mockResolvedValue(Response.json({finance:{status:404,code:'PT404',message:'PRIVATE'},finance_read_authorized:true,provider:{status:403,code:'API_KEY_ACCESS_DENIED'},secret:'PRIVATE'}));vi.stubGlobal('fetch',f);render(<PaymentReadDiagnostics paused/>);fireEvent.click(screen.getByRole('button'));expect(await screen.findByRole('status')).toHaveTextContent('Finance: HTTP 404');expect(screen.queryByText(/PRIVATE/)).toBeNull();expect(f).toHaveBeenCalledWith('/api/payments/diagnostics',expect.objectContaining({method:'POST',body:'{}'}));});
