import {afterEach,expect,it,vi} from 'vitest';
import {lookupSchoolName} from './school';
import {resolveSchoolName,clearSchoolResolutionCache} from './school-resolution';
vi.mock('./school',()=>({lookupSchoolName:vi.fn()}));
afterEach(()=>{clearSchoolResolutionCache();vi.resetAllMocks();});
it('deduplicates school identities across members and reuses names',async()=>{
 vi.mocked(lookupSchoolName).mockResolvedValue('새학교');
 const a=resolveSchoolName('B10','1'),b=resolveSchoolName('B10','1');
 expect(a).toBe(b);expect(await a).toBe('새학교');await resolveSchoolName('B10','1');expect(lookupSchoolName).toHaveBeenCalledTimes(1);
});
it('does not permanently cache a failure and permits explicit retry',async()=>{
 vi.mocked(lookupSchoolName).mockRejectedValueOnce(Error('offline')).mockResolvedValue('복구학교');
 expect(await resolveSchoolName('B10','2')).toBeNull();expect(await resolveSchoolName('B10','2',true)).toBe('복구학교');
});
it('limits concurrent lookups to four',async()=>{
 let active=0,max=0;vi.mocked(lookupSchoolName).mockImplementation(async()=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,2));active--;return '학교';});
 await Promise.all(Array.from({length:20},(_,i)=>resolveSchoolName('B10',String(i))));expect(max).toBe(4);
});
