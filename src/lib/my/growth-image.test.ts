import {expect,it} from 'vitest';
import {growthImageData} from './growth-image';
it('exports only titles, counts and compatible numeric bars, never private report fields',()=>{
 const criterion={id:'private-id',name:'논리',value:'',stars:3,feedback:'private rationale'};
 const result=growthImageData([{university:'대학',exam:'시험'}],2,[{title:'대학 · 시험',changes:[{id:'secret',name:'논리',before:criterion,after:{...criterion,stars:4},direction:'IMPROVED'}]}]);
 expect(result.series[0].bars).toEqual([{name:'논리',before:3,after:4}]);
 expect(JSON.stringify(result)).not.toMatch(/secret|private|feedback|answer|email/);
});
it('does not convert non numeric judgments into a growth scale',()=>{
 const c={id:'c',name:'풀이',value:'ADEQUATE',stars:null,feedback:''};
 expect(growthImageData([],0,[{title:'수리',changes:[{id:'c',name:'풀이',before:c,after:c,direction:'UNCHANGED'}]}]).series).toEqual([]);
});

it('does not expose stored marking guidance through a criterion name',()=>{
 const c={id:'c',name:'소문항 공식 요구: 비공개 채점 근거와 예시 답안',value:'',stars:4,feedback:''};
 const data=growthImageData([],1,[{title:'시험',changes:[{id:'c',name:c.name,before:c,after:c,direction:'UNCHANGED'}]}]);
 expect(data.series[0].bars[0].name).toBe('평가 기준명 확인 필요');expect(JSON.stringify(data)).not.toContain('비공개');
});
