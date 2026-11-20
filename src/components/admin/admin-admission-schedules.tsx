'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/components/auth-context';
import { admissionEventLabels, scheduleErrorCopy } from '@/lib/my/admission-day-events';
import { readAdminAdmissionSchedules, saveAdminAdmissionSchedule, validateAdmissionSchedule, type AdmissionSchedule, type AdmissionScheduleInput, type AdmissionSchedules } from '@/lib/admin/admission-schedules';
import './admin-admission-schedules.css';

export function AdminAdmissionSchedules() {
  const auth = useAuth();
  if (auth.status !== 'authenticated' || !auth.client || !auth.user || auth.recoveryActive) return null;
  return <ScheduleManager key={auth.user.id} client={auth.client} owner={auth.user.id} />;
}
function ScheduleManager({ client, owner }: { client: NonNullable<ReturnType<typeof useAuth>['client']>; owner: string }) {
  const [data, setData] = useState<AdmissionSchedules | null>(null);
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);
  const [selected, setSelected] = useState<AdmissionSchedule | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    readAdminAdmissionSchedules(client, owner).then(value => { if (active) { setData(value); setError(''); } }).catch(error => { if (active) { setData(null); setError(scheduleErrorCopy(error)); } });
    return () => { active = false; };
  }, [client, owner, nonce]);
  async function save(input: AdmissionScheduleInput, key: string) {
    setSaving(true);
    try {
      const saved = await saveAdminAdmissionSchedule(client, owner, selected?.id ?? null, selected?.revision ?? 0, input, key);
      setSelected(saved); setEditorKey(value => value + 1); setNonce(value => value + 1);
      setMessage('일정을 저장했습니다. 공개된 공식 일정은 연결 대상 학생의 D-Day에 반영됩니다.');
    } finally { setSaving(false); }
  }
  const schedules = data?.schedules.filter(row => !filter || row.university_id === filter) ?? [];
  return <div className="admin-schedules">
    <section className="admin-section">
      <div className="admin-schedules__heading"><h2>{selected ? '공식 일정 수정' : '공식 일정 등록'}</h2><button type="button" className="button button--outline" disabled={saving} onClick={() => { setSelected(null); setEditorKey(value => value + 1); setMessage(''); }}>신규 일정</button></div>
      {error && <p role="alert">{error} <button className="text-link" onClick={() => setNonce(value => value + 1)}>다시 조회</button></p>}
      {!data && !error && <p role="status">공식 일정을 불러오고 있습니다.</p>}
      {data && <AdmissionScheduleForm key={editorKey} initial={selected} universities={data.universities} schedules={data.schedules} save={save} />}
      {message && <p role="status">{message}</p>}
    </section>
    {data && <section className="admin-section">
      <div className="admin-schedules__heading"><h2>등록된 일정 ({schedules.length})</h2><button className="button button--outline" disabled={saving} onClick={() => setNonce(value => value + 1)}>목록 새로고침</button></div>
      <label className="admin-schedules__filter">대학별 조회<select value={filter} onChange={event => setFilter(event.target.value)}><option value="">전체 대학</option>{data.universities.map(university => <option key={university.id} value={university.id}>{university.name}</option>)}</select></label>
      {schedules.length === 0 && <p>등록된 일정이 없습니다.</p>}
      <div className="admin-schedules__list">{schedules.map(row => <article className="admin-schedules__item" key={row.id}>
        <div><span className={`admin-schedules__state admin-schedules__state--${row.verification_status.toLowerCase()}`}>{row.verification_status === 'VERIFIED' ? '공식 확인' : row.verification_status === 'CANCELLED' ? '취소' : '확인 대기'} · {row.is_published ? '공개' : '비공개'}</span><h3>{row.university_name || data.universities.find(university => university.id === row.university_id)?.name} · {admissionEventLabels[row.event_type]}</h3><p>{row.academic_year}학년도 · {row.campus} · {row.event_date ?? '날짜 미확정'}{row.event_time ? ` ${row.event_time.slice(0, 5)} KST` : ''}</p><p>{row.admission_names.join(' / ') || '전형 확인 대기'} · {row.division_names.join(' / ') || '모집단위 확인 대기'}</p><p className="admin-schedules__hint">수정 {row.revision}차{row.updated_at ? ` · ${new Date(row.updated_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}` : ''}</p>{row.source_url && <a className="text-link" href={row.source_url} target="_blank" rel="noopener noreferrer">공식 출처 ↗</a>}</div>
        <button className="button button--outline" disabled={saving} onClick={() => { setSelected(row); setEditorKey(value => value + 1); setMessage(''); }} aria-label={`${row.title} 수정`}>수정</button>
      </article>)}</div>
    </section>}
  </div>;
}
export function AdmissionScheduleForm({ initial, universities, schedules, save }: { initial: AdmissionSchedule | null; universities: AdmissionSchedules['universities']; schedules: AdmissionSchedule[]; save: (input: AdmissionScheduleInput, key: string) => Promise<void> }) {
  const [input, setInput] = useState<AdmissionScheduleInput>(() => initial ? {
    university_id: initial.university_id, academic_year: initial.academic_year, campus: initial.campus, title: initial.title,
    event_type: initial.event_type, event_date: initial.event_date, event_time: initial.event_time,
    admission_names: initial.admission_names, division_names: initial.division_names, source_url: initial.source_url,
    source_sha256: initial.source_sha256, source_page: initial.source_page, source_note: initial.source_note,
    verification_status: initial.verification_status, is_published: initial.is_published,
  } : { university_id: '', academic_year: Number(new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 4)) + 1, campus: '', title: '', event_type: 'ESSAY', event_date: null, event_time: null, admission_names: [], division_names: [], source_url: null, source_sha256: null, source_page: null, source_note: '', verification_status: 'PENDING', is_published: false });
  const [names, setNames] = useState(initial?.admission_names.join('\n') ?? '');
  const [divisions, setDivisions] = useState(initial?.division_names.join('\n') ?? '');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const writing = useRef(false), mounted = useRef(true), request = useRef<{ signature: string; key: string } | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const edit = <K extends keyof AdmissionScheduleInput>(key: K, value: AdmissionScheduleInput[K]) => setInput(previous => ({ ...previous, [key]: value }));
  const aliases = [...new Set(schedules.filter(row => row.university_id === input.university_id && row.academic_year === input.academic_year).flatMap(row => row.admission_names))];
  async function submit(event: FormEvent) {
    event.preventDefault(); if (writing.current) return;
    const lines = (value: string) => [...new Set(value.split('\n').map(part => part.trim()).filter(Boolean))];
    const draft = { ...input, title: input.title.trim(), campus: input.campus.trim(), source_note: input.source_note.trim(), admission_names: lines(names), division_names: lines(divisions) };
    const invalid = validateAdmissionSchedule(draft); if (invalid) { setError(invalid); return; }
    const signature = JSON.stringify([initial?.id, initial?.revision, draft]);
    if (request.current?.signature !== signature) request.current = { signature, key: crypto.randomUUID() };
    writing.current = true; setBusy(true); setError('');
    try { await save(draft, request.current.key); request.current = null; }
    catch (error) { if (mounted.current) setError(scheduleErrorCopy(error)); }
    finally { writing.current = false; if (mounted.current) setBusy(false); }
  }
  return <form onSubmit={submit} className="admin-schedules__form">
    <p className="admin-schedules__hint">대학·학년도·캠퍼스·일정 유형은 저장 후 유지됩니다. 확인하지 못한 일정은 비공개 ‘확인 대기’로 저장하세요.</p>
    <fieldset disabled={busy}>
      <div className="admin-schedules__grid">
        <label>대학 선택<select required value={input.university_id} disabled={Boolean(initial)} onChange={event => edit('university_id', event.target.value)}><option value="">대학을 선택하세요</option>{universities.map(university => <option key={university.id} value={university.id}>{university.name}</option>)}</select></label>
        <label>학년도<input type="number" required min={1900} max={2200} disabled={Boolean(initial)} value={input.academic_year} onChange={event => edit('academic_year', Number(event.target.value))} /></label>
        <label>캠퍼스<input required maxLength={80} disabled={Boolean(initial)} value={input.campus} onChange={event => edit('campus', event.target.value)} placeholder="예: 서울" /></label>
        <label>일정 유형<select value={input.event_type} disabled={Boolean(initial)} onChange={event => edit('event_type', event.target.value as AdmissionScheduleInput['event_type'])}>{Object.entries(admissionEventLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label>D-Day 표시 이름<input required value={input.title} onChange={event => edit('title', event.target.value)} placeholder="예: 아주대학교 논술고사" /><span className="admin-schedules__hint">최대 15자</span></label>
        <label>날짜 (KST)<input type="date" value={input.event_date ?? ''} onChange={event => edit('event_date', event.target.value || null)} /></label>
        <label>시각 (선택, KST)<input type="time" value={input.event_time?.slice(0, 5) ?? ''} onChange={event => edit('event_time', event.target.value || null)} /><span className="admin-schedules__hint">입실 마감을 시험 시작 시각으로 입력하지 마세요.</span></label>
        <label>기존 전형 선택<select value="" onChange={event => { if (event.target.value) setNames(previous => [...new Set([...previous.split('\n').filter(Boolean), event.target.value])].join('\n')); }}><option value="">전형을 골라 적용 목록에 추가</option>{aliases.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
        <label>적용 전형 이름<textarea rows={3} value={names} onChange={event => setNames(event.target.value)} placeholder={'논술우수자전형\n수리논술'} /><span className="admin-schedules__hint">공식 전형과 확인한 입력 별칭을 한 줄에 하나씩 적어 주세요. 입력값과 정확하게 일치할 때 연결합니다.</span></label>
        <label>모집단위 적용 범위<textarea rows={3} value={divisions} onChange={event => setDivisions(event.target.value)} placeholder="기계공학과" /><span className="admin-schedules__hint">확인한 모집단위를 한 줄에 하나씩 입력하세요. 확인 대기 일정에도 전형·모집단위가 필요하며 전체 적용은 지원하지 않습니다.</span></label>
        <label className="admin-schedules__wide">공식 출처 URL<input type="url" value={input.source_url ?? ''} onChange={event => edit('source_url', event.target.value || null)} placeholder="https://입학처/공식자료" /></label>
        <label>출처 페이지 (선택)<input type="number" min={1} value={input.source_page ?? ''} onChange={event => edit('source_page', event.target.value ? Number(event.target.value) : null)} /></label>
        <label>출처 SHA256 (선택)<input value={input.source_sha256 ?? ''} maxLength={64} onChange={event => edit('source_sha256', event.target.value || null)} /></label>
        <label className="admin-schedules__wide">검수 근거·적용 조건<textarea rows={3} value={input.source_note} onChange={event => edit('source_note', event.target.value)} placeholder="공식 표의 적용 대상, 예외와 확인한 내용을 적어 주세요. 공식 확인은 최소 5자입니다." /></label>
        <label>검증 상태<select value={input.verification_status} onChange={event => setInput(previous => ({ ...previous, verification_status: event.target.value as AdmissionScheduleInput['verification_status'], is_published: event.target.value === 'VERIFIED' && previous.is_published }))}><option value="PENDING">확인 대기 (PENDING)</option><option value="VERIFIED">공식 확인 (VERIFIED)</option><option value="CANCELLED">취소 (CANCELLED)</option></select></label>
        <label className="admin-schedules__publish"><input type="checkbox" checked={input.is_published} disabled={input.verification_status !== 'VERIFIED'} onChange={event => edit('is_published', event.target.checked)} />학생에게 공개</label>
      </div>
      <p className="admin-schedules__hint">공식 출처와 적용 전형·모집단위를 직접 확인한 일정만 공개하세요. 변경된 날짜는 연결된 D-Day에 반영되며, 학생이 삭제한 일정은 다시 생성되지 않습니다.</p>
      <button className="button button--primary" type="submit">{busy ? '저장 중…' : '일정 저장'}</button>
    </fieldset>
    {error && <p role="alert">{error}</p>}
  </form>;
}
