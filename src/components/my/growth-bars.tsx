import {growthLabel} from '@/lib/my/growth-label';
import type {Change} from '@/lib/my/evaluation-report';
import styles from './growth-bars.module.css';
export function GrowthBars({changes}:{changes:Change[]}){
 return <div className={styles.grid}>{changes.map(c=><figure className={styles.item} key={c.id}>
 <figcaption><span className={styles.label}>{growthLabel(c.name)}</span><details><summary>평가 기준 전문</summary><p>{c.name}</p></details></figcaption>
 {c.before.stars!==null&&c.after.stars!==null?<div className={styles.plot} role="img" aria-label={`${growthLabel(c.name)}: 최초 ${c.before.stars}, 최근 ${c.after.stars} (5단계 기준)`}>
 <div className={styles.scale} aria-hidden="true">{[5,4,3,2,1,0].map(n=><span key={n}>{n}</span>)}</div>
 <div className={styles.columns} aria-hidden="true">{[['최초',c.before.stars],['최근',c.after.stars]].map(([label,value],i)=><div className={styles.column} key={label}><div className={styles.track}><div className={`${styles.bar} ${i?styles.recent:''}`} style={{height:`${Number(value)/5*100}%`}}><b>{value}</b></div></div><span>{label}</span></div>)}</div>
 </div>:<p>비교할 평가 단계가 저장되어 있지 않습니다.</p>}
 </figure>)}</div>;
}
