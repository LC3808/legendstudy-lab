'use client';
import {useState} from 'react';
import {useAuth} from '@/components/auth-context';
import {AdminSchoolName as SchoolName} from '@/components/admin/admin-school-name';
import {searchSchools,type SchoolOption} from '@/lib/admin/school';
import {assertOwner,saveMyProfile,type MyProfile} from '@/lib/my/data';
export function ProfileEditor({profile,reload}:{profile:MyProfile;reload:()=>void}) {
 const {client,user}=useAuth();
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(profile),[query,setQuery]=useState(''),[results,setResults]=useState<SchoolOption[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const labels:Record<string,string>={student:'재학생',retaker:'N수·검정고시 등',other:'기타'};
 const school=<SchoolName office={draft.neis_office_code} school={draft.neis_school_code}/>;
 async function run(action:()=>Promise<void>){if(!client||!user||busy)return;setBusy(true);setError('');try{await assertOwner(client,user.id);await action();await assertOwner(client,user.id);}catch{setError('처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');}finally{setBusy(false);}}
 if(!editing)return <><dl className="my-profile"><div><dt>학교</dt><dd>{school}</dd></div><div><dt>현재 상태</dt><dd>{profile.academic_status ? labels[profile.academic_status]??'확인 필요' : '설정 안 함'}{profile.academic_status==='student'&&profile.grade_level ? ` · ${profile.grade_level}학년` : ''}</dd></div></dl><button type="button" className="button button--outline" onClick={()=>setEditing(true)}>학교·현재 상태 변경</button></>;
 return <div className="my-goals">
 <form onSubmit={e=>{e.preventDefault();void run(async()=>{const rows=await searchSchools(query);await assertOwner(client!,user!.id);setResults(rows);if(!rows.length)setError('검색 결과가 없습니다.');});}}><label>학교 검색<input value={query} maxLength={100} disabled={busy} onChange={e=>setQuery(e.target.value)} placeholder="학교 이름을 검색해 주세요"/></label><button className="button button--outline" disabled={busy||!query.trim()}>검색</button></form>
 {results.length>0&&<ul className="my-search-results">{results.map(s=><li key={`${s.office}/${s.code}`}><span>{s.name}<small> · {s.address}</small></span><button className="button button--outline button--small" type="button" disabled={busy} onClick={()=>{setDraft({...draft,neis_office_code:s.office,neis_school_code:s.code});setResults([]);}}>선택</button></li>)}</ul>}
 <p>선택한 학교: {school}</p><button className="text-link" type="button" disabled={busy} onClick={()=>setDraft({...draft,neis_office_code:null,neis_school_code:null})}>학교 해당 없음</button>
 <form onSubmit={e=>{e.preventDefault();void run(async()=>{await saveMyProfile(client!,user!.id,draft);setEditing(false);reload();});}}>
 <label>현재 상태<select aria-label="현재 상태" value={draft.academic_status??''} disabled={busy} onChange={e=>setDraft({...draft,academic_status:e.target.value||null,grade_level:e.target.value==='student'?draft.grade_level:null})}><option value="">설정 안 함</option>{Object.entries(labels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
 {draft.academic_status==='student'&&<label>학년<select aria-label="학년" value={draft.grade_level??''} disabled={busy} onChange={e=>setDraft({...draft,grade_level:e.target.value?Number(e.target.value):null})}><option value="">설정 안 함</option>{[1,2,3].map(v=><option value={v} key={v}>{v}학년</option>)}</select></label>}
 <div className="button-row"><button className="button button--outline" disabled={busy}>{busy?'저장 중':'학교·상태 저장'}</button><button className="text-link" type="button" disabled={busy} onClick={()=>{setDraft(profile);setEditing(false);setError('');setResults([]);}}>취소</button></div>
 </form>{error&&<p role="alert">{error}</p>}
 </div>;
}
