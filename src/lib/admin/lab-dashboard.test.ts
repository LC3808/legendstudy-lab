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
