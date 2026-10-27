'use client';
import {useState} from 'react';
import {useAuth} from '@/components/auth-context';
import {AdminSchoolName as SchoolName} from '@/components/admin/admin-school-name';
import {searchSchools,type SchoolOption} from '@/lib/admin/school';
import {assertOwner,saveMyProfile,type MyProfile} from '@/lib/my/data';
export function ProfileEditor({profile,reload,compact=false}:{profile:MyProfile;reload:()=>void;compact?:boolean}) {
 const {client,user}=useAuth();
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(profile),[query,setQuery]=useState(''),[results,setResults]=useState<SchoolOption[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const labels:Record<string,string>={student:'재학생',retaker:'재수/N수생',other:'해당 없음'};
 const school=<SchoolName office={draft.neis_office_code} school={draft.neis_school_code}/>;
 async function run(action:()=>Promise<void>){if(!client||!user||busy)return;setBusy(true);setError('');try{await assertOwner(client,user.id);await action();await assertOwner(client,user.id);}catch{setError('처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');}finally{setBusy(false);}}
 if(!editing&&compact)return <button className="button button--outline button--small" onClick={()=>setEditing(true)}>프로필 편집</button>;
 if(!editing){
  const hasSchool=Boolean(profile.neis_office_code&&profile.neis_school_code);
  const status=profile.academic_status?labels[profile.academic_status]??'확인 필요':hasSchool?'설정 안 함':null;
  if(!status)return <div className="my-facts-empty"><p className="my-empty">학교와 현재 상태를 아직 설정하지 않았습니다.</p><button type="button" className="button button--outline button--small" onClick={()=>setEditing(true)}>학교·학년 설정</button></div>;
  return <><dl className="my-facts">
   <div><dt>현재 상태</dt><dd>{status}</dd></div>
   {hasSchool
    ?<><div><dt>학교</dt><dd>{hasSchool?school:'아직 설정하지 않았습니다'}</dd></div><div><dt>학년</dt><dd>{profile.grade_level?`${profile.grade_level}학년`:'아직 설정하지 않았습니다'}</dd></div></>
    :<div><dt>학교·학년</dt><dd className="my-facts__muted">해당 없음</dd></div>}
  </dl><button type="button" className="button button--outline button--small" onClick={()=>setEditing(true)}>학교·학년 변경</button></>;
 }
 return <div className="my-goals my-profile-edit">
 <label>닉네임<input aria-label="닉네임" value={draft.display_name??''} maxLength={160} disabled={busy} onChange={e=>setDraft({...draft,display_name:e.target.value})}/></label>
 <form onSubmit={e=>{e.preventDefault();void run(async()=>{const rows=await searchSchools(query);await assertOwner(client!,user!.id);setResults(rows);if(!rows.length)setError('검색 결과가 없습니다.');});}}><label>학교 검색<input value={query} maxLength={100} disabled={busy} onChange={e=>setQuery(e.target.value)} placeholder="학교 이름을 검색해 주세요"/></label><button className="button button--outline" disabled={busy||!query.trim()}>검색</button></form>
 {results.length>0&&<ul className="my-search-results">{results.map(s=><li key={`${s.office}/${s.code}`}><span>{s.name}<small> · {s.address}</small></span><button className="button button--outline button--small" type="button" disabled={busy} onClick={()=>{setDraft({...draft,neis_office_code:s.office,neis_school_code:s.code});setResults([]);}}>선택</button></li>)}</ul>}
 <p>선택한 학교: {school}</p><button className="text-link" type="button" disabled={busy} onClick={()=>setDraft({...draft,neis_office_code:null,neis_school_code:null})}>학교 해당 없음</button>
 <form onSubmit={e=>{e.preventDefault();void run(async()=>{await saveMyProfile(client!,user!.id,draft);setEditing(false);reload();});}}>
 <fieldset className="my-grade-options" disabled={busy}><legend>학년</legend>{[
 {value:'1',label:'1학년'},{value:'2',label:'2학년'},{value:'3',label:'3학년'},
 {value:'retaker',label:'재수/N수생'},{value:'other',label:'해당 없음'},
 ].map(option=><label key={option.value}><input type="radio" name="profile-grade"
 value={option.value} checked={(draft.academic_status==='retaker'?'retaker':draft.academic_status==='other'?'other':draft.grade_level?String(draft.grade_level):'other')===option.value}
 onChange={()=>setDraft({...draft,academic_status:['1','2','3'].includes(option.value)?'student':option.value,grade_level:['1','2','3'].includes(option.value)?Number(option.value):null})}/><span>{option.label}</span></label>)}</fieldset>
 <div className="button-row"><button className="button button--primary" disabled={busy}>{busy?'저장 중':compact?'프로필 저장':draft.neis_school_code?'학교·학년 저장':'현재 상태 저장'}</button><button className="text-link" type="button" disabled={busy} onClick={()=>{setDraft(profile);setEditing(false);setError('');setResults([]);}}>취소</button></div>
 </form>{error&&<p role="alert">{error}</p>}
 </div>;
}
