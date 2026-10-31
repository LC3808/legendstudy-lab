'use client';
import {logAnalytics} from '@/lib/analytics/client';
import {analyticsEvents as AE} from '@/lib/analytics/events';
import {useEffect} from 'react';

import {SourceExamSelection} from './source-exam-selection';

/** Use the same canonical metadata and approved question reader for guests and accounts.
 * The old published-only table selector dropped registered, unpublished questions and
 * discarded the approved Hanyang PDF descriptor when projecting metadata rows.
 */
export function UniversityEssayStart({sourceId,onSelectionChange}:{universityId:string|null;sourceId:string;onSelectionChange?:(title:string)=>void}){
 useEffect(()=>{logAnalytics(AE.universitySelect,{university_code:sourceId},sourceId);},[sourceId]);
 return <SourceExamSelection sourceId={sourceId} registeredOnly onSelectionChange={onSelectionChange}/>;
}
