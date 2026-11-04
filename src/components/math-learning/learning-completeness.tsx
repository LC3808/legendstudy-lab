import {object,text} from '@/lib/my/evaluation-report';
/** Display only: no inferred rating, score averaging or historical backfill. */
export function LearningCompletenessCard({value,evaluationId}:{value:unknown;evaluationId:string}){
 const d=object(value),level=d.level;
 if(d.version!=='learning-completeness-v1'||d.evaluation_id!==evaluationId)return null;
 const assessed=d.status==='ASSESSED'&&typeof level==='number'&&Number.isInteger(level)&&level>=1&&level<=5;
 const withheld=d.status==='INSUFFICIENT_EVIDENCE'&&level===null;
 if((!assessed&&!withheld)||!text(d.rationale).trim()||typeof d.next_direction!=='string')return null;
 return <section className="math-study-diagnosis" aria-label="학습 완성도">
  <h3>학습 완성도 · {assessed?`${level}/5단계`:'판단 보류'}</h3>
  {assessed&&<p aria-label={`학습 완성도 ${level}단계, 전체 5단계`}><span aria-hidden="true">{'★'.repeat(level as number)}{'☆'.repeat(5-(level as number))}</span></p>}
  <p>{text(d.rationale)}</p><h4>다음 학습 방향</h4><p>{text(d.next_direction)}</p>
  <p className="math-study-note">학습을 돕는 단계이며 대학 공식 점수나 합격 가능성을 뜻하지 않습니다.</p>
 </section>;
}
