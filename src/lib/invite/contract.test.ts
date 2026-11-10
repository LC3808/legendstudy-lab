import {expect, it, describe} from 'vitest';
import {isInviteToken, parseInviteLookup, parseInvitePerformance, inviteUrl} from './contract';

const TOKEN='a'.repeat(64);

describe('invite token', () => {
  it('validates the opaque 64-hex token shape', () => {
    expect(isInviteToken(TOKEN)).toBe(true);
    expect(isInviteToken('short')).toBe(false);
    expect(isInviteToken('g'.repeat(64))).toBe(false); // non-hex
    expect(isInviteToken(null)).toBe(false);
  });
  it('builds an invite URL carrying only the token (no PII)', () => {
    const url = inviteUrl(TOKEN);
    expect(url).toBe(`https://lab.legendstudy.com/invite/?t=${TOKEN}`);
    expect(url).not.toMatch(/@|uuid|user/i);
  });
});

describe('parseInviteLookup', () => {
  it('parses a valid lookup with a school', () => {
    const r = parseInviteLookup({version:'invite-lookup-v1', valid:true, office_code:'J10', school_code:'7530851', has_school:true, campaign:'school_rank'});
    expect(r.valid).toBe(true);
    if(r.valid){ expect(r.officeCode).toBe('J10'); expect(r.hasSchool).toBe(true); expect(r.campaign).toBe('school_rank'); }
  });
  it('parses a valid lookup without a school (null codes)', () => {
    const r = parseInviteLookup({version:'invite-lookup-v1', valid:true, office_code:null, school_code:null, has_school:false, campaign:'school_rank'});
    if(r.valid){ expect(r.officeCode).toBeNull(); expect(r.hasSchool).toBe(false); }
  });
  it('maps invalid reasons and defaults unknown to error', () => {
    expect(parseInviteLookup({valid:false, reason:'expired'})).toEqual({valid:false, reason:'expired'});
    expect(parseInviteLookup({valid:false, reason:'weird'})).toEqual({valid:false, reason:'error'});
    expect(parseInviteLookup({valid:false})).toEqual({valid:false, reason:'error'});
  });
});

describe('parseInvitePerformance', () => {
  it('parses the inviter performance counts incl. d7 eligibility denominator', () => {
    const p = parseInvitePerformance({version:'invite-perf-v1', tokens:3, visits:10, signups:4, first_study:2, d7_eligible:3, d7_retained:1});
    expect(p).toEqual({tokens:3, visits:10, signups:4, firstStudy:2, d7Eligible:3, d7Retained:1});
  });
  it('rejects malformed payloads', () => {
    expect(()=>parseInvitePerformance({tokens:'x', visits:0, signups:0, first_study:0, d7_eligible:0, d7_retained:0})).toThrow('MALFORMED');
    expect(()=>parseInvitePerformance(null)).toThrow('MALFORMED');
  });
});
