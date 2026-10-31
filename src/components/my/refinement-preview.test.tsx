// @vitest-environment jsdom
import {it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {writeFileSync,readFileSync} from 'node:fs';
import {OfficialRubricTable} from './official-rubric';
import type {OfficialRubric} from '@/lib/my/official-rubric';
import {EvaluationReport,EvaluationComparison} from './evaluation-report';
import type {Report} from '@/lib/my/evaluation-report';
it('exports an offline synthetic review fixture when requested',()=>{
 if(!process.env.REFINEMENT_PREVIEW)return;
 const before:Report={id:'a',answer:'학생의 실제 문장 예시.',question:'',summary:'저장된 종합 평가 예시.',rubric:[{id:'c',name:'논리 전개와 구성이 잘 이루어졌는가',stars:4,value:'',feedback:'자료를 연결했습니다. 다만 연결 설명은 보완이 필요합니다.'}],strengths:[{title:'자료의 관계를 명확히 설명하기',explanation:'저장된 강점 예시.',evidence:'',action:''}],weaknesses:[{title:'논거의 연결을 구체적으로 설명하기',explanation:'저장된 보완점 예시.',evidence:'',action:'연결을 설명하세요.'}],actions:['논거의 연결을 확인하세요.'],nextSteps:['근거를 확인했나요?'],pins:['q','v'],priorId:null,sentences:[{quote:'학생의 실제 문장 예시.',diagnosis:'평가 설명입니다.',direction:'수정 방법입니다.'}]};
 const after={...before,id:'b',priorId:'a'};
 const candidate=process.env.RUBRIC_PREVIEW_SOURCE?JSON.parse(readFileSync(process.env.RUBRIC_PREVIEW_SOURCE,'utf8')) as OfficialRubric:null;
 const markup=renderToStaticMarkup(<div className="essay-personal history-detail">{candidate&&<section><h1>숭실대 정정 후보 — Owner 승인 대기</h1><p>표 구조 검수용입니다. 기존 평가 결과와 운영 Package에는 적용하지 않았습니다.</p><OfficialRubricTable rubric={candidate}/></section>}<div className="exam-result" data-view="questions"><EvaluationReport report={after} title="재첨삭" voiceType="humanities_social"/><EvaluationComparison before={before} after={after}/></div></div>);
 const css=['src/components/essay-service.css','src/components/my/essay-dashboard.css','src/components/my/exam-result-layout.css','src/components/my/evaluation-refinement.css','src/components/my/growth-bars.module.css'].map(p=>readFileSync(p,'utf8')).join('\n');
 writeFileSync(process.env.REFINEMENT_PREVIEW,`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>*{box-sizing:border-box}body{margin:0;padding:12px;font-family:Arial,sans-serif}${css}</style>${markup}`);
});
