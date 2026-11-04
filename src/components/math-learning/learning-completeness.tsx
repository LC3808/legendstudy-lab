import {object,text} from '@/lib/my/evaluation-report';
/** Display only: no inferred rating, score averaging or historical backfill. */
export function LearningCompletenessCard({value,evaluationId,comparison}:{value:unknown;evaluationId:string;comparison?:unknown}){
 const d=object(value),level=d.level;
 if(d.version!=='learning-completeness-v1'||d.evaluation_id!==evaluationId)return null;
 const assessed=d.status==='ASSESSED'&&typeof level==='number'&&Number.isInteger(level)&&level>=1&&level<=5;
 const withheld=d.status==='INSUFFICIENT_EVIDENCE'&&level===null;
 if((!assessed&&!withheld)||!text(d.rationale).trim()||typeof d.next_direction!=='string')return null;
 return <section className="math-study-diagnosis" aria-label="학습 완성도">
  <h3>학습 완성도 · {assessed?`${level}/5단계`:'판단 보류'}</h3>
  {assessed&&<p aria-label={`학습 완성도 ${level}단계, 전체 5단계`}><span aria-hidden="true">{'★'.repeat(level as number)}{'☆'.repeat(5-(level as number))}</span></p>}
  <p>{text(d.rationale)}</p><h4>다음 학습 방향</h4><p>{text(d.next_direction)}</p>
  <LearningComparison value={comparison}/>
  <details><summary>평가 기준 및 정책</summary><p>정책: {text(d.version)}</p><p style={{overflowWrap:'anywhere'}}>평가 기준: {text(d.rubric_version)||'미제공'}</p></details>
  <p className="math-study-note">학습을 돕는 단계이며 대학 공식 점수나 합격 가능성을 뜻하지 않습니다.</p>
 </section>;
}

export function LearningComparison({value}:{value:unknown}){
 if(!value)return null;
 const d=object(value);
 if(d.comparable!==true)return <p>{d.reason==='NO_PREVIOUS_ASSESSMENT'?'이전 평가에는 비교할 학습 완성도가 없습니다.':'평가 기준이 달라 학습 완성도를 직접 비교하지 않습니다.'}</p>;
 const {before,after,delta}=d;
 if(typeof before!=='number'||typeof after!=='number'||typeof delta!=='number'||![before,after,delta].every(Number.isInteger)||before<1||before>5||after<1||after>5||delta!==after-before)return null;
 return <section aria-label="이전 답안과 비교"><h4>이전 답안과 비교</h4><p><strong>{before}단계 → {after}단계 ({delta>0?'+':''}{delta})</strong></p><p>이전 근거: {text(d.prior_rationale)}</p><p>현재 근거: {text(d.current_rationale)}</p>
 {Array.isArray(d.improved_criterion_ids)&&Array.isArray(d.remaining_criterion_ids)&&<p>개선된 평가 요소 {d.improved_criterion_ids.length}개 · 보완할 평가 요소 {d.remaining_criterion_ids.length}개</p>}
 {Array.isArray(d.improved_elements)&&d.improved_elements.length>0&&<><h4>개선된 평가 요소</h4><ul>{d.improved_elements.map(object).map((e,i)=><li key={i}>{text(e.rationale)}</li>)}</ul></>}
 {Array.isArray(d.remaining_elements)&&d.remaining_elements.length>0&&<><h4>보완할 평가 요소</h4><ul>{d.remaining_elements.map(object).map((e,i)=><li key={i}>{text(e.rationale)}</li>)}</ul></>}
 <p className="math-study-note">이 답안의 학습 완성도 변화이며 실제 실력 향상이나 합격 가능성을 뜻하지 않습니다.</p></section>;
}
