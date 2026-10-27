'use client';
import {useRef,type ReactNode} from 'react';

/** Native disclosure preserves keyboard/touch access without trapping focus. */
export function RowActions({label,children}:{label:string;children:ReactNode}) {
 const ref=useRef<HTMLDetailsElement>(null);
 return <details ref={ref} className="my-row-actions" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))event.currentTarget.open=false;}} onKeyDown={event=>{if(event.key==='Escape'){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}}>
  <summary aria-label={label}>⋯</summary>
  <div className="my-row-actions__items" onClick={event=>{if((event.target as HTMLElement).closest('button')&&ref.current)ref.current.open=false;}}>{children}</div>
 </details>;
}
