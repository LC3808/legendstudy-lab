import type {CSSProperties,ReactNode} from 'react';
import type {CatalogUniversity} from '@/lib/essay-runtime/public-discovery';
import {UniversityLogo} from './university-identity';
import {universityEssayTheme} from '@/lib/essay-runtime/university-theme';

export function UniversityEssayHero({university,selectedTitle,officialLink,officialLabel,children}:{university:CatalogUniversity;selectedTitle:string;officialLink?:string;officialLabel:string;children:ReactNode}){
 const theme=universityEssayTheme(university.sourceUniversityId);
 const title=selectedTitle.replaceAll(university.name,'').replace(/\bmock\b/gi,'모의논술').replace(/\badmission\b/gi,'수시논술').replace(/\s*·\s*·\s*/g,' · ').replace(/^[\s·]+|[\s·]+$/g,'').replace(/\s+/g,' ');
 return <header className="university-detail-hero essay-studio-hero essay-brand-hero" style={{'--university-brand':theme.accent,'--university-tint':theme.tint,'--university-background':theme.background_color,'--university-border':theme.border_color} as CSSProperties}>
  <div className="essay-studio-identity"><div className="essay-studio-logo"><UniversityLogo university={university} logoAsset={theme.logo_asset}/></div><div><h1>{university.name}</h1><h2 className="essay-studio-exam">{title}</h2></div></div>
  <div className="essay-studio-links">{officialLink?<a className="university-source-button" href={officialLink} target="_blank" rel="noopener noreferrer">{officialLabel} <span aria-hidden="true">↗</span></a>:<p>공식 논술 자료실 링크를 확인 중입니다.</p>}</div>
  {children}
 </header>;
}
