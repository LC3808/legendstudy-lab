// @vitest-environment jsdom
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {AdminRecoveryOperations} from './admin-recovery-operations';
import {operationsFixture,recoveryRun} from '@/lib/admin/run-recovery.test-fixture';
const mock=vi.hoisted(()=>({read:vi.fn()}));
vi.mock('./admin-dashboard-view',()=>({useReadReport:(...args:unknown[])=>mock.read(...args)}));
const range={p_from:'2026-11-15T15:00:00Z',p_to:'2026-11-22T15:00:00Z'};
beforeEach(()=>{mock.read.mockReset();mock.read.mockReturnValue({data:operationsFixture()});});afterEach(cleanup);
it('uses authoritative totals rather than the capped attention rows; links exact request without date filters',()=>{render(<AdminRecoveryOperations range={range} refresh={2}/>);expect(screen.getByText('26건 · 전체 기간 · 보관 제외')).toBeInTheDocument();expect(screen.getByText('3건 · 전체 기간 · 시각 미기록 제외')).toBeInTheDocument();expect(screen.getByText('0건 · 선택 기간 완료 기준')).toBeInTheDocument();const href=screen.getByRole('link',{name:'첨삭 복구·완료 진단'}).getAttribute('href');expect(href).toBe(`/admin/essay-runs/?visibility=all&run=${recoveryRun}&recovery=1`);expect(screen.getByText(/재진행 접수 · 완료 대기/)).toBeInTheDocument();expect(mock.read).toHaveBeenCalledWith('admin_lab_recovery_operations',range,2);});
it('retains all-time attention while explicitly using seven-day recovery history for an all-time selection',()=>{render(<AdminRecoveryOperations range={{p_from:null,p_to:null}}/>);expect(screen.getByText('26건 · 전체 기간 · 보관 제외')).toBeInTheDocument();expect(screen.getByText('0건 · 최근 7일 완료 기준')).toBeInTheDocument();const args=mock.read.mock.calls[0][1];expect(args.p_from).toBeTruthy();expect(args.p_to).toBeTruthy();expect(Date.parse(args.p_to)-Date.parse(args.p_from)).toBe(7*86400000);});
it('reloads independently and keeps errors isolated from existing metrics',()=>{const view=render(<AdminRecoveryOperations range={range}/>);fireEvent.click(screen.getByRole('button',{name:'복구 현황 새로고침'}));expect(mock.read).toHaveBeenLastCalledWith('admin_lab_recovery_operations',range,1);mock.read.mockReturnValue({error:true});view.rerender(<AdminRecoveryOperations range={range}/>);expect(screen.getByRole('alert')).toHaveTextContent('기존 첨삭 현황은 별도로');expect(screen.queryByText(/0건/)).not.toBeInTheDocument();});
