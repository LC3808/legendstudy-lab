// @vitest-environment jsdom
import {it,expect} from 'vitest';
import {readFileSync,writeFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {examReports} from '@/lib/my/exam-history';
import {compareReports} from '@/lib/my/evaluation-report';
import {EvaluationReport,EvaluationComparison} from './evaluation-report';
const path=process.env.ESSAY_QA_RESULT_PATH;
it.skipIf(!path)('renders existing operating results without a new evaluation',()=>{
 const runs=JSON.parse(readFileSync(path!,'utf8'));const before=examReports(runs[0])[0],after=examReports(runs[1])[0];
 const changes=compareReports(before,after)!;expect(changes.filter(c=>c.direction==='IMPROVED')).toHaveLength(1);
 expect(changes.find(c=>c.direction==='IMPROVED')?.before.stars).toBe(3);expect(changes.find(c=>c.direction==='IMPROVED')?.after.stars).toBe(4);
 expect(after.sentences).toHaveLength(0);
 const content=renderToStaticMarkup(<main className="my-dashboard essay-personal"><header><h1>한양대학교</h1><h2>2024학년도 수시 논술</h2><p>인문계열 · 오후 2 · 문제 1</p><p>무료 재첨삭 · 저장된 실제 결과</p></header><EvaluationReport report={after} title="무료 재첨삭" voiceType="humanities_social" answerLabel="수정 제출 답안"/><EvaluationComparison before={before} after={after}/></main>);
 expect(content).toContain('평가 단계: 3단계');
 if(process.env.ESSAY_QA_HTML_PATH){const css=['src/components/my/essay-dashboard.css','src/components/essay-service.css'].map(p=>readFileSync(p,'utf8')).join('\n');writeFileSync(process.env.ESSAY_QA_HTML_PATH,`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:24px;font:16px/1.65 sans-serif;color:#1b2a4a}main{max-width:1000px;margin:auto}*{box-sizing:border-box}p{overflow-wrap:anywhere}${css}</style>${content}</html>`);}
});
