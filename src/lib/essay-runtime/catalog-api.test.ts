import {it,expect} from 'vitest';
import {onRequestGet} from '../../../functions/api/essay/catalog';
import source from '@/data/essay-source-registry.json';
it('APP and WEB receive the same existing source keys and question metadata',async()=>{
 const response=onRequestGet();const data=await response.json();
 expect(data.exams).toEqual(source.exams);expect(data.universities).toHaveLength(21);
 expect(data.exams.flatMap((e:{questions:unknown[]})=>e.questions)).toHaveLength(237);
 expect(data.exams.every((e:{evaluationReady:boolean})=>!e.evaluationReady)).toBe(true);
});
