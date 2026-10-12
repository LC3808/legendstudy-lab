/** Device-local photo drafts, separate from immutable remote evaluation evidence. */
export async function sourceImageDraft(key:string,write?:File|File[]|null):Promise<File|File[]|null>{
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('legendstudy-essay-images',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('drafts',write===undefined?'readonly':'readwrite');const store=tx.objectStore('drafts');const r=write===undefined?store.get(key):write===null?store.delete(key):store.put(write,key);let value:File|File[]|null=null;r.onsuccess=()=>{value=write===undefined?r.result??null:write;};tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??Error('Draft not saved'));});}finally{db.close();}
}

export async function purgeSourceDrafts(owner:string):Promise<void>{
 const prefix=`legendstudy:essay-source-draft:v1:${owner}:`;
 Object.keys(localStorage).filter(k=>k.startsWith(prefix)).forEach(k=>localStorage.removeItem(k));
 if(typeof indexedDB==='undefined')return;
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('legendstudy-essay-images',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');const r=tx.objectStore('drafts').openCursor();r.onsuccess=()=>{const c=r.result;if(!c)return;if(String(c.key).startsWith(prefix))c.delete();c.continue();};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
}
