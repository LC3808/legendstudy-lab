import {expect,it} from 'vitest';
import {task16gTest,task16gExam,task16gPdfs} from './task16g-test-catalog';
it('requires both dedicated TEST host and isolated database',()=>{
 const env={MATH_PROJECT_REF:'kpqbedylxlyntrrfybpn',MATH_SUPABASE_URL:'https://kpqbedylxlyntrrfybpn.supabase.co'};
 expect(task16gTest(new Request('https://legendstudy-task16b.pages.dev/api/essay/catalog'),env)).toBe(true);
 expect(task16gTest(new Request('https://lab.legendstudy.com/api/essay/catalog'),env)).toBe(false);
 expect(task16gTest(new Request('https://legendstudy-task16b.pages.dev/api/essay/catalog'),{...env,MATH_PROJECT_REF:'production'})).toBe(false);
 expect(task16gExam.questions.map(q=>q.dbQuestionId)).toEqual(task16gPdfs.map(q=>q.questionId));
 expect(task16gPdfs.map(q=>q.startPage)).toEqual([2,3]);
 expect(JSON.stringify(task16gExam)).not.toMatch(/scoring|correct_answer|generated_solution/);
});
