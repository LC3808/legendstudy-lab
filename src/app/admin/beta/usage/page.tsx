import { AdminSurface } from '@/components/admin/admin-surface';
import { AdminBeta } from '@/components/admin/admin-beta';
export const metadata = {title:'무료 이용 현황',robots:{index:false,follow:false}};
export default function Page() {return <AdminSurface active="beta-usage" eyebrow="논술 LAB" title="무료 이용 현황" lead="기존 이용권·평가 원장을 보존하며 운영 설정과 이용 내역을 확인합니다."><AdminBeta kind="usage"/></AdminSurface>;}
