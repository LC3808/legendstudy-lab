// @vitest-environment jsdom
import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {examReports} from '@/lib/my/exam-history';
import {compareReports} from '@/lib/my/evaluation-report';
import {EvaluationReport} from './evaluation-report';
const path=process.env.ESSAY_QA_ADDITIONAL_RESULT_PATH;
it.skipIf(!path)('renders the stored additional paid result without inventing free-rewrite lineage',()=>{
 const rows=JSON.parse(readFileSync(path!,'utf8')),run=rows.at(-1);
 expect(run.submission_index).toBe(3);expect(run.previous_paid_run_id).toBe(rows[0].id);
 expect(run.parent_id).toBeNull();expect(run.free_rewrite_available).toBe(true);
 const report=examReports(run)[0];expect(report.rubric).toHaveLength(5);
 expect(report.rubric.every(c=>c.stars===4)).toBe(true);
 expect(compareReports(examReports(rows[0])[0],report)).toBeNull();
 const html=renderToStaticMarkup(<EvaluationReport report={report} title="추가 첨삭" voiceType="humanities_social" answerLabel="수정 제출 답안 2"/>);
 expect(html).toContain('논제의 세 요구를 모두 충실히 수행한 강한 답안이다.');
 expect(html).toContain('추가 첨삭');expect(html).toContain('수정 제출 답안 2');
});
