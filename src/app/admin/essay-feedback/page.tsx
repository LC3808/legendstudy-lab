import {AdminSurface} from '@/components/admin/admin-surface';
import {AdminEssayFeedback} from '@/components/admin/admin-essay-feedback';
export const metadata={title:'피드백·오류 신고',robots:{index:false,follow:false}};
export default function Page(){return <AdminSurface active="essay-feedback" eyebrow="논술 LAB" title="피드백·오류 신고" lead="사용자 의견을 확인하고 처리 상태를 기록합니다."><AdminEssayFeedback/></AdminSurface>;}
