import {it,expect} from 'vitest';
import {periodBounds} from './period';
it('uses Korean day boundaries and inclusive custom final day',()=>{
 const now=new Date('2026-10-24T16:00:00Z');
 expect(periodBounds('today','','',now)).toEqual({from:Date.parse('2026-10-24T15:00:00Z'),to:Date.parse('2026-10-25T15:00:00Z')});
 expect(periodBounds('custom','2026-10-01','2026-10-24')).toEqual({from:Date.parse('2026-09-30T15:00:00Z'),to:Date.parse('2026-10-24T15:00:00Z')});
 expect(periodBounds('custom','2026-10-25','2026-10-24')).toBeNull();expect(periodBounds('custom')).toBeNull();
});
it('covers seven calendar dates and current month',()=>{
 const now=new Date('2026-10-24T01:00:00Z');
 expect(periodBounds('d7','','',now)!.from).toBe(Date.parse('2026-10-18T00:00:00+09:00'));
 expect(periodBounds('month','','',now)!.from).toBe(Date.parse('2026-10-01T00:00:00+09:00'));
});
