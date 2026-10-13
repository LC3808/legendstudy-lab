// @vitest-environment jsdom
import {render,screen} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
vi.mock('@/components/auth-context',()=>({useAuth:()=>({status:'anonymous',user:null,client:null})}));
import {MaterialsConsole} from './materials-console';
it('does not mount the private review client for guests',()=>{render(<MaterialsConsole/>);expect(screen.getByText(/관리자 계정으로 로그인/)).toBeTruthy();expect(screen.queryByText('비공개 PDF 등록')).toBeNull();});
