import {it,expect,vi} from 'vitest';
import {requestEssayReservation,ReservationRejected} from './reservation';
it.each([402,422] as const)('only translates matching SQL rejection %s',async status=>{
 const request=vi.fn(async()=>Response.json({code:`PT${status}`,message:'private diagnostic'},{status}));
 await expect(requestEssayReservation(request,'synthetic',{})).rejects.toEqual(new ReservationRejected(status));
 expect(request.mock.calls).toHaveLength(1);
});
it.each([{status:402,body:{code:'PT422'}},{status:422,body:{}},{status:500,body:{code:'PT402'}}])('unknown errors are not declared released: $status',async({status,body})=>{
 await expect(requestEssayReservation(async()=>Response.json(body,{status}),'synthetic',{})).rejects.toThrow('RESERVATION_STATUS_UNKNOWN');
});
it('retains successful ID and propagates network ambiguity',async()=>{
 await expect(requestEssayReservation(async()=>Response.json('evaluation-id'),'synthetic',{})).resolves.toBe('evaluation-id');
 await expect(requestEssayReservation(async()=>{throw Error('timeout');},'synthetic',{})).rejects.toThrow('timeout');
});
