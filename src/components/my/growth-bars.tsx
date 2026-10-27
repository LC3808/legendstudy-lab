import {criterionValues,resultHref,type GrowthPoint} from '@/lib/my/growth-history';
import {growthLabel} from '@/lib/my/growth-label';
import type {Change} from '@/lib/my/evaluation-report';
import styles from './growth-bars.module.css';
export function GrowthBars({changes=[],history,compact=false}:{changes?:Change[];history?:GrowthPoint[];compact?:boolean}){
 if(history)return <HistoryPlot points={history} minimal={compact}/>;
 return <div className={styles.grid}>{changes.map(c=><figure className={styles.item} key={c.id}>
 <figcaption><span className={styles.label}>{growthLabel(c.name,c.id)}</span><details><summary>평가 기준 전문</summary><p>{c.name}</p></details></figcaption>
 {c.before.stars!==null&&c.after.stars!==null?<div className={styles.plot} role="img" aria-label={`${growthLabel(c.name,c.id)}: 최초 ${c.before.stars}, 최근 ${c.after.stars} (5단계 기준)`}>
 <div className={styles.scale} aria-hidden="true">{[5,4,3,2,1,0].map(n=><span key={n}>{n}</span>)}</div>
 <div className={styles.columns} aria-hidden="true">{[['최초',c.before.stars],['최근',c.after.stars]].map(([label,value],i)=><div className={styles.column} key={label}><div className={styles.track}><div className={`${styles.bar} ${i?styles.recent:''}`} style={{height:`${Number(value)/5*100}%`}}><b>{value}</b></div></div><span>{label}</span></div>)}</div>
 </div>:<p>비교할 평가 단계가 저장되어 있지 않습니다.</p>}
 </figure>)}</div>;
}

const colors=['#175cd3','#b45309','#047857','#7c3aed','#be185d','#0e7490'];
function HistoryPlot({points,minimal=false}:{points:GrowthPoint[];minimal?:boolean}){
 const criteria=[...new Map(points.flatMap(p=>p.report.rubric.map(c=>[JSON.stringify([c.id,c.name]),c] as const))).values()];
 if(!points.length)return <p>저장된 평가가 없습니다.</p>;
 const compact=points.length>2?[points[0],points[points.length-1]]:points;
 return <div className={`${styles.history} ${minimal?styles.minimal:''}`}>
 <p>완료 평가 {points.length}회 · {points.length>2?(minimal?'전체 성장 과정':'최초·최신 요약'):'저장된 평가 단계'} (5단계)</p>
 {!minimal&&points.length>2&&<ul className={styles.summary}>{criteria.map(c=>{const values=criterionValues(compact,c.id,c.name);return <li key={c.id+c.name}><span>{growthLabel(c.name,c.id)}</span><strong>{values[0]??'—'} → {values[1]??'—'}</strong></li>;})}</ul>}
 {points.length<=2?<div className={styles.grid}>{criteria.map(c=>{const values=criterionValues(points,c.id,c.name);return <figure className={styles.item} key={c.id+c.name}><figcaption>{growthLabel(c.name,c.id)}{!minimal&&<details><summary>평가 기준 전문</summary><p>{c.name}</p></details>}</figcaption><div className={styles.plot}><div className={styles.scale} aria-hidden="true">{[5,4,3,2,1,0].map(n=><span key={n}>{n}</span>)}</div><div className={styles.columns}>{points.map((p,i)=><a className={styles.column} key={p.report.id} href={resultHref(p)} aria-label={`${p.label} ${growthLabel(c.name,c.id)} ${values[i]??'점수 없음'} · 결과 보기`}><div className={styles.track}>{values[i]!==null?<div className={`${styles.bar} ${i?styles.recent:''}`} style={{height:`${values[i]!/5*100}%`}}><b>{values[i]}</b></div>:<span>점수 없음</span>}</div><span>{p.label}</span></a>)}</div></div></figure>;})}</div>:null}
 {(!minimal||points.length>=3)&&<details className={styles.full} open={minimal||undefined}><summary>전체 성장 과정 보기 · {points.length}회</summary>
 {points.length>=3&&<>{!minimal&&<p>각 지점을 선택하면 해당 결과로 이동합니다. 점수가 없는 구간은 연결하지 않습니다.</p>}<div className={styles.scroll}><svg viewBox={`0 0 ${Math.max(600,points.length*100)} 270`} style={{minWidth:minimal?undefined:Math.max(600,points.length*100)}} role="img" aria-label="평가 순서별 전체 성장 과정 꺾은선그래프">
 {[1,2,3,4,5].map(n=><g key={n}><text x="8" y={226-n*40}>{n}</text><line x1="35" x2={Math.max(600,points.length*100)-20} y1={220-n*40} y2={220-n*40} stroke="#dfe5ed"/></g>)}
 {criteria.map((c,ci)=>{const values=criterionValues(points,c.id,c.name),color=colors[ci%colors.length],x=(i:number)=>55+i*(Math.max(600,points.length*100)-90)/(points.length-1);return <g key={c.id+c.name}>{values.map((v,i)=>v===null?null:<g key={i}>{i>0&&values[i-1]!==null&&<line x1={x(i-1)} y1={220-values[i-1]!*40} x2={x(i)} y2={220-v*40} stroke={color} strokeWidth="2" strokeDasharray={ci>=colors.length?'5 3':undefined}/>}<a href={resultHref(points[i])} aria-label={`${i+1}회 ${growthLabel(c.name,c.id)} ${v} · 결과 보기`}><circle cx={x(i)} cy={220-v*40} r="6" fill={color} stroke="white" strokeWidth="2"/><title>{points[i].label} · {c.name}: {v}/5</title></a></g>)}</g>;})}
 {points.map((p,i)=><text key={p.report.id} x={55+i*(Math.max(600,points.length*100)-90)/(points.length-1)} y="250" textAnchor="middle">{i+1}회</text>)}
 </svg></div><ul className={styles.legend}>{criteria.map((c,i)=><li key={c.id+c.name}><span style={{background:colors[i%colors.length]}}/>{growthLabel(c.name,c.id)}{!minimal&&<details><summary>기준 전문</summary>{c.name}</details>}</li>)}</ul></>}
 {!minimal&&<ol className={styles.sequence}>{points.map((p,i)=><li key={p.report.id}><a href={resultHref(p)}>{i+1}회 · {p.label} · {new Date(p.at).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'})} · 결과 보기</a><ul>{criteria.map(c=><li key={c.id+c.name}>{growthLabel(c.name,c.id)}: {criterionValues([p],c.id,c.name)[0]??'점수 없음'}</li>)}</ul></li>)}</ol>}
 </details>}{!minimal&&<p className="my-note">무료 재첨삭은 최초 완료 후 14일 이내 1회입니다. 새 답안의 유료 첨삭은 별도 회차로 표시합니다. 숫자 단계가 없는 결과는 점수로 환산하지 않습니다.</p>}
 </div>;
}
