'use client';
import Link from 'next/link';
import {useCallback,useEffect,useState} from 'react';
import {useAuth} from '@/components/auth-context';
import {OwnerArea} from '@/components/my/owner-data';
import {formatStudyTime} from '@/lib/admin/study-time';
import {SchoolName} from './school-name';
import {SchoolInviteButton} from './invite-button';
import {
  readSchoolCard,readSchoolRanking,
  type SchoolCard,type SchoolRanking,type SchoolRankMetric,type SchoolRankPeriod,type SchoolRankRow,
} from '@/lib/school/participation';

type Load<T>={data:T|null;loading:boolean;reload:()=>void};

function useSchoolCard():Load<SchoolCard>{
  const {client,user,status}=useAuth();
  const [version,setVersion]=useState(0);
  const [state,setState]=useState<{data:SchoolCard|null;loading:boolean}>({data:null,loading:true});
  useEffect(()=>{
    if(status!=='authenticated'||!client||!user)return;
    let active=true;
    void readSchoolCard(client).then(d=>{if(active)setState({data:d,loading:false});});
    return()=>{active=false;};
  },[client,user,status,version]);
  return {...state,reload:useCallback(()=>setVersion(v=>v+1),[])};
}

function useSchoolRanking(metric:SchoolRankMetric,period:SchoolRankPeriod):Load<SchoolRanking>{
  const {client,user,status}=useAuth();
  const [version,setVersion]=useState(0);
  const [state,setState]=useState<{data:SchoolRanking|null;loading:boolean}>({data:null,loading:true});
  useEffect(()=>{
    if(status!=='authenticated'||!client||!user)return;
    let active=true;
    void readSchoolRanking(client,metric,period).then(d=>{if(active)setState({data:d,loading:false});});
    return()=>{active=false;};
  },[client,user,status,metric,period,version]);
  return {...state,reload:useCallback(()=>setVersion(v=>v+1),[])};
}

/** 1~4명: 친구 초대 중심 / 5~19명: 학교 참여 확대 / 20명+: 학교 순위 경쟁 */
function cardTier(registered:number):'invite'|'grow'|'compete'{
  if(registered<=4)return 'invite';
  if(registered<=19)return 'grow';
  return 'compete';
}

function PreparingNote({children}:{children:React.ReactNode}){
  return <p className="focus-note" role="status">{children}</p>;
}

export function SchoolParticipationCard({card,loading}:{card:SchoolCard|null;loading:boolean}){
  if(loading&&!card)return <section className="school-card school-card--loading"><p role="status">우리 학교 현황을 불러오고 있어요.</p></section>;
  if(!card)return <section className="school-card"><h2>🏫 우리 학교 참여 현황</h2><PreparingNote>학교별 참여 현황은 준비 중이에요. 잠시 후 다시 확인해 주세요.</PreparingNote></section>;
  if(!card.hasSchool)return <section className="school-card school-card--empty">
    <h2>🏫 학교를 등록해 주세요</h2>
    <p>학교를 등록하면 우리 학교 친구들과 함께 공부시간을 기록하고 순위를 겨룰 수 있어요.</p>
    <div className="school-card__actions"><Link className="button button--primary" href="/account/">학교 등록하기</Link></div>
  </section>;

  const tier=cardTier(card.registeredUsers);
  // 랭킹 공개(기록자 하한 충족)는 weekMs로 판별 — 미만이면 API가 null을 반환(랭킹 잠금).
  const rankingOpen=card.weekMs!=null;
  return <section className="school-card">
    <h2>🏫 <SchoolName office={card.officeCode} school={card.schoolCode}/> 참여 현황</h2>
    <dl className="school-card__stats">
      <div><dt>우리 학교 참여 학생</dt><dd>{card.registeredUsers.toLocaleString('ko-KR')}명</dd></div>
      <div><dt>최근 7일 공부 기록자</dt><dd>{card.activeUsers7d.toLocaleString('ko-KR')}명</dd></div>
      {rankingOpen&&<div><dt>이번 주 총 공부시간</dt><dd>{formatStudyTime(card.weekMs)}</dd></div>}
      {rankingOpen&&<div><dt>우리 학교 순위</dt><dd>{card.rank!=null?`전국 ${card.rank.toLocaleString('ko-KR')}위`:'집계 준비 중'}</dd></div>}
    </dl>
    {!rankingOpen&&<div className="school-card__locked">
      <p className="school-card__locked-title">🔓 우리 학교 공부시간 랭킹이 곧 열려요!</p>
      <p className="school-card__message">친구들과 함께 공부시간을 기록하면 우리 학교의 공부시간 랭킹이 공개됩니다.</p>
      {card.recordersNeeded>0&&<p className="school-card__message"><strong>{card.recordersNeeded}명</strong>이 더 공부시간을 기록하면 우리 학교 랭킹이 공개됩니다.</p>}
    </div>}
    {rankingOpen&&tier!=='compete'&&<p className="school-card__message">우리 학교 친구 <strong>{card.registeredUsers}명</strong>이 함께하고 있어요. 더 많은 친구가 모이면 학교 순위가 올라가요. 함께할 친구를 초대해 보세요!</p>}
    {rankingOpen&&tier==='compete'&&<p className="school-card__message">우리 학교 친구 <strong>{card.registeredUsers}명</strong>이 공부시간을 기록하고 있어요. 이번 주 공부시간을 늘려 우리 학교 순위를 끌어올려 보세요!</p>}
    <div className="school-card__actions">
      <SchoolInviteButton schoolName={undefined}/>
      {rankingOpen&&<a className="button button--outline" href="#school-ranking">학교 랭킹 보기</a>}
    </div>
  </section>;
}

