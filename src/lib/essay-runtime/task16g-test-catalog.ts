import type {SourceExam} from './source-registry';
import type {MathEnvironment} from '../math-release/server/transport';
/** Reviewed official question metadata, isolated TEST only; never a public launch gate. */
export function task16gBrowser(origin:string|undefined){return origin==='https://legendstudy-task16b.pages.dev';}
export function task16gTest(request:Request,env:MathEnvironment){
 return new URL(request.url).hostname==='legendstudy-task16b.pages.dev'&&env.MATH_PROJECT_REF==='kpqbedylxlyntrrfybpn'&&env.MATH_SUPABASE_URL==='https://kpqbedylxlyntrrfybpn.supabase.co';
}
const hash='2a2e94097d97e3c758927146e0e68a1376d9996f3f474131b443c3ba65bcb7a4';
export const task16gExamId='b98fd0c9-8a84-5747-a35c-25755312aede';
export const task16gPdfs=['accf9b83-1dbf-5bc8-a771-21b8587d3564','42ebe3b3-2b04-5a21-80a3-75d332611f8b'].map((questionId,i)=>({examId:task16gExamId,questionId,kind:'student_question',bucket:'essay-material-originals',assetId:hash,sha256:hash,pageCount:3,startPage:i+2,verification:'VERIFIED',studentDisplay:'APPROVED'}));
export const task16gExam:SourceExam={key:'task16g-hanyang-2024-natural-am',dbExamId:task16gExamId,universityId:'1090e1be-174e-5042-abd3-ca929c6e26f8',sourceUniversityId:'hanyang',year:2024,kind:'admission',track:'자연계열',session:'오전',campus:null,verification:'VERIFIED',sourceHashes:[hash],evaluationReady:false,questions:task16gPdfs.map((pdf,i)=>({key:`task16g-hanyang-2024-natural-am-q${i+1}`,dbQuestionId:pdf.questionId,label:`문제 ${i+1}`,inputMode:'image',accountDraftReady:false,sourceLocator:`공식 문제 PDF ${i+2}쪽`,lengthLabel:null,studentPdf:pdf}))};
