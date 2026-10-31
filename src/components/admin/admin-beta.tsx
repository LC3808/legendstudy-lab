'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {useAuth} from '@/components/auth-context';
import {betaInput, kstInput, type BetaConfig} from '@/lib/admin/beta';

type Kind='settings'|'usage'|'failures';
type Campaign={campaign_id:string;config:BetaConfig|null;can_edit:boolean};
type Report={rows:Record<string,unknown>[];total:number;page_size:number};
const labels:Record<string,string>={user_id:'사용자 ID',signup_at:'가입일',latest_use:'최근 이용일',today_used:'오늘 사용·예약',today_remaining:'오늘 남은 횟수',free_count:'기간 내 무료 첨삭',rewrite_count:'기간 내 무료 재첨삭',success_count:'성공',failure_count:'실패·부분 실패',recovery_count:'복구',evaluation_id:'평가 ID',created_at:'접수 시각',state:'평가 상태',operation_status:'운영 상태',reserved:'예약',consumed:'차감',released:'예약 해제',recovered_at:'복구 시각',recovery_method:'복구 방식',generation:'재처리 회차',failed_questions:'실패 문항 수',failure_codes:'실패 진단',actor:'변경자',recorded_at:'변경 시각',before_value:'변경 전',after_value:'변경 후',reason:'변경 사유'};
const status:Record<string,string>={completed:'정상 완료',processing:'처리 중',reserved:'예약 유지',failed:'실패',recovered:'복구 완료',recovery_pending:'복구 대기',manual_check:'수동 확인 필요',automatic:'자동 복구'};
export function AdminBeta({kind}:{kind:Kind}){const {user}=useAuth();return <BetaContent key={user?.id??'signed-out'} kind={kind}/>;}
function BetaContent({kind}:{kind:Kind}){
 const {client}=useAuth();const [campaigns,setCampaigns]=useState<Campaign[]>([]);const [report,setReport]=useState<Report|null>(null);
 const [audit,setAudit]=useState<Report|null>(null);const [filter,setFilter]=useState({user:'',from:'',to:'',sort:'recent'});
 const [offset,setOffset]=useState(0);const [refresh,setRefresh]=useState(0);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);const busy=useRef(false);const alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{let active=true;async function load(){setLoading(true);setError('');try{
  if(!client) throw Error('로그인이 필요합니다.');
  if(kind==='settings'){
   const [c,a]=await Promise.all([client.rpc('admin_essay_beta_config'),client.rpc('admin_essay_beta_report',{p_kind:'audit'})]);
   if(c.error||a.error) throw Error('베타 운영 권한 또는 서버 설치 상태를 확인해 주세요.');
   if(active){setCampaigns(c.data.campaigns);setAudit(a.data);}
  }else{
   const {data,error:e}=await client.rpc('admin_essay_beta_report',{p_kind:kind,p_user:filter.user||null,p_from:filter.from?new Date(filter.from+'T00:00:00+09:00').toISOString():null,p_to:filter.to?new Date(filter.to+'T00:00:00+09:00').toISOString():null,p_sort:filter.sort,p_offset:offset});
   if(e) throw Error('조회하지 못했습니다. 사용자 UUID·기간·관리자 권한·서버 설치 상태를 확인해 주세요.');if(active)setReport(data);
  }
 }catch(e){if(active)setError(e instanceof Error?e.message:'조회 실패');}finally{if(active)setLoading(false);}}
 void load();return()=>{active=false;};},[client,kind,filter,offset,refresh]);
 async function save(event:FormEvent<HTMLFormElement>,c:Campaign){event.preventDefault();if(busy.current||!client)return;busy.current=true;setSaving(true);setError('');
 try{const f=new FormData(event.currentTarget);const payload=betaInput(f);const {error:e}=await client.rpc('admin_essay_beta_save',{p_campaign:c.campaign_id,p_expected_version:c.config?.version??0,p_value:payload,p_reason:String(f.get('reason')??'')});
 if(e)throw Error(e.message.includes('TODAY_GRANTED')?'오늘 이미 발급된 이용권이 있어 즉시 변경할 수 없습니다. 다음 자정 적용을 선택해 주세요.':e.message.includes('SETTINGS_CHANGED')?'다른 관리자가 설정을 변경했습니다. 새로고침 후 확인해 주세요.':'설정이 저장되지 않았습니다. 승인 권한·공지·시험 범위·입력값을 확인해 주세요.');
 if(alive.current)setRefresh(n=>n+1);
 }catch(e){if(alive.current)setError(e instanceof Error?e.message:'저장 실패');}finally{busy.current=false;if(alive.current)setSaving(false);}}
 return <section>{error&&<p role="alert">{error}</p>}<button className="button button--small" disabled={loading||saving} onClick={()=>setRefresh(n=>n+1)}>새로고침</button>
 {kind==='settings'?<>
 <p>한도 변경은 다음 자정 적용을 권장합니다. 당일 발급 후 즉시 변경은 차단됩니다. 발급된 이용권·과거 재첨삭 만료일은 변경되지 않습니다.</p>
 {!loading&&!campaigns.length&&<p>검수된 베타 캠페인이 없습니다. Owner 승인용 SQL의 캠페인·시험 범위·공지 연결을 먼저 준비해야 합니다.</p>}
 {campaigns.map(c=><form className="admin-panel" key={c.campaign_id+':'+(c.config?.version??0)} onSubmit={e=>void save(e,c)}><h2>베타 운영 설정</h2><p>캠페인 {c.campaign_id}</p>
 <fieldset disabled={!c.can_edit||saving||loading} style={{display:'grid',gap:16,border:0}}>
 <label><input name="enabled" type="checkbox" defaultChecked={c.config?.beta_enabled??false}/> 베타 활성화</label>
 <label>시작 시각 (KST)<input name="start" type="datetime-local" required defaultValue={c.config?kstInput(c.config.beta_start_at):''}/></label>
 <label>종료 시각 (KST, 미포함)<input name="end" type="datetime-local" required defaultValue={c.config?kstInput(c.config.beta_end_at):'2026-11-11T00:00'}/></label>
 <label>일일 무료 횟수<input name="limit" type="number" min="1" max="100" required defaultValue={c.config?.next_daily_limit??c.config?.daily_free_limit??1}/></label>
 <label>한도 적용<select name="application" defaultValue="next_reset"><option value="next_reset">다음 00:00 KST</option><option value="immediate">즉시 (당일 발급 전만 가능)</option></select></label>
 <p>갱신 시간대: Asia/Seoul · 미사용분 이월 없음</p>
 {c.config?.limit_effective_at&&<p>예약된 한도 {c.config.next_daily_limit}회 · {kstInput(c.config.limit_effective_at)} KST 적용</p>}
 <label>변경 사유<textarea name="reason" required maxLength={1000}/></label><button className="button" type="submit">설정 저장</button></fieldset>
 {!c.can_edit&&<p>설정 변경은 Owner 또는 별도 승인된 관리자만 가능합니다.</p>}</form>)}
 <h2>최근 설정 변경 기록 (25건)</h2>{audit&&<Rows rows={audit.rows} columns={['actor','recorded_at','before_value','after_value','reason']}/>}
 </>:<><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);setOffset(0);setFilter({user:String(f.get('user')),from:String(f.get('from')),to:String(f.get('to')),sort:String(f.get('sort'))});}} className="admin-panel">
 <label>사용자 UUID<input name="user"/></label><label>시작일 (KST)<input type="date" name="from"/></label><label>종료일 (미포함)<input type="date" name="to"/></label>
 <label>정렬<select name="sort"><option value="recent">최근 이용순</option>{kind==='usage'&&<><option value="usage">이용 횟수순</option><option value="failures">실패 횟수순</option></>}</select></label><button className="button">조회</button></form>
 <p>기간을 지정하지 않으면 누적 내역입니다. 오늘 사용은 예약을 포함하며, 부분 실패는 자동 환불 대상이 아닙니다. 원인이 기록되지 않은 경우 진단 미제공으로 표시합니다.</p>
 {!loading&&report&&<><Rows rows={report.rows} columns={kind==='usage'?['user_id','signup_at','latest_use','today_used','today_remaining','free_count','rewrite_count','success_count','failure_count','recovery_count']:['evaluation_id','user_id','created_at','state','operation_status','failed_questions','failure_codes','reserved','consumed','released','recovery_method','recovered_at','generation']}/>
 <div><button className="button" disabled={offset===0} onClick={()=>setOffset(n=>Math.max(0,n-25))}>이전</button> {Math.floor(offset/25)+1} / {Math.max(1,Math.ceil(report.total/25))} <button className="button" disabled={offset+25>=report.total} onClick={()=>setOffset(n=>n+25)}>다음</button></div></>}
 </>}{loading&&<p role="status">조회 중…</p>}</section>;
}
function Rows({rows,columns}:{rows:Record<string,unknown>[];columns:string[]}){return rows.length?<div style={{overflowX:'auto'}}><table className="admin-table"><thead><tr>{columns.map(k=><th key={k}>{labels[k]??k}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={String(r.evaluation_id??r.user_id??r.id??i)}>{columns.map(k=><td key={k} style={{minWidth:100,maxWidth:360,overflowWrap:'anywhere',whiteSpace:'pre-wrap'}}>{r[k]===null||r[k]===undefined?'—':typeof r[k]==='object'?JSON.stringify(r[k],null,2):status[String(r[k])]??String(r[k])}</td>)}</tr>)}</tbody></table></div>:<p>조회된 내역이 없습니다.</p>;}
