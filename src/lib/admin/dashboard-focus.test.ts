import {describe,it,expect} from 'vitest';
import {periodBounds} from './period';
import {formatStudyTime} from './study-time';
describe('dashboard dates and durations',()=>{
 const now=new Date('2026-11-04T09:00:00Z');
 it.each([['today','2026-11-03T15:00:00.000Z'],['d7','2026-10-28T15:00:00.000Z'],['d30','2026-10-05T15:00:00.000Z'],['d90','2026-08-06T15:00:00.000Z'],['m6','2026-05-03T15:00:00.000Z'],['y1','2025-11-03T15:00:00.000Z']] as const)('uses KST %s', (period,start)=>{expect(new Date(periodBounds(period,'','',now)!.from).toISOString()).toBe(start);});
 it('clips month end without overflow',()=>expect(new Date(periodBounds('m6','','',new Date('2026-08-31T01:00:00Z'))!.from).toISOString()).toBe('2026-02-27T15:00:00.000Z'));
 it('formats missing, zero and partial minutes honestly',()=>{expect(formatStudyTime(null)).toBe('미확인');expect(formatStudyTime(0)).toBe('0시간 0분');expect(formatStudyTime(13457752)).toBe('3시간 44분');});
});
