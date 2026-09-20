"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="status-page"><div className="status-page__card"><p className="eyebrow eyebrow--accent">ROUTE ERROR</p><h1>화면을 준비하지 못했습니다.</h1><p>공개 metadata 또는 합성 fixture를 다시 읽어 보세요. 실제 사용자 데이터나 평가 처리에는 연결되어 있지 않습니다.</p><button className="button button--primary" type="button" onClick={() => reset()}>다시 시도</button></div></div>;
}
