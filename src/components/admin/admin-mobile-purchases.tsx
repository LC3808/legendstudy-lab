'use client';
import type {MobilePurchases} from '@/lib/admin/mobile-purchases';
import {useAdminQuery,AdminLoading,AdminErrorPanel} from './admin-surface';
export function AdminMobilePurchases({from,to,quantity}:{from:string|null;to:string|null;quantity:number|null}){
 const {state,reload}=useAdminQuery<MobilePurchases>(c=>c.mobilePurchases(from,to,quantity),JSON.stringify(['mobile',from,to,quantity]));
 return <section className="admin-payment-summary" aria-label="모바일 구매 지급"><h3>모바일 구매 · 크레딧 지급</h3>
 {state.status==='loading'?<AdminLoading/>:state.status==='error'?<AdminErrorPanel kind={state.kind} onRetry={reload}/>:<>{state.data.platforms.length?state.data.platforms.map(p=><p key={p.platform}><strong>{p.platform==='apple'?'App Store':'Google Play'}</strong> · 구매 {p.purchase_count}건 · 지급 {p.granted_credits}크레딧</p>):<p>선택 기간·상품에 해당하는 모바일 구매 지급 기록이 없습니다.</p>}<p>합계 {state.data.platforms.reduce((n,p)=>n+p.purchase_count,0)}건 · {state.data.platforms.reduce((n,p)=>n+p.granted_credits,0)}크레딧 지급</p></>}
 <p className="admin-muted">스토어 검증 후 크레딧이 지급된 날짜 기준입니다. 기간·상품 필터를 적용하며 웹 주문의 거래 상태 필터와는 별도입니다. 누적 지급과 현재 사용 가능 잔액은 다릅니다.</p>
 <p className="admin-muted">기존 지급 기록에는 결제 금액·통화와 TEST/LIVE 환경이 없어 매출을 합산하지 않습니다. 스토어 결제·환불 내역과 별도 대조가 필요합니다.</p></section>;
}
