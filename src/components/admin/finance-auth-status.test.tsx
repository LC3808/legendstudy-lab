// @vitest-environment jsdom
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import {FinanceAuthStatus} from './finance-auth-status';
const auth=vi.hoisted(()=>({id:'d5eab102-da92-4c4c-9adb-16d2c9d20e4c'}));
vi.mock('../auth-context',()=>({useAuth:()=>({user:{id:auth.id},client:{auth:{getSession:async()=>({data:{session:{user:{id:auth.id},access_token:'synthetic'}}})}}})}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();auth.id='d5eab102-da92-4c4c-9adb-16d2c9d20e4c';});
it('other admins cannot see status control',()=>{auth.id='other';render(<FinanceAuthStatus/>);expect(screen.queryByRole('button')).toBeNull();});
it('shows fallback warning without unknown fields or raw errors',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>Response.json({source:'fallback',healthy:true,warning:true,remainingSeconds:7200,lastError:'PRIVATE',token:'SECRET'})));render(<FinanceAuthStatus/>);fireEvent.click(screen.getByRole('button'));expect(await screen.findByRole('alert')).toHaveTextContent('기존 토큰으로 복구');expect(screen.queryByText(/SECRET|PRIVATE/)).toBeNull();});
