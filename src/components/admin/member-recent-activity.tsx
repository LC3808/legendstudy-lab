'use client';
import {useReadReport} from './admin-dashboard-view';
import {formatDateTime} from '@/lib/admin/format';
export type MaterialActivity={id:string;content_item_id:string;title:string;source_url:string|null;at:string};
export type MemberActivity={version:'admin-member-activity-v1';account_id:string;bookmarks_total:number;recent_total:number;bookmarks:MaterialActivity[];recent:MaterialActivity[]};
export function materialUrl(raw:string|null){try{if(!raw)return null;const u=new URL(raw);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
export function ActivityRows({title,rows,total,dateLabel}:{title:string;rows:MaterialActivity[];total:number;dateLabel:string}){
 return <div><h4 className="admin-subhead">{title} <small>최근 {rows.length}개 / 전체 {total}개</small></h4>{rows.length?<table><thead><tr><th>자료</th><th>{dateLabel} (KST)</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{materialUrl(r.source_url)?<a href={materialUrl(r.source_url)!} target="_blank" rel="noopener noreferrer">{r.title} ↗</a>:r.title}</td><td><time dateTime={r.at}>{formatDateTime(r.at)}</time></td></tr>)}</tbody></table>:<p>기록이 없습니다.</p>}</div>;
}
export function MemberRecentActivity({accountId}:{accountId:string}){
 const result=useReadReport<MemberActivity>('admin_member_recent_activity',{p_account_id:accountId});
 if(result.error)return <p role="alert">자료 활동을 불러오지 못했습니다.</p>;
 if(!result.data)return <p role="status">자료 활동을 불러오는 중입니다.</p>;
 const d=result.data;if(d.version!=='admin-member-activity-v1'||d.account_id!==accountId)return <p role="alert">회원 활동 조회값을 확인할 수 없습니다.</p>;
 return <div className="member-recent-activity"><ActivityRows title="북마크(즐겨찾기)" rows={d.bookmarks} total={d.bookmarks_total} dateLabel="저장일"/><ActivityRows title="최근 본 자료" rows={d.recent} total={d.recent_total} dateLabel="최근 열람일"/><p className="focus-note">현재 남아 있는 저장·열람 기록을 최신순으로 표시합니다. 같은 자료의 반복 열람은 최근 열람 시각으로 표시합니다.</p></div>;
}
