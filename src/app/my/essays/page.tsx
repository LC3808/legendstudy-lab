import { MyEssays } from '@/components/my/dashboard';
import { buildMetadata } from '@/lib/brand';
export const metadata=buildMetadata('나의 논술 기록','내 논술 연습과 평가 기록을 확인하세요.');
export default function Page(){return <MyEssays/>;}
