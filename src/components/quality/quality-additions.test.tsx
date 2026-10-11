// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { QualityBack } from './quality-back';
import { MathQualityRead } from './math-quality-read';
import { ScoreLabLanding } from '../score-lab-landing';
const router = vi.hoisted(() => ({ back: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
beforeEach(() => vi.clearAllMocks());
it('direct entry with unrelated history returns to admin', () => {
    Object.defineProperty(document, 'referrer', { configurable: true, value: 'https://external.example/' });
    Object.defineProperty(history, 'length', { configurable: true, value: 5 });
    render(<QualityBack />);
    fireEvent.click(screen.getByRole('button', { name: '← 뒤로가기' }));
    expect(router.replace).toHaveBeenCalledWith('/admin/');
    expect(router.back).not.toHaveBeenCalled();
});
it('same-origin history uses back', () => {
    Object.defineProperty(document, 'referrer', { configurable: true, value: location.origin + '/admin/' });
    Object.defineProperty(history, 'length', { configurable: true, value: 2 });
    render(<QualityBack />);
    fireEvent.click(screen.getByRole('button', { name: '← 뒤로가기' }));
    expect(router.back).toHaveBeenCalledOnce();
});
for (const exam of [false, true])
    it(`preview disabled and has no account link ${exam}`, () => {
        render(<ScoreLabLanding exam={exam}/>);
        expect(screen.getByRole('button', { name: '서비스 준비 중' })).toBeDisabled();
        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.getByRole('heading', { name: exam ? '수능 LAB' : '내신 LAB' })).toBeVisible();
    });
const rows = [{ evaluation_id: 'revised', completed_at: '2026-10-10T10:00:00Z', leaf_id: 'leaf' }, { evaluation_id: 'first', completed_at: '2026-10-09T10:00:00Z', leaf_id: 'leaf' }];
function fakeClient(metadata = false) {
    return { rpc: vi.fn(async (_fn: string, { p_request: r }: {
            p_request: {
                action: string;
                payload: Record<string, unknown>;
            };
        }) => {
            let result: unknown;
            if (r.action === 'list')
                result = { dto_version: 'qlm-read-v1', cases: rows };
            else if (r.action === 'review_state')
                result = { dto_version: 'hq-math-read-v1', cases: rows.map((x, i) => ({ math_evaluation_id: x.evaluation_id, availability: 'AVAILABLE', human_review_state: i ? 'REVIEWED_ACCEPTABLE' : 'UNREVIEWED' })) };
            else if (r.action === 'history') result = {dto_version:'hq-math-read-v1',judgments:[],next_cursor:null};
            else
                result = { dto_version: 'qlm-read-v1', evaluation_id: r.payload.evaluation_id, typed_answer: r.payload.evaluation_id === 'first' ? 'First stored answer' : 'Revised stored answer', prior_evaluation_id: r.payload.evaluation_id === 'revised' ? 'first' : null, output: { overall: { explanation: 'Stored provider result' } }, leaf: { statement: 'Original question' } };
            if(metadata&&r.action==='detail'){
                const d=result as Record<string,unknown>,id=String(r.payload.evaluation_id),revised=id==='revised';
                Object.assign(d,{attempt_id:'attempt-'+id,leaf_id:'leaf',profile_id:'profile',profile:{rubric_version:'v1'},problem:{id:'problem'},quality_metadata:{version:'quality-metadata-v1',student_reference:'qs1_'+ 'a'.repeat(64),attempt_id:'attempt-'+id,root_attempt_id:'attempt-first',lineage_id:'attempt-first',predecessor_attempt_id:revised?'attempt-first':null,prior_evaluation_id:revised?'first':null,relationship_state:revised?'LINKED':'ROOT',problem_id:'problem',problem_set_id:'set',problem_label:'Stored question label',leaf_id:'leaf',evaluation_profile_id:'profile',rubric_version:'v1',exam_metadata_verified:false,university_name:null,academic_year:null}});
            }
            return { data: { dto_version: 'qlm-runtime-v1', action: r.action, result }, error: null };
        }) };
}
describe('stored Math quality read-only integration', () => {
    it('reads actual wire shape, filters unreviewed and compares linked prior detail without writes', async () => {
        const c = fakeClient();
        render(<MathQualityRead client={c as unknown as SupabaseClient}/>);
        await screen.findByRole('button', { name: /평가 revised/ });
        expect(screen.getAllByRole('heading',{name:'사용자: 확인되지 않음'}).length).toBeGreaterThan(0);
        expect(screen.queryByText(/가명 사용자 [a-f0-9]{12}/)).toBeNull();
        fireEvent.click(screen.getByRole('checkbox'));
        expect(screen.queryByRole('button', { name: /평가 first/ })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: '다음 미검토' }));
        await screen.findByRole('heading', { name: '최초 답안과 첨삭' });
        expect(screen.getByRole('heading', { name: '재작성 답안과 재첨삭' })).toBeVisible();
        expect(screen.getAllByText('First stored answer').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Revised stored answer').length).toBeGreaterThan(0);
        expect(c.rpc.mock.calls.every(([fn, { p_request }]) => fn === 'qlm_quality' && ['list', 'detail', 'review_state', 'history'].includes(p_request.action))).toBe(true);
    });
    it('denial fails closed without invented empty-list success', async () => {
        const c = { rpc: vi.fn(async () => ({ data: null, error: { code: '42501' } })) };
        render(<MathQualityRead client={c as unknown as SupabaseClient}/>);
        await screen.findByRole('alert');
        expect(screen.queryByText('현재 조건에 맞는 수리논술 평가가 없습니다.')).toBeNull();
    });
    it('unmounted detail cannot display after account or source switch', async () => {
        const c = fakeClient();
        const { unmount } = render(<MathQualityRead client={c as unknown as SupabaseClient}/>);
        await screen.findByRole('button', { name: /평가 revised/ });
        unmount();
        await waitFor(() => expect(screen.queryByRole('main')).toBeNull());
    });
});

it('renders server pseudonym, independent lineage and unverified exam state',async()=>{
 const c=fakeClient(true);render(<MathQualityRead client={c as unknown as SupabaseClient}/>);
 await screen.findByRole('heading',{name:'가명 사용자 aaaaaaaaaaaa'});
 expect(screen.getAllByRole('heading',{name:/답안 과정/})).toHaveLength(1);
 fireEvent.click(screen.getByRole('button',{name:/평가 revised/}));
 await screen.findByRole('heading',{name:'최초 답안과 첨삭'});
 expect(screen.getByText('대학 미확인 · 학년도 미확인')).toBeVisible();
 expect(c.rpc.mock.calls.every(([, {p_request}])=>p_request.action!=='submit')).toBe(true);
});
