import type {SourceExam} from '@/lib/essay-runtime/source-registry';
/** Some Registry session labels contain the entire exam title. Display it once. */
export function essayExamLabel(exam:SourceExam){
 const year=`${exam.year}학년도`;
 if(exam.session?.includes(year))return exam.session.slice(exam.session.indexOf(year));
 return `${year} ${exam.kind==='mock'?'모의논술':'수시논술'} · ${exam.track}${exam.session?' · '+exam.session:''}`;
}
