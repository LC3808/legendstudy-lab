import {it,expect,vi} from 'vitest';
import {nameSchoolDistribution} from './school-distribution';
import {lookupSchoolName} from './school';
vi.mock('./school',()=>({lookupSchoolName:vi.fn()}));
it('resolves distinct office/school pairs once, preserving aggregate counts and caching names',async()=>{
 vi.mocked(lookupSchoolName).mockImplementation(async(o)=>o==='B10'?'첫학교':'둘째학교');
 const rows=[{key:'pair',officeCode:'B10',count:23},{key:'pair',officeCode:'J10',count:7}];
 const first=await nameSchoolDistribution(rows);expect(first.map(r=>r.label)).toEqual(['첫학교','둘째학교']);expect(first.map(r=>r.count)).toEqual([23,7]);
 await nameSchoolDistribution(rows);expect(lookupSchoolName).toHaveBeenCalledTimes(2);
});
it('never labels a code as a name and never queries missing office identity',async()=>{
 vi.mocked(lookupSchoolName).mockClear().mockRejectedValue(new Error('unavailable'));
 const rows=await nameSchoolDistribution([{key:'123',count:8},{key:'456',officeCode:'B10',count:3}]);
 expect(rows.map(r=>r.label)).toEqual(['학교명 확인 필요','학교명 확인 필요']);expect(lookupSchoolName).toHaveBeenCalledTimes(1);
});
it('bounds requests to twenty aggregate identities, independent of member counts',async()=>{
 vi.mocked(lookupSchoolName).mockClear().mockResolvedValue('학교');
 const rows=await nameSchoolDistribution(Array.from({length:100},(_,i)=>({key:`bounded-${i}`,officeCode:'B10',count:10000})));
 expect(rows).toHaveLength(20);expect(lookupSchoolName).toHaveBeenCalledTimes(20);
});
