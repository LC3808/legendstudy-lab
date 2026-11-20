import { AdminSurface } from '@/components/admin/admin-surface';
import { AdminAdmissionSchedules } from '@/components/admin/admin-admission-schedules';

export const metadata = { title: '공식 입시 일정 관리', robots: { index: false, follow: false } };
export default function Page() {
  return <AdminSurface active="admission-schedules" eyebrow="운영 콘솔" title="공식 입시 일정 관리" lead="공식 자료의 전형·모집단위를 확인하고 학생 D-Day에 연결할 일정을 관리합니다.">
    <AdminAdmissionSchedules />
  </AdminSurface>;
}
