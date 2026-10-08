/** Actual existing Supabase client adapter. SQL/RLS remains the authorization boundary. */
import type {SupabaseClient} from '@supabase/supabase-js';
import {EssayRuntimeError,type EssayTransport,type Row} from './client';
const tables=new Set(['essay_practice_sessions','essay_drafts','essay_attempts','essay_evaluations','essay_evaluation_dimensions']);
const rpcs=new Set(['essay_open_session','essay_save_draft','essay_submit_attempt','essay_request_evaluation','essay_evaluation_status','essay_component_result']);
export function essaySupabaseTransport(client:SupabaseClient,currentUserId:()=>string|null):EssayTransport {
 return {
  userId:currentUserId,
  async rpc(name,args){
   if(!rpcs.has(name))throw new EssayRuntimeError('UNSUPPORTED_RPC');
   const {data,error}=await client.rpc(name,args);if(error)throw new EssayRuntimeError(error.code||'RPC_FAILED');return data;
  },
  async rows(table,columns,filters,limit,order){
   if(!tables.has(table)||!Number.isInteger(limit)||limit<1||limit>50)throw new EssayRuntimeError('INVALID_READ');
   let query=client.from(table).select(columns);
   for(const [key,value] of Object.entries(filters))query=query.eq(key,value);
   for(const item of order.split(',')){
    const [column,direction]=item.split('.');if(!/^[a-z_]+$/.test(column)||!['asc','desc'].includes(direction))throw new EssayRuntimeError('INVALID_READ');
    query=query.order(column,{ascending:direction==='asc'});
   }
   const {data,error}=await query.limit(limit);if(error)throw new EssayRuntimeError(error.code||'READ_FAILED');
   if(!Array.isArray(data))throw new EssayRuntimeError('INVALID_RESPONSE');return data as unknown as Row[];
  },
 };
}
