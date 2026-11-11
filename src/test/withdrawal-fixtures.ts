import {activityCounts,activityDates} from '@/lib/admin/withdrawals';
export const requestId='10000000-0000-0000-0000-000000000001';
export const accountId='00000000-0000-0000-0000-000000000003';
export const timestamp='2026-11-08T12:00:00Z';
export const row={request_id:requestId,account_id:accountId,joined_at:timestamp,requested_at:timestamp,scheduled_deletion_at:timestamp,completed_at:null,state:'DELETION_PENDING',phase:'PERSONAL',status:'pending',data_state:'retained'};
export const listFixture={version:'admin-withdrawals-v1',next_cursor:null,as_of:timestamp,total:1,limit:10,offset:0,kpis:{pending:1,processing:0,failed:0,completed30:0},items:[row]};
export const detailFixture={version:'admin-withdrawal-detail-v1',as_of:timestamp,request_id:requestId,state:'DELETION_PENDING',phase:'PERSONAL',requested_at:timestamp,scheduled_deletion_at:timestamp,started_at:null,completed_at:null,cancelled_at:null,expires_at:null,retry_count:0,next_attempt_at:timestamp,error:null,identity:{account_id:accountId,joined_at:timestamp,grade:3,academic_status:'student',school_set:true},activity:{...Object.fromEntries(activityCounts.map(k=>[k,0])),...Object.fromEntries(activityDates.map(k=>[k,null])),material_views:null}};
