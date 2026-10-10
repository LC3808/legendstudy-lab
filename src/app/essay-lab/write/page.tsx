import {Suspense} from 'react';
import {EssayServiceWorkspace} from '@/components/essay-service-workspace';
export const metadata={title:'내 논술 답안 | LegendStudy LAB',robots:{index:false,follow:false}};
export default function Page(){return <Suspense fallback={<p role="status">답안을 불러오고 있습니다.</p>}><EssayServiceWorkspace/></Suspense>;}
