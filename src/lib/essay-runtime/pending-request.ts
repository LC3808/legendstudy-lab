/** Local idempotency state only; never changes server billing or existing runs. */
export type PendingRequest={fingerprint:string;key:string;answers:{questionId:string;body?:string;revision:number;mathInput?:{attemptId:string;confirmedRunId:string}}[]};
type Store={read(key:string):string;write(key:string,value:string):void};
export function questionScope(ids:string[]){return JSON.stringify([...new Set(ids)].sort());}
export function pendingStorageKey(legacy:string,ids:string[]){return `${legacy}:questions:${questionScope(ids)}`;}
export function restorePending(store:Store,legacy:string,ids:string[]):PendingRequest|null{
 const key=pendingStorageKey(legacy,ids),saved=store.read(key);
 if(saved)return parse(saved);
 const index=JSON.parse(store.read(`${legacy}:question-scopes`)||'[]') as string[][];
 if(!Array.isArray(index)||index.some(scope=>!Array.isArray(scope)||scope.some(id=>typeof id!=='string')))throw Error('PENDING_CHANGED');
 for(const scope of index){
  if(scope.some(id=>ids.includes(id))&&store.read(pendingStorageKey(legacy,scope))&&parse(store.read(pendingStorageKey(legacy,scope))))throw Error('PENDING_CHANGED');
 }
 const old=store.read(legacy);if(!old)return null;
 const pending=parse(old);if(!pending)return null;
 const previous=pending.answers.map(a=>a.questionId);
 if(questionScope(previous)===questionScope(ids)){
  // Copy, never erase the legacy request. Ambiguous retries retain its exact key.
  store.write(key,old);return pending;
 }
 // A different disjoint question is a different submission. Overlapping sets
 // cannot silently escape a possibly outstanding request by adding a question.
 if(previous.some(id=>ids.includes(id)))throw Error('PENDING_CHANGED');
 return null;
}
function parse(raw:string):PendingRequest|null{
 const p=JSON.parse(raw);if(p===null)return null;
 if(!p||typeof p.key!=='string'||!p.key||typeof p.fingerprint!=='string'||!Array.isArray(p.answers)||!p.answers.length||p.answers.some((a:PendingRequest['answers'][number])=>!a||typeof a.questionId!=='string'||!Number.isInteger(a.revision)||(a.mathInput?(a.body!==undefined||typeof a.mathInput.attemptId!=='string'||typeof a.mathInput.confirmedRunId!=='string'):typeof a.body!=='string')))throw Error('PENDING_CHANGED');
 return p;
}

export function savePending(store:Store,legacy:string,pending:PendingRequest){
 const ids=pending.answers.map(a=>a.questionId),key=pendingStorageKey(legacy,ids);
 const index=JSON.parse(store.read(`${legacy}:question-scopes`)||'[]') as string[][];
 if(!index.some(scope=>questionScope(scope)===questionScope(ids)))index.push([...ids].sort());
 // Index first: if storage fails, submission does not leave this function.
 store.write(`${legacy}:question-scopes`,JSON.stringify(index));
 store.write(key,JSON.stringify(pending));
}
