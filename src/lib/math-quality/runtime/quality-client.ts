/**
 * MATH-7B — Math Quality Console operator client (browser-safe). Wraps qlm_quality (operator-gated
 * server-side via is_quality_operator; no privileged service-role key in the browser). Reviews AI quality only.
 */

import { callRuntime, type MathRpcTransport } from "../../math-input/runtime/transport";
import {
  QLM_RUNTIME_DTO,
  type QlmDetailResult,
  type QlmHistoryResult,
  type QlmListResult,
  type QlmReviewStateResult,
  type QlmSubmitResult,
} from "./contract";
import type { HqMathJudgment } from "../types";

export class MathQualityClient {
  constructor(private readonly transport: MathRpcTransport) {}

  listCases(options: { limit?: number; beforeAt?: string; beforeId?: string } = {}): Promise<QlmListResult> {
    const payload: Record<string, unknown> = {};
    if (options.limit !== undefined) payload.limit = options.limit;
    if (options.beforeAt !== undefined && options.beforeId !== undefined) {
      payload.before_at = options.beforeAt;
      payload.before_id = options.beforeId;
    }
    return callRuntime<QlmListResult>(this.transport, "qlm_quality", QLM_RUNTIME_DTO, "list", payload);
  }

  caseDetail(evaluationId: string): Promise<QlmDetailResult> {
    return callRuntime<QlmDetailResult>(this.transport, "qlm_quality", QLM_RUNTIME_DTO, "detail", {
      evaluation_id: evaluationId,
    });
  }

  submitJudgment(judgment: HqMathJudgment): Promise<QlmSubmitResult> {
    return callRuntime<QlmSubmitResult>(this.transport, "qlm_quality", QLM_RUNTIME_DTO, "submit_judgment", {
      judgment,
    });
  }

  reviewState(evaluationIds: string[]): Promise<QlmReviewStateResult> {
    return callRuntime<QlmReviewStateResult>(this.transport, "qlm_quality", QLM_RUNTIME_DTO, "review_state", {
      evaluation_ids: evaluationIds,
    });
  }

  history(evaluationId: string, options: { limit?: number; beforeAt?: string; beforeId?: string } = {}): Promise<QlmHistoryResult> {
    const payload: Record<string, unknown> = { evaluation_id: evaluationId };
    if (options.limit !== undefined) payload.limit = options.limit;
    if (options.beforeAt !== undefined && options.beforeId !== undefined) {
      payload.before_at = options.beforeAt;
      payload.before_id = options.beforeId;
    }
    return callRuntime<QlmHistoryResult>(this.transport, "qlm_quality", QLM_RUNTIME_DTO, "history", payload);
  }
}

/** Production read projection (verified against deployed qlm_* RPCs). The older
 * domain fixtures are not the stored-result wire shape. Never coerce them. */
export type StoredMathCase={evaluation_id:string;completed_at:string;leaf_id:string;quality_metadata?:unknown};
export type StoredMathDetail=Record<string,unknown>&{dto_version:'qlm-read-v1';evaluation_id:string};
export type StoredMathReview={math_evaluation_id:string;availability:string;human_review_state?:string;total_count?:number};
export class StoredMathQualityReader {
 constructor(private readonly transport:MathRpcTransport){}
 private async read(action:string,payload:Record<string,unknown>,version:string){
  const value=await callRuntime<Record<string,unknown>>(this.transport,'qlm_quality',QLM_RUNTIME_DTO,action,payload);
  if(!value||value.dto_version!==version)throw Error('INVALID_QUALITY_RESPONSE');
  return value;
 }
 async list(before?:StoredMathCase){
  const value=await this.read('list',{limit:50,...(before?{before_at:before.completed_at,before_id:before.evaluation_id}:{})},'qlm-read-v1');
  if(!Array.isArray(value.cases)||value.cases.some(v=>!v||typeof v.evaluation_id!=='string'||typeof v.completed_at!=='string'||typeof v.leaf_id!=='string'))throw Error('INVALID_QUALITY_RESPONSE');
  return value.cases as StoredMathCase[];
 }
 async detail(id:string){
  const value=await this.read('detail',{evaluation_id:id},'qlm-read-v1');
  if(value.evaluation_id!==id||typeof value.output!=='object'||!value.output)throw Error('INVALID_QUALITY_RESPONSE');
  return value as StoredMathDetail;
 }
 async history(id:string, before?:{created_at:string;judgment_id:string}) {
  const value=await this.read('history',{evaluation_id:id,limit:20,...(before?{before_at:before.created_at,before_id:before.judgment_id}:{})},'hq-math-read-v1');
  if(!Array.isArray(value.judgments))throw Error('INVALID_QUALITY_RESPONSE');
  return value;
 }
 async submit(judgment:Record<string,unknown>) {
  return this.read('submit_judgment',{judgment},'hq-math-write-v1');
 }
 async reviewState(ids:string[]){
  const value=await this.read('review_state',{evaluation_ids:ids},'hq-math-read-v1');
  if(!Array.isArray(value.cases)||value.cases.some(v=>!v||typeof v.math_evaluation_id!=='string'||typeof v.availability!=='string'))throw Error('INVALID_QUALITY_RESPONSE');
  return value.cases as StoredMathReview[];
 }
}
