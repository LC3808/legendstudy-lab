// @vitest-environment jsdom
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {PaymentRefundControl} from './payment-refund-control';
const OWNER='d5eab102-da92-4c4c-9adb-16d2c9d20e4c',ID='86f4d220-6527-4689-8723-52800802b2b6';
const auth=vi.hoisted(()=>({id:'d5eab102-da92-4c4c-9adb-16d2c9d20e4c'}));
vi.mock('../auth-context',()=>({useAuth:()=>({user:{id:auth.id},client:{auth:{getSession:async()=>({data:{session:{user:{id:auth.id},access_token:'synthetic'}}})}}})}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();auth.id=OWNER;});
const response=(eligible=true)=>Response.json({order:{id:ID,mode:'LIVE',state:'PAID'},preview:{refund_amount:4900,remaining:1,eligible}});
async function preview(){render(<PaymentRefundControl/>);fireEvent.change(screen.getByLabelText('환불할 주문 ID'),{target:{value:ID}});fireEvent.click(screen.getByText('환불 대상 확인'));await screen.findByText('환불 금액 4,900원 · 회수 이용권 1회');}
it('hides from other administrators',()=>{auth.id='other';render(<PaymentRefundControl/>);expect(screen.queryByText('환불 대상 확인')).toBeNull();});
it('inspection does not refund, and declined confirmation does not send',async()=>{const f=vi.fn().mockResolvedValue(response());vi.stubGlobal('fetch',f);vi.spyOn(window,'confirm').mockReturnValue(false);await preview();fireEvent.click(screen.getByText('환불 실행'));expect(f).toHaveBeenCalledTimes(1);expect(f.mock.calls[0][0]).toBe('/api/payments/support-inspect');});
it('blocks ineligible preview',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(false)));await preview();expect(screen.getByText('환불 실행')).toBeDisabled();});
it('sends only order and idempotency key after confirmation and blocks double click',async()=>{const f=vi.fn().mockResolvedValueOnce(response()).mockResolvedValueOnce(Response.json({order:{state:'CANCELLED',grant_state:'REVOKED'}}));vi.stubGlobal('fetch',f);vi.spyOn(window,'confirm').mockReturnValue(true);await preview();fireEvent.click(screen.getByText('환불 실행'));fireEvent.click(screen.getByText('환불 실행'));await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('환불 처리와 이용권 회수가 완료'));expect(f).toHaveBeenCalledTimes(2);expect(f.mock.calls[1][0]).toBe('/api/payments/support-cancel');expect(Object.keys(JSON.parse(f.mock.calls[1][1].body)).sort()).toEqual(['id','request_key']);});
