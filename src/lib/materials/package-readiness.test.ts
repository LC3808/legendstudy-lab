import {describe,it,expect} from 'vitest';
import {packageContentIssues,type ReviewBody} from './contract';
describe('material question content',()=>{
 it('rejects checked but empty question and intent-only text',()=>{
 const body:ReviewBody={documents:[],checks:{question:true},mappings:[{questionId:'q',sourceHash:'a',role:'intent',startPage:2,endPage:2,evidenceText:'actual question',verification:'VERIFIED'},{questionId:'q',sourceHash:'a',role:'question',startPage:6,endPage:6,evidenceText:' ',verification:'VERIFIED'}]};
 expect(packageContentIssues(body,[{id:'q',label:'문제1',sourceKey:'q'}])).toHaveLength(1);
 body.mappings[0].role='question';
 expect(packageContentIssues(body,[{id:'q',label:'문제1',sourceKey:'q'}])).toEqual([]);
 });
});
