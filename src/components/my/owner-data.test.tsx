// @vitest-environment jsdom
import {act,render,screen,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {AuthContext,type AuthContextValue} from '@/components/auth-context';
import {OwnerArea,useOwnerData} from './owner-data';
it('clears old owner data on switch/logout and ignores late responses',async()=>{
 let current='a';const pending:Record<string,(s:string)=>void>={};
 const load=vi.fn((_client,owner:string)=>new Promise<string>(r=>{pending[owner]=r;}));
 const client={auth:{getSession:async()=>({data:{session:current?{user:{id:current}}:null}})}};
 function Child(){const r=useOwnerData(load);return <p>{r.data??'loading'}</p>;}
 const value=(owner:string)=>({client,status:owner?'authenticated':'anonymous',user:owner?{id:owner}:null}) as AuthContextValue;
 const {rerender}=render(<AuthContext.Provider value={value('a')}><OwnerArea><Child/></OwnerArea></AuthContext.Provider>);
 await waitFor(()=>expect(pending.a).toBeDefined());
 current='b';rerender(<AuthContext.Provider value={value('b')}><OwnerArea><Child/></OwnerArea></AuthContext.Provider>);
 await act(async()=>pending.a('PRIVATE A'));expect(screen.queryByText('PRIVATE A')).toBeNull();
 await waitFor(()=>expect(pending.b).toBeDefined());await act(async()=>pending.b('PRIVATE B'));expect(screen.getByText('PRIVATE B')).toBeTruthy();
 current='';rerender(<AuthContext.Provider value={value('')}><OwnerArea><Child/></OwnerArea></AuthContext.Provider>);expect(screen.queryByText('PRIVATE B')).toBeNull();expect(screen.getByRole('link',{name:'로그인'})).toBeTruthy();
});
