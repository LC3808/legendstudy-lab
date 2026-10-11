import Image from 'next/image';
import logos from '@/data/university-logos.json';
import type {CatalogUniversity,Offering} from '@/lib/essay-runtime/public-discovery';
export function UniversityLogo({university:u}:{university:CatalogUniversity}){
 const asset=(logos as Record<string,{src:string;darkSurface?:boolean}>)[u.sourceUniversityId];
 return asset?<Image className="university-logo" data-dark-surface={asset.darkSurface||undefined} src={asset.src} alt={`${u.name} 로고`} width={112} height={56} unoptimized/>:<span className="university-monogram" aria-label={`${u.name} 로고 준비 중`}>{u.name.slice(0,1)}</span>;
}
export function regionLabels(offerings:Offering[]){
 return [...new Set(offerings.map(o=>{
  const raw=o.sourceRegion??o.region;
  if(/서울|Seoul/.test(raw))return '서울';
  if(/경기|인천|Gyeonggi|Incheon/.test(raw))return '경기·인천';
  if(/대구|경상북도/.test(raw))return '대구·경북';
  if(/부산|경상남도/.test(raw))return '부산·경남';
  if(/강원/.test(raw))return '강원';
  if(/세종/.test(raw))return '세종';
  if(/충청남도|충남/.test(raw))return '충남';
  return o.region;
 }))];
}
export function UniversityRegions({offerings}:{offerings:Offering[]}){
 return <div className="university-regions" aria-label="대학 소재 지역">{regionLabels(offerings).map(r=><span key={r} className="university-badge university-badge--region" data-region={r}>{r}</span>)}</div>;
}
export function CatalogIcon({kind}:{kind:'search'|'document'|'book'|'sparkle'}){
 return <svg className="catalog-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==='search'?<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>:kind==='document'?<><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M8 12h8M8 16h6"/></>:kind==='book'?<><path d="M12 5v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2z"/></>:<><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5zM20 2v4M18 4h4"/></>}</svg>;
}
