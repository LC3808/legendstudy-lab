import {notFound} from 'next/navigation';
import {publicCatalog,catalogUniversity} from '@/lib/essay-runtime/public-discovery';
import {UniversityCatalogDetail} from '@/components/university-catalog-detail';
export const dynamicParams=false;
export function generateStaticParams(){return publicCatalog.universities.flatMap(u=>[...new Set(u.offerings.map(o=>o.admissionYear))].map(year=>({universityId:u.sourceUniversityId,year:String(year)})));}
export default async function Page({params}:{params:Promise<{universityId:string;year:string}>}){const {universityId,year}=await params;const u=catalogUniversity(universityId);if(!u||!u.offerings.some(o=>String(o.admissionYear)===year))notFound();return <UniversityCatalogDetail university={u} year={year}/>;}
