// @vitest-environment jsdom
import {expect,it} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import {readOfficialRubric} from '@/lib/my/official-rubric';
import {OfficialRubricTable} from './official-rubric';
const payload={schema:'official-rubric-read-v1',status:'VERIFIED',criterion_id:'c',original_text:'원문',source:{package_digest:'digest',package_version:2,page:6,pdf_hash:'a'.repeat(64)},rows:[{score:'8~10',grade:'',description:'검수된 설명'}],bonus:'1점 가점 조건'};
const read=(v:unknown)=>readOfficialRubric(v,'c','digest','원문');
it('rejects candidate, stale package, wrong criterion and incomplete rows',()=>{
 expect(read(payload)).not.toBeNull();
 for(const change of [{status:'CANDIDATE_OWNER_REVIEW'},{criterion_id:'other'},{original_text:'different'},{source:{...payload.source,package_digest:'next'}},{rows:[{score:'8~10'}]}])expect(read({...payload,...change})).toBeNull();
});
it('renders verified score cells separately without inventing a student score',()=>{
 render(<OfficialRubricTable rubric={read(payload)!}/>);
 expect(screen.getByRole('rowheader').textContent).toBe('8~10');
 expect(screen.getByRole('cell').textContent).toBe('검수된 설명');
 expect(screen.getByText(/가점 조건:/)).toBeTruthy();cleanup();
});
