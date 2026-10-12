import {EssayRuntimeClient,EssayRuntimeError} from './client';
export type Draft = {body:string;revision:number};
/** Uses existing canonical session/draft RPCs only; no submission or Credit calls. */
export class SourceDraftSync {
 revision:number|null=null;
 remoteBody:string|null=null;
 conflict=false;
 constructor(private client:Pick<EssayRuntimeClient,'open'|'save'>){}
 async open(localBody:string){
  const remote=await this.client.open();
  this.revision=remote.revision;this.remoteBody=remote.body;
  this.conflict=!!localBody&&!!remote.body&&localBody!==remote.body;
  return {body:localBody||remote.body,conflict:this.conflict};
 }
 async save(body:string){
  if(this.conflict||this.revision===null)throw new EssayRuntimeError('DRAFT_CONFLICT');
  if(body.length>20000)throw new EssayRuntimeError('DRAFT_TOO_LONG');
  try {
   const next=await this.client.save(body,this.revision);
   this.revision=next.revision;this.remoteBody=next.body;return next;
  } catch(error){
   if(error instanceof EssayRuntimeError&&error.code==='PT409')this.conflict=true;
   throw error;
  }
 }
}
