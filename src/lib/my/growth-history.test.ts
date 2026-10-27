import {expect,it} from 'vitest';
import {growthHistory,criterionValues,resultHref} from './growth-history';
import type {Report} from './evaluation-report';
const report=(id:string,score:number|null,pins=['q','v1','e1','1.3']):Report=>({id,answer:'',question:'',summary:'',rubric:[{id:'c',name:'논리 구성',stars:score,value:'',feedback:''}],strengths:[],weaknesses:[],actions:[],nextSteps:[],pins,priorId:null});
const entry=(id:string,score:number|null,parent:string|null=null,pins?:string[])=>({run:{id,exam_id:'exam',created_at:`2026-10-${id.slice(-2)}T00:00:00Z`,parent_id:parent},reports:[report(id+'/q',score,pins)],title:()=> '시험 · 문제 1'});
it('retains single, pair and all chronological points including declines and missing scores',()=>{
 for(const n of [1,2,4]){const s=growthHistory([entry('r01',4),entry('r02',5,'r01'),entry('r03',null),entry('r04',2)].slice(0,n));expect(s).toHaveLength(1);expect(s[0].points).toHaveLength(n);}
 const s=growthHistory([entry('r04',2),entry('r01',4),entry('r02',5,'r01'),entry('r03',null)])[0];
 expect(criterionValues(s.points,'c','논리 구성')).toEqual([4,5,null,2]);expect(s.changes[0].direction).toBe('DECLINED');expect(s.points[2].label).toBe('새 답안 첨삭');expect(s.points[1].label).toBe('무료 재첨삭');expect(resultHref(s.points[1])).toContain('id=r02');
});
it('separates changed criteria versions, missing pins and different exams',()=>{const a=entry('r01',4),b=entry('r02',3,null,['q','v2','e1','1.3']),c=entry('r03',3,null,[]),d=entry('r04',2);d.run.exam_id='another';expect(growthHistory([a,b,c,d])).toHaveLength(4);});
it('does not connect renamed or duplicated criteria or mutate input records',()=>{const a=entry('r01',4),b=entry('r02',5);b.reports[0].rubric[0].name='근거 활용';const before=JSON.stringify([a,b]);const s=growthHistory([a,b])[0];expect(criterionValues(s.points,'c','논리 구성')).toEqual([4,null]);expect(JSON.stringify([a,b])).toBe(before);});
