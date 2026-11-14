'use client';
import {useState} from 'react';
import {useReadReport} from './admin-dashboard-view';
import {initialLabQuery,uuidValue} from '@/lib/admin/lab-navigation';
import type {LabDetail} from '@/lib/admin/lab-operations';
import type {RecordItem} from '@/lib/my/essay-dashboard';
import {examReports} from '@/lib/my/exam-history';
import {ExamResultLayout} from '@/components/my/exam-result-layout';
export function AdminLabPreview(){
 const [id]=useState(()=>uuidValue(initialLabQuery().get('run')));
 const r=useReadReport<LabDetail>('admin_lab_run_detail',id?{p_run:id}:null);
 if(!id)return <p role="alert">올바른 첨삭 회차를 선택해 주세요.</p>;
 if(r.error)return <p role="alert">미리보기 접근 불가 — 관리자 권한과 원본 기록을 확인하세요.</p>;
 if(!r.data)return <p role="status">저장된 결과를 불러오는 중…</p>;
 if(r.data.version!=='admin-lab-detail-v1')return <p role="alert">결과 계약을 확인할 수 없습니다.</p>;
 const run=r.data.run;let reports:ReturnType<typeof examReports>;
 try{reports=examReports(run);}catch{return <p role="alert">저장 형식 표시 불가 — 첨삭 상세에서 원본을 확인하세요.</p>;}
 if(!reports.length)return <p>표시 가능한 완료 결과가 없습니다.</p>;
 const row:RecordItem={id,source:'exam',examId:String(run.exam_id),question:String(run.title??'첨삭 결과'),university:typeof run.university==='string'?run.university:null,at:String(run.created_at),rewrite:typeof run.parent_id==='string',evaluations:[{id,status:String(run.state),at:String(run.created_at),completedAt:typeof run.completed_at==='string'?run.completed_at:null,valid:true}]};
 return <><p className="admin-preview-notice">관리자 읽기 전용 미리보기 · WEB 학생용 결과입니다. 학생 계정으로 전환하지 않습니다.</p><ExamResultLayout row={row} run={run} reports={reports} previous={[]} readOnly/></>;
}
export function PreviewButton({runId,available}:{runId:string;available:boolean}){
 const [blocked,setBlocked]=useState(false);const href=`/admin/essay-runs/preview/?run=${encodeURIComponent(runId)}`;
 function open(){const tab=window.open(href,'_blank');if(tab){tab.opener=null;setBlocked(false);}else setBlocked(true);}
 return <><button className="button button--primary" disabled={!available} onClick={open}>학생 화면으로 미리보기 ↗</button>{!available&&<p>표시 가능한 완료 결과가 없습니다.</p>}{blocked&&<p role="alert">새 탭이 차단되었습니다. 브라우저에서 팝업을 허용하거나 <a href={href} target="_blank" rel="noopener noreferrer">미리보기 링크</a>를 열어 주세요.</p>}</>;
}
