import {describe,it,expect} from 'vitest';
import {parseLearningAnalytics} from './learning-analytics';
import {ADMIN_GROUPS,ADMIN_NAV} from './navigation';
const value={version:'admin-learning-analytics-v1',as_of:'2026-11-01T00:00:00Z',from:'2026-10-01T00:00:00Z',to:'2026-11-01T00:00:00Z',timezone:'Asia/Seoul',minimum_sample:5,state:'EMPTY',metrics:{targets:null,saved:null,recent:null,applications:null,study_users:null,study_ms:null},rows:[]};
describe('learning report',()=>{
 it('preserves missing values rather than coercing to zero',()=>expect(parseLearningAnalytics(value).metrics.study_ms).toBeNull());
 it.each([{}, {...value,metrics:{}},{...value,metrics:{...value.metrics,study_ms:-1}},{...value,rows:[{kind:'targets',label:'x',users:0,records:4}]},{...value,as_of:'unknown'}])('rejects incompatible or invalid responses',v=>expect(()=>parseLearningAnalytics(v)).toThrow());
 it('accepts all recorded cohorts',()=>expect(parseLearningAnalytics({...value,state:'READY',rows:[{kind:'saved',label:'자료',users:1,records:1}]}).rows).toHaveLength(1));
 it('all groups resolve real unique routes',()=>{const keys=ADMIN_GROUPS.flatMap(g=>[...g.keys]);expect(new Set(keys).size).toBe(keys.length);for(const key of keys){expect(ADMIN_NAV.find(n=>n.key===key)?.href).toMatch(/^\/(admin|ql)/);}expect(ADMIN_NAV.length).toBeGreaterThanOrEqual(keys.length);});
});
