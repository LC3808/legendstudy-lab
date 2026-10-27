import type {ReactNode} from 'react';
import {EssayBetaCredit} from '@/components/essay-beta-credit';
export default function EssayLabLayout({children}:{children:ReactNode}){
  return <><EssayBetaCredit/>{children}</>;
}
