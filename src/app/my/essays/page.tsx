import {Suspense} from 'react';
import { EssayHistory } from '@/components/my/essay-history';
import { buildMetadata } from '@/lib/brand';
export const metadata=buildMetadata('나의 첨삭 기록','내 논술 연습과 평가 기록을 확인하세요.');
export default function Page(){return <Suspense fallback={<p>첨삭 기록 확인 중…</p>}><EssayHistory/></Suspense>;}
