import {Suspense} from 'react';
import {EssayResultPage} from '@/components/my/essay-result-page';
import {buildMetadata} from '@/lib/brand';
export const metadata=buildMetadata('논술 첨삭 결과','저장된 첨삭 결과와 재작성·성장을 확인하세요.');
export default function Page(){return <Suspense fallback={<p role="status">결과를 불러오고 있습니다.</p>}><EssayResultPage/></Suspense>;}
