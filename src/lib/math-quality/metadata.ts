import { object, text } from '@/lib/my/evaluation-report';
import type { StoredMathDetail } from './runtime/quality-client';
/** Only the operator RPC produces this versioned, additive contract. Never derive
 * user identities in the browser or infer an unverified exam label. */
export function qualityMetadata(d: StoredMathDetail) {
 const m=object(d.quality_metadata);
 if(m.version!=='quality-metadata-v1')return null;
 const subject=text(m.student_reference);
 if(!/^qs1_[0-9a-f]{64}$/.test(subject))return null;
 const attempt=text(m.attempt_id),root=text(m.root_attempt_id),lineage=text(m.lineage_id);
 if(!attempt||text(d.attempt_id)!==attempt||text(d.leaf_id)!==text(m.leaf_id)||text(d.profile_id)!==text(m.evaluation_profile_id)||text(object(d.profile).rubric_version)!==text(m.rubric_version))return null;
 const state=text(m.relationship_state);
 const linked=root!==''&&root===lineage&&(state==='ROOT'&&attempt===root&&!text(d.prior_evaluation_id)||state==='LINKED'&&!!text(m.predecessor_attempt_id)&&!!text(m.prior_evaluation_id)&&text(m.prior_evaluation_id)===text(d.prior_evaluation_id));
 return {subject,attempt,root:linked?root:null,state:linked?state:'UNLINKED',prior:text(m.prior_evaluation_id),predecessor:text(m.predecessor_attempt_id),problem:text(m.problem_id),set:text(m.problem_set_id),label:text(m.problem_label),leaf:text(m.leaf_id),profile:text(m.evaluation_profile_id),rubric:text(m.rubric_version),university:m.exam_metadata_verified===true?text(m.university_name):'',year:m.exam_metadata_verified===true&&Number.isInteger(m.academic_year)?m.academic_year as number:null};
}
export function sameTraceEdge(before:StoredMathDetail,after:StoredMathDetail) {
 if(text(after.prior_evaluation_id)!==before.evaluation_id||text(before.leaf_id)!==text(after.leaf_id)||text(before.profile_id)!==text(after.profile_id)||text(object(before.profile).rubric_version)!==text(object(after.profile).rubric_version))return false;
 const a=qualityMetadata(before),b=qualityMetadata(after);
 if(before.quality_metadata!==undefined||after.quality_metadata!==undefined)return !!a&&!!b&&!!a.root&&a.root===b.root&&a.subject===b.subject&&a.problem===b.problem&&a.set===b.set&&b.predecessor===a.attempt&&b.prior===before.evaluation_id;
 // Legacy contract remains readable until migration; identity is explicitly unknown.
 return true;
}
