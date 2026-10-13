import type {SupabaseClient} from '@supabase/supabase-js';
import type {Detail,Document,ExamRow,ReviewBody} from './contract';
import type {SourcePages} from './analysis';
import {hashPdf,openPdf} from './pdf';
export function materialsClient(client:SupabaseClient){
 async function call<T>(name:string,p?:Record<string,unknown>):Promise<T>{const {data,error}=await client.rpc(name,p);if(error)throw Error(error.code==='40001'?'REVISION_CONFLICT':'MATERIAL_REQUEST_FAILED');return data as T;}
 return {
  allowed:()=>call<boolean>('is_quality_operator'),
  list:()=>call<ExamRow[]>('essay_material_list'),
  detail:(id:string)=>call<Detail>('essay_material_detail',{p_exam:id}),
  documents:()=>call<Document[]>('essay_material_documents'),
  save:(exam:string,revision:number,body:ReviewBody,state:string,approve=false)=>call<Detail>('essay_material_save',{p_exam:exam,p_revision:revision,p_body:body,p_state:state,p_request_approval:approve}),
  async analyze(examId:string,revision:number,sources:SourcePages[]){const {data}=await client.auth.getSession();if(!data.session)throw Error('LOGIN_REQUIRED');const response=await fetch('/api/materials/analyze',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({examId,revision,sources})});const result=await response.json();if(!response.ok)throw Error(typeof result.code==='string'?result.code:'ANALYSIS_FAILED');return result;},
  async load(d:Document){const {data,error}=await client.storage.from('essay-material-originals').download(d.object_key);if(error||!data)throw Error('PDF_UNAVAILABLE');const b=new Uint8Array(await data.arrayBuffer());if(await hashPdf(b)!==d.sha256)throw Error('SOURCE_HASH_MISMATCH');return b;},
  async upload(file:File){const bytes=new Uint8Array(await file.arrayBuffer());const hash=await hashPdf(bytes);const existing=(await call<Document[]>('essay_material_documents')).find(d=>d.sha256===hash);if(existing)return existing;const pdf=await openPdf(bytes);const pages=pdf.numPages;await pdf.destroy();const {error}=await client.storage.from('essay-material-originals').upload(hash+'.pdf',file,{contentType:'application/pdf',upsert:false});if(error){const retry=await client.storage.from('essay-material-originals').download(hash+'.pdf');if(retry.error||!retry.data||await hashPdf(new Uint8Array(await retry.data.arrayBuffer()))!==hash)throw Error('UPLOAD_FAILED');}return call<Document>('essay_material_register',{p_hash:hash,p_title:file.name,p_pages:pages});},
 };
}
