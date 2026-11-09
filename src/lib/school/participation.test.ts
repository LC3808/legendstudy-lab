import {expect, it, describe} from 'vitest';
import {parseSchoolCard, parseSchoolRanking} from './participation';

describe('parseSchoolCard', () => {
  it('parses a school-present card', () => {
    const card = parseSchoolCard({
      version:'student-school-card-v1', has_school:true,
      office_code:'B10', school_code:'7010001', registered_users:12,
      active_users_7d:5, week_ms:3600000, rank:42, as_of:'2026-11-09T00:00:00Z',
    });
    expect(card.hasSchool).toBe(true);
    if(card.hasSchool){ expect(card.registeredUsers).toBe(12); expect(card.weekMs).toBe(3600000); expect(card.rank).toBe(42); }
  });
  it('parses a no-school card and a null rank', () => {
    expect(parseSchoolCard({version:'student-school-card-v1', has_school:false}).hasSchool).toBe(false);
    const c = parseSchoolCard({version:'student-school-card-v1', has_school:true, office_code:'B10', school_code:'x', registered_users:1, active_users_7d:0, week_ms:0, rank:null, as_of:'t'});
    if(c.hasSchool) expect(c.rank).toBeNull();
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
  it('accepts a null my_school', () => {
    const r = parseSchoolRanking({version:'student-school-ranking-v1', metric:'average', period:'month', min_users:5, school_count:0, as_of:'t', top:[], around:[], my_school:null});
    expect(r.mySchool).toBeNull();
  });
  it('rejects bad metric/period/shape', () => {
    expect(()=>parseSchoolRanking({version:'student-school-ranking-v1', metric:'bogus', period:'week', min_users:5, school_count:0, as_of:'t', top:[], around:[], my_school:null})).toThrow('MALFORMED');
    expect(()=>parseSchoolRanking({version:'student-school-ranking-v1', metric:'total', period:'decade', min_users:5, school_count:0, as_of:'t', top:[], around:[], my_school:null})).toThrow('MALFORMED');
    expect(()=>parseSchoolRanking({version:'student-school-ranking-v1', metric:'total', period:'week', min_users:5, school_count:0, as_of:'t', top:'x', around:[], my_school:null})).toThrow('MALFORMED');
  });
});
