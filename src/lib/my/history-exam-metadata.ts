import registry from '@/data/essay-source-registry.json';
import {betaExpansionCandidates} from '@/lib/essay-runtime/beta-expansion';
import {publicCatalog} from '@/lib/essay-runtime/public-discovery';
/** Identity lookup only. Names/labels never infer an exam or authorize evaluation. */
export function historyExamUniversity(examId:unknown){
 if(typeof examId!=='string')return undefined;
 const ids=new Set([registry.exams.find(e=>e.dbExamId===examId)?.universityId,betaExpansionCandidates.find(e=>e.examId===examId)?.universityId].filter((id):id is string=>typeof id==='string'&&!!id));
 if(ids.size!==1)return undefined;
 const matches=publicCatalog.universities.filter(u=>!!u.universityId&&ids.has(u.universityId));
 return matches.length===1?matches[0]:undefined;
}
