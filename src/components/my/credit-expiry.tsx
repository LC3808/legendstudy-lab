'use client';
import {useCallback} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {readCreditExpiry} from '@/lib/my/credit-expiry';
import {useOwnerData} from './owner-data';
export function CreditExpiry({at}:{at:string|null}){
 const load=useCallback((client:SupabaseClient,owner:string)=>readCreditExpiry(client,owner,at),[at]);
 const result=useOwnerData(load);
 if(!at)return <p className="my-metric__meta">만료 예정 없음</p>;
 const date=new Date(at).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric'});
 return <><p className="my-metric__value my-metric__value--date">{date} 만료</p>{result.data?.at===at?result.data.groups.map(g=><p className="my-metric__meta" key={g.label}>{g.label} {g.quantity}개</p>):<p className="my-metric__meta">{result.error?'만료 수량을 확인하지 못했습니다.':'만료 수량 확인 중…'}{result.error&&<button className="text-link" onClick={result.reload}>다시 확인</button>}</p>}</>;
}
