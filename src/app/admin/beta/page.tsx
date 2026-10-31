import { AdminSurface } from '@/components/admin/admin-surface';
import { AdminBeta } from '@/components/admin/admin-beta';
export const metadata = {title:'논술 LAB 베타 운영',robots:{index:false,follow:false}};
export default function Page() {return <AdminSurface active="beta" eyebrow="논술 LAB" title="논술 LAB 베타 운영" lead="기존 이용권·평가 원장을 보존하며 운영 설정과 이용 내역을 확인합니다."><AdminBeta kind="settings"/></AdminSurface>;}
