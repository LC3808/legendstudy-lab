import { CreditHistory } from '@/components/my/dashboard';
import { buildMetadata } from '@/lib/brand';
export const metadata=buildMetadata('구매·사용 내역','내 크레딧 내역을 확인하세요.');
export default function Page(){return <CreditHistory/>;}
