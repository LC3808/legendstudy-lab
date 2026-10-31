import type {OfficialRubric} from '@/lib/my/official-rubric';
/** Prepared renderer: candidates are not automatically attached to old results. */
export function OfficialRubricTable({rubric}:{rubric:OfficialRubric}){
 return <section><p>평가 당시 자료 v{rubric.source.package_version} · PDF {rubric.source.page}쪽</p><table style={{width:'100%',tableLayout:'fixed',overflowWrap:'anywhere'}}><thead><tr><th style={{width:'25%'}}>배점·등급</th><th>공식 채점기준</th></tr></thead><tbody>{rubric.rows.map((r,i)=><tr key={i}><th scope="row">{[r.score,r.grade].filter(Boolean).join(' · ')}</th><td style={{whiteSpace:'pre-wrap',textAlign:'left',padding:'12px'}}>{r.description}</td></tr>)}</tbody></table>{rubric.bonus&&<p>가점 조건: {rubric.bonus}</p>}</section>;
}
