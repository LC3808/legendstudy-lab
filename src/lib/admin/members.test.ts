import {describe,it,expect} from 'vitest';
import {parseMemberDirectory,directorySchoolLabel} from './members';
const row={account_id:'a',email:'a@example.test',display_name:null,created_at:'2026-10-08T00:00:00Z',account_state:'NORMAL',academic_status:null,grade_level:null,intended_major:null,school_name:null,school_state:'unset'};
const page={version:'admin-members-v1',as_of:'2026-10-08T00:00:00Z',total:32,filtered_total:1,offset:0,limit:25,items:[row]};
describe('Admin directory contract',()=>{
 it('distinguishes resolved, unset and unresolved names without school codes',()=>{
  expect(directorySchoolLabel(parseMemberDirectory(page).items[0])).toBe('학교 미설정');
  expect(directorySchoolLabel(parseMemberDirectory({...page,items:[{...row,school_state:'unresolved'}]}).items[0])).toBe('학교명 확인 필요');
  expect(directorySchoolLabel(parseMemberDirectory({...page,items:[{...row,school_state:'resolved',school_name:'진접고등학교'}]}).items[0])).toBe('진접고등학교');
 });
 it('rejects malformed counts, duplicates and unsupported data instead of inventing empty rows',()=>{
  for(const bad of [{...page,filtered_total:33},{...page,items:null},{...page,filtered_total:2,items:[row,row]},{...page,items:[{...row,school_state:'resolved'}]},{...page,items:[{...row,grade_level:4}]}])expect(()=>parseMemberDirectory(bad)).toThrow();
 });
 it('keeps real totals distinct from the current page size',()=>{
  const result=parseMemberDirectory(page);expect(result.total).toBe(32);expect(result.items).toHaveLength(1);
 });
});
