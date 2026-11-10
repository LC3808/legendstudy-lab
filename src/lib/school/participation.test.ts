import {expect, it, describe} from 'vitest';
import {parseSchoolCard, parseSchoolRanking} from './participation';

describe('parseSchoolCard', () => {
  it('parses an open-ranking card (recorders >= threshold)', () => {
    const card = parseSchoolCard({
      version:'student-school-card-v1', has_school:true,
      office_code:'B10', school_code:'7010001', registered_users:12,
      active_users_7d:5, min_recorders:3, week_recorders:5, recorders_needed:0,
      week_ms:3600000, rank:42, as_of:'2026-11-09T00:00:00Z',
    });
    expect(card.hasSchool).toBe(true);
    if(card.hasSchool){ expect(card.registeredUsers).toBe(12); expect(card.weekMs).toBe(3600000); expect(card.rank).toBe(42); expect(card.recordersNeeded).toBe(0); }
  });
  it('parses a locked card: null week_ms/rank + recorders_needed', () => {
    const c = parseSchoolCard({version:'student-school-card-v1', has_school:true, office_code:'B10', school_code:'x', registered_users:2, active_users_7d:1, min_recorders:3, week_recorders:1, recorders_needed:2, week_ms:null, rank:null, as_of:'t'});
    expect(c.hasSchool).toBe(true);
    if(c.hasSchool){ expect(c.weekMs).toBeNull(); expect(c.rank).toBeNull(); expect(c.recordersNeeded).toBe(2); expect(c.weekRecorders).toBe(1); }
  });
  it('parses a no-school card', () => {
    expect(parseSchoolCard({version:'student-school-card-v1', has_school:false}).hasSchool).toBe(false);
  });
  it('rejects a wrong version or malformed payload', () => {
    expect(()=>parseSchoolCard({version:'other'})).toThrow('MALFORMED');
    expect(()=>parseSchoolCard(null)).toThrow('MALFORMED');
    expect(()=>parseSchoolCard({version:'student-school-card-v1', has_school:true, office_code:'B10'})).toThrow('MALFORMED');
  });
});

describe('parseSchoolRanking', () => {
  const row = (rank:number) => ({office_code:'B10', school_code:'s'+rank, registered_users:10, active_users:6, ms:1000*rank, avg_ms:166*rank, rank});
  it('parses top/my/around with validation', () => {
    const r = parseSchoolRanking({
      version:'student-school-ranking-v1', metric:'total', period:'week', min_users:5,
      school_count:3, as_of:'t', top:[row(1),row(2)], around:[row(2)], my_school:row(2),
    });
    expect(r.metric).toBe('total'); expect(r.top).toHaveLength(2);
    expect(r.mySchool?.rank).toBe(2); expect(r.schoolCount).toBe(3);
  });
  it('accepts suppressed ms/avg_ms (below public min-recorder threshold)', () => {
    const r = parseSchoolRanking({
      version:'student-school-ranking-v1', metric:'registered', period:'week', min_users:5, min_recorders:3,
      school_count:1, as_of:'t', my_school:null, around:[],
      top:[{office_code:'B10', school_code:'s', registered_users:2, active_users:1, ms:null, avg_ms:null, rank:1}],
    });
    expect(r.top[0].ms).toBeNull();
    expect(r.top[0].avgMs).toBeNull();
    expect(r.top[0].registeredUsers).toBe(2);
  });
  it('accepts a masked (null) registered count for other schools; own school keeps the real value', () => {
    const r = parseSchoolRanking({
      version:'student-school-ranking-v1', metric:'registered', period:'week', min_users:3, min_recorders:3,
      school_count:2, as_of:'t', my_school:{office_code:'B10', school_code:'mine', registered_users:3, active_users:3, ms:null, avg_ms:null, rank:2},
      top:[
        {office_code:'B10', school_code:'other', registered_users:null, active_users:4, ms:null, avg_ms:null, rank:1},
        {office_code:'B10', school_code:'mine', registered_users:3, active_users:3, ms:null, avg_ms:null, rank:2},
      ], around:[],
    });
    expect(r.top[0].registeredUsers).toBeNull();   // other school masked, not 0
    expect(r.top[1].registeredUsers).toBe(3);      // own school real value
    expect(r.mySchool?.registeredUsers).toBe(3);
  });
  it('accepts a null my_school', () => {
    const r = parseSchoolRanking({version:'student-school-ranking-v1', metric:'average', period:'month', min_users:3, school_count:0, as_of:'t', top:[], around:[], my_school:null});
    expect(r.mySchool).toBeNull();
  });
  it('rejects bad metric/period/shape', () => {
    expect(()=>parseSchoolRanking({version:'student-school-ranking-v1', metric:'bogus', period:'week', min_users:5, school_count:0, as_of:'t', top:[], around:[], my_school:null})).toThrow('MALFORMED');
    expect(()=>parseSchoolRanking({version:'student-school-ranking-v1', metric:'total', period:'decade', min_users:5, school_count:0, as_of:'t', top:[], around:[], my_school:null})).toThrow('MALFORMED');
    expect(()=>parseSchoolRanking({version:'student-school-ranking-v1', metric:'total', period:'week', min_users:5, school_count:0, as_of:'t', top:'x', around:[], my_school:null})).toThrow('MALFORMED');
  });
});
