import {describe,it,expect} from 'vitest';
import {betaInput,kstInput} from './beta';
import {parseBetaCredit} from '@/components/essay-beta-credit';
describe('beta operations contract',()=>{
 const form=()=>{const f=new FormData();for(const [k,v] of Object.entries({start:'2026-11-01T00:00',end:'2026-11-11T00:00',limit:'2',application:'next_reset',enabled:'on'}))f.set(k,v);return f;};
 it('sends explicit KST instants, server limit and next reset policy',()=>{expect(betaInput(form())).toEqual({beta_enabled:true,beta_start_at:'2026-10-31T15:00:00.000Z',beta_end_at:'2026-11-10T15:00:00.000Z',daily_free_limit:2,reset_timezone:'Asia/Seoul',limit_application:'next_reset'});expect(kstInput('2026-11-10T15:00:00Z')).toBe('2026-11-11T00:00');});
 it.each(['0','101','1.5','NaN'])('rejects invalid allowance %s',v=>{const f=form();f.set('limit',v);expect(()=>betaInput(f)).toThrow();});
 it('rejects reversed window',()=>{const f=form();f.set('end','2026-10-31T00:00');expect(()=>betaInput(f)).toThrow();});
 it('variable daily quota remains separate and validates availability',()=>{const v={version:'essay-beta-credit-v2',active:true,status:'active',grant_id:'g',day:'2026-11-10',available:2,daily_limit:2,expires_at:'2026-11-10T15:00:00Z',ends_at:'2026-11-10T15:00:00Z',campaign_id:'c',policy_version:'daily-v2',notice_id:null,notice_seen:true};expect(parseBetaCredit(v)).toEqual(v);expect(parseBetaCredit({...v,daily_limit:1})).toBeNull();expect(parseBetaCredit({...v,daily_limit:undefined})).toBeNull();});
});
