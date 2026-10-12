import registry from '@/data/essay-source-registry.json';
export type SourceQuestion={accountDraftReady?:boolean;inputMode?:"image"|"text";key:string;dbQuestionId:string|null;label:string;sourceLocator:string|null;lengthLabel:string|null};
export type SourceExam={key:string;dbExamId:string|null;universityId:string|null;sourceUniversityId:string;year:number;kind:string;track:string;session:string|null;campus:string|null;verification:string;sourceHashes:string[];questions:SourceQuestion[];evaluationReady:boolean};
/** Public metadata only. Neither source PDFs nor private evaluation evidence belong here. */
export function sourceExams(university:string):SourceExam[]{return registry.exams.filter(e=>e.sourceUniversityId===university&&e.verification==='VERIFIED') as SourceExam[];}
export const sourceCoverage=registry.coverage;
