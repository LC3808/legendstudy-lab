/** Web binding of APP essay_live_gateway.dart. SQL remains the only write/billing authority. */
export type Row = Record<string, unknown>;
export interface EssayTransport {
  userId(): string | null;
  rpc(name: string, args: Row): Promise<unknown>;
  rows(table: string, columns: string, filters: Row, limit: number, order: string): Promise<Row[]>;
}
export class EssayRuntimeError extends Error { constructor(readonly code: string) { super(code); } }
export type EssayStatus = {
  state: 'processing' | 'reconciling' | 'completed' | 'failed';
  credit_state: 'reserved' | 'included' | 'settled' | 'released' | 'pending';
  credit_mode: 'paid' | 'included' | 'pending';
  no_credit_consumed: boolean; release_confirmed: boolean;
};
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuid(value: unknown): string {
  if (typeof value !== 'string' || !uuidPattern.test(value)) throw new EssayRuntimeError('INVALID_RESPONSE');
  return value;
}
export async function hashText(text: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
}
/** Same deterministic UUID transformation as APP. No random retry keys after ambiguous writes. */
export async function essayRequestId(scope: string): Promise<string> {
  const hex=await hashText(scope);
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}
export function parseEssayStatus(value: unknown): EssayStatus {
  if (!value || typeof value!=='object' || Array.isArray(value)) throw new EssayRuntimeError('INVALID_RESPONSE');
  const v=value as Row;
  if (!['processing','reconciling','completed','failed'].includes(String(v.state)) ||
      !['reserved','included','settled','released','pending'].includes(String(v.credit_state)) ||
      !['paid','included','pending'].includes(String(v.credit_mode)) ||
      typeof v.no_credit_consumed!=='boolean' || typeof v.release_confirmed!=='boolean') throw new EssayRuntimeError('INVALID_RESPONSE');
  return {state:v.state as EssayStatus['state'],credit_state:v.credit_state as EssayStatus['credit_state'],
    credit_mode:v.credit_mode as EssayStatus['credit_mode'],release_confirmed:v.release_confirmed,
    no_credit_consumed:v.state!=='reconciling' && v.no_credit_consumed};
}
export class EssayRuntimeClient {
  readonly owner: string;
  private revoked=false;
  sessionId: string | null=null;
  constructor(private transport: EssayTransport,readonly questionId: string,private writesEnabled=false) {
    this.owner=uuid(transport.userId());uuid(questionId);
  }
  revoke(){this.revoked=true;this.sessionId=null;}
  private guard(){if(this.revoked || this.transport.userId()!==this.owner) throw new EssayRuntimeError('PT401');}
  private async call<T>(run:()=>Promise<T>):Promise<T>{this.guard();const value=await run();this.guard();return value;}
  private write(){this.guard();if(!this.writesEnabled)throw new EssayRuntimeError('DISABLED');}
  private session(){this.guard();if(!this.sessionId)throw new EssayRuntimeError('PT404');return this.sessionId;}
  async open(resumeId?:string) {
    this.guard();
    const rows=await this.call(()=>this.transport.rows('essay_practice_sessions','id,user_id,question_id',
      {user_id:this.owner,question_id:this.questionId,...(resumeId?{id:uuid(resumeId)}:{})},1,'created_at.desc,id.desc'));
    if(resumeId&&!rows.length)throw new EssayRuntimeError('PT404');
    let id:string;
    if(rows.length){
      if(rows[0].user_id!==this.owner||rows[0].question_id!==this.questionId)throw new EssayRuntimeError('PT403');
      id=uuid(rows[0].id);
    } else {
      this.write();id=await essayRequestId(`essay-default-cycle/v1/${this.owner}/${this.questionId}`);this.guard();
      const created=await this.call(()=>this.transport.rpc('essay_open_session',{p_id:id,p_question:this.questionId}));
      if(uuid(created)!==id)throw new EssayRuntimeError('INVALID_RESPONSE');
    }
    this.guard();this.sessionId=id;return this.readDraft();
  }
  async readDraft(){
    const id=this.session();const rows=await this.call(()=>this.transport.rows('essay_drafts','body,revision',{session_id:id},1,'session_id.asc'));
    const row=rows[0];if(rows.length!==1||typeof row.body!=='string'||!Number.isSafeInteger(row.revision)||Number(row.revision)<0)throw new EssayRuntimeError('INVALID_RESPONSE');
    return {body:row.body,revision:row.revision as number};
  }
  async save(body:string,revision:number){
    this.write();const id=this.session();if(!Number.isSafeInteger(revision)||revision<0)throw new EssayRuntimeError('PT422');
    const next=await this.call(()=>this.transport.rpc('essay_save_draft',{p_session:id,p_revision:revision,p_body:body,p_device:'web_desktop',p_mode:'practice',p_active_seconds:null}));
    if(!Number.isSafeInteger(next)||Number(next)<=revision)throw new EssayRuntimeError('INVALID_RESPONSE');
    return {body,revision:next as number};
  }
  async submit(body:string,revision:number){
    this.write();const id=this.session(),hash=await hashText(body);this.guard();
    const key=await essayRequestId(`${id}/${revision}/${hash}`);this.guard();
    return uuid(await this.call(()=>this.transport.rpc('essay_submit_attempt',{p_session:id,p_revision:revision,p_key:key,p_body_hash:hash})));
  }
  /** Call only after trusted server worker admission. Never decide eligibility from displayed Credit. */
  async requestEvaluation(attemptId:string,admit:()=>Promise<void>){
    this.write();uuid(attemptId);await this.call(admit);
    const regime='essay-v1.3',key=await essayRequestId(`${attemptId}/${regime}`);this.guard();
    return uuid(await this.call(()=>this.transport.rpc('essay_request_evaluation',{p_attempt:attemptId,p_key:key,p_regime:regime})));
  }
  async status(evaluationId:string){return parseEssayStatus(await this.call(()=>this.transport.rpc('essay_evaluation_status',{p_evaluation:uuid(evaluationId)})));}
  async result(evaluationId:string){
    const status=await this.status(evaluationId);if(status.state!=='completed')throw new EssayRuntimeError(status.state.toUpperCase());
    const rows=await this.call(()=>this.transport.rows('essay_evaluations','id,attempt_id,session_id,overall_summary,strengths,rewrite_checklist,contract_version,completed_at',
      {id:evaluationId,session_id:this.session(),status:'completed'},1,'completed_at.desc,id.desc'));
    if(rows.length!==1)throw new EssayRuntimeError('PT404');return rows[0];
  }
  async history(){
    const id=this.session();
    const [attempts,evaluations]=await Promise.all([
      this.call(()=>this.transport.rows('essay_attempts','id,attempt_no,submitted_at',{session_id:id},50,'attempt_no.desc,id.desc')),
      this.call(()=>this.transport.rows('essay_evaluations','id,attempt_id,status,requested_at,completed_at,contract_version',{session_id:id},50,'requested_at.desc,id.desc')),
    ]);this.guard();return {attempts,evaluations};
  }
}
