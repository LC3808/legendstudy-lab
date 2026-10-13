'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {MaterialExamList} from './material-exam-list';
import {useAuth} from '@/components/auth-context';
import {materialsClient} from '@/lib/materials/client';
import {type Detail,type Document,type ExamRow} from '@/lib/materials/contract';
import {ReviewEditor} from './review-editor';
import './materials.css';
export function MaterialsConsole(){
 const auth=useAuth();
 if(auth.status!=='authenticated'||!auth.user||!auth.client||auth.recoveryActive)return <p>관리자 계정으로 로그인해 주세요. <Link href="/login/">로그인</Link></p>;
 return <AuthorizedConsole key={auth.user.id} client={materialsClient(auth.client)} owner={auth.user.id}/>;
}
export function AuthorizedConsole({client:incoming,owner}:{client:ReturnType<typeof materialsClient>;owner:string}){
 const [client]=useState(incoming);const [rows,setRows]=useState<ExamRow[]>([]),[detail,setDetail]=useState<Detail|null>(null),[docs,setDocs]=useState<Document[]>([]),[university,setUniversity]=useState(''),[allowed,setAllowed]=useState(false),[notice,setNotice]=useState('권한을 확인하고 있어요.');
 useEffect(()=>{let active=true;void(async()=>{try{if(!await client.allowed()){if(active)setNotice('자료 검수 권한이 없습니다.');return;}const [r,d]=await Promise.all([client.list(),client.documents()]);if(active){setRows(r);setDocs(d);setAllowed(true);setNotice('');}}catch{if(active)setNotice('자료 관리 서버에 연결하지 못했습니다. 운영 적용 상태를 확인해 주세요.');}})();return()=>{active=false;};},[client]);
 async function select(id:string){try{setDetail(await client.detail(id));setNotice('');}catch{setNotice('검수 자료를 불러오지 못했습니다. 다시 선택해 주세요.');}}
 function savedReview(d:Detail, completed:boolean){
  setRows(current=>current.map(r=>r.examId===d.examId?{...r,state:d.review.state,revision:d.review.revision,approvalRequested:d.review.approvalRequested}:r));
  if(completed){setUniversity(rows.find(r=>r.examId===d.examId)?.universityId??university);setDetail(null);setNotice('검수 완료 상태를 저장했습니다.');}
 }
 return <main className="materials-console"><Link href="/admin/">← 관리자</Link><h1>논술 자료 검수</h1>{notice&&<p role="status">{notice}</p>}{allowed&&<><div hidden={!!detail}><MaterialExamList rows={rows} university={university} onUniversity={setUniversity} onSelect={id=>void select(id)}/></div>{detail&&<ReviewEditor key={detail.examId} initial={detail} exam={rows.find(r=>r.examId===detail.examId)} documents={docs} client={client} owner={owner} back={()=>setDetail(null)} updated={d=>setDocs(d)} onSaved={savedReview}/>}</>}</main>;
}
