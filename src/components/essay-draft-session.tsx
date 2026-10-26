'use client';
import {createContext,useContext} from 'react';
/** Empty scope retains existing initial/rewrite storage; new UUIDs never reuse it. */
export const EssayDraftSession=createContext('');
export const useEssayDraftSession=()=>useContext(EssayDraftSession);
export function scopedDraftKey(key:string,session:string){return session?`${key}:draft-session:${session}`:key;}
