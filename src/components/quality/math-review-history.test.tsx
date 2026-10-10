// @vitest-environment jsdom
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {MathReviewHistory} from './math-review-history';
import {StoredMathQualityReader,type StoredMathDetail} from '@/lib/math-quality/runtime/quality-client';
const detail:StoredMathDetail={dto_version:'qlm-read-v1',evaluation_id:'e',state:'COMPLETED',output_sha256:'a'.repeat(64),input_kind:'TYPED',profile:{reasoning_required:false},sources:[{id:'source'}],output:{hints:[],generated_solution:null}};
it('requires deliberate review, preserves retry id and only sends existing contract',async()=>{
 let failures=1;
 const rpc=vi.fn(async(_fn,request)=>{if(request.action==='history')return {dto_version:'qlm-runtime-v1',action:'history',result:{dto_version:'hq-math-read-v1',judgments:[],next_cursor:null}};if(failures-->0)throw Error('network');return {dto_version:'qlm-runtime-v1',action:'submit_judgment',result:{dto_version:'hq-math-write-v1',judgment_id:'j'}}});
 render(<MathReviewHistory reader={new StoredMathQualityReader({rpc})} detail={detail}/>);
 await screen.findByText('저장된 검수 이력이 없습니다.');expect(screen.getByRole('button',{name:'검수 기록 저장'})).toBeDisabled();
 for(const select of screen.getAllByRole('combobox').slice(0,6))fireEvent.change(select,{target:{value:'OK'}});
 fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'검수 기록 저장'}));
 await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'같은 검수 다시 저장'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'검수 기록 저장'})).toBeDisabled());
 const writes=rpc.mock.calls.filter(([,r])=>r.action==='submit_judgment');expect(writes).toHaveLength(2);expect(writes[0][1]).toEqual(writes[1][1]);const j=writes[0][1].payload.judgment;expect(j.rubric_result.progression).toBe('NA');expect(j.expected_output_sha256).toBe(detail.output_sha256);expect(j.reviewer_user_id).toBeUndefined();
});
it('history denial never enables writing',async()=>{
 render(<MathReviewHistory reader={new StoredMathQualityReader({rpc:async()=>{throw Error('42501')}})} detail={detail}/>);await screen.findByRole('alert');expect(screen.getByRole('button',{name:'검수 기록 저장'})).toBeDisabled();
});
