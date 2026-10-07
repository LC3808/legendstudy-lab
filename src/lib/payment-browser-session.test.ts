import { afterEach, expect, it, vi } from 'vitest';
const getSession=vi.hoisted(()=>vi.fn());
vi.mock('./browser-auth-client',()=>({getBrowserAuthClient:()=>({auth:{getSession}})}));
import { paymentSessionToken } from './payment-browser-session';
afterEach(()=>{vi.useRealTimers();vi.clearAllMocks();});
it('fails after three seconds when the session is absent',async()=>{
 vi.useFakeTimers();getSession.mockResolvedValue({data:{session:null}});
 const result=expect(paymentSessionToken()).rejects.toThrow('SESSION_UNAVAILABLE');
 await vi.advanceTimersByTimeAsync(3000);await result;
 const count=getSession.mock.calls.length;await vi.advanceTimersByTimeAsync(1000);
 expect(getSession).toHaveBeenCalledTimes(count);expect(count).toBeLessThanOrEqual(20);
});
it('bounds a stalled initialization too',async()=>{
 vi.useFakeTimers();getSession.mockImplementation(()=>new Promise(()=>{}));
 const result=expect(paymentSessionToken()).rejects.toThrow('SESSION_UNAVAILABLE');
 await vi.advanceTimersByTimeAsync(3000);await result;expect(getSession).toHaveBeenCalledTimes(1);
});
