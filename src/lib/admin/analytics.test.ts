import {describe,it,expect} from 'vitest';
import {analyticsWindow,parseAnalytics} from './analytics';
const kpi={version:'analytics-kpi-v1',active_learners:{basis:'server_learning_activity',dau:0,wau:2,mau:3},new_signups:2,completed_eval_users:1,free_eval_completed_users:1,eval_success_rate:null};
describe('existing Analytics v1 display contract',()=>{
 it('distinguishes zero activity from unknown success rate',()=>{const r=parseAnalytics('kpi',kpi);expect(r.metrics[0].value).toBe(0);expect(r.metrics.at(-1)?.value).toBeNull();expect(r.note).toContain('GA4 방문자 수가 아닙니다');});
 it('does not invent missing metrics',()=>{expect(()=>parseAnalytics('kpi',{...kpi,new_signups:undefined})).toThrow();expect(()=>parseAnalytics('kpi',{...kpi,version:'v2'})).toThrow();});
 it('rejects a changed activity definition',()=>expect(()=>parseAnalytics('kpi',{...kpi,active_learners:{...kpi.active_learners,basis:'page_view'}})).toThrow());
 it('uses Korean midnight independent of browser zone',()=>expect(analyticsWindow('today','','',new Date('2026-11-01T15:01:00Z'))).toEqual({p_from:'2026-11-01T15:00:00.000Z',p_to:'2026-11-02T15:00:00.000Z'}));
 it('rejects all time and windows above RPC maximum',()=>{expect(analyticsWindow('all')).toBeNull();expect(analyticsWindow('custom','2024-01-01','2026-01-01')).toBeNull();});
 it('preserves cohort counts without treating them as sequential conversions',()=>{const stages=['signup','first_submit','first_eval_completed','rewrite_submit','full_loop_nsm'].map((key,i)=>({key,count:5-i}));const r=parseAnalytics('funnel',{version:'analytics-funnel-v1',stages});expect(r.metrics.map(m=>m.value)).toEqual([5,4,3,2,1]);expect(r.note).toContain('전체 기간');expect(()=>parseAnalytics('funnel',{version:'analytics-funnel-v1',stages:[...stages.slice(0,4),stages[0]]})).toThrow();});
 it('rejects TEST or foreign currency revenue rather than mixing ledgers',()=>{expect(()=>parseAnalytics('revenue',{version:'analytics-revenue-v1',currency:'USD',mode:'LIVE'})).toThrow();expect(()=>parseAnalytics('revenue',{version:'analytics-revenue-v1',currency:'KRW',mode:'TEST'})).toThrow();});
 it('preserves negative net revenue and separates credit restoration',()=>{const r=parseAnalytics('revenue',{version:'analytics-revenue-v1',currency:'KRW',mode:'LIVE',buyers:1,paid_orders:1,gross_revenue:100,refunded:200,net_revenue:-100,arppu:100,excluded_currency_orders:2,credit_released_units:1,credit_refunded_units:3});expect(r.metrics.find(m=>m.label==='순매출')?.value).toBe(-100);expect(r.metrics.at(-1)?.value).toBe(3);});
});

it('does not turn legacy binary satisfaction or empty ratings into an average',()=>{
 const raw={version:'essay-satisfaction-v2',basis:'submitted_feedback',stats:{average:null,rated:0,legacy_binary:12,reports:0,resolved_reports:0},distribution:[1,2,3,4,5].map(rating=>({rating,count:0}))};
 expect(parseAnalytics('satisfaction',raw).metrics[0].value).toBeNull();
 expect(()=>parseAnalytics('satisfaction',{...raw,stats:{...raw.stats,average:6}})).toThrow();
 expect(()=>parseAnalytics('satisfaction',{...raw,distribution:[1,1,2,3,4].map(rating=>({rating,count:0}))})).toThrow();
});
