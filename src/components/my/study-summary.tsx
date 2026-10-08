'use client';
import {DataStatus, useOwnerData} from './owner-data';
import {readStudy, studyDuration, type StudySummary} from '@/lib/my/foundation';

/**
 * 나의 학습시간 — presentation only.
 *
 * Reads the shared server aggregation `my_study_summary` (study-summary-v1), the
 * same RPC the APP consumes, so the APP and the Web show the same numbers for the
 * same records. Rendered as a calm dashboard — summary stats + a 7-day bar chart
 * (oldest → today, today on the right) with a 7-day average line — not a raw
 * per-day text list. No Web-only calculation is introduced. `StudyBars` is reused
 * by the Admin Student 360 view so both read the trend the same way.
 */
export function StudySummaryPanel() {
  const result = useOwnerData(readStudy);
  if (!result.data) return <DataStatus error={result.error} reload={result.reload} />;
  return <StudyDashboard d={result.data} reload={result.reload} />;
}

/** daily7 entries are 'YYYY-MM-DD'; the last one is today. Compact "M/D" / "오늘". */
function dayLabel(date: string, isToday: boolean) {
  if (isToday) return '오늘';
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

export type StudyDay = {date: string; milliseconds: number};

/** 7-day bar chart (oldest → today) with a 7-day average line + an accessible table. */
export function StudyBars({days}: {days: StudyDay[]}) {
  if (days.length === 0) return null;
  const last = days.length - 1;
  const average = Math.round(days.reduce((sum, x) => sum + x.milliseconds, 0) / days.length);
  const highest = Math.max(...days.map((x) => x.milliseconds));
  const scale = Math.max(highest, average, 1);
  const W = 560, H = 176, padT = 14, padB = 4, padX = 6;
  const chartH = H - padT - padB;
  const step = (W - padX * 2) / days.length;
  const barW = step * 0.56;
  const yOf = (ms: number) => padT + chartH - (ms / scale) * chartH;
  const avgY = yOf(average);
  return (
    <figure className="my-study__chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
           aria-label={`최근 7일 학습시간 막대그래프. 7일 평균 ${studyDuration(average)}, 7일 최고 ${studyDuration(highest)}.`}>
        <line className="my-study__avg" x1={padX} x2={W - padX} y1={avgY} y2={avgY} />
        {days.map((day, i) => {
          const top = yOf(day.milliseconds);
          const x = padX + i * step + (step - barW) / 2;
          return (
            <rect key={day.date} className={`my-study__bar${i === last ? ' my-study__bar--today' : ''}`}
                  x={x} y={top} width={barW} height={padT + chartH - top} rx="3">
              <title>{dayLabel(day.date, i === last)} · {studyDuration(day.milliseconds)}</title>
            </rect>
          );
        })}
      </svg>
      <div className="my-study__xaxis" aria-hidden="true">
        {days.map((day, i) => (
          <span key={day.date} className={i === last ? 'is-today' : ''}>{dayLabel(day.date, i === last)}</span>
        ))}
      </div>
      <figcaption className="my-study__caption">막대 = 일별 학습시간 · 점선 = 7일 평균 {studyDuration(average)}</figcaption>
      <table className="sr-only">
        <caption>최근 7일 일별 학습시간</caption>
        <thead><tr><th scope="col">날짜</th><th scope="col">학습시간</th></tr></thead>
        <tbody>
          {days.map((day, i) => (
            <tr key={day.date}><th scope="row">{i === last ? '오늘' : day.date}</th><td>{studyDuration(day.milliseconds)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function StudyDashboard({d, reload}: {d: StudySummary; reload: () => void}) {
  const days = d.daily7; // oldest → newest; days[6] is today (contract-guaranteed)
  const average = days.length ? Math.round(days.reduce((sum, x) => sum + x.milliseconds, 0) / days.length) : 0;
  const highest = days.length ? Math.max(...days.map((x) => x.milliseconds)) : 0;
  const empty = d.last30_ms === 0 || days.length === 0;
  return (
    <div className="my-panel my-study">
      <dl className="my-study__stats">
        <div><dt>오늘</dt><dd>{studyDuration(d.today_ms)}</dd></div>
        <div><dt>이번 주</dt><dd>{studyDuration(d.week_ms)}</dd></div>
        <div><dt>최근 30일</dt><dd>{studyDuration(d.last30_ms)}</dd></div>
        <div><dt>7일 평균</dt><dd>{studyDuration(average)}</dd></div>
        <div><dt>7일 최고</dt><dd>{studyDuration(highest)}</dd></div>
      </dl>
      {empty ? (
        <div className="my-study__empty">
          <p className="my-study__empty-title">아직 완료된 학습 기록이 없습니다.</p>
          <p className="my-study__empty-sub">앱에서 공부를 완료하면 최근 7일 기록이 여기에 쌓입니다.</p>
        </div>
      ) : (
        <StudyBars days={days} />
      )}
      <p className="my-study__note">한국 시간 기준 · 앱에서 완료하고 동기화한 기록입니다.</p>
      <button className="text-link" onClick={reload}>새로고침</button>
    </div>
  );
}
