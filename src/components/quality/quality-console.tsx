"use client";

import Link from "next/link";
import {QualityBack} from "./quality-back";
import {MathQualityRead} from "./math-quality-read";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/auth-context";
import { createQualityClient, type QualityClient } from "@/lib/quality/client";
import { createHumanReviewClient, type HumanReviewClient } from "@/lib/quality/human-review-client";
import type { QualityCaseDetail, QualityCaseSummary, QualityListCursor } from "@/lib/quality/contract";
import type { HqCaseReviewState } from "@/lib/quality/human-review-contract";
import { qualityErrorKind, type QualityErrorKind } from "@/lib/quality/errors";

import { QualityCaseList, type ListState } from "./quality-case-list";
import { QualityCaseDetailPanel, type DetailState } from "./quality-case-detail";
import { QualityReviewPanel } from "./quality-review-panel";

/**
 * Operator-only Quality Console (`/ql`). Client-rendered on top of the static
 * export; all data comes from the deployed canonical RPCs via the authenticated
 * Supabase session. Client route gating is defense-in-depth only — the database
 * SECURITY DEFINER authorization is authoritative.
 */

type OperatorGate = "checking" | "operator" | "denied" | "error";

export function QualityConsole() {
  const auth = useAuth();

  if (auth.status === "loading") {
    return <GateShell><p className="ql-state" aria-live="polite">세션을 확인하고 있습니다.</p></GateShell>;
  }

  if (auth.status === "unconfigured") {
    return (
      <GateShell>
        <p className="eyebrow eyebrow--accent">QUALITY CONSOLE</p>
        <h1>계정 연결이 준비되지 않았습니다.</h1>
        <p>이 배포에는 LegendStudy Supabase 브라우저 설정이 연결되어 있지 않아 Quality 데이터를 조회할 수 없습니다.</p>
        <Link className="button button--outline" href="/">홈으로</Link>
      </GateShell>
    );
  }

  if (auth.status === "anonymous") {
    return (
      <GateShell>
        <p className="eyebrow eyebrow--accent">QUALITY CONSOLE</p>
        <h1>로그인이 필요합니다.</h1>
        <p>이 영역은 로그인한 운영자만 접근할 수 있습니다. 로그아웃 상태에서는 어떤 Quality 데이터도 표시되지 않습니다.</p>
        <Link className="button button--primary" href="/login/?next=%2Fql%2F">로그인</Link>
      </GateShell>
    );
  }

  return <OperatorGateView key={auth.user?.id} auth={auth} />;
}