// label = 탭 이름, col = 표(컬럼) 머리글(생략 시 label). 참여 탭은 'Top 학교'를 강조하되 컬럼은 '참여 학생 수'.
const METRICS:{key:SchoolRankMetric;label:string;col?:string;note:string}[]=[
  {key:'total',label:'총 공부시간',note:'기록자 3명 이상 학교 (개인 공부시간 보호)'},
  {key:'average',label:'1인당 평균',note:'기록자 3명 이상 학교 (개인 공부시간 보호)'},
  {key:'participation',label:'참여 학생 수 Top 학교',col:'참여 학생 수',note:'기간 내 공부시간을 기록한 학생 수 (다른 학교 인원은 비공개)'},
];
function metricCol(metric:SchoolRankMetric):string{ const m=METRICS.find(x=>x.key===metric)!; return m.col??m.label; }
/** 다른 학교의 가입·참여 학생 수는 비공개(null) — 0명이 아니라 ** 로 표시. */
const MASK='**';
function countLabel(v:number|null):string{ return v==null?MASK:`${v.toLocaleString('ko-KR')}명`; }
/** 보조 컬럼: 참여 탭에서는 가입 학생 수를, 그 외 탭에서는 참여 학생 수를 보여 숫자 중복을 피한다. */
function secondaryOf(metric:SchoolRankMetric){ return metric==='participation'?'가입 학생 수':'참여 학생 수'; }
function secondaryValue(row:SchoolRankRow,metric:SchoolRankMetric):number|null{ return metric==='participation'?row.registeredUsers:row.activeUsers; }
const PERIODS:{key:SchoolRankPeriod;label:string}[]=[
  {key:'all',label:'전체 기간'},
  {key:'week',label:'이번 주'},
  {key:'last_week',label:'지난 주'},
  {key:'month',label:'최근 30일'},
];

function metricValue(row:SchoolRankRow,metric:SchoolRankMetric):string{
  if(metric==='total')return row.ms==null?'비공개':formatStudyTime(row.ms);
  if(metric==='average')return row.avgMs==null?'비공개':`${formatStudyTime(row.avgMs)} / 인`;
  return countLabel(row.activeUsers); // 참여 학생 수 = 기간 내 기록자
}

