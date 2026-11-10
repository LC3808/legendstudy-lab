'use client';
import {useState,useEffect} from 'react';
import {useAuth} from '@/components/auth-context';
import {AdminPanel,AdminLoading} from './admin-surface';
import {AdminSchoolName} from './admin-school-name';

type AppRow={application_id:string;student_name:string;office_code:string|null;school_code:string|null;student_status:string|null;grade_level:number|null;university:string;intended_division:string;admission_type:string;admission_name:string;admission_year:number;created_at:string;status:string|null;ever_accepted:boolean};
type Roster={offset:number;limit:number;total:number;has_more:boolean;items:AppRow[]};
const STATUS:Record<string,string>={planned:'지원 예정',submitted:'제출',stage_pass:'1단계 합격',accepted:'최종 합격',additional_acceptance:'추가 합격',rejected:'불합격',registered:'등록',not_registered:'미등록'};
function statusText(s:string|null,ever:boolean):string{
  const base=s?STATUS[s]??s:'결과 미입력';
  return ever&&s!=null&&['registered','not_registered'].includes(s)?`${base} · 합격`:base;
}
const STUDENT:Record<string,string>={student:'재학생',retaker:'N수·검정고시'};

/** 관리자 상세: 개별 지원 목록(누가·어디에·전형·상태). operator 전용. admin_applications_list RPC
 * 미적용 시 '준비 중'으로 degrade. 기간 필터 없이 전체 지원을 페이지로 보여준다. */
export function ApplicationsRoster(){
  const {client,user}=useAuth();
  const [offset,setOffset]=useState(0);
  const [result,setResult]=useState<{key:string;data?:Roster;error?:boolean}|null>(null);
  const key=JSON.stringify([offset,user?.id]);
  useEffect(()=>{let active=true;if(!client||!user)return;void Promise.resolve(client.rpc('admin_applications_list',{p_offset:offset})).then(({data,error})=>{if(active)setResult(error?{key,error:true}:{key,data:data as Roster});}).catch(()=>{if(active)setResult({key,error:true});});return()=>{active=false;};},[client,user,key,offset]);
  const cur=result?.key===key?result:null;
  if(!cur)return <AdminPanel title="개별 지원 목록 · 누가 어디에 지원했나"><AdminLoading/></AdminPanel>;
  if(cur.error||!cur.data)return <AdminPanel title="개별 지원 목록 · 누가 어디에 지원했나 (준비 중)"><p>개별 지원 목록은 <code>admin_applications_list</code> RPC가 운영에 적용되면 표시됩니다. 학생별로 어느 대학·학과에 어떤 전형으로 지원했고 현재 상태가 무엇인지 확인할 수 있습니다.</p></AdminPanel>;
  const d=cur.data;
  return <AdminPanel title={`개별 지원 목록 · 총 ${d.total.toLocaleString()}건`}>
    {d.items.length===0?<p>아직 입력된 실제 지원이 없습니다.</p>:<>
    <div className="admin-table-scroll"><table className="admin-table">
      <thead><tr><th scope="col">학생</th><th scope="col">학교</th><th scope="col">대학</th><th scope="col">학과·모집단위</th><th scope="col">전형</th><th scope="col">학년도</th><th scope="col">상태</th></tr></thead>
      <tbody>{d.items.map(a=><tr key={a.application_id}>
        <td>{a.student_name}{a.student_status?` · ${a.grade_level&&a.student_status==='student'?`고${a.grade_level}`:STUDENT[a.student_status]??a.student_status}`:''}</td>
        <td>{a.office_code&&a.school_code?<AdminSchoolName office={a.office_code} school={a.school_code}/>:'미입력'}</td>
        <td>{a.university}</td>
        <td>{a.intended_division}</td>
        <td>{a.admission_type}{a.admission_name?` · ${a.admission_name}`:''}</td>
        <td>{a.admission_year}</td>
        <td>{statusText(a.status,a.ever_accepted)}</td>
      </tr>)}</tbody>
    </table></div>
    <div className="admin-pagination"><button type="button" className="button button--outline button--small" disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-25))}>이전</button><span aria-live="polite">{Math.floor(offset/25)+1} 페이지</span><button type="button" className="button button--outline button--small" disabled={!d.has_more} onClick={()=>setOffset(offset+25)}>다음</button></div>
    </>}
    <p className="admin-muted">operator 권한 전용 · 학생이 직접 입력한 실제 지원 기준입니다. 같은 대학에 복수 전형·학과 지원이 가능합니다. 합격 이력은 등록·미등록 이후에도 「합격」으로 함께 표시합니다.</p>
  </AdminPanel>;
}
