import {AdminSurface} from '@/components/admin/admin-surface';
import {AdminLabOperations} from '@/components/admin/admin-lab-operations';
export const metadata={title:'첨삭 이용 현황 | 운영 콘솔',robots:{index:false,follow:false}};
export default function Page(){return <AdminSurface active="essay" title="첨삭 요청·결과 조회" eyebrow="운영 콘솔 / 논술 LAB" lead="실제 저장된 회차·답안·평가 결과를 확인합니다."><AdminLabOperations/></AdminSurface>;}
