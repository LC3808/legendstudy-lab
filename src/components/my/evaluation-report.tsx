'use client';
import {criterionEvidence,studentCriterionName} from '@/lib/my/criterion-display';
import './evaluation-refinement.css';
import {GrowthBars} from './growth-bars';
import '../essay-service.css';
import {evaluationChangeSentence,evaluationSpeech} from '@/lib/my/evaluation-presentation';
import {VoiceFeedback} from './voice-feedback';
import {changeLabels,compareReports,criterionValue,type Feedback,type Report} from '@/lib/my/evaluation-report';
function FeedbackSection({title,items,answer,separateActions=[]}:{title:string;items:Feedback[];answer:string;separateActions?:string[]}){return <section className={`report-block ${title==='잘한 점'?'report-strengths':'report-weaknesses'}`}><h3 className="report-block__title">{title}</h3>{items.length?items.map((f,i)=><div className="report-feedback" key={i}><h4>{i+1}. {f.title||title}</h4><p>{f.explanation}</p>{f.evidence&&answer.includes(f.evidence)&&<blockquote className="report-evidence"><span className="report-evidence__label">학생이 작성한 글</span><br/>{f.evidence}</blockquote>}{f.action&&!separateActions.includes(f.action)&&<p className="rewrite-direction"><strong>개선 방법</strong><br/>{f.action}</p>}</div>):<p className="my-note">이 기록에는 해당 피드백이 저장되어 있지 않습니다.</p>}</section>;}
export function EvaluationReport({report,title,voiceType,answerLabel,before}:{before?:Report;report:Report;title:string;answerLabel?:string;voiceType?:'humanities_social'|'business_economics'|'math'|'science'}){
 return <HumanEvaluationReport report={report} title={title} answerLabel={answerLabel} before={before} allowVoice={voiceType==='humanities_social'||voiceType==='business_economics'}/>;
}
export function EvaluationComparison({before,after}:{before?:Report;after?:Report}){
 if(!before||!after)return null;
 const changes=compareReports(before,after);
 return <details className="my-panel evaluation-growth"><summary>최초 첨삭과 재첨삭 비교</summary>{changes?<><h3>이전 첨삭에서 지적된 부분</h3>{before.weaknesses.map((f,i)=><p key={i}>{f.explanation}</p>)}<h3>이번 평가에서 확인한 변화</h3>{after.previousReviews?.length?after.previousReviews.map((r,i)=><p key={i}>{r.reason}</p>):<p>별도의 개선 여부 설명이 저장되어 있지 않습니다.</p>}<p>남은 과제는 보완할 점과 개선 방법에서 확인하세요.</p><div className="report-comparison">{changes.map((c,index)=><section key={c.id} className={`comparison-card report-change--${c.direction.toLowerCase()}`}>
 <h3>{studentCriterionName(c.name,c.id,index)}</h3>
 <dl className="comparison-levels"><div><dt>최초 첨삭</dt><dd>{criterionValue(c.before)} {c.before.stars!==null&&`${c.before.stars}/5`}</dd></div><div><dt>재첨삭</dt><dd>{criterionValue(c.after)} {c.after.stars!==null&&`${c.after.stars}/5`}</dd></div><div><dt>변화</dt><dd>{c.direction==='UNCHANGED'?'변화 없음':changeLabels[c.direction]}</dd></div></dl>
 {c.before.stars!==null&&c.after.stars!==null&&<p>{evaluationChangeSentence(c.before.stars,c.after.stars)}</p>}
 <h4>재첨삭 평가 설명</h4><p className="criterion-feedback">{c.after.feedback||'상세 평가 설명이 제공되지 않았습니다.'}</p>

 <GrowthBars changes={[c]} hideHeading/>
 </section>)}</div><p>{changes.filter(c=>c.direction==='IMPROVED').length}개 항목 향상 · {changes.filter(c=>c.direction==='UNCHANGED').length}개 동일 · {changes.filter(c=>c.direction==='DECLINED').length}개 하락 · {changes.filter(c=>c.direction==='UNAVAILABLE').length}개 비교 불가</p><p className="my-note">동일한 문제·평가 기준의 결과만 비교합니다. 등급 변화만으로 어떤 수정이 변화의 원인인지 단정하지 않습니다.</p></>:<p>평가 기준이 다르거나 비교에 필요한 정보가 없어 직접 비교하기 어렵습니다.</p>}</details>;
}

