import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
import {EvaluationReport,EvaluationComparison} from '../../src/components/my/evaluation-report';
import {examReports,examQuestionLabel} from '../../src/lib/my/exam-history';
import '../../src/components/my/essay-dashboard.css';
import './review.css';
declare const REVIEW_KEY:string;
const auth=createClient('https://stlhijzpjfgwwdgunlsd.supabase.co',REVIEW_KEY,{auth:{storageKey:'legendstudy-lab-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
type Run=Record<string,unknown>;
async function read(id?:string):Promise<Run[]>{const {data:{session}}=await auth.auth.getSession();if(!session)throw Error('기존 운영 사이트에서 로그인한 뒤 이 화면을 다시 열어 주세요.');const response=await fetch('/api/owner-review/essay'+(id?'?run='+encodeURIComponent(id):''),{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});if(!response.ok)throw Error(response.status===403?'관리자만 이용할 수 있는 검수 화면입니다.':response.status===401?'로그인을 다시 확인해 주세요.':'저장된 결과를 조회하지 못했습니다.');const data=await response.json();const current=await auth.auth.getSession();if(current.data.session?.user.id!==session.user.id)throw Error('계정이 변경되었습니다. 화면을 다시 열어 주세요.');return data.runs;}
function App(){
 const [runs,setRuns]=useState<Run[]>([]),[selected,setSelected]=useState<Run|null>(null),[prior,setPrior]=useState<Run|null>(null),[message,setMessage]=useState('관리자 권한과 저장된 기록을 확인하고 있어요.'),[busy,setBusy]=useState(true);
 useEffect(()=>{let active=true;let owner:string|null|undefined;const {data:{subscription}}=auth.auth.onAuthStateChange((_event,session)=>{const next= session?.user.id??null;if(owner!==undefined&&owner!==next){setRuns([]);setSelected(null);setPrior(null);setMessage('계정이 변경되었습니다. 화면을 다시 열어 주세요.');}owner=next;});
 async function start(){try{const data=await read();if(active){setRuns(data);setMessage(data.length?'':'저장된 시험 기록이 없습니다.');}}catch(e){if(active)setMessage((e as Error).message);}finally{if(active)setBusy(false);}}void start();return()=>{active=false;subscription.unsubscribe();};},[]);

 async function select(id:string){setBusy(true);setSelected(null);setPrior(null);setMessage('저장된 결과를 조회하고 있어요.');try{const data=await read(id);if(data.length!==1)throw Error('해당 기록을 찾을 수 없습니다.');const run=data[0];let parent:Run|null=null;if(typeof run.parent_id==='string'){const parents=await read(run.parent_id);parent=parents[0]??null;}setSelected(run);setPrior(parent);setMessage('');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 let reports:ReturnType<typeof examReports>=[],previous:ReturnType<typeof examReports>=[],parseError=false;
 try{if(selected)reports=examReports(selected);if(prior)previous=examReports(prior);}catch{parseError=true;}
 return <main className="essay-personal my-dashboard content-wrap content-wrap--detail"><header className="my-panel"><h1>Owner 전용 첨삭 결과 검수</h1><p><strong>실제 저장 결과 · 읽기 전용</strong> — UI 기준 1390452</p><p>합성 Fixture가 아닙니다. 기존 로그인과 본인 기록만 사용합니다. 제출·재처리·답안 저장은 이 화면에서 실행하지 않습니다.</p><a href="/login/?next=%2Fowner-review%2Fessay%2F">기존 로그인 화면</a> · <a href="/my/essays/">기존 운영 첨삭 기록</a></header><p role="status">{message}</p>
 <section className="my-panel"><h2>검수할 기록</h2>{runs.map(r=><button disabled={busy} key={String(r.id)} onClick={()=>void select(String(r.id))}>{String(r.university??'')} · {String(r.title??r.id)} · {String(r.created_at??'')} · {String(r.state??'')}</button>)}</section>
 {parseError?<p role="alert">저장된 평가 형식을 표시할 수 없습니다. 원본은 변경되지 않았습니다.</p>:selected&&<section><h2>{String(selected.university??'')} · {String(selected.title??'')}</h2>{!reports.length&&<p>전체 완료 전인 회차입니다. 이 검수본에서는 완료된 시험 결과만 표시합니다.</p>}{reports.map(report=>{const before=previous.find(p=>p.id===report.priorId);return <section key={report.id}><EvaluationReport report={report} title={examQuestionLabel(report.id.split('/').at(-1)!)} before={before} voiceType="humanities_social"/><EvaluationComparison before={before} after={report}/></section>;})}{reports.length>0&&<button onClick={()=>window.print()}>검수 화면 인쇄 / PDF 저장</button>}</section>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
