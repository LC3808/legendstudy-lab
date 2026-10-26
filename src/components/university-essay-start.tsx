'use client';

import {SourceExamSelection} from './source-exam-selection';

/** Use the same canonical metadata and approved question reader for guests and accounts.
 * The old published-only table selector dropped registered, unpublished questions and
 * discarded the approved Hanyang PDF descriptor when projecting metadata rows.
 */
export function UniversityEssayStart({sourceId,onSelectionChange}:{universityId:string|null;sourceId:string;onSelectionChange?:(title:string)=>void}){
 return <SourceExamSelection sourceId={sourceId} registeredOnly onSelectionChange={onSelectionChange}/>;
}
