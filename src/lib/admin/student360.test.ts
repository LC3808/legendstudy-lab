import {it,expect} from 'vitest';
import {parseStudent360} from './student360';
const payload={version:'student360-v1',as_of:'2026-10-08T10:00:00Z',identity:{academic_status:'student'},academic_performance:null,period_entitlement:null,
 study:{version:'study-summary-v1',as_of:'2026-10-08T10:00:00Z',timezone:'Asia/Seoul',unit:'milliseconds',source:'completed_synced_sessions',record_count:0,today_ms:0,week_ms:0,last30_ms:0,daily7:Array.from({length:7},(_,i)=>({date:`2026-10-0${i+2}`,milliseconds:0}))},
 applications:{version:'applications-v1',offset:0,has_more:false,items:[]},essay:{version:'essay-summary-v1',has_more_sessions:false,has_more_evaluations:false,sessions:[],evaluations:[]}};
it('preserves real empty data and status without fabricating entitlement/performance',()=>{const r=parseStudent360(payload);expect(r.status).toBe('student');expect(r.study.today_ms).toBe(0);expect(r.essay.sessions).toEqual([]);});
it('fails closed on unknown contracts and invalid totals/status',()=>{for(const p of [{...payload,version:'unknown'},{...payload,identity:{academic_status:'super_student'}},{...payload,study:{...payload.study,today_ms:null}},{...payload,period_entitlement:{active:true}}])expect(()=>parseStudent360(p)).toThrow('MALFORMED_RESPONSE');});
