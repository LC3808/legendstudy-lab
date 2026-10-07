import { MyDashboard } from '@/components/my/dashboard';
import { buildMetadata } from '@/lib/brand';
export const metadata=buildMetadata('마이페이지','나의 목표, 첨삭권과 논술 기록을 확인하세요.');
export default function AccountPage(){return <MyDashboard/>;}
