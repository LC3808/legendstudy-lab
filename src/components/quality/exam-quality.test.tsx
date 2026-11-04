// @vitest-environment jsdom
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {ExamQuality} from './exam-quality';
const row={run_id:'run',question_id:'question',official_label:'공식 문제 2',state:'completed',created_at:'2026-11-04T00:00:00Z',reviewed:false,parent_id:null};
it('reads list without original bodies, loads only selected subject and records no review on navigation',async()=>{
 const rpc=vi.fn(async(fn:string)=>({error:null,data:fn==='ql_exam_cases'?{rows:[row],total:1,coverage:{subjects:1,reviewed:0}}:{subject:{...row,snapshot_sha256:'a'.repeat(64),answer:{body:'synthetic original'},result:{evaluation:'synthetic output'},result_available:true},history:[]}}));
 render(<ExamQuality client={{rpc} as unknown as SupabaseClient}/>);
 fireEvent.click(await screen.findByRole('button',{name:'검토 시작'}));
 await screen.findByText('synthetic original');
 expect(rpc.mock.calls.map(c=>c[0])).toEqual(['ql_exam_cases','ql_exam_detail']);
 expect(screen.getByRole('button',{name:'검토 기록 저장'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'새로고침'}));
 await waitFor(()=>expect(screen.queryByText('synthetic original')).toBeNull());
 expect(rpc.mock.calls.some(c=>c[0]==='ql_exam_submit')).toBe(false);
});
it('permission error is not represented as zero subjects',async()=>{
 const rpc=vi.fn(async()=>({data:null,error:{code:'42501'}}));render(<ExamQuality client={{rpc} as unknown as SupabaseClient}/>);
 await screen.findByRole('alert');expect(screen.queryByText('조건에 맞는 기록이 없습니다.')).toBeNull();
});
