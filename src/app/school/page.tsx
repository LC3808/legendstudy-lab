import {SchoolView} from '@/components/school/school-view';
import {buildMetadata} from '@/lib/brand';

export const metadata=buildMetadata('우리 학교 공부 경쟁','우리 학교 친구들과 함께 공부시간을 기록하고 학교 순위를 겨뤄보세요.');
export default function Page(){ return <SchoolView/>; }
