'use client';
import Link from 'next/link';
import {useEffect,useState,type CSSProperties} from 'react';
import {useAuth} from '../auth-context';
import {UniversityLogo} from '../university-identity';
import {publicCatalog} from '@/lib/essay-runtime/public-discovery';
import {universityEssayTheme} from '@/lib/essay-runtime/university-theme';
import {loadRegisteredMaterials,mergeRegisteredCatalog} from '@/lib/essay-runtime/registered-material-catalog';
import {sourceExams} from '@/lib/essay-runtime/source-registry';
import {examQuestionLabel} from '@/lib/my/exam-history';
import {historyType,answerVersion,completedAt,type RecordItem} from '@/lib/my/essay-dashboard';
import type {Report} from '@/lib/my/evaluation-report';
import {EvaluationReport,EvaluationComparison} from './evaluation-report';
import {dateLabel} from './owner-data';
import './exam-result-layout.css';
const sections=[['summary','첨삭 결과'],['questions','문항별 첨삭'],['criteria','작성 가이드'],['feedback','강점과 개선 방향'],['rewrite','재작성 안내'],['answers','제출 답안']] as const;
type Section=typeof sections[number][0];
/** A presentation of the same owner-scoped reports used immediately after completion and in History. */
export function ExamResultLayout({row,run,reports,previous,onRewrite,onAdditional}:{row:RecordItem;run:Record<string,unknown>;reports:Report[];previous:Report[];onRewrite:()=>void;onAdditional:()=>void}){
 const [section,setSection]=useState<Section>('summary');
 const [open,setOpen]=useState<Record<string,boolean>>({});
 const [order,setOrder]=useState<string[]>([]);
 const [labels,setLabels]=useState<Record<string,string>>({});
 const auth=useAuth();
 const university=publicCatalog.universities.find(u=>u.name===row.university);
 const sourceId=university?.sourceUniversityId;
 useEffect(()=>{let live=true;if(!auth.client||!sourceId)return;
  void loadRegisteredMaterials(auth.client,sourceId).then(materials=>{
   const exam=mergeRegisteredCatalog(sourceExams(sourceId),materials).find(e=>e.dbExamId===row.examId);
   if(live&&exam){setLabels(Object.fromEntries(exam.questions.filter(q=>q.dbQuestionId).map(q=>[q.dbQuestionId!,q.label])));setOrder(exam.questions.flatMap(q=>q.dbQuestionId?[q.dbQuestionId]:[]));}
  }).catch(()=>{/* Stored results remain available if optional catalog labels cannot be read. */});return()=>{live=false;};
 },[auth.client,sourceId,row.examId]);
 const theme=universityEssayTheme(sourceId??'');
 const title=row.question.replaceAll(row.university??'','').replace(/\bmock\b/gi,'모의논술').replace(/\badmission\b/gi,'수시논술').trim();
 const label=(report:Report,index:number)=>{const id=report.id.split('/').at(-1)??'';const stored=labels[id]??examQuestionLabel(id);return stored==='문항별 첨삭'?`제출 문항 ${index+1}`:stored;};
 const orderedReports=[...reports].sort((a,b)=>{const ai=order.indexOf(a.id.split('/').at(-1)??''),bi=order.indexOf(b.id.split('/').at(-1)??'');return ai<0||bi<0?0:ai-bi;});
 const canRewrite=run.free_rewrite_available===true;
 return <div className="exam-result" data-view={section} style={{'--result-accent':theme.accent,'--result-border':theme.border_color} as CSSProperties}>
  <header className="exam-result-hero">
   <div className="exam-result-identity">{university&&<UniversityLogo university={university} logoAsset={theme.logo_asset}/>}<div><h1>{row.university??'논술 첨삭 결과'}</h1><h2>{title}</h2></div></div>
   <div className="exam-result-meta"><span className="essay-history-badge">{historyType(row)}</span><span>제출 {reports.length}문항</span><span>{dateLabel(completedAt(row))} 첨삭 완료</span></div>
   <div className="my-actions"><Link className="button button--outline" href="/essay-lab/">다른 논술 풀기</Link><Link className="button button--primary" href="/my/essays/">나의 첨삭 기록 →</Link></div>
  </header>
  <nav className="exam-result-nav" aria-label="첨삭 결과 섹션">{sections.map(([key,name])=><button key={key} aria-current={section===key?'page':undefined} onClick={()=>setSection(key)}>{name}{key==='questions'?` (${reports.length})`:''}</button>)}</nav>
  <div className="exam-result-columns"><main className="exam-result-main" aria-label="저장된 평가 결과">
   <h2 className="exam-result-section-title">{sections.find(([key])=>key===section)?.[1]}</h2>
   {section==='summary'&&<p className="my-note">문항별로 저장된 평가입니다. 별도의 종합 점수는 산출하지 않습니다.</p>}
   {orderedReports.map((report,index)=>{
    const before=previous.find(p=>p.id===report.priorId);
    const expanded=section!=='questions'||(open[report.id]??index===0);
    return <section className="exam-result-question" key={report.id}>
     <header className="exam-result-question-head"><h3>{label(report,index)}</h3>{section==='questions'&&<button aria-expanded={expanded} aria-controls={`report-${index}`} onClick={()=>setOpen(old=>({...old,[report.id]:!expanded}))}>{expanded?'접기':'펼치기'} <span aria-hidden="true">{expanded?'−':'+'}</span></button>}</header>
     <div id={`report-${index}`} hidden={!expanded}>
      {section==='answers'?<div className="exam-result-answer"><p className="essay-answer">{report.answer||'이 기록에는 표시할 텍스트 답안이 없습니다.'}</p>{report.pins.includes('math-eval-v1')&&<p className="my-note">저장된 수식·텍스트 답안입니다. 원본 사진 미리보기는 이 결과 조회 경로에서 제공되지 않습니다.</p>}</div>:<EvaluationReport voiceType="humanities_social" title={historyType(row)} answerLabel={answerVersion(row)} before={before} report={report}/>}
      {(section==='summary'||section==='rewrite'||section==='questions')&&<EvaluationComparison before={before} after={row.rewrite?report:undefined}/>}
      {section==='rewrite'&&!report.nextSteps.length&&!report.actions.length&&<p>이 기록에는 별도 재작성 안내가 없습니다. 문항별 피드백을 참고해 주세요.</p>}
     </div>
    </section>;
   })}
   <section className="report-rewrite-cta"><h2>다시 써보기</h2><p>이번 첨삭에서 확인한 개선 방향을 적용해 답안을 다시 작성해 보세요.</p><button className="button button--primary" disabled={!canRewrite} onClick={onRewrite}>답안 다시 작성하기 · 무료 재첨삭</button>{!canRewrite&&<p>이 회차는 현재 무료 재첨삭을 사용할 수 없습니다.</p>}{run.continuous_cycles_supported===true&&<button className="button button--outline" onClick={onAdditional}>추가 첨삭 · 1 크레딧</button>}</section>
  </main><aside className="exam-result-sidebar" aria-label="제출 정보와 다음 단계">
   <section><h2>제출 정보</h2><dl><div><dt>첨삭 유형</dt><dd>{historyType(row)}</dd></div><div><dt>제출일</dt><dd>{dateLabel(row.at)}</dd></div><div><dt>제출 문항</dt><dd>{reports.length}문항</dd></div><div><dt>무료 재첨삭</dt><dd>{canRewrite?'사용 가능':'현재 사용 불가'}</dd></div></dl></section>
   <section><h2>다음 단계</h2><button className="button button--primary" disabled={!canRewrite} onClick={onRewrite}>이 결과를 바탕으로 재작성하기 →</button>{!canRewrite&&<p className="my-note">무료 재첨삭 가능 기간 또는 사용 상태에 따라 현재 요청할 수 없습니다.</p>}<Link className="button button--outline" href="/essay-lab/">다른 논술 풀기</Link><Link className="essay-history-button" href="/my/essays/">나의 첨삭 기록 확인 →</Link>{run.continuous_cycles_supported===true&&<details><summary>새 첨삭 회차 선택</summary><p>기존 결과와 별도로 새 회차를 작성합니다.</p><button className="button button--outline" onClick={onAdditional}>추가 첨삭 · 1 크레딧</button></details>}</section>
  </aside></div>
 </div>;
}
