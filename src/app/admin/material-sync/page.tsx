import type { Metadata } from 'next';
import { AdminSurface } from '@/components/admin/admin-surface';
import { AdminMaterialSync } from '@/components/admin/admin-material-sync';
export const metadata:Metadata={title:'학습자료 동기화',robots:{index:false,follow:false}};
export default function Page(){return <AdminSurface active="material-sync" eyebrow="운영 콘솔" title="학습자료 동기화" lead="자동 갱신 현황을 확인하고 필요한 자료 갱신을 요청합니다."><AdminMaterialSync/></AdminSurface>;}
