import {it,expect,vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';
import {loadRegisteredMaterials,projectRegisteredExam} from './registered-material-catalog';
import {catalogUniversity} from './public-discovery';
import type {ExamRow,Detail} from '../materials/contract';
const id='00000000-0000-4000-8000-000000000001';
const row={examId:id,universityId:catalogUniversity('gachon')!.universityId!,university:'가천대학교',year:2027,kind:'mock',track:'의예',title:'2027 모의',questionCount:1} as ExamRow;
const detail={examId:id,questions:[{id,label:'문제 1',sourceKey:'source:example'}],documents:[{object_key:'PRIVATE_PATH'}],review:{body:{notes:'PRIVATE_EVIDENCE'}}} as unknown as Detail;
it('projects DB identity and metadata without private evidence or evaluation authority',()=>{
 const result=projectRegisteredExam('gachon',row,detail);
 expect(result).toMatchObject({dbExamId:id,year:2027,kind:'mock',verification:'REVIEW_REQUIRED',evaluationReady:false,questions:[{dbQuestionId:id,accountDraftReady:false}]});
 expect(JSON.stringify(result)).not.toMatch(/PRIVATE_/);
});
it('rejects mismatched, duplicate or incomplete question sets',()=>{
 for(const value of [{...detail,examId:'other'},{...detail,questions:[]},{...detail,questions:[detail.questions[0],detail.questions[0]]}])expect(()=>projectRegisteredExam('gachon',row,value)).toThrow();
});
it('does not query private materials for a non-operator',async()=>{
 const rpc=vi.fn().mockResolvedValueOnce({error:{code:"PGRST202"}}).mockResolvedValue({data:false,error:null});
 expect(await loadRegisteredMaterials({rpc} as unknown as SupabaseClient,'gachon')).toEqual([]);
 expect(rpc.mock.calls).toEqual([['essay_browse_catalog',{p_university:'gachon'}],['is_quality_operator']]);
});
it('uses existing operator RPC and loads only the selected university',async()=>{
 const rpc=vi.fn().mockResolvedValueOnce({error:{code:"PGRST202"}}).mockResolvedValueOnce({data:true}).mockResolvedValueOnce({data:[row,{...row,universityId:id,university:'다른 대학'}]}).mockResolvedValueOnce({data:detail});
 expect(await loadRegisteredMaterials({rpc} as unknown as SupabaseClient,'gachon')).toHaveLength(1);
 expect(rpc.mock.calls[3]).toEqual(['essay_material_detail',{p_exam:id}]);
});
it('fails closed on RPC errors without inventing registered exams',async()=>{
 const rpc=vi.fn().mockResolvedValueOnce({error:{code:"PGRST202"}}).mockResolvedValueOnce({data:true}).mockResolvedValueOnce({error:{message:'denied'}});
 await expect(loadRegisteredMaterials({rpc} as unknown as SupabaseClient,'gachon')).rejects.toThrow();
});

it('uses metadata RPC for ordinary users without loading reviewer data',async()=>{
 const rpc=vi.fn().mockResolvedValue({data:[{...row,questions:detail.questions}]});
 expect(await loadRegisteredMaterials({rpc} as unknown as SupabaseClient,'gachon')).toHaveLength(1);
 expect(rpc.mock.calls).toEqual([['essay_browse_catalog',{p_university:'gachon'}]]);
});
it('does not fall back to private RPC on metadata permission failure',async()=>{
 const rpc=vi.fn().mockResolvedValue({error:{code:'42501'}});
 await expect(loadRegisteredMaterials({rpc} as unknown as SupabaseClient,'gachon')).rejects.toThrow();
 expect(rpc).toHaveBeenCalledTimes(1);
});
