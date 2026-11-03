import {expect,it} from 'vitest';
import {historyExamUniversity} from './history-exam-metadata';
it('uses verified exact IDs for a newly registered exam, never a university-like string',()=>{
 expect(historyExamUniversity('70b0ddd5-0816-5395-8ac5-6a4e3664a282')).toMatchObject({name:'인하대학교',sourceUniversityId:'inha',universityId:'e40f4b8f-8949-4726-a774-2b6f0e6d8939'});
 for(const id of ['인하대학교','2027 인하 자연','unknown',undefined])expect(historyExamUniversity(id)).toBeUndefined();
});
