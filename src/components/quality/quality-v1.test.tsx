// @vitest-environment jsdom
import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {QualityV1} from './quality-v1';
import report from '../../../functions/_data/quality-report.json';
vi.mock('../admin/admin-surface',()=>({AdminFrame:({children}:{children:React.ReactNode})=><>{children}</>}));
vi.mock('@/lib/quality/console-v1',async()=>{const actual=await vi.importActual<typeof import('@/lib/quality/console-v1')>('@/lib/quality/console-v1');return {...actual,loadQualityReport:vi.fn().mockImplementation(async()=> (await import('../../../functions/_data/quality-report.json')).default),loadCensus:vi.fn().mockResolvedValue([{run_id:'one',question_id:'q1',exam_id:'e',state:'completed',reviewed:false,created_at:'2026-11-25',parent_id:null}])};});
it('distinguishes review presence from quality pass and exposes complete protected report',async()=>{window.history.replaceState({},'','/ql/');render(<QualityV1 client={{} as SupabaseClient} source="exam" onSource={vi.fn()}><p>existing review controls</p></QualityV1>);await screen.findAllByText('1문항');expect(screen.getAllByText('집계 불가').length).toBeGreaterThan(0);fireEvent.click(screen.getByRole('button',{name:'검증 보고서'}));await screen.findByText(report.sections[0].body);expect(screen.getByText(/Q01 대학별/)).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'첨삭 품질 검수'}));expect(screen.getByText('existing review controls')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'개선 이력'}));expect(screen.getByText('QC-01 · 잘한 점의 평가 요소 소제목')).toBeInTheDocument();});
