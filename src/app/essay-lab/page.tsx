import {UniversityDiscovery} from '@/components/university-discovery';
import {EssayCreditStatus} from '@/components/essay-credit-status';
import {buildMetadata} from '@/lib/brand';
export const metadata=buildMetadata('논술 LAB','대학별 평가 기준에 맞춰 내 답안을 점검하고, 직접 다시 써보세요.');
export default function EssayLabPage(){return <div className="page-section content-wrap university-discovery-page essay-lab-page"><div className="page-intro"><p className="essay-hero__label">논술 LAB</p><h1 className="essay-hero__headline">대학별 평가 기준에 맞춰<br/>내 답안을 점검하고, 직접 다시 써보세요.</h1></div><EssayCreditStatus/><UniversityDiscovery essayFirst/></div>;}
