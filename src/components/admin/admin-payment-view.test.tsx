// @vitest-environment jsdom
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {AdminReleaseReport} from './admin-release-report';
const fixture=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('../auth-context',()=>({useAuth:()=>({client:{rpc:fixture.rpc,auth:{getSession:async()=>({data:{session:{user:{id:'operator'}}}})}}})}));
afterEach(()=>{cleanup();fixture.rpc.mockReset();});
it('combines server filters and whole-result totals beyond one page',async()=>{
 fixture.rpc.mockResolvedValue({data:{version:'admin-release-v1',kind:'payment',as_of:'2026-10-24T00:00:00Z',total:61,rows:[{id:'one',sku:'sku-one',quantity:3,amount:3000,currency:'KRW',mode:'LIVE',state:'PAID',created_at:'2026-10-24T00:00:00Z'}],paid:[{mode:'LIVE',currency:'KRW',count:60,amount:180000},{mode:'TEST',currency:'KRW',count:1,amount:3000}]},error:null});
 const onState=vi.fn();render(<AdminReleaseReport kind="payment" onPaymentState={onState}/>);
 expect(await screen.findByText('전체 61건')).toBeVisible();
 expect(screen.getByText(/60건 · 180,000 KRW/)).toBeVisible();expect(screen.getByText(/1건 · 3,000 KRW/)).toBeVisible();
 fireEvent.change(screen.getByLabelText('상품'),{target:{value:'3'}});
 fireEvent.change(screen.getByLabelText('거래 상태'),{target:{value:'cancelled'}});
 expect(onState).toHaveBeenLastCalledWith('CANCELLED');
 fireEvent.change(screen.getByLabelText('기간'),{target:{value:'custom'}});
 fireEvent.change(screen.getByLabelText('시작일'),{target:{value:'2026-10-23'}});
 fireEvent.change(screen.getByLabelText('종료일'),{target:{value:'2026-10-23'}});
 await waitFor(()=>expect(fixture.rpc).toHaveBeenLastCalledWith('admin_release_report',{p:expect.objectContaining({kind:'payment',quantity:3,state:'cancelled',from:'2026-10-22T15:00:00.000Z',to:'2026-10-23T15:00:00.000Z',offset:0,limit:5})}));
 await screen.findByText('전체 61건');fireEvent.click(screen.getByRole('button',{name:'다음'}));
 await waitFor(()=>expect(fixture.rpc.mock.calls.at(-1)?.[1].p.offset).toBe(5));
});
it('rejects missing totals rather than rendering zero',async()=>{
 fixture.rpc.mockResolvedValue({data:{version:'admin-release-v1',kind:'payment',as_of:'2026-10-24',rows:[],paid:[]},error:null});
 render(<AdminReleaseReport kind="payment"/>);
 expect(await screen.findByRole('button',{name:'다시 시도'})).toBeVisible();
 expect(screen.queryByText('전체 0건')).toBeNull();
});
it('pages credit records by five and explains the reservation lifecycle',async()=>{
 fixture.rpc.mockImplementation(async(_name:string,{p}:{p:{offset:number;limit:number}})=>({data:{version:'admin-release-v1',kind:'credit',as_of:'2026-10-25',total:12,balance_delta:-1,reserved_delta:0,rows:Array.from({length:p.limit},(_,i)=>({id:String(p.offset+i),created_at:'2026-10-24T00:00:00Z',origin:'admin_grant',transaction_type:i%2?'consume':'reserve',balance_delta:i%2?-1:0,reserved_delta:i%2?-1:1}))},error:null}));
 const {container}=render(<AdminReleaseReport kind="credit"/>);
 await screen.findByText('전체 12건');expect(container.querySelectorAll('.admin-order')).toHaveLength(5);
 expect(screen.getAllByText(/첨삭 사용 대기 · 출처/).length).toBeGreaterThan(0);
 fireEvent.click(screen.getByRole('button',{name:'다음'}));
 await waitFor(()=>expect(fixture.rpc).toHaveBeenLastCalledWith('admin_release_report',{p:expect.objectContaining({limit:5,offset:5})}));
});
