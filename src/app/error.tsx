"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="status-page"><div className="status-page__card"><p className="eyebrow eyebrow--accent">ROUTE ERROR</p><h1>화면을 준비하지 못했습니다.</h1><p>잠시 후 다시 시도해 주세요.</p><button className="button button--primary" type="button" onClick={() => reset()}>다시 시도</button></div></div>;
}
