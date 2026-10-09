/** Display-only contract growth-display-v1. Never persists or re-evaluates results. */
export type Feedback={title:string;explanation:string;evidence:string;action:string};
export type Criterion={id:string;name:string;value:string;stars:number|null;feedback:string};
export type Report={id:string;answer:string;question:string;summary:string;rubric:Criterion[];strengths:Feedback[];weaknesses:Feedback[];actions:string[];nextSteps:string[];pins:string[];priorId:string|null};
export function object(v:unknown):Record<string,unknown>{return v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};}
export function array(v:unknown):unknown[]{return Array.isArray(v)?v:[];}
export function text(v:unknown):string{return typeof v==='string'?v:'';}
export function rating(v:unknown):number|null{return typeof v==='number'&&Number.isInteger(v)&&v>=1&&v<=5?v:null;}
export function stars(v:number):string{return '★'.repeat(v)+'☆'.repeat(5-v);}
const labels:Record<string,string>={logical_development:'논리적 전개',computation_accuracy:'계산의 정확성',final_conclusion:'최종 결론',problem_understanding:'문제 이해',concept_selection:'개념 선택',solution_strategy:'풀이 전략',justification_completeness:'근거의 충실성',mathematical_writing:'수학적 표현',case_analysis:'경우 분석',graph_interpretation:'그래프 해석'};
const verdicts:Record<string,string>={STRONG:'충실',ADEQUATE:'대체로 충실',NEEDS_IMPROVEMENT:'보완 필요',INSUFFICIENT:'부족',NOT_APPLICABLE:'해당 없음',NOT_ASSESSABLE:'판단 어려움',satisfied:'충족',partially_satisfied:'일부 충족',not_satisfied:'미충족',not_determinable:'판단 어려움'};
const overall:Record<string,string>={ANSWER_CORRECT_AND_REASONING_SUFFICIENT:'답을 정확하게 구했고, 풀이 근거도 충분히 설명했어요.',ANSWER_CORRECT_REASONING_INCOMPLETE:'답은 맞았어요. 다만 풀이 근거를 더 설명해야 해요.',ANSWER_INCORRECT_APPROACH_MOSTLY_VALID:'접근 방법은 대체로 타당하지만, 답은 맞지 않았어요.',FUNDAMENTAL_APPROACH_ERROR:'문제에 접근하는 방법부터 다시 살펴볼 필요가 있어요.',NOT_DETERMINABLE:'현재 답안만으로는 정확한 판단이 어려워요.'};
export function criterionValue(c:Criterion){return c.stars===null?(verdicts[c.value]??c.value):stars(c.stars);}
export function mathReport(value:unknown):Report{
 const v=object(value),out=object(v.output),profile=object(v.profile),prov=object(out.provenance),o=object(out.overall);
 const steps=array(out.steps).map(object),core=array(out.core).map(object),errors=array(out.errors).map(object);
 const feedback=(s:Record<string,unknown>):Feedback=>({title:`풀이 ${s.position??''}`,explanation:text(s.explanation),evidence:text(s.representation),action:''});
 const strengths=steps.filter(s=>s.status==='VALID').map(feedback);
 const weaknesses=core.map(c=>({title:text(c.title),explanation:[text(c.diagnosis),text(c.why)].filter(Boolean).join('\n'),evidence:text(steps.find(s=>s.id===c.step_id)?.representation),action:text(c.next_action)}));
 for(const e of errors)if(!core.some(c=>c.error_id===e.id))weaknesses.push({title:'확인할 부분',explanation:text(e.explanation),evidence:text(steps.find(s=>s.id===e.step_id)?.representation),action:''});
 // No hints/generated solutions: their release remains under the learning runtime.
 return {id:text(v.evaluation_id),answer:text(v.typed_answer),question:text(object(v.problem).statement),summary:overall[text(o.explanation)]??text(o.explanation),
  rubric:[...array(out.criteria).map(object).map(c=>{const definition=array(v.criteria).map(object).map(x=>object(x.criterion)).find(d=>d.id===c.criterion_id);return {id:'criterion:'+text(c.criterion_id),name:text(definition?.description)||'대학 평가 기준',value:text(c.verdict),stars:null,feedback:text(c.explanation)};}),...Object.entries(object(out.rubric)).map(([id,value])=>({id,name:labels[id]??id,value:text(value),stars:null,feedback:''}))],strengths,weaknesses,actions:core.map(c=>text(c.next_action)).filter(Boolean),nextSteps:[],
  pins:[text(v.leaf_id),text(v.profile_id),text(profile.rubric_version),text(out.contract_version),text(prov.provider),text(prov.model_version),text(prov.prompt_version),text(v.kind)==='STEP_RETRY'?'': 'full-answer'],priorId:text(v.prior_evaluation_id)||null};
}
/** Nulls/unknown schema never become stars. Existing five-level educational rubric is identity mapped. */
export function humanReport(value:unknown,answer='',question='',attempt:unknown=null):Report{
 const v=object(value),a=object(attempt),snapshot=object(v.input_snapshot);const criteria=array(snapshot.criteria).map(object);const progress=array(v.essay_improvement_progress).map(object);
 return {id:text(v.id),answer,question,summary:text(v.overall_summary),
 rubric:array(v.essay_evaluation_dimensions).map(object).sort((a,b)=>Number(a.display_order)-Number(b.display_order)).map(d=>({id:text(d.criterion_id),name:text(object(d.essay_evaluation_criteria).label)||`평가 항목 ${d.display_order??''}`,value:'',stars:rating(d.level_1_to_5),feedback:text(d.explanation)})),
 strengths:array(v.strengths).map(s=>({title:'잘한 점',explanation:text(s),evidence:'',action:''})).filter(s=>s.explanation!==''),
 weaknesses:progress.filter(p=>p.status!=='resolved').map(p=>({title:text(p.title),explanation:text(p.explanation),evidence:'',action:text(p.next_action)})),
 actions:progress.map(p=>text(p.next_action)).filter(Boolean),nextSteps:array(v.rewrite_checklist).map(text).filter(Boolean),
 // Legacy results without pinned conditions are intentionally not compared.
 pins:v.evidence_completeness==='complete'&&criteria.length&&criteria.every(c=>text(c.id)&&text(c.version))&&Object.keys(object(a.conditions_snapshot)).length ? [text(v.session_id),text(v.question_id),text(v.regime_key),text(v.contract_version),text(a.mode),text(a.question_metadata_version),stable(a.conditions_snapshot),stable(criteria.map(c=>({id:c.id,version:c.version})).sort((a,b)=>text(a.id).localeCompare(text(b.id))))]:[],priorId:null};
}
export type Change={id:string;name:string;before:Criterion;after:Criterion;direction:'IMPROVED'|'UNCHANGED'|'DECLINED'|'UNAVAILABLE'};
export function compareReports(before:Report,after:Report):Change[]|null{
 if(!before.id||after.priorId!==before.id||!before.pins.length||before.pins.length!==after.pins.length||before.pins.some((p,i)=>!p||p!==after.pins[i]))return null;
 if(!before.rubric.length||before.rubric.length!==after.rubric.length||new Set(before.rubric.map(c=>c.id)).size!==before.rubric.length||new Set(after.rubric.map(c=>c.id)).size!==after.rubric.length)return null;
 const ranks:Record<string,number>={STRONG:4,ADEQUATE:3,NEEDS_IMPROVEMENT:2,INSUFFICIENT:1,satisfied:3,partially_satisfied:2,not_satisfied:1};
 const changes:Change[]=[];
 for(const a of after.rubric){const b=before.rubric.find(c=>c.id===a.id);if(!b)return null;
  const x=b.stars??ranks[b.value],y=a.stars??ranks[a.value];
  changes.push({id:a.id,name:a.name,before:b,after:a,direction:x===undefined||y===undefined?'UNAVAILABLE':y>x?'IMPROVED':y<x?'DECLINED':'UNCHANGED'});
 }
 return changes;
}
export const changeLabels={IMPROVED:'향상',UNCHANGED:'동일',DECLINED:'하락',UNAVAILABLE:'비교 불가'};

function stable(v:unknown):string {if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(v!==null&&typeof v==='object')return '{'+Object.entries(object(v)).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>JSON.stringify(k)+':'+stable(x)).join(',')+'}';return JSON.stringify(v)??'';}
