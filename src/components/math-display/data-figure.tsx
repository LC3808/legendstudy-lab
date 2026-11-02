export type DataPoint={label:string;x:number;y:number|null;sourceValue:string};
/** No generated image, interpolation, executable formula, or inferred missing values. */
export function DataFigure({title,source,unit,points}:{title:string;source:string;unit:string;points:DataPoint[]}) {
 const valid=source.trim()&&points.length>0&&points.length<=200&&points.every(p=>Number.isFinite(p.x)&&(p.y===null||(Number.isFinite(p.y)&&p.sourceValue.trim()!==''&&Number(p.sourceValue.replaceAll(',',''))===p.y)))&&new Set(points.map(p=>p.x)).size===points.length;
 const present=points.filter((p):p is DataPoint&{y:number}=>p.y!==null&&Number.isFinite(p.y));
 const xs=present.map(p=>p.x),ys=present.map(p=>p.y),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(0,...ys),ymax=Math.max(0,...ys);
 const x=(v:number)=>48+(v-xmin)/(xmax-xmin||1)*504,y=(v:number)=>200-(v-ymin)/(ymax-ymin||1)*160;
 return <figure><figcaption>{title} · 단위: {unit}</figcaption><p>근거: {source||'원문 근거 미확인'}</p>
  {valid&&present.length>0?<svg viewBox="0 0 600 240" role="img" aria-label={`${title}: 원문 값의 점 그래프. 점 사이를 추정하지 않습니다.`} style={{width:'100%',maxWidth:600}}>
    <path d="M48 32V200H568" fill="none" stroke="currentColor"/>
    <text x="0" y="40" fontSize="12">{ymax}</text><text x="0" y="200" fontSize="12">{ymin}</text>
    {present.map(p=><g key={p.x}><circle cx={x(p.x)} cy={y(p.y)} r="4" fill="#305bc4"/><text x={x(p.x)} y="222" textAnchor="middle" fontSize="11">{p.label}</text><title>{p.label}: {p.sourceValue} {unit}</title></g>)}
  </svg>:<p role="status">값 또는 원문 근거를 확인하기 전에는 그래프를 표시하지 않습니다.</p>}
  <table><thead><tr><th>항목</th><th>원문 값</th><th>표시 값 ({unit})</th></tr></thead><tbody>{points.map((p,i)=><tr key={i}><th>{p.label}</th><td>{p.sourceValue}</td><td>{p.y===null?'미확인':String(p.y)}</td></tr>)}</tbody></table>
 </figure>;
}