function OperatorGateView({ auth }: { auth: ReturnType<typeof useAuth> }) {
  const quality = useMemo<QualityClient | null>(
    () => (auth.client ? createQualityClient(auth.client) : null),
    [auth.client],
  );
  const humanReview = useMemo<HumanReviewClient | null>(
    () => (auth.client ? createHumanReviewClient(auth.client) : null),
    [auth.client],
  );
  const [source,setSource]=useState<"general"|"math">("general");
  const [gate, setGate] = useState<OperatorGate>("checking");
  const [errorKind, setErrorKind] = useState<QualityErrorKind | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // State is set only inside async callbacks (never synchronously in the effect
  // body), mirroring the auth-context pattern and the React 19 effect rules.
  useEffect(() => {
    let active = true;
    if (!quality) {
      Promise.resolve().then(() => {
        if (!active) return;
        setErrorKind("UNKNOWN");
        setGate("error");
      });
      return () => {
        active = false;
      };
    }
    quality
      .isOperator()
      .then((ok) => {
        if (active) setGate(ok ? "operator" : "denied");
      })
      .catch((error) => {
        if (!active) return;
        setErrorKind(qualityErrorKind(error));
        setGate("error");
      });
    return () => {
      active = false;
    };
  }, [quality, reloadToken]);

  // Retry runs in an event handler, where a synchronous reset is allowed.
  const retryOperatorCheck = () => {
    setGate("checking");
    setErrorKind(null);
    setReloadToken((token) => token + 1);
  };

  if (gate === "checking") {
    return <GateShell><p className="ql-state" aria-live="polite">접근 권한을 확인하고 있습니다.</p></GateShell>;
  }

  if (gate === "denied") {
    return (
      <GateShell>
        <p className="eyebrow eyebrow--accent">QUALITY CONSOLE</p>
        <h1>접근 권한이 없습니다.</h1>
        <p>이 계정은 Quality 운영자 권한이 없습니다. 접근이 필요하면 운영자에게 문의하세요.</p>
        <Link className="button button--outline" href="/">홈으로</Link>
      </GateShell>
    );
  }

  if (gate === "error") {
    return (
      <GateShell>
        <p className="eyebrow eyebrow--accent">QUALITY CONSOLE</p>
        <h1>권한 확인 중 오류가 발생했습니다.</h1>
        <p>{errorKind === "NETWORK" ? "네트워크 오류로 권한을 확인하지 못했습니다." : "권한을 확인하는 중 문제가 발생했습니다."}</p>
        <button type="button" className="button button--primary" onClick={retryOperatorCheck}>다시 시도</button>
      </GateShell>
    );
  }

  return <><div className="content-wrap content-wrap--wide ql-source-controls"><QualityBack/><div role="group" aria-label="논술 유형"><button className="button button--outline button--small" aria-pressed={source==='general'} onClick={()=>setSource('general')}>일반 논술</button><button className="button button--outline button--small" aria-pressed={source==='math'} onClick={()=>setSource('math')}>수리논술</button></div></div>{source==='math'&&auth.client?<MathQualityRead client={auth.client}/>:<QualityWorkspace quality={quality as QualityClient} humanReview={humanReview as HumanReviewClient}/>}</>;
}

function GateShell({ children }: { children: React.ReactNode }) {
  return <div className="ql-gate content-wrap"><div className="ql-gate__card">{children}</div></div>;
}

