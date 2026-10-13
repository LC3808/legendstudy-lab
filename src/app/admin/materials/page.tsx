import type {Metadata} from 'next';
import {MaterialsConsole} from '@/components/materials/materials-console';
export const metadata:Metadata={title:'논술 자료 검수',robots:{index:false,follow:false}};
export default function Page(){return <MaterialsConsole/>;}
