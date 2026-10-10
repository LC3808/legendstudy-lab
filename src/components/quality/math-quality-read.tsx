'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { StoredMathQualityReader, type StoredMathCase, type StoredMathDetail, type StoredMathReview } from '@/lib/math-quality/runtime/quality-client';
import { mathReport, object, text } from '@/lib/my/evaluation-report';
import { EvaluationReport, EvaluationComparison } from '@/components/my/evaluation-report';
import { QlSection, QlStructuredValue } from './quality-primitives';
/** Read-only existing operator RPCs. No review writes, direct tables or service key. */
export function MathQualityRead({ client }: {
    client: SupabaseClient;
}) {
    const reader = useMemo(() => new StoredMathQualityReader({ async rpc(fn, p_request) { const { data, error } = await client.rpc(fn, { p_request }); if (error)
            throw error; return data; } }), [client]);
    const [cases, setCases] = useState<StoredMathCase[]>([]), [reviews, setReviews] = useState<StoredMathReview[]>([]);
    const [busy, setBusy] = useState(true), [error, setError] = useState(false), [more, setMore] = useState(false), [reload, setReload] = useState(0), [unreviewed, setUnreviewed] = useState(false);
    const [selected, setSelected] = useState<string | null>(null), [detail, setDetail] = useState<StoredMathDetail | null>(null), [prior, setPrior] = useState<StoredMathDetail | null>(null), [detailError, setDetailError] = useState(false);
    const generation = useRef(0), selection = useRef(0);
    useEffect(() => { const generations = generation, selections = selection; const g = ++generations.current; reader.list().then(async (rows) => ({ rows, states: rows.length ? await reader.reviewState(rows.map(r => r.evaluation_id)) : [] })).then(({ rows, states }) => { if (g !== generation.current)
        return; setCases(rows); setReviews(states); setMore(rows.length === 50); setBusy(false); }).catch(() => { if (g === generation.current) {
        setError(true);
        setBusy(false);
    } }); return () => { generations.current++; selections.current++; }; }, [reader, reload]);
    const refresh = () => { selection.current++; setSelected(null); setDetail(null); setPrior(null); setCases([]); setReviews([]); setError(false); setBusy(true); setReload(v => v + 1); };
    const loadMore = async () => { const g = generation.current; setBusy(true); try {
        const rows = await reader.list(cases.at(-1));
        const states = rows.length ? await reader.reviewState(rows.map(r => r.evaluation_id)) : [];
        if (g !== generation.current)
            return;
        setCases(v => [...v, ...rows.filter(r => !v.some(c => c.evaluation_id === r.evaluation_id))]);
        setReviews(v => [...v, ...states]);
        setMore(rows.length === 50);
    }
    catch {
        if (g === generation.current)
            setError(true);
    }
    finally {
        if (g === generation.current)
            setBusy(false);
    } };
    const isUnreviewed = (id: string) => reviews.some(r => r.math_evaluation_id === id && r.availability === 'AVAILABLE' && r.human_review_state === 'UNREVIEWED');
    const visible = cases.filter(c => !unreviewed || isUnreviewed(c.evaluation_id));
    const select = async (id: string) => { const s = ++selection.current; setSelected(id); setDetail(null); setPrior(null); setDetailError(false); try {
        const d = await reader.detail(id);
        const p = text(d.prior_evaluation_id) ? await reader.detail(text(d.prior_evaluation_id)) : null;
        if (s !== selection.current)
            return;
        setDetail(d);
        setPrior(p);
    }
    catch {
        if (s === selection.current)
            setDetailError(true);
    } };
    const next = () => { const candidates = cases.filter(c => isUnreviewed(c.evaluation_id)); if (!candidates.length)
        return; const i = candidates.findIndex(c => c.evaluation_id === selected); void select(candidates[(i + 1) % candidates.length].evaluation_id); };
    return <div className="ql-workspace"><header className="ql-workspace__head content-wrap content-wrap--wide"><h1>품질 검토 콘솔</h1><p className="ql-workspace__lead">수리논술의 제출 답안과 AI 평가 결과를 검토합니다. 검수 상태는 학생의 성적과 별개입니다.</p></header>
 <div className="ql-workspace__grid content-wrap content-wrap--wide"><aside className="ql-workspace__list"><div className="ql-list" aria-label="수리논술 평가 목록"><div className="ql-list__head"><p className="eyebrow">QUALITY CASES</p><button className="button button--outline button--small" disabled={busy} onClick={refresh}>새로고침</button></div>
 <div className="ql-list__filters"><label><input type="checkbox" checked={unreviewed} onChange={e => setUnreviewed(e.target.checked)}/>미검토만 (불러온 범위)</label><button className="button button--outline button--small" onClick={next} disabled={!cases.some(c => isUnreviewed(c.evaluation_id))}>다음 미검토</button></div>
 {busy && <p role="status">목록을 확인하고 있습니다.</p>}{error && <p role="alert">수리논술 기록을 불러오지 못했습니다. 권한과 연결 상태를 확인해 주세요.</p>}
 {!busy && !error && !visible.length && <p className="ql-state">현재 조건에 맞는 수리논술 평가가 없습니다.</p>}
 <ul className="ql-list__items">{visible.map(c => <li key={c.evaluation_id}><button className={`ql-case ${selected === c.evaluation_id ? 'ql-case--selected' : ''}`} onClick={() => void select(c.evaluation_id)} aria-pressed={selected === c.evaluation_id}><strong>수리논술 · {new Date(c.completed_at).toLocaleString('ko-KR')}</strong><span>{isUnreviewed(c.evaluation_id) ? '미검토' : '검수 상태 확인됨'}</span><span className="ql-case__meta">평가 {c.evaluation_id.slice(0, 8)}</span></button></li>)}</ul>{more && <button className="button button--outline ql-list__more" onClick={() => void loadMore()} disabled={busy}>더 불러오기</button>}</div></aside>
 <main className="ql-workspace__detail" aria-label="수리논술 평가 상세"><div className="ql-detail"><p className="eyebrow">CASE DETAIL</p>{detailError ? <p role="alert">평가 상세를 불러오지 못했습니다.</p> : !detail ? <p>{selected ? '평가를 확인하고 있습니다.' : '왼쪽에서 평가를 선택하세요.'}</p> : <>
 <h2>{text(object(detail.problem).title) || '수리논술'} · {text(object(detail.leaf).label) || '문항'}</h2>
 <p>{prior ? '재첨삭' : '최초 첨삭'} · {cases.find(c => c.evaluation_id === detail.evaluation_id)?.completed_at ? new Date(cases.find(c => c.evaluation_id === detail.evaluation_id)!.completed_at).toLocaleString('ko-KR') : ''}</p>
 <p className="ql-privacy-note">계정 식별정보는 표시하지 않습니다. 답안은 품질 검수 목적으로만 확인하세요.</p>
 <QlSection title="관리자 검수 상태"><QlStructuredValue value={reviews.find(r => r.math_evaluation_id === detail.evaluation_id)?.human_review_state ?? null}/><p>기존 검수 이력은 보존됩니다. 이 수리논술 화면은 조회 전용입니다.</p></QlSection>
 {prior && <EvaluationReport report={mathReport(prior)} title="최초 답안과 첨삭" voiceType="math"/>}<EvaluationReport report={mathReport(detail)} title={prior ? '재작성 답안과 재첨삭' : '제출 답안과 첨삭'} voiceType="math"/>{prior && <EvaluationComparison before={mathReport(prior)} after={mathReport(detail)}/>} 
 <QlSection title="평가 기준 근거"><QlStructuredValue value={detail.criteria}/></QlSection>
 </>}</div></main></div></div>;
}
