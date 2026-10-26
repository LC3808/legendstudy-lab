/** Named UUID allowlist only. Compact UUIDs avoid the hosting text-binding limit. */
export function publicExamScope(raw:string|undefined):string[]{
 const ids=(raw??'').split(',').map(value=>value.trim().replace(/^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i,'$1-$2-$3-$4-$5').toLowerCase());
 if(ids.length>256||ids.some(id=>! /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id))||new Set(ids).size!==ids.length)return [];
 return ids;
}
