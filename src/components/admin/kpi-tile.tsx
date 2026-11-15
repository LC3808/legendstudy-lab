import Link from 'next/link';
export function KpiTile({label,value,note,tone,href}:{label:string;value:React.ReactNode;note?:React.ReactNode;tone?:'ok'|'warn'|'danger'|'info';href?:string}){
 const cls=`focus-kpi${tone?` focus-kpi--${tone}`:''}${href?' focus-kpi--link':''}`;
 const body=<>
  <p className="focus-kpi__l">{label}{href?<span className="focus-kpi__go" aria-hidden="true">→</span>:null}</p>
  <p className="focus-kpi__v">{value}</p>
  {note?<p className="focus-kpi__n">{note}</p>:null}
 </>;
 return href?<Link className={cls} href={href}>{body}</Link>:<div className={cls}>{body}</div>;
}
