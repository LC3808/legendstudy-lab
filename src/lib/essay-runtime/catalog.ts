import type {SupabaseClient} from '@supabase/supabase-js';
export type Exam = {id:string;university_id:string;admission_year:number;exam_name:string;exam_kind:string;campus:string|null;field_or_division:string|null;admission_track:string|null;official_source_url:string|null;universities:{name:string;slug:string}};
export type Question = {id:string;essay_exam_id:string;question_key:string;label:string;metadata_version:string;length_min:number|null;length_max:number|null;length_count_rule:string|null;time_limit_seconds:number|null};
export const isUuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function officialUrl(value:string|null){try{const u=new URL(value??'');return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export async function loadExams(client:SupabaseClient){
 const {data,error}=await client.from('essay_exams').select('id,university_id,admission_year,exam_name,exam_kind,campus,field_or_division,admission_track,official_source_url,universities!inner(name,slug)').eq('is_active',true).eq('verification_status','verified').eq('universities.is_active',true).order('admission_year',{ascending:false}).order('id').limit(200).abortSignal(AbortSignal.timeout(15000));
 if(error)throw error;return (data??[]) as unknown as Exam[];
}
export async function loadQuestions(client:SupabaseClient,examId:string){
 if(!isUuid(examId))throw Error('INVALID_EXAM');
 const {data,error}=await client.from('essay_questions').select('id,essay_exam_id,question_key,label,metadata_version,length_min,length_max,length_count_rule,time_limit_seconds').eq('essay_exam_id',examId).eq('is_published',true).order('display_order').order('id').limit(100).abortSignal(AbortSignal.timeout(15000));
 if(error)throw error;return (data??[]) as Question[];
}
export async function loadQuestion(client:SupabaseClient,id:string){
 if(!isUuid(id))throw Error('INVALID_QUESTION');
 const {data,error}=await client.from('essay_questions').select('id,essay_exam_id,question_key,label,metadata_version,length_min,length_max,length_count_rule,time_limit_seconds').eq('id',id).eq('is_published',true).abortSignal(AbortSignal.timeout(15000)).maybeSingle();
 if(error)throw error;if(!data)throw Error('QUESTION_UNAVAILABLE');return data as Question;
}
export function filterExams(rows:Exam[],query:string,year:string,campus:string){
 const q=query.trim().toLocaleLowerCase('ko-KR');return rows.filter(e=>(!year||String(e.admission_year)===year)&&(!campus||e.campus===campus)&&(!q||[e.universities.name,e.exam_name,e.field_or_division,e.admission_track,e.campus].join(' ').toLocaleLowerCase('ko-KR').includes(q)));
}
