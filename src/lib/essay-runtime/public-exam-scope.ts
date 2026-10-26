/** Named UUID allowlist only. Compact UUIDs avoid the hosting text-binding limit. */
export function publicExamScope(raw:string|undefined):string[]{
 let value=raw??'';
 if(value.startsWith('uuid64:')){
  try{const encoded=value.slice(7);if(encoded.length>5464||! /^[A-Za-z0-9+/]+={0,2}$/.test(encoded))return [];const bytes=atob(encoded);if(!bytes.length||bytes.length%16||bytes.length>4096||btoa(bytes)!==encoded)return [];value=Array.from({length:bytes.length/16},(_,i)=>Array.from(bytes.slice(i*16,i*16+16),c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('')).join(',');}catch{return [];}
 }
 const ids=value.split(',').map(value=>value.trim().replace(/^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i,'$1-$2-$3-$4-$5').toLowerCase());
 if(ids.length>256||ids.some(id=>! /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id))||new Set(ids).size!==ids.length)return [];
 return ids;
}
