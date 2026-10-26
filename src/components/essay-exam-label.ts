import type {SourceExam} from '@/lib/essay-runtime/source-registry';
/** Some Registry session labels contain the entire exam title. Display it once. */
export function essayExamLabel(exam:SourceExam){
 const year=`${exam.year}학년도`;
 if(exam.session?.includes(year))return exam.session.slice(exam.session.indexOf(year));
 const session=exam.session&&/\b(mock|admission)\b/.test(exam.session)?exam.session.split('·').map(v=>v.trim()).filter(v=>v&&v!==String(exam.year)&&v!==exam.track&&!/대학교|\b(mock|admission)\b/.test(v)).join(' · '):exam.session;
 return `${year} ${exam.kind==='mock'?'모의논술':'수시논술'} · ${exam.track}${session?' · '+session:''}`;
}
