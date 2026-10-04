"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useAuth } from "@/components/auth-context";
import { MathInputFlow } from "@/components/math-input/math-input-flow";
import { LearningGuidance } from "@/components/math-learning/learning-guidance";
import { LearningHistory } from "@/components/math-learning/learning-history";
import { LearningDelta } from "@/components/math-learning/learning-delta";
import { MathInputClient } from "@/lib/math-input/runtime/input-client";
import { fromWireCandidateRegion } from "@/lib/math-input/runtime/mapping";
import type { ReadInputResult, EvidenceMetadata } from "@/lib/math-input/runtime/contract";
import type { ReadinessResult } from "@/lib/math-input/types";
import type { MathRpcTransport } from "@/lib/math-input/runtime/transport";
import { LearningRuntimeClient } from "@/lib/math-learning/runtime/learning-client";
import type { LearningState, LearningHistoryResult, RevealSolutionResult, ReevaluationDelta } from "@/lib/math-learning/runtime/contract";
import { buildLearningTimeline } from "@/lib/math-learning/history";
import { summarizeReevaluationDelta } from "@/lib/math-learning/delta";
import type { CoreView, HintLevel } from "@/lib/math-learning/types";
import "./student-route.css";
type Catalog = { leaf_id: string; statement: string; problem_statement: string; label: string; response_format: string };
const unavailable = "지금은 요청을 처리할 수 없습니다. 로그인 상태와 연결을 확인한 뒤 다시 시도해 주세요.";
export function MathStudentRoute({ enabled }: { enabled: boolean }) {
  const auth = useAuth();
  if (!enabled) return <main className="math-student"><h1>수리논술</h1><p>서비스를 준비하고 있습니다.</p><Link href="/">LAB 홈으로</Link></main>;
  if (auth.status === "loading") return <main className="math-student"><h1>수리논술</h1><p>로그인을 확인하고 있습니다.</p></main>;
  if (!auth.user || !auth.client) return <main className="math-student"><h1>수리논술</h1><p>내 답안과 학습 기록을 보려면 로그인해 주세요.</p><Link href="/login/">로그인</Link></main>;
  return <Workspace key={auth.user.id} client={auth.client} />;
}
function LocalPreview({ file }: { file: File }) {
  const image = useRef<HTMLImageElement>(null), link = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!URL.createObjectURL) return;
    const url = URL.createObjectURL(file);
    if (image.current) image.current.src = url;
    if (link.current) link.current.href = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return file.type === "application/pdf" ? <a ref={link} target="_blank" rel="noopener noreferrer">선택한 PDF 미리보기</a> :
    // Local blob preview only; revoked on file change/account unmount.
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={image} alt="선택한 답안 미리보기" style={{ maxHeight: "24rem", objectFit: "contain" }} />;
}
function Workspace({ client }: { client: SupabaseClient }) {
  const alive = useRef(true), keys = useRef(new Map<string, string>());
  const [catalog, setCatalog] = useState<Catalog[]>([]), [leaf, setLeaf] = useState("");
  const [answer, setAnswer] = useState(""), [file, setFile] = useState<File | null>(null);
  const [attempt, setAttempt] = useState<string | null>(null), [input, setInput] = useState<ReadInputResult | null>(null);
  const [learning, setLearning] = useState<LearningState | null>(null), [history, setHistory] = useState<LearningHistoryResult | null>(null);
  const [hints, setHints] = useState<Partial<Record<HintLevel,string>>>({}), [solution, setSolution] = useState<RevealSolutionResult | null>(null);
  const [corrections, setCorrections] = useState<Record<string,string>>({});
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const [result, setResult] = useState<{ overall?: { explanation?: string }; steps?: { id: string; representation: string; explanation: string }[] } | null>(null);
  const [prior, setPrior] = useState<LearningState | null>(null);
  const [evaluations, setEvaluations] = useState<{ id: string; label: string }[]>([]);
  const token = async () => {
    const { data } = await client.auth.getSession();
    if (!data.session) throw Error("LOGIN_REQUIRED"); return data.session.access_token;
  };
  const rpc = useMemo<MathRpcTransport>(() => ({ rpc: async (fn, p_request) => {
    const { data, error } = await client.rpc(fn, { p_request }).abortSignal(AbortSignal.timeout(20000));
    if (error) throw error; return data;
  }}), [client]);
  const inputClient = useMemo(() => new MathInputClient(rpc), [rpc]);
  const learnClient = useMemo(() => new LearningRuntimeClient(rpc), [rpc]);
  const key = (name: string) => { if (!keys.current.has(name)) keys.current.set(name, crypto.randomUUID()); return keys.current.get(name)!; };
  async function run(work: () => Promise<void>) {
    if (busy) return; setBusy(true); setNotice("");
    try { await work(); } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (alive.current) setNotice(code === "PT402" ? "사용 가능한 Credit이 부족합니다. 보유 내역을 확인해 주세요." : code === "42501" ? "계정 상태 또는 접근 권한을 확인해 주세요. 삭제 진행 중인 계정은 새 답안을 제출할 수 없습니다." : unavailable);
    }
    finally { if (alive.current) setBusy(false); }
  }
  async function gateway(action: string, payload: unknown, upload = false) {
    const res = await fetch(`/api/math/${action}`, { method: "POST", headers: {
      Authorization: `Bearer ${await token()}`, ...(upload ? {} : { "Content-Type": "application/json" }),
    }, body: upload ? payload as FormData : JSON.stringify(payload), signal: AbortSignal.timeout(55000) });
    if (!res.ok) throw Error("MATH_UNAVAILABLE"); return res.json();
  }
  useEffect(() => {
    alive.current = true;
    Promise.all([
      client.rpc("math_catalog", { p_limit: 20 }).abortSignal(AbortSignal.timeout(20000)),
      rpc.rpc("math_input", { dto_version: "math-input-v1", action: "history", payload: { limit: 20 } }),
    ]).then(([result, wire]) => {
      if (!alive.current) return;
      if (result.error) throw result.error;
      setCatalog(result.data ?? []); setLeaf(result.data?.[0]?.leaf_id ?? "");
      const rows = (wire as { result: { attempts: { evaluations?: { evaluation_id?: string; id?: string }[] }[] } }).result.attempts;
      setEvaluations(rows.flatMap((row, index) => (row.evaluations ?? []).flatMap(e => e.evaluation_id || e.id ? [{ id: (e.evaluation_id ?? e.id)!, label: `학습 기록 ${index + 1}` }] : [])));
    }).catch(() => { if (alive.current) setNotice(unavailable); });
    return () => { alive.current = false; };
  }, [client, rpc]);
  async function readEvaluation(id: string) {
    const state = await learnClient.readLearningState(id);
    if (!state.valid_evaluation_available) {
      if (alive.current) { setLearning(state); setNotice(state.evaluation_state === "FAILED" ? "평가가 완료되지 않았습니다. 새 답안을 작성하거나 잠시 후 다시 시도해 주세요." : "평가를 진행하고 있습니다. 잠시 후 결과를 다시 확인해 주세요."); }
      return;
    }
    const wire = await rpc.rpc("math_input", { dto_version: "math-input-v1", action: "read_result", payload: { evaluation_id: id } }) as { result: { output: typeof result } };
    if (alive.current) setResult(wire.result.output);
    if (!alive.current) return;
    setLearning(state); setHints({}); setSolution(null);
    const records = await learnClient.readLearningHistory(id);
    if (alive.current) setHistory(records);
    if (!state.valid_evaluation_available) setNotice("평가 결과를 아직 확인할 수 없습니다. 잠시 후 결과를 다시 확인해 주세요.");
  }
  async function submit() {
    let id = attempt;
    if (!id) {
      const payload = { client_submission_id: key("attempt"), leaf_id: leaf, kind: "INITIAL" as const,
        input_kind: file ? (answer.trim() ? "MIXED" as const : "EVIDENCE" as const) : "TYPED" as const,
        ...(answer.trim() ? { typed_answer: answer } : {}) };
      const created = prior ? await learnClient.createResolveAttempt({ ...payload, kind: prior.response_format === "SHORT_ANSWER" ? "SHORT_ANSWER_RESOLVE" : "FULL_RESOLVE", predecessor_id: prior.attempt_id, prior_evaluation_id: prior.evaluation_id }) : await inputClient.createAttempt(payload);
      id = created.attempt_id; if (!alive.current) return; setAttempt(id);
    }
    if (file) {
      const artifact = await inputClient.registerEvidence(id, { position: 1, media_type: file.type as EvidenceMetadata["media_type"], byte_size: file.size });
      const form = new FormData(); form.set("artifact_id", artifact.artifact_id); form.set("file", file);
      await gateway("upload", form, true); await gateway("extract", { attempt_id: id });
    }
    const state = await inputClient.readInput(id); if (alive.current) setInput(state);
  }
  async function evaluate() {
    if (!attempt) return;
    const response = prior ? await learnClient.requestReevaluation(attempt, key("evaluation")) :
      ((await rpc.rpc("math_input", { dto_version: "math-input-v1", action: "request_evaluation", payload: { attempt_id: attempt, client_submission_id: key("evaluation") } })) as { result: { evaluation_id: string } }).result;
    try { await gateway("evaluate", { evaluation_id: response.evaluation_id }); }
    finally { await readEvaluation(response.evaluation_id); }
  }
  const regions = input?.candidate_regions ?? [];
  const readiness = { status: input?.can_request_evaluation ? "READY_FOR_EVALUATION" : "NEEDS_CONFIRMATION", confirmationRequired: regions.map(fromWireCandidateRegion) } as ReadinessResult;
  const core = learning?.core?.[0];
  const coreView: CoreView = { primary: core ? { coreId: core.core_id, errorId: core.error_id, stepId: core.step_id, title: core.title, diagnosis: core.diagnosis, why: core.why, nextAction: core.next_action } : null, secondary: [], propagatedSummary: [] };
  const chosen = catalog.find(row => row.leaf_id === leaf);
  return <main className="math-student" aria-busy={busy}>
    <h1>수리논술</h1><p>답안의 풀이 과정을 확인하고 다시 풀며 학습하세요.</p>
    {notice && <p role="alert">{notice}</p>}
    <fieldset disabled={busy}>
      <label htmlFor="math-question">문제 선택</label>
      <select id="math-question" value={leaf} disabled={!!attempt || !!prior} onChange={e => setLeaf(e.target.value)}>
        {catalog.map(row => <option key={row.leaf_id} value={row.leaf_id}>{row.label} · {row.statement.slice(0,80)}</option>)}
      </select>
      {!catalog.length && <p>현재 준비된 문제가 없습니다.</p>}
      {chosen && <section aria-label="문제"><p>{chosen.problem_statement}</p><p>{chosen.statement}</p></section>}
      <label htmlFor="math-answer">내 답안</label>
      <textarea id="math-answer" value={answer} maxLength={30000} disabled={!!attempt} onChange={e => setAnswer(e.target.value)} rows={8} />
      <label htmlFor="math-file">답안 사진 또는 PDF (20MB 이하)</label>
      <input id="math-file" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" disabled={!!attempt} onChange={e => {
        const selected = e.target.files?.[0] ?? null;
        if (selected && (selected.size > 20971520 || !["image/png","image/jpeg","image/webp","application/pdf"].includes(selected.type))) { setFile(null); setNotice("지원하는 사진 또는 20MB 이하 PDF를 선택해 주세요."); return; }
        setFile(selected);
      }} />
      {file && <><p>선택한 파일: {file.name}</p><LocalPreview key={file.name + file.lastModified} file={file}/></>}
      <button type="button" disabled={!leaf || (!answer.trim() && !file)} onClick={() => void run(submit)}>답안 제출 · 입력 확인</button>
      {input && <MathInputFlow readiness={readiness} onConfirm={intent => setCorrections(current => ({ ...current, [intent.regionId]: intent.confirmedRawText }))} />}
      {!!regions.length && !input?.can_request_evaluation && <button type="button" disabled={regions.some(row => corrections[row.region_id] === undefined)} onClick={() => void run(async () => {
        await inputClient.confirmExtraction(attempt!, String(input!.candidate?.run_id ?? input!.candidate?.id), regions.map(row => ({ region_id: row.region_id, raw_text: corrections[row.region_id], normalized_math: corrections[row.region_id] })));
        const state = await inputClient.readInput(attempt!); if (alive.current) setInput(state);
      })}>확인한 답안 저장</button>}
      <button type="button" onClick={() => { setAttempt(null); setInput(null); setPrior(null); setLearning(null); setResult(null); setAnswer(""); setFile(null); setHints({}); setSolution(null); setCorrections({}); keys.current.clear(); }}>새 답안 작성</button>
      {input?.can_request_evaluation && <button type="button" onClick={() => void run(evaluate)}>{prior ? "재첨삭 요청 · 추가 Credit 없음" : "첨삭 요청 · 1 Credit"}</button>}
      {learning && <button type="button" onClick={() => void run(() => readEvaluation(learning.evaluation_id))}>결과 다시 확인</button>}
      {learning?.valid_evaluation_available && <>
        <section aria-label="첨삭 결과"><h2>첨삭 결과</h2>
          {result?.overall?.explanation && <p>{result.overall.explanation.replace(/^[A-Z_]+$/, "답안의 풀이 과정과 개선 안내를 확인해 주세요.")}</p>}
          {result?.steps?.map(step => <article key={step.id}><p>{step.representation}</p><p>{step.explanation}</p></article>)}
        </section>
        <LearningGuidance coreView={coreView} l0Body="아래 안내를 확인하고 풀이를 개선해 보세요." revealedHints={hints}
          onRevealHint={level => void run(async () => {
            const hint = learning.hints.find(h => h.core_id === core?.core_id && h.level === level && h.can_reveal);
            if (!hint) throw Error("HINT_UNAVAILABLE");
            const result = await learnClient.revealHint(learning.evaluation_id, hint.hint_id, level, key(`hint:${hint.hint_id}`));
            const state = await learnClient.readLearningState(learning.evaluation_id);
            if (alive.current) { setHints(current => ({ ...current, [level]: result.body })); setLearning(state); }
          })}
          onRevealSolution={() => void run(async () => {
            const selected = learning.solutions[0]; if (!selected) throw Error("SOLUTION_UNAVAILABLE");
            const result = await learnClient.revealSolution(learning.evaluation_id, selected.target, key("solution"), selected.solution_id);
            if (alive.current) setSolution(result);
          })}
          onResolve={() => { setPrior(learning); setLeaf(learning.leaf_id); setAttempt(null); setInput(null); setAnswer(""); setFile(null); setCorrections({}); keys.current.clear(); }} solutionProvenance={solution?.provenance} />
        {solution && <section aria-label="해설"><h2>해설</h2><p>{solution.body}</p></section>}
        <LearningDelta view={summarizeReevaluationDelta(learning.reevaluation_delta as ReevaluationDelta | null)} />
      </>}
      {prior && !prior.included_reevaluation.eligible && <p>추가 비용 없는 재첨삭 기간 또는 횟수를 확인해 주세요. 요청 가능 여부는 서버에서 확인합니다.</p>}
      {history && <LearningHistory timeline={buildLearningTimeline(history)} />}
      {!!evaluations.length && <section aria-label="이전 학습"><h2>이전 학습</h2>{evaluations.map(row => <button key={row.id} type="button" onClick={() => void run(() => readEvaluation(row.id))}>{row.label}</button>)}</section>}
    </fieldset>
  </main>;
}
