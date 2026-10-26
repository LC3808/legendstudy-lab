import candidates from '../../../src/data/essay-student-pdf-candidates.json';
import {studentPdfForExam} from '../../../src/lib/materials/student-asset';
import {serverTransport,type MathEnvironment} from '../../../src/lib/math-release/server/transport';
import {legendStudySupabaseUrl} from '../../../src/lib/auth-config';
/** Approved question-only metadata. This does not grant Storage access or evaluation. */
export async function onRequestGet({request,env}:{request:Request;env:MathEnvironment}){
 const headers={'Cache-Control':'private, no-store','Vary':'Authorization'};
 const token=request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/)?.[1];
 if(!token)return Response.json({code:'LOGIN_REQUIRED'},{status:401,headers});
 if(env.MATH_ORIGIN!==new URL(request.url).origin||env.MATH_SUPABASE_URL!==legendStudySupabaseUrl)return Response.json({code:'UNAVAILABLE'},{status:503,headers});
 try{
  await serverTransport(env).subject(token,true);
  const questions=candidates.questions.flatMap(q=>{const pdf=studentPdfForExam(q.examId,q.questionId);return pdf?[{...pdf,examId:q.examId}]:[];});
  return Response.json({version:'essay-student-pdfs-v1',questions},{headers});
 }catch{return Response.json({code:'UNAVAILABLE'},{status:503,headers});}
}
