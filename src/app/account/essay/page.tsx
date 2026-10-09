import {EssayDashboard} from '@/components/my/essay-dashboard';
import {buildMetadata} from '@/lib/brand';
export const metadata={...buildMetadata('나의 논술 LAB','내 첨삭과 재작성, Credit 이용 기록을 확인하세요.'),robots:{index:false,follow:false}};
export default function Page(){return <EssayDashboard/>;}
