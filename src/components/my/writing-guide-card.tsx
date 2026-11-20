import type {Report} from '@/lib/my/evaluation-report';
import './writing-guide-card.css';

const distinct = (values: string[]) => [...new Set(values.filter(value => value.trim()))];

/** Presentation only: preserve stored wording and the existing action/checklist mapping. */
export function WritingGuideCard({report}: {report: Report}) {
  const linked = new Set(report.weaknesses.map(item => item.action));
  const priorities = [
    ...report.weaknesses.filter(item => item.action.trim() && report.actions.includes(item.action))
      .map(item => item.title.trim() ? item.title : item.action),
    ...distinct(report.actions).filter(action => !linked.has(action)),
  ];
  const checklist = distinct(report.nextSteps)
    .filter(item => !linked.has(item) && !report.actions.includes(item));

  return <section className="report-block report-guide writing-guide">
    <h3>높은 평가를 위한 작성 가이드</h3>
    <p className="writing-guide__intro">이 문항에서 우선 보완할 내용을 확인하고, 다시 작성할 때 아래 질문을 점검해 보세요.</p>
    {priorities.length > 0 && <div className="writing-guide__section">
      <h4><span aria-hidden="true">01</span> 우선 개선 과제</h4>
      <ol className="writing-guide__priorities" role="list">
        {priorities.map((item, index) => <li key={index}>
          <span className="writing-guide__number" aria-hidden="true">{index + 1}</span>
          <span className="writing-guide__text">{item}</span>
        </li>)}
      </ol>
      <p className="writing-guide__hint">보완 사유와 구체적인 개선 방법은 ‘보완할 점과 개선 방법’에서 확인할 수 있어요.</p>
    </div>}
    {checklist.length > 0 && <div className="writing-guide__section">
      <h4><span aria-hidden="true">02</span> 다시 쓸 때 확인할 것</h4>
      <ul className="writing-guide__checklist" role="list">
        {checklist.map((item, index) => <li key={index}>
          <span className="writing-guide__check" aria-hidden="true">✓</span>
          <span className="writing-guide__text">{item}</span>
        </li>)}
      </ul>
    </div>}
    {!priorities.length && !checklist.length && <p className="writing-guide__empty">저장된 개선 과제와 확인 항목이 없습니다.</p>}
    <p className="writing-guide__note"><span>안내</span> 추가 평가 기준이 제공되지 않은 문항은 저장된 첨삭 내용을 기준으로 안내합니다.</p>
  </section>;
}
