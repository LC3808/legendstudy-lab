import {loadResearchPreview} from '@/lib/essay-research/server';
import {ResearchCatalogView} from '@/components/essay-research-preview';
import {CatalogFilters} from '@/components/catalog-filters';
import {listUniversities} from '@/lib/public-catalog';
export default async function UniversitiesPage(){const preview=await loadResearchPreview();return <div className='page-section content-wrap'><h1>논술 LAB · 대학 찾기</h1>{preview?<ResearchCatalogView catalog={preview}/>:<CatalogFilters universities={listUniversities()}/>}</div>;}
