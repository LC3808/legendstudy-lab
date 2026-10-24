// @vitest-environment jsdom
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {AdminPaymentView} from './admin-payment-view';
const fixture=vi.hoisted(()=>({total:3}));
vi.mock('./admin-surface',()=>({
 useAdminQuery:()=>({state:{status:'ready',data:{installed:true,runtimeLabel:'TEST',mode:'TEST',total:fixture.total,orders:[
  {orderId:'one',sku:'sku-one',quantity:1,amount:5000,currency:'KRW',state:'PAID',createdAt:'2026-10-24T00:00:00Z'},
  {orderId:'three',sku:'sku-three',quantity:3,amount:14000,currency:'KRW',state:'PAID',createdAt:'2026-10-23T00:00:00Z'},
  {orderId:'cancel',sku:'sku-cancel',quantity:3,amount:14000,currency:'KRW',state:'CANCELLED',createdAt:'2026-10-24T00:00:00Z'},
 ]}},reload:()=>{}}),AdminEmpty:({title}:{title:string})=><p>{title}</p>,AdminLoading:()=>null,AdminErrorPanel:()=>null,
}));
afterEach(()=>{cleanup();fixture.total=3;});
it('combines product, cancellation and date filters using a complete actual read',()=>{
 render(<AdminPaymentView/>);
 expect(screen.getByText('결제 완료 2건')).toBeVisible();expect(screen.getByText('결제 완료 금액 19,000 KRW')).toBeVisible();
 fireEvent.change(screen.getByLabelText('상품'),{target:{value:'3'}});
 expect(screen.getByText('결제 완료 1건')).toBeVisible();expect(screen.queryByText('one')).toBeNull();
 fireEvent.change(screen.getByLabelText('결제 상태'),{target:{value:'CANCELLED'}});
 expect(screen.getByText('cancel')).toBeVisible();expect(screen.queryByText('three')).toBeNull();
 fireEvent.change(screen.getByLabelText('기간'),{target:{value:'custom'}});
 fireEvent.change(screen.getByLabelText('시작일'),{target:{value:'2026-10-23'}});
 fireEvent.change(screen.getByLabelText('종료일'),{target:{value:'2026-10-23'}});
 expect(screen.queryByText('cancel')).toBeNull();expect(screen.getByText('조회된 주문이 없습니다')).toBeVisible();
});
it('does not report a truncated page as global revenue or drop existing paging',()=>{
 fixture.total=51;render(<AdminPaymentView/>);
 expect(screen.queryByText('결제 완료 금액 19,000 KRW')).toBeNull();
 expect(screen.getByLabelText('상품')).toBeDisabled();expect(screen.getByRole('navigation',{name:'주문 목록 페이지'})).toBeVisible();
});
