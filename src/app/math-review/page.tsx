import {Suspense} from 'react';
import {MathReviewPage} from '@/components/math-learning/math-review-page';
export const metadata={title:'수리논술 학습 워크스페이스 | LegendStudy',robots:{index:false,follow:false}};
export default function Page(){return <Suspense fallback={<p>첨삭 기록 확인 중…</p>}><MathReviewPage/></Suspense>;}
