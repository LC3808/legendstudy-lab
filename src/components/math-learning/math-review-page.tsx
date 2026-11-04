'use client';
import {useSearchParams} from 'next/navigation';
import {OwnerArea} from '../my/owner-data';
import {ServerCoaching} from './server-coaching';
export function MathReviewPage(){const query=useSearchParams(),evaluation=query.get('evaluation')??'';
 return <div className="math-study-page"><OwnerArea path={`/math-review/?evaluation=${encodeURIComponent(evaluation)}`}>{/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(evaluation)?<ServerCoaching evaluationId={evaluation}/>:<p>나의 첨삭 기록에서 확인할 수리 답안을 선택해 주세요.</p>}</OwnerArea></div>;
}
