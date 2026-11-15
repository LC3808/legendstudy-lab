import {AdminSurface} from '@/components/admin/admin-surface';
import {AdminLabDashboard} from '@/components/admin/admin-lab-dashboard';
export const metadata={title:'논술 LAB 대시보드 | 운영 콘솔',robots:{index:false,follow:false}};
export default function Page(){return <AdminSurface active="lab-dashboard" title="논술 LAB 대시보드" eyebrow="운영 콘솔 / 논술 LAB" lead="이용 현황에서 첨삭·품질·이용권 상세까지 연결합니다."><AdminLabDashboard/></AdminSurface>;}
