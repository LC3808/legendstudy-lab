import {UniversityDiscovery} from '@/components/university-discovery';
import {EssayCreditStatus} from '@/components/essay-credit-status';
import {EssayRuntimeEntry} from '@/components/essay-runtime-entry';
import {buildMetadata} from '@/lib/brand';
export const metadata=buildMetadata('논술 LAB','대학별 논술 기출문제를 살펴보고 나에게 필요한 첨삭을 시작하세요.');
export default function EssayLabPage(){return <div className="page-section content-wrap essay-lab-page"><div className="page-intro"><p className="essay-hero__label">논술 LAB</p><h1 className="essay-hero__headline">대학별 논술 기출문제를 살펴보고<br/>나에게 필요한 첨삭을 시작하세요.</h1></div><EssayCreditStatus/><EssayRuntimeEntry/><UniversityDiscovery/></div>;}
