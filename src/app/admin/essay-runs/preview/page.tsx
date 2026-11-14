import {AdminSurface} from '@/components/admin/admin-surface';
import {AdminLabPreview} from '@/components/admin/admin-lab-preview';
export const metadata={title:'학생 결과 미리보기 | 운영 콘솔',robots:{index:false,follow:false}};
export default function Page(){return <AdminSurface active="essay-runs" title="학생 결과 미리보기" eyebrow="운영 콘솔 / 읽기 전용"><AdminLabPreview/></AdminSurface>;}
