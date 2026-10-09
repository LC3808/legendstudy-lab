// @vitest-environment jsdom
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect,vi} from 'vitest';
import {ReturnNavigation} from './return-navigation';
const router=vi.hoisted(()=>({back:vi.fn(),replace:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>router}));
it('falls back for direct entry even when external browser history exists',async()=>{
 Object.defineProperty(document,'referrer',{configurable:true,value:'https://external.example/'});
 Object.defineProperty(window.history,'length',{configurable:true,value:5});
 render(<ReturnNavigation href="/account/" label="마이페이지"/>);
 await userEvent.click(screen.getByRole('button',{name:'뒤로가기'}));expect(router.replace).toHaveBeenCalledWith('/account/');expect(router.back).not.toHaveBeenCalled();
});
it('uses back only with a same-origin referrer and existing history',async()=>{
 Object.defineProperty(document,'referrer',{configurable:true,value:window.location.origin+'/essay-lab/'});
 render(<ReturnNavigation/>);await userEvent.click(screen.getByRole('button',{name:'뒤로가기'}));expect(router.back).toHaveBeenCalledOnce();
});
