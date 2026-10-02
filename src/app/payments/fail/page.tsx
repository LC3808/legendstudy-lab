import Link from 'next/link';
export const metadata = {title:'테스트 결제 중단',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function Page(){return <section className="policy-page content-wrap"><h1>테스트 결제가 완료되지 않았습니다</h1><p>결제를 취소했거나 진행하지 못했습니다. Credit은 지급되지 않습니다.</p><Link href="/payments/test/">다시 시도</Link></section>;}
