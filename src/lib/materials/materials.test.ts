import {describe,it,expect} from 'vitest';
import {classifyPages} from './contract';
import {studentPdf} from './student-asset';
const asset={kind:'student_question',questionId:'q',assetId:'asset-1',sha256:'a'.repeat(64),pageCount:3,startPage:2,verification:'VERIFIED',studentDisplay:'APPROVED'};
describe('shared student delivery boundary',()=>{
 it('requires approved question-only asset and exact question',()=>{expect(studentPdf(asset,'q')).not.toBeNull();expect(studentPdf(asset,'other')).toBeNull();for(const p of [{kind:'original'},{studentDisplay:'UNVERIFIED'},{verification:'NEEDS_REVIEW'},{assetId:'../../original'},{startPage:4},{pageCount:0}])expect(studentPdf({...asset,...p},'q')).toBeNull();});
 it('does not label candidate pages verified or invent a question mapping',()=>{const rows=classifyPages(['문제 1 제시문','출제의도 채점기준 예시답안'],'a'.repeat(64));expect(rows.length).toBe(4);expect(rows.every(r=>r.verification==='NEEDS_REVIEW'&&r.questionId==='')).toBe(true);expect(rows[1].startPage).toBe(2);});
 it('keeps scanned documents unclassified for human inspection',()=>expect(classifyPages([''],'a'.repeat(64))).toEqual([]));
});