export function CriterionResults({report}:{report:Report}){
 const cards=report.rubric.map((c,index)=>{
  const evidence=criterionEvidence(c,report.evidenceLabels??[]);
  const feedback=c.feedback||evidence.find(e=>e.body)?.body||'';
  const extra=evidence.filter(e=>e.body&&e.body!==feedback);
  return <article key={c.id||c.name} className="criterion-card">
   <h4>{studentCriterionName(c.name,c.id,index)}</h4>
   <p className="criterion-rating" aria-label={c.stars===null?undefined:`5단계 중 ${c.stars}단계`}>{c.stars===null?'':humanLevels[c.stars]} {criterionValue(c)} {c.stars!==null&&`· 평가 단계 ${c.stars}/5`}</p>
   <p className="criterion-feedback">{feedback||'상세 평가 설명이 제공되지 않았습니다.'}</p>
   {extra.map(e=><p key={e.original}>{e.body}</p>)}
  </article>;
 });

 return <section className="report-block report-criteria"><h3>평가 항목별 설명과 단계</h3>{cards}{!cards.length&&<p>저장된 평가 항목이 없습니다.</p>}<p className="my-note">별은 5단계 학습 평가이며 대학의 공식 점수나 합격 가능성을 뜻하지 않습니다.</p></section>;
}
const humanLevels=['','크게 보완 필요','부족','보완 필요','대체로 충실','매우 충실'];
function HumanEvaluationReport({report,title,answerLabel,before,allowVoice}:{before?:Report;report:Report;title:string;answerLabel?:string;allowVoice:boolean}){
 const distinct=(values:string[])=>[...new Set(values.filter(s=>s.trim()))];
 const linked=new Set(report.weaknesses.map(f=>f.action));
 const actions=distinct(report.actions).filter(s=>!linked.has(s));
 const checklist=distinct(report.nextSteps).filter(s=>!linked.has(s)&&!report.actions.includes(s));
 return <article className="my-panel evaluation-report essay-service"><h2 className="evaluation-report__title">{title}</h2>
 <details className="report-answer"><summary>{answerLabel??'제출 답안'}</summary><p className="essay-answer">{report.answer||'첨부 답안 · 비공개 보관'}</p></details>
 {before&&<details className="report-answer"><summary>비교 대상 · 이전 제출 답안</summary><p className="essay-answer">{before.answer||'첨부 답안 · 비공개 보관'}</p></details>}
 <section className="report-block report-block--summary"><h3>종합 평가</h3><p>{report.summary||'저장된 종합 평가가 없습니다.'}</p></section>
 {allowVoice&&<details className="report-audio"><summary>음성으로 듣기</summary><VoiceFeedback text={evaluationSpeech(report)}/></details>}
 <section className="report-block report-guide"><h3>높은 평가를 위한 작성 가이드</h3>
 <p>이 문항에 저장된 수정 방향과 확인 항목입니다. 보완 사유와 연결된 개선 방법은 아래에서 확인하세요.</p>
 {report.actions.length>0&&<><h4>우선 개선 과제</h4><ul>{report.weaknesses.filter(f=>report.actions.includes(f.action)).map((f,i)=><li key={i}>{f.title||'보완할 점'} · 아래 개선 방법 확인</li>)}{actions.map((a,i)=><li key={'action'+i}>{a}</li>)}</ul></>}
 {checklist.length>0&&<><h4>다시 쓸 때 확인할 것</h4><ul>{checklist.map((s,i)=><li key={i}>{s}</li>)}</ul></>}
 <p className="my-note">이 기록에는 별도로 검증된 높은 평가의 핵심 조건과 추천 답안 전개 순서가 없습니다. 저장된 피드백만 안내합니다.</p>
 </section>
 <FeedbackSection title="잘한 점" items={report.strengths} answer={report.answer}/>
 <FeedbackSection title="보완할 점과 개선 방법" items={report.weaknesses} answer={report.answer}/>
 {report.sentences?.filter(s=>s.quote&&report.answer.includes(s.quote)).length?<section className="report-block report-sentences"><h3>문장 다듬기</h3>{report.sentences.filter(s=>s.quote&&report.answer.includes(s.quote)).map((s,i)=><article className="report-feedback" key={i}><h4>학생이 작성한 글</h4><blockquote>{s.quote}</blockquote><h4>평가</h4><p>{s.diagnosis}</p><div className="rewrite-direction"><h4>개선 방법</h4><p>{s.direction}</p>{s.example&&<><h4>수정 예시 · 학생 원문 아님</h4><p>{s.example}</p></>}</div></article>)}</section>:null}
 <details className="report-dimensions"><summary>평가 항목별 설명과 단계</summary><CriterionResults report={report}/></details>

 </article>;
}