function QualityWorkspace({ quality, humanReview }: { quality: QualityClient; humanReview: HumanReviewClient }) {
  const [cases, setCases] = useState<QualityCaseSummary[]>([]);
  // Initial state is "loading" because the mount effect fetches immediately —
  // so no synchronous setState is needed in the effect body.
  const [listState, setListState] = useState<ListState>("loading");
  const [listError, setListError] = useState<QualityErrorKind | null>(null);
  const [cursor, setCursor] = useState<QualityListCursor | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const [reviewStates, setReviewStates] = useState<Map<string, HqCaseReviewState>>(new Map());
  const [unreviewedOnly, setUnreviewedOnly] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<QualityCaseDetail | null>(null);
  const [detailState, setDetailState] = useState<DetailState>("idle");
  const [detailError, setDetailError] = useState<QualityErrorKind | null>(null);

  const reqIdRef = useRef(0);

  const caseIdsKey = cases.map((item) => item.evaluation_id).join(",");

  // Batch-fetch human review state for visible cases (bounded, deduped). A
  // review-state failure must never corrupt the ql-read-v1 case list, so errors
  // here are swallowed (badges simply stay absent). No answer bodies fetched.
  useEffect(() => {
    if (cases.length === 0) return;
    let active = true;
    const ids = cases.map((c) => c.evaluation_id);
    const missing = ids.filter((id) => !reviewStates.has(id));
    if (missing.length === 0) return;
    const chunks: string[][] = [];
    for (let i = 0; i < missing.length; i += 100) chunks.push(missing.slice(i, i + 100));
    Promise.all(chunks.map((chunk) => humanReview.getReviewState(chunk).catch(() => [])))
      .then((results) => {
        if (!active) return;
        setReviewStates((prev) => {
          const next = new Map(prev);
          for (const rows of results) for (const row of rows) next.set(row.evaluation_id, row);
          return next;
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseIdsKey, humanReview]);

  const refreshReviewStateFor = (evaluationId: string) => {
    humanReview
      .getReviewState([evaluationId])
      .then((rows) => {
        setReviewStates((prev) => {
          const next = new Map(prev);
          for (const row of rows) next.set(row.evaluation_id, row);
          return next;
        });
      })
      .catch(() => {});
  };

  const isUnreviewed = (id: string) => reviewStates.get(id)?.human_review_state === "UNREVIEWED";
  const visibleCases = unreviewedOnly ? cases.filter((item) => isUnreviewed(item.evaluation_id)) : cases;

  const nextUnreviewed = () => {
    if (cases.length === 0) return;
    const start = selectedId ? cases.findIndex((c) => c.evaluation_id === selectedId) + 1 : 0;
    for (let offset = 0; offset < cases.length; offset += 1) {
      const candidate = cases[(start + offset) % cases.length];
      if (isUnreviewed(candidate.evaluation_id)) {
        selectCase(candidate.evaluation_id);
        return;
      }
    }
  };

  useEffect(() => {
    let active = true;
    quality
      .listCases()
      .then((page) => {
        if (!active) return;
        setCases(page.cases);
        setCursor(page.nextCursor);
        setListState("loaded");
      })
      .catch((error) => {
        if (!active) return;
        setListError(qualityErrorKind(error));
        setListState("error");
      });
    return () => {
      active = false;
    };
  }, [quality, reloadToken]);

  // Event handler — synchronous reset is allowed outside an effect.
  const refresh = () => {
    setListState("loading");
    setListError(null);
    setCases([]);
    setCursor(null);
    setReloadToken((token) => token + 1);
  };

  const loadMore = () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    quality
      .listCases({ cursor })
      .then((page) => {
        setCases((prev) => [...prev, ...page.cases]);
        setCursor(page.nextCursor);
      })
      .catch((error) => {
        setListError(qualityErrorKind(error));
        setListState("error");
      })
      .finally(() => setLoadingMore(false));
  };

  const selectCase = (evaluationId: string) => {
    setSelectedId(evaluationId);
    setDetailState("loading");
    setDetailError(null);
    setDetail(null);
    const reqId = ++reqIdRef.current;
    quality
      .getCaseDetail(evaluationId)
      .then((result) => {
        if (reqIdRef.current !== reqId) return; // ignore stale response
        setDetail(result);
        setDetailState("loaded");
      })
      .catch((error) => {
        if (reqIdRef.current !== reqId) return;
        setDetailError(qualityErrorKind(error));
        setDetailState("error");
      });
  };

  return (
    <div className="ql-workspace">
      <header className="ql-workspace__head content-wrap content-wrap--wide">
        <div>
          <p className="eyebrow eyebrow--accent">LEGENDSTUDY LAB · QUALITY CONSOLE v0</p>
          <h1>품질 검토 콘솔</h1>
          <p className="ql-workspace__lead">초기 서비스 단계에서는 제출 답안과 AI 피드백을 가까이에서 검토해 서비스가 올바르게 작동하는지 확인합니다. 각 사례에 대한 인간 품질 검토를 기록할 수 있으며, 검토 기록은 불변 이력으로 보존됩니다.</p>
        </div>
      </header>
      <div className="ql-workspace__grid content-wrap content-wrap--wide">
        <aside className="ql-workspace__list">
          <QualityCaseList
            cases={visibleCases}
            state={listState}
            errorKind={listError}
            selectedId={selectedId}
            hasMore={Boolean(cursor)}
            loadingMore={loadingMore}
            onSelect={selectCase}
            onLoadMore={loadMore}
            onRefresh={refresh}
            reviewStates={reviewStates}
            unreviewedOnly={unreviewedOnly}
            onToggleUnreviewed={() => setUnreviewedOnly((v) => !v)}
            onNextUnreviewed={nextUnreviewed}
          />
        </aside>
        <main className="ql-workspace__detail">
          <QualityCaseDetailPanel detail={detail} state={detailState} errorKind={detailError} />
          {detailState === "loaded" && detail && selectedId ? (
            <QualityReviewPanel
              key={selectedId}
              humanReview={humanReview}
              evaluationId={selectedId}
              detail={detail}
              onReviewed={refreshReviewStateFor}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
