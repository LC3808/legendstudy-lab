import {it,expect} from 'vitest';
import {labDashboardRange,labDashboardHref,dashboardNumber} from './lab-dashboard';
it('uses KST calendar boundaries and preserves period/source/UUID deep links',()=>{
 const r=labDashboardRange('d7',new Date('2026-11-15T10:00:00Z'));
 expect(r).toEqual({p_from:'2026-11-08T15:00:00.000Z',p_to:'2026-11-15T15:00:00.000Z'});
 const url=new URL(labDashboardHref(r,'beta',{university:'actual-id'}),'https://example.test');
 expect(Object.fromEntries(url.searchParams)).toEqual({visibility:'all',university:'actual-id',source:'beta',from:'2026-11-09',to:'2026-11-15'});
 expect(labDashboardRange('all',new Date())).toEqual({p_from:null,p_to:null});
 expect(labDashboardHref(labDashboardRange('all',new Date()),'',{run:'uuid'})).toBe('/admin/essay-runs/?visibility=all&run=uuid');
});
it('keeps absent or invalid numbers distinct from zero',()=>{
 expect(dashboardNumber(0,'건')).toBe('0건');for(const x of [null,undefined,NaN,-1,'0'])expect(dashboardNumber(x)).toBe('확인 불가');
});

import {completionRate,durationLabel,activityDuration,memberLabel} from './lab-dashboard';
it('defines request-cohort completion rate and unknown/empty boundaries',()=>{
 expect(completionRate(9,8)).toBe('88.9%');expect(completionRate(0,0)).toBe('요청 없음');expect(completionRate(2,3)).toBe('확인 불가');expect(completionRate(null,0)).toBe('확인 불가');
 expect(durationLabel(535.195)).toBe('8분 55초');expect(durationLabel(59.6)).toBe('1분 0초');expect(durationLabel(null)).toBe('기록 없음');
});
it('marks only unfinished requests at fifteen minutes as review candidates',()=>{
 const r={state:'reserved',created_at:'2026-11-22T00:00:00Z',completed_at:null};
 expect(activityDuration(r,Date.parse('2026-11-22T00:14:59Z')).delayed).toBe(false);expect(activityDuration(r,Date.parse('2026-11-22T00:15:00Z')).delayed).toBe(true);
 expect(activityDuration({...r,state:'completed',completed_at:'2026-11-22T00:20:00Z'},Date.now())).toEqual({label:'20분 0초',delayed:false});
 expect(activityDuration({...r,created_at:'invalid'},Date.now()).label).toBe('확인 필요');expect(memberLabel('12345678-aaaa')).toBe('회원 12345678');
});