function RankRow({row,metric,mine}:{row:SchoolRankRow;metric:SchoolRankMetric;mine:boolean}){
  return <tr className={mine?'school-rank__row school-rank__row--mine':'school-rank__row'}>
    <td data-label="순위">{row.rank.toLocaleString('ko-KR')}</td>
    <td data-label="학교"><SchoolName office={row.officeCode} school={row.schoolCode}/>{mine&&<span className="school-rank__badge"> · 우리 학교</span>}</td>
    <td data-label={metricCol(metric)}>{metricValue(row,metric)}</td>
    <td data-label={secondaryOf(metric)}>{countLabel(secondaryValue(row,metric))}</td>
  </tr>;
}

export function SchoolRankingPanel(){
  const [metric,setMetric]=useState<SchoolRankMetric>('participation');
  const [period,setPeriod]=useState<SchoolRankPeriod>('all');
  const {data,loading}=useSchoolRanking(metric,period);
  const activeMetric=METRICS.find(m=>m.key===metric)!;
  const mySchoolInTop=data?.mySchool&&data.top.some(r=>r.officeCode===data.mySchool!.officeCode&&r.schoolCode===data.mySchool!.schoolCode);
  return <section className="school-rank" id="school-ranking" aria-labelledby="school-rank-title">
    <h2 id="school-rank-title">🏆 학교별 공부 순위</h2>
    <div className="school-rank__controls">
      <div className="school-rank__tabs" role="tablist" aria-label="랭킹 기준">
        {METRICS.map(m=><button key={m.key} type="button" role="tab" aria-selected={m.key===metric} className={m.key===metric?'button button--small button--primary':'button button--small button--outline'} onClick={()=>setMetric(m.key)}>{m.label}</button>)}
      </div>
      <label className="school-rank__period">기간
        <select value={period} onChange={e=>setPeriod(e.target.value as SchoolRankPeriod)}>
          {PERIODS.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </label>
    </div>
    <p className="focus-note">{activeMetric.note} 기준 · {PERIODS.find(p=>p.key===period)!.label}</p>
    {loading&&!data&&<p role="status">랭킹을 불러오고 있어요.</p>}
    {!loading&&!data&&<PreparingNote>학교별 랭킹은 준비 중이에요. 잠시 후 다시 확인해 주세요.</PreparingNote>}
    {data&&data.top.length===0&&<p className="focus-note">아직 집계된 학교가 없어요.</p>}
    {data&&data.top.length>0&&<table className="school-rank__table"><caption className="sr-only">{activeMetric.label} 기준 학교 랭킹</caption>
      <thead><tr><th scope="col">순위</th><th scope="col">학교</th><th scope="col">{metricCol(metric)}</th><th scope="col">{secondaryOf(metric)}</th></tr></thead>
      <tbody>
        {data.top.map(r=><RankRow key={`${r.officeCode}-${r.schoolCode}`} row={r} metric={metric} mine={!!data.mySchool&&r.officeCode===data.mySchool.officeCode&&r.schoolCode===data.mySchool.schoolCode}/>)}
        {data.mySchool&&!mySchoolInTop&&<>
          <tr className="school-rank__gap"><td colSpan={4}>⋯</td></tr>
          {data.around.map(r=><RankRow key={`around-${r.officeCode}-${r.schoolCode}`} row={r} metric={metric} mine={r.officeCode===data.mySchool!.officeCode&&r.schoolCode===data.mySchool!.schoolCode}/>)}
        </>}
      </tbody>
    </table>}
    {data&&<p className="focus-note">집계 학교 {data.schoolCount.toLocaleString('ko-KR')}곳</p>}
  </section>;
}

export function SchoolView(){
  const card=useSchoolCard();
  return <div className="my-dashboard content-wrap content-wrap--detail school-view">
    <header className="my-head"><h1>우리 학교 공부 순위</h1></header>
    <OwnerArea path="/school/">
      <div className="school-view__stack">
        <SchoolParticipationCard card={card.data} loading={card.loading}/>
        <SchoolRankingPanel/>
        <p className="school-view__source">레전드스터디+의 학습 시간을 기준으로 집계돼요</p>
      </div>
    </OwnerArea>
  </div>;
}
