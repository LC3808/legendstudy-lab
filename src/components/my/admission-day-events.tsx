'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth-context';
import { actOnAdmissionDayEvent, ADMISSION_SCHEDULES_CHANGED, admissionDayLabel, admissionEventLabels, readAdmissionDayEvents, scheduleErrorCopy, unavailableScheduleCopy, type AdmissionDayEvent } from '@/lib/my/admission-day-events';
import './admission-day-events.css';

export function AdmissionDayEventsPanel() {
  const auth = useAuth();
  if (auth.status !== 'authenticated' || !auth.client || !auth.user || auth.recoveryActive) return null;
  return <AdmissionDayEvents key={auth.user.id} client={auth.client} owner={auth.user.id} />;
}
function AdmissionDayEvents({ client, owner }: { client: NonNullable<ReturnType<typeof useAuth>['client']>; owner: string }) {
  const [events, setEvents] = useState<AdmissionDayEvent[] | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [nonce, setNonce] = useState(0);
  const mounted = useRef(true), writing = useRef(false), generation = useRef(0);
  const request = useRef<{ signature: string; key: string } | null>(null);
  const reload = useCallback(() => setNonce(value => value + 1), []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    const current = ++generation.current;
    readAdmissionDayEvents(client, owner).then(rows => { if (active && current === generation.current) { setEvents(rows); setError(''); } }).catch(error => { if (active && current === generation.current) { setEvents(null); setError(scheduleErrorCopy(error)); } });
    return () => { active = false; };
  }, [client, owner, nonce]);
  useEffect(() => {
    const refresh = () => { if (!writing.current) reload(); };
    window.addEventListener(ADMISSION_SCHEDULES_CHANGED, refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener(ADMISSION_SCHEDULES_CHANGED, refresh); window.removeEventListener('focus', refresh); };
  }, [reload]);
  async function act(event: AdmissionDayEvent, action: 'dismiss' | 'restore') {
    if (writing.current) return;
    if (action === 'dismiss' && !window.confirm(`${event.university_name} ${admissionEventLabels[event.event_type]} 일정을 삭제할까요? 지원 기록은 유지되며, 직접 복원하기 전에는 다시 추가되지 않습니다.`)) return;
    writing.current = true; generation.current += 1; setBusy(true); setError(''); setMessage('');
    const signature = JSON.stringify([event.official_event_id, event.revision, action]);
    if (request.current?.signature !== signature) request.current = { signature, key: crypto.randomUUID() };
    try {
      const updated = await actOnAdmissionDayEvent(client, owner, event, action, request.current.key);
      if (!mounted.current) return;
      setEvents(previous => previous?.map(row => row.official_event_id === updated.official_event_id ? updated : row) ?? [updated]);
      setMessage(action === 'dismiss' ? '일정을 삭제했습니다. 삭제한 입시 일정에서 복원할 수 있습니다.' : '최신 공식 날짜로 복원했습니다.');
      request.current = null;
    } catch (error) { if (mounted.current) setError(scheduleErrorCopy(error)); }
    finally { writing.current = false; if (mounted.current) setBusy(false); }
  }
  const active = (events ?? []).filter(event => event.status === 'ACTIVE').sort((a, b) => (a.event_date ?? '').localeCompare(b.event_date ?? '') || a.title.localeCompare(b.title));
  const dismissed = (events ?? []).filter(event => event.status === 'DISMISSED');
  const cancelled = (events ?? []).filter(event => event.status === 'CANCELLED');
  return <section className="my-section admission-days" aria-labelledby="admission-days-title">
    <div className="admission-days__heading"><h2 id="admission-days-title">입시 D-Day</h2><button className="text-link" disabled={busy} onClick={reload}>일정 새로고침</button></div>
    <p className="admission-days__lead">수시 지원 기록과 일치하는 공식 일정만 연결됩니다. 삭제한 일정은 직접 복원하기 전에는 다시 추가되지 않습니다.</p>
    {error && <p role="alert">{error}</p>}
    {!events && !error && <p role="status">공식 일정을 확인하고 있습니다.</p>}
    {events && active.length === 0 && <p className="my-empty">표시할 입시 일정이 없습니다. 전형·모집단위와 공식 날짜가 확인되면 연결됩니다.</p>}
    <div className="admission-days__list">{(expanded ? active : active.slice(0, 3)).map(event => <AdmissionDayRow key={event.official_event_id} event={event} busy={busy} act={act} />)}</div>
    {active.length > 3 && <button className="text-link" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>{expanded ? '일정 접기' : `일정 ${active.length - 3}개 더보기`}</button>}
    {events && <details className="admission-days__hidden"><summary>삭제한 입시 일정 ({dismissed.length})</summary>
      {dismissed.length === 0 && <p>삭제한 입시 일정이 없습니다.</p>}
      {dismissed.map(event => <AdmissionDayRow key={event.official_event_id} event={event} busy={busy} act={act} />)}
    </details>}
    {cancelled.length > 0 && <details className="admission-days__hidden"><summary>연결이 해제된 일정 ({cancelled.length})</summary>{cancelled.map(event => <AdmissionDayRow key={event.official_event_id} event={event} busy={busy} act={act} />)}</details>}
    {message && <p role="status">{message}</p>}
  </section>;
}
function AdmissionDayRow({ event, busy, act }: { event: AdmissionDayEvent; busy: boolean; act: (event: AdmissionDayEvent, action: 'dismiss' | 'restore') => Promise<void> }) {
  const title = `${event.university_name} ${admissionEventLabels[event.event_type]}`;
  return <article className="admission-days__event" aria-label={`${title} ${event.status === 'DISMISSED' ? '삭제됨' : ''}`}>
    <div><span className="admission-days__badge">입시 일정</span><h3>{title}</h3><p>{event.event_date?.replaceAll('-', '.') ?? '날짜 확인 중'}{event.event_time ? ` · ${event.event_time.slice(0, 5)} KST` : ''}</p>
      {event.source_url && <a className="text-link" href={event.source_url} target="_blank" rel="noopener noreferrer">공식 일정 확인 ↗</a>}
      {event.status !== 'ACTIVE' && !event.can_restore && <p className="admission-days__note">{unavailableScheduleCopy(event.unavailable_reason)}</p>}
    </div>
    <div className="admission-days__actions">
      {event.status === 'ACTIVE' && event.event_date && <strong>{admissionDayLabel(event.event_date)}</strong>}
      {event.status === 'ACTIVE' && <button className="button button--outline button--small" disabled={busy} onClick={() => void act(event, 'dismiss')} aria-label={`${title} 삭제`}>삭제</button>}
      {event.status === 'DISMISSED' && <button className="button button--outline button--small" disabled={busy || !event.can_restore} onClick={() => void act(event, 'restore')} aria-label={`${title} 복원`}>복원</button>}
    </div>
  </article>;
}
