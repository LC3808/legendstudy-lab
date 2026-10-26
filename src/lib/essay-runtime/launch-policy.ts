import holds from '../../data/essay-launch-holds.json';
/** Exact Registry identities; never infer an evaluator from a university name. */
export function examLaunchHold(examId:unknown){return typeof examId==='string'?holds.exams.find(e=>e.examId===examId)?.reason:undefined;}
