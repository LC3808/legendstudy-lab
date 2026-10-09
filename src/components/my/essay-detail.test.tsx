// @vitest-environment jsdom
import {render,screen} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {RecordDetail} from './essay-dashboard';
import type {RecordItem} from '@/lib/my/essay-dashboard';
vi.mock('@/components/auth-context',()=>({useAuth:()=>({status:'authenticated',user:{id:'owner'},client:{auth:{getSession:async()=>({data:{session:{user:{id:'owner'}}}})}}})}));
vi.mock('@/lib/my/essay-dashboard',async original=>({...await original<typeof import('@/lib/my/essay-dashboard')>(),readEssayDetail:async()=>({attempts:[{id:'a',attempt_no:1,body:'저장된 인문 답안'}],evaluations:[]}),mathRead:async()=>({attempt:{typed_answer:'저장된 수리 답안'},artifacts:[]})}));
const row:RecordItem={id:'a',source:'essay',sessionId:'session',question:'문제',university:null,at:'2026-10-09',rewrite:false,evaluations:[]};
it('retains submitted Humanities answer when no completed evaluation exists',async()=>{render(<RecordDetail row={row}/>);expect(await screen.findByText('저장된 인문 답안')).toBeVisible();expect(screen.getByText('완료된 평가가 없습니다.')).toBeVisible();});
it('retains submitted Math answer while evaluation is pending',async()=>{render(<RecordDetail row={{...row,source:'math'}}/>);expect(await screen.findByText('저장된 수리 답안')).toBeVisible();expect(screen.getByText('완료된 평가가 없습니다.')).toBeVisible();});
